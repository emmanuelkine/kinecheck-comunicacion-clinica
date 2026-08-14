-- Hotmart access consistency hardening.
--
-- This migration does not rewrite purchases or licences. It adds defensive
-- rules for future webhook/reconciliation writes, makes administrative
-- purchase deletion explicit and auditable, and separates internal QA traffic
-- from commercial purchase metrics.

begin;

create or replace function public.kinecheck_is_nonproduction_purchase(
  p_buyer_email text,
  p_transaction_id text,
  p_product_id bigint
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select
    lower(trim(coalesce(p_buyer_email, ''))) like '%@example.%'
    or exists (
      select 1
      from public.course_access ca
      where lower(trim(ca.email)) = lower(trim(coalesce(p_buyer_email, '')))
        and ca.course_slug in (
          select g.course_slug
          from public.hotmart_product_grants g
          where g.product_id = p_product_id
        )
        and (
          lower(coalesce(ca.access_source, '')) in (
            'owner', 'beta', 'manual_test', 'hotmart_test'
          )
          or (
            lower(coalesce(ca.access_source, '')) = 'manual'
            and upper(coalesce(ca.last_event, '')) = 'HOTMART_AREA_TEST'
          )
        )
        and (
          ca.transaction_id = p_transaction_id
          or lower(coalesce(ca.access_source, '')) in (
            'owner', 'beta', 'manual_test'
          )
          or (
            lower(coalesce(ca.access_source, '')) = 'manual'
            and upper(coalesce(ca.last_event, '')) = 'HOTMART_AREA_TEST'
          )
        )
    );
$$;

comment on function public.kinecheck_is_nonproduction_purchase(text, text, bigint)
is 'Classifies owner, beta and synthetic QA Hotmart rows so commercial rollups can exclude them without deleting history.';

revoke all on function public.kinecheck_is_nonproduction_purchase(text, text, bigint)
from public, anon, authenticated;

-- Purchase history is an operational ledger. There is no application route
-- that needs DELETE, so require an explicit transaction-local reason even for
-- an administrative deletion and retain the complete old row in an audit log.
create table if not exists public.kinecheck_hotmart_purchase_audit (
  audit_id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  transaction_id text not null,
  product_id bigint not null,
  old_status text,
  new_status text,
  buyer_email_sha256 text not null,
  old_row jsonb,
  new_row jsonb,
  database_user text not null,
  session_user_name text not null,
  application_name text,
  delete_reason text,
  transaction_xid bigint not null
);

comment on table public.kinecheck_hotmart_purchase_audit
is 'Append-only operational audit trail for Hotmart purchase inserts, updates and explicitly justified deletes.';

create index if not exists kinecheck_hotmart_purchase_audit_lookup_idx
on public.kinecheck_hotmart_purchase_audit (
  transaction_id,
  product_id,
  occurred_at desc
);

alter table public.kinecheck_hotmart_purchase_audit enable row level security;
revoke all on table public.kinecheck_hotmart_purchase_audit
from public, anon, authenticated;
grant select on table public.kinecheck_hotmart_purchase_audit to service_role;

drop policy if exists kinecheck_hotmart_purchase_audit_service_read
on public.kinecheck_hotmart_purchase_audit;

create policy kinecheck_hotmart_purchase_audit_service_read
on public.kinecheck_hotmart_purchase_audit
for select
to service_role
using (true);

create or replace function public.kinecheck_require_hotmart_purchase_delete_reason()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := nullif(btrim(current_setting(
    'kinecheck.hotmart_purchase_delete_reason', true
  )), '');
begin
  if v_reason is null or length(v_reason) < 8 then
    raise exception using
      errcode = 'P0001',
      message = 'hotmart_purchases DELETE requires an explicit audit reason',
      hint = 'Use BEGIN; SELECT set_config(''kinecheck.hotmart_purchase_delete_reason'', ''reason with ticket/context'', true); DELETE ...; COMMIT;';
  end if;

  return old;
end;
$$;

revoke all on function public.kinecheck_require_hotmart_purchase_delete_reason()
from public, anon, authenticated;

create or replace function public.kinecheck_audit_hotmart_purchase_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_email text;
begin
  if tg_op <> 'INSERT' then
    v_old := to_jsonb(old) - 'buyer_email';
    v_email := old.buyer_email;
  end if;
  if tg_op <> 'DELETE' then
    v_new := to_jsonb(new) - 'buyer_email';
    v_email := new.buyer_email;
  end if;

  insert into public.kinecheck_hotmart_purchase_audit (
    operation,
    transaction_id,
    product_id,
    old_status,
    new_status,
    buyer_email_sha256,
    old_row,
    new_row,
    database_user,
    session_user_name,
    application_name,
    delete_reason,
    transaction_xid
  ) values (
    tg_op,
    coalesce(new.transaction_id, old.transaction_id),
    coalesce(new.product_id, old.product_id),
    case when tg_op <> 'INSERT' then old.status end,
    case when tg_op <> 'DELETE' then new.status end,
    encode(sha256(convert_to(lower(trim(v_email)), 'UTF8')), 'hex'),
    v_old,
    v_new,
    -- SECURITY DEFINER changes current_user to the function owner. The active
    -- role setting preserves service_role/other SET ROLE callers; direct
    -- administrative sessions fall back to session_user.
    coalesce(
      nullif(current_setting('role', true), 'none'),
      session_user
    ),
    session_user,
    nullif(current_setting('application_name', true), ''),
    case when tg_op = 'DELETE' then nullif(btrim(current_setting(
      'kinecheck.hotmart_purchase_delete_reason', true
    )), '') end,
    txid_current()
  );

  return coalesce(new, old);
end;
$$;

revoke all on function public.kinecheck_audit_hotmart_purchase_change()
from public, anon, authenticated;

drop trigger if exists aa_kinecheck_require_hotmart_purchase_delete_reason
on public.hotmart_purchases;

create trigger aa_kinecheck_require_hotmart_purchase_delete_reason
before delete on public.hotmart_purchases
for each row
execute function public.kinecheck_require_hotmart_purchase_delete_reason();

drop trigger if exists zz_kinecheck_audit_hotmart_purchase_change
on public.hotmart_purchases;

create trigger zz_kinecheck_audit_hotmart_purchase_change
after insert or update or delete on public.hotmart_purchases
for each row
execute function public.kinecheck_audit_hotmart_purchase_change();

-- These roles have no legitimate deletion path. Database administrators can
-- still perform an exceptional delete, but only with the guarded reason above.
revoke delete on table public.hotmart_purchases
from public, anon, authenticated, service_role;

-- A refund for one transaction must not remove an entitlement still backed
-- by another active transaction for the same buyer and course. Commercial
-- revocations must also leave independent owner/beta/manual test grants alone.
create or replace function public.kinecheck_guard_hotmart_access_revocation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_purchase record;
  v_old_is_independent_noncommercial boolean := false;
begin
  if new.active is distinct from false
     or upper(coalesce(new.last_event, '')) not in (
       'PURCHASE_CANCELED',
       'PURCHASE_CHARGEBACK',
       'PURCHASE_EXPIRED',
       'PURCHASE_REFUNDED',
       'PURCHASE_DELAYED',
       'CANCELED',
       'CANCELLED',
       'CHARGEBACK',
       'EXPIRED',
       'REFUNDED',
       'DELAYED'
     )
  then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_old_is_independent_noncommercial :=
      lower(coalesce(old.access_source, '')) in (
        'owner', 'beta', 'manual_test'
      )
      or upper(coalesce(old.last_event, '')) = 'OWNER_ACCESS'
      or (
        lower(coalesce(old.access_source, '')) = 'manual'
        and upper(coalesce(old.last_event, '')) = 'HOTMART_AREA_TEST'
      );

    if v_old_is_independent_noncommercial then
      return old;
    end if;
  end if;

  select
    hp.transaction_id,
    hp.product_id,
    hp.event_name,
    hp.purchased_at,
    hp.last_event_at,
    hp.buyer_email
  into v_active_purchase
  from public.hotmart_purchases hp
  join public.hotmart_product_grants g
    on g.product_id = hp.product_id
  where lower(trim(hp.buyer_email)) = lower(trim(new.email))
    and g.course_slug = new.course_slug
    and hp.status = 'active'
  order by
    coalesce(hp.purchased_at, hp.last_event_at) desc,
    hp.last_event_at desc,
    hp.transaction_id desc
  limit 1;

  if not found then
    return new;
  end if;

  new.active := true;
  new.hotmart_product_id := v_active_purchase.product_id::text;
  new.transaction_id := v_active_purchase.transaction_id;
  new.last_event := v_active_purchase.event_name;
  new.purchase_date := coalesce(
    new.purchase_date,
    v_active_purchase.purchased_at,
    v_active_purchase.last_event_at
  );
  new.access_source := case
    when lower(trim(v_active_purchase.buyer_email)) like '%@example.%'
      then 'hotmart_test'
    else 'hotmart'
  end;
  new.last_event_at := v_active_purchase.last_event_at;

  return new;
end;
$$;

drop trigger if exists zz_kinecheck_guard_hotmart_access_revocation
on public.course_access;

create trigger zz_kinecheck_guard_hotmart_access_revocation
before insert or update on public.course_access
for each row
execute function public.kinecheck_guard_hotmart_access_revocation();

revoke all on function public.kinecheck_guard_hotmart_access_revocation()
from public, anon, authenticated;

comment on function public.kinecheck_guard_hotmart_access_revocation()
is 'Prevents one revoked Hotmart transaction from disabling another active purchase or an independent owner/beta/manual QA entitlement.';

-- Keep access resilient if a purchase row is removed administratively. The
-- normal webhook and reconciliation paths still deactivate course_access on
-- legitimate refunds, so an active licence remains the safe fallback.
create or replace function public.has_course_access(p_course_slug text, p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.course_access ca
      where lower(trim(ca.email)) = lower(trim(p_email))
        and ca.course_slug = p_course_slug
        and ca.active = true
        and (
          lower(coalesce(ca.access_source, '')) in (
            'hotmart', 'hotmart_test', 'beta', 'owner', 'manual_test'
          )
          or (
            lower(coalesce(ca.access_source, '')) = 'manual'
            and upper(coalesce(ca.last_event, '')) = 'HOTMART_AREA_TEST'
          )
        )
        and (ca.access_expires_at is null or ca.access_expires_at > now())
    )
    or exists (
      select 1
      from public.hotmart_purchases purchase
      join public.hotmart_product_grants g
        on g.product_id = purchase.product_id
      where lower(trim(purchase.buyer_email)) = lower(trim(p_email))
        and g.course_slug = p_course_slug
        and purchase.status = 'active'
    );
$$;

revoke all on function public.has_course_access(text, text)
from public, anon, authenticated;

create or replace function public.kinecheck_rollup_daily_metrics()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_payload jsonb;
  v_product_views jsonb;
  v_checkout_starts jsonb;
  v_page_views integer;
  v_product_view_count integer;
  v_checkout_count integer;
  v_approvals integer;
  v_approvals_total integer;
  v_approvals_nonproduction integer;
  v_approvals_unclassified integer;
  v_revocations integer;
  v_revocations_total integer;
  v_revocations_nonproduction integer;
  v_revocations_unclassified integer;
  v_active_purchases integer;
  v_active_purchases_total integer;
  v_active_purchases_nonproduction integer;
  v_revoked_purchases integer;
  v_revoked_purchases_total integer;
  v_revoked_purchases_nonproduction integer;
  v_unclassified_purchases integer;
begin
  select count(*)::int into v_page_views
  from public.kinecheck_public_events
  where event_name='page_view'
    and occurred_at >= current_date
    and occurred_at < current_date + interval '1 day';

  select count(*)::int into v_product_view_count
  from public.kinecheck_public_events
  where event_name='product_view'
    and occurred_at >= current_date
    and occurred_at < current_date + interval '1 day';

  select count(*)::int into v_checkout_count
  from public.kinecheck_public_events
  where event_name='checkout_start'
    and occurred_at >= current_date
    and occurred_at < current_date + interval '1 day';

  select
    count(*) filter (where hp.status = 'active')::int,
    count(*) filter (
      where hp.status = 'active'
        and public.kinecheck_is_nonproduction_purchase(
          hp.buyer_email, hp.transaction_id, hp.product_id
        )
    )::int,
    count(*) filter (where hp.status = 'revoked')::int,
    count(*) filter (
      where hp.status = 'revoked'
        and public.kinecheck_is_nonproduction_purchase(
          hp.buyer_email, hp.transaction_id, hp.product_id
        )
    )::int,
    count(*) filter (
      where hp.status not in ('active', 'revoked')
    )::int
  into
    v_active_purchases_total,
    v_active_purchases_nonproduction,
    v_revoked_purchases_total,
    v_revoked_purchases_nonproduction,
    v_unclassified_purchases
  from public.hotmart_purchases hp;

  v_active_purchases :=
    v_active_purchases_total - v_active_purchases_nonproduction;
  v_revoked_purchases :=
    v_revoked_purchases_total - v_revoked_purchases_nonproduction;

  select count(distinct e.transaction_id)::int
  into v_approvals_total
  from public.hotmart_webhook_events e
  where upper(e.event_name) in ('PURCHASE_APPROVED','PURCHASE_COMPLETE')
    and e.received_at >= current_date
    and e.received_at < current_date + interval '1 day';

  select count(distinct e.transaction_id)::int
  into v_approvals_nonproduction
  from public.hotmart_webhook_events e
  where upper(e.event_name) in ('PURCHASE_APPROVED','PURCHASE_COMPLETE')
    and e.received_at >= current_date
    and e.received_at < current_date + interval '1 day'
    and exists (
      select 1
      from public.hotmart_purchases hp
      where hp.transaction_id = e.transaction_id
        and public.kinecheck_is_nonproduction_purchase(
          hp.buyer_email, hp.transaction_id, hp.product_id
        )
    )
    and not exists (
      select 1
      from public.hotmart_purchases hp
      where hp.transaction_id = e.transaction_id
        and not public.kinecheck_is_nonproduction_purchase(
          hp.buyer_email, hp.transaction_id, hp.product_id
        )
    );

  select count(distinct e.transaction_id)::int
  into v_approvals
  from public.hotmart_webhook_events e
  where upper(e.event_name) in ('PURCHASE_APPROVED','PURCHASE_COMPLETE')
    and e.received_at >= current_date
    and e.received_at < current_date + interval '1 day'
    and exists (
      select 1
      from public.hotmart_purchases hp
      where hp.transaction_id = e.transaction_id
        and not public.kinecheck_is_nonproduction_purchase(
          hp.buyer_email, hp.transaction_id, hp.product_id
        )
    );

  v_approvals_unclassified := greatest(
    v_approvals_total - v_approvals - v_approvals_nonproduction,
    0
  );

  select count(distinct e.transaction_id)::int
  into v_revocations_total
  from public.hotmart_webhook_events e
  where upper(e.event_name) in (
    'PURCHASE_REFUNDED', 'PURCHASE_CANCELED',
    'PURCHASE_CHARGEBACK', 'CHARGEBACK'
  )
    and e.received_at >= current_date
    and e.received_at < current_date + interval '1 day';

  select count(distinct e.transaction_id)::int
  into v_revocations_nonproduction
  from public.hotmart_webhook_events e
  where upper(e.event_name) in (
    'PURCHASE_REFUNDED', 'PURCHASE_CANCELED',
    'PURCHASE_CHARGEBACK', 'CHARGEBACK'
  )
    and e.received_at >= current_date
    and e.received_at < current_date + interval '1 day'
    and exists (
      select 1
      from public.hotmart_purchases hp
      where hp.transaction_id = e.transaction_id
        and public.kinecheck_is_nonproduction_purchase(
          hp.buyer_email, hp.transaction_id, hp.product_id
        )
    )
    and not exists (
      select 1
      from public.hotmart_purchases hp
      where hp.transaction_id = e.transaction_id
        and not public.kinecheck_is_nonproduction_purchase(
          hp.buyer_email, hp.transaction_id, hp.product_id
        )
    );

  select count(distinct e.transaction_id)::int
  into v_revocations
  from public.hotmart_webhook_events e
  where upper(e.event_name) in (
    'PURCHASE_REFUNDED', 'PURCHASE_CANCELED',
    'PURCHASE_CHARGEBACK', 'CHARGEBACK'
  )
    and e.received_at >= current_date
    and e.received_at < current_date + interval '1 day'
    and exists (
      select 1
      from public.hotmart_purchases hp
      where hp.transaction_id = e.transaction_id
        and not public.kinecheck_is_nonproduction_purchase(
          hp.buyer_email, hp.transaction_id, hp.product_id
        )
    );

  v_revocations_unclassified := greatest(
    v_revocations_total - v_revocations - v_revocations_nonproduction,
    0
  );

  select coalesce(jsonb_object_agg(product_slug, total), '{}'::jsonb)
  into v_product_views
  from (
    select product_slug, count(*)::int as total
    from public.kinecheck_public_events
    where event_name = 'product_view'
      and occurred_at >= current_date
      and occurred_at < current_date + interval '1 day'
      and product_slug is not null
    group by product_slug
  ) s;

  select coalesce(jsonb_object_agg(product_slug, total), '{}'::jsonb)
  into v_checkout_starts
  from (
    select product_slug, count(*)::int as total
    from public.kinecheck_public_events
    where event_name = 'checkout_start'
      and occurred_at >= current_date
      and occurred_at < current_date + interval '1 day'
      and product_slug is not null
    group by product_slug
  ) s;

  v_payload := jsonb_build_object(
    'active_licenses', (
      select count(*) from public.course_access where active = true
    ),
    'active_licenses_commercial', (
      select count(*)
      from public.course_access
      where active = true
        and not (
          lower(coalesce(access_source,'')) in (
            'owner','beta','manual_test','hotmart_test'
          )
          or upper(coalesce(last_event,'')) = 'OWNER_ACCESS'
          or (
            lower(coalesce(access_source,'')) = 'manual'
            and upper(coalesce(last_event,'')) = 'HOTMART_AREA_TEST'
          )
        )
    ),
    'active_licenses_nonproduction', (
      select count(*)
      from public.course_access
      where active = true
        and (
          lower(coalesce(access_source,'')) in (
            'owner','beta','manual_test','hotmart_test'
          )
          or upper(coalesce(last_event,'')) = 'OWNER_ACCESS'
          or (
            lower(coalesce(access_source,'')) = 'manual'
            and upper(coalesce(last_event,'')) = 'HOTMART_AREA_TEST'
          )
        )
    ),
    'expired_licenses', (
      select count(*)
      from public.course_access
      where active = false
        and upper(coalesce(last_event,'')) = 'ACCESS_TERM_EXPIRED'
    ),
    'expiring_30_days_total', (
      select count(*)
      from public.course_access
      where active = true
        and access_expires_at > now()
        and access_expires_at <= now() + interval '30 days'
    ),
    'expiring_30_days', (
      select count(*)
      from public.course_access
      where active = true
        and access_expires_at > now()
        and access_expires_at <= now() + interval '30 days'
        and not (
          lower(coalesce(access_source,'')) in (
            'owner','beta','manual_test','hotmart_test'
          )
          or upper(coalesce(last_event,'')) = 'OWNER_ACCESS'
          or (
            lower(coalesce(access_source,'')) = 'manual'
            and upper(coalesce(last_event,'')) = 'HOTMART_AREA_TEST'
          )
        )
    ),
    'expiring_30_days_nonproduction', (
      select count(*)
      from public.course_access
      where active = true
        and access_expires_at > now()
        and access_expires_at <= now() + interval '30 days'
        and (
          lower(coalesce(access_source,'')) in (
            'owner','beta','manual_test','hotmart_test'
          )
          or upper(coalesce(last_event,'')) = 'OWNER_ACCESS'
          or (
            lower(coalesce(access_source,'')) = 'manual'
            and upper(coalesce(last_event,'')) = 'HOTMART_AREA_TEST'
          )
        )
    ),
    -- Preserve the historical keys as totals. New explicit commercial/QA
    -- keys prevent dashboards from silently changing their prior meaning.
    'active_purchases', v_active_purchases_total,
    'commercial_active_purchases', v_active_purchases,
    'qa_active_purchases', v_active_purchases_nonproduction,
    'active_purchases_total', v_active_purchases_total,
    'active_purchases_nonproduction', v_active_purchases_nonproduction,
    'revoked_purchases', v_revoked_purchases_total,
    'commercial_revoked_purchases', v_revoked_purchases,
    'qa_revoked_purchases', v_revoked_purchases_nonproduction,
    'revoked_purchases_total', v_revoked_purchases_total,
    'revoked_purchases_nonproduction', v_revoked_purchases_nonproduction,
    'unclassified_purchases', v_unclassified_purchases,
    'legacy_purchase_metrics_scope', 'all_including_qa',
    'generated_at', now()
  ) || jsonb_build_object(
    'open_support', (
      select count(*)
      from public.kinecheck_support_requests
      where status in ('open','in_progress','waiting_user')
    ),
    'urgent_support', (
      select count(*)
      from public.kinecheck_support_requests
      where status in ('open','in_progress')
        and priority in ('urgent','high')
    ),
    'beta_new', (
      select count(*)
      from public.beta_applications
      where status = 'new'
    ),
    'beta_high_score', (
      select count(*)
      from public.beta_applications
      where status in ('new','shortlisted')
        and triage_band = 'high'
    ),
    'open_reconciliation_issues', (
      select count(*)
      from public.kinecheck_reconciliation_issues
      where status = 'open'
    ),
    'queued_outbox_total', (
      select count(*)
      from public.kinecheck_outbox
      where status in ('queued','failed')
    ),
    'queued_outbox', (
      select count(*)
      from public.kinecheck_outbox o
      where o.status in ('queued','failed')
        and not (
          lower(o.recipient) like '%@example.%'
          or exists (
            select 1
            from public.course_access ca
            where lower(ca.email)=lower(o.recipient)
              and lower(coalesce(ca.access_source,'')) in (
                'beta','manual_test','hotmart_test'
              )
          )
          or exists (
            select 1
            from public.course_access ca
            where lower(ca.email)=lower(o.recipient)
              and lower(coalesce(ca.access_source,''))='manual'
              and upper(coalesce(ca.last_event,''))='HOTMART_AREA_TEST'
          )
        )
    ),
    'queued_outbox_nonproduction', (
      select count(*)
      from public.kinecheck_outbox o
      where o.status in ('queued','failed')
        and (
          lower(o.recipient) like '%@example.%'
          or exists (
            select 1
            from public.course_access ca
            where lower(ca.email)=lower(o.recipient)
              and lower(coalesce(ca.access_source,'')) in (
                'beta','manual_test','hotmart_test'
              )
          )
          or exists (
            select 1
            from public.course_access ca
            where lower(ca.email)=lower(o.recipient)
              and lower(coalesce(ca.access_source,''))='manual'
              and upper(coalesce(ca.last_event,''))='HOTMART_AREA_TEST'
          )
        )
    ),
    'unread_notifications', (
      select count(*)
      from public.kinecheck_notifications
      where read_at is null
    ),
    'public_page_views', v_page_views,
    'product_views', v_product_view_count,
    'checkout_starts', v_checkout_count,
    'academy_opens', (
      select count(*)
      from public.kinecheck_public_events
      where event_name='academy_open'
        and occurred_at >= current_date
        and occurred_at < current_date + interval '1 day'
    ),
    'course_opens', (
      select count(*)
      from public.kinecheck_public_events
      where event_name='course_open'
        and occurred_at >= current_date
        and occurred_at < current_date + interval '1 day'
    ),
    'beta_submissions_today', (
      select count(*)
      from public.beta_applications
      where created_at >= current_date
        and created_at < current_date + interval '1 day'
    ),
    'support_submissions_today', (
      select count(*)
      from public.kinecheck_support_requests
      where created_at >= current_date
        and created_at < current_date + interval '1 day'
    ),
    'purchase_approvals_today', v_approvals_total,
    'commercial_purchase_approvals_today', v_approvals,
    'qa_purchase_approvals_today', v_approvals_nonproduction,
    'purchase_approvals_today_total', v_approvals_total,
    'purchase_approvals_today_nonproduction', v_approvals_nonproduction,
    'purchase_approvals_today_unclassified', v_approvals_unclassified,
    'revocation_events_today', v_revocations_total,
    'commercial_revocation_events_today', v_revocations,
    'qa_revocation_events_today', v_revocations_nonproduction,
    'revocation_events_today_total', v_revocations_total,
    'revocation_events_today_nonproduction', v_revocations_nonproduction,
    'revocation_events_today_unclassified', v_revocations_unclassified,
    'product_to_checkout_rate', case
      when v_product_view_count > 0
        then round(v_checkout_count::numeric / v_product_view_count, 4)
      else 0
    end,
    'checkout_conversion_estimate', case
      when v_checkout_count > 0
        then round(v_approvals::numeric / v_checkout_count, 4)
      else 0
    end,
    'checkout_abandonment_estimate', greatest(
      v_checkout_count - v_approvals,
      0
    ),
    'product_views_by_product', v_product_views,
    'checkout_starts_by_product', v_checkout_starts
  );

  insert into public.kinecheck_daily_metrics (
    metric_date,
    payload,
    updated_at
  )
  values (current_date, v_payload, now())
  on conflict (metric_date) do update
  set payload = excluded.payload,
      updated_at = now();

  return v_payload;
end;
$function$;

commit;
