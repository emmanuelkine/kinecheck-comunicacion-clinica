-- Operational metric hygiene for prelaunch monitoring.
-- Applied to production on 2026-08-14.

-- Cancel only queued/failed items that are provably non-production QA/test traffic.
update public.kinecheck_outbox o
set status = 'cancelled'
where o.status in ('queued','failed')
  and (
    lower(o.recipient) like '%@example.%'
    or exists (
      select 1 from public.course_access ca
      where lower(ca.email)=lower(o.recipient)
        and lower(coalesce(ca.access_source,'')) in ('manual_test','beta','hotmart_test')
    )
    or exists (
      select 1 from public.course_access ca
      where lower(ca.email)=lower(o.recipient)
        and lower(coalesce(ca.access_source,''))='manual'
        and upper(coalesce(ca.last_event,''))='HOTMART_AREA_TEST'
    )
  );

-- Read/archive in-app QA notifications using the same non-production classification.
update public.kinecheck_notifications n
set read_at = coalesce(n.read_at, now())
where n.read_at is null
  and (
    lower(n.email) like '%@example.%'
    or exists (
      select 1 from public.course_access ca
      where lower(ca.email)=lower(n.email)
        and lower(coalesce(ca.access_source,'')) in ('manual_test','beta','hotmart_test')
    )
    or exists (
      select 1 from public.course_access ca
      where lower(ca.email)=lower(n.email)
        and lower(coalesce(ca.access_source,''))='manual'
        and upper(coalesce(ca.last_event,''))='HOTMART_AREA_TEST'
    )
  );

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
  v_revocations integer;
begin
  select count(*)::int into v_page_views
  from public.kinecheck_public_events
  where event_name='page_view' and occurred_at >= current_date and occurred_at < current_date + interval '1 day';

  select count(*)::int into v_product_view_count
  from public.kinecheck_public_events
  where event_name='product_view' and occurred_at >= current_date and occurred_at < current_date + interval '1 day';

  select count(*)::int into v_checkout_count
  from public.kinecheck_public_events
  where event_name='checkout_start' and occurred_at >= current_date and occurred_at < current_date + interval '1 day';

  select count(distinct transaction_id)::int into v_approvals
  from public.hotmart_webhook_events
  where upper(event_name) in ('PURCHASE_APPROVED','PURCHASE_COMPLETE')
    and received_at >= current_date and received_at < current_date + interval '1 day';

  select count(distinct transaction_id)::int into v_revocations
  from public.hotmart_webhook_events
  where upper(event_name) in ('PURCHASE_REFUNDED','PURCHASE_CANCELED','CHARGEBACK')
    and received_at >= current_date and received_at < current_date + interval '1 day';

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
    'active_licenses', (select count(*) from public.course_access where active = true),
    'expired_licenses', (select count(*) from public.course_access where active = false and upper(coalesce(last_event,'')) = 'ACCESS_TERM_EXPIRED'),
    'expiring_30_days_total', (
      select count(*) from public.course_access
      where active = true and access_expires_at > now() and access_expires_at <= now() + interval '30 days'
    ),
    -- Backward-compatible alert key now means operational/commercial exposure.
    'expiring_30_days', (
      select count(*) from public.course_access
      where active = true
        and access_expires_at > now()
        and access_expires_at <= now() + interval '30 days'
        and not (
          lower(coalesce(access_source,'')) in ('owner','beta','manual_test','hotmart_test')
          or upper(coalesce(last_event,'')) = 'OWNER_ACCESS'
          or (lower(coalesce(access_source,'')) = 'manual' and upper(coalesce(last_event,'')) = 'HOTMART_AREA_TEST')
        )
    ),
    'expiring_30_days_nonproduction', (
      select count(*) from public.course_access
      where active = true
        and access_expires_at > now()
        and access_expires_at <= now() + interval '30 days'
        and (
          lower(coalesce(access_source,'')) in ('owner','beta','manual_test','hotmart_test')
          or upper(coalesce(last_event,'')) = 'OWNER_ACCESS'
          or (lower(coalesce(access_source,'')) = 'manual' and upper(coalesce(last_event,'')) = 'HOTMART_AREA_TEST')
        )
    ),
    'active_purchases', (select count(*) from public.hotmart_purchases where status = 'active'),
    'revoked_purchases', (select count(*) from public.hotmart_purchases where status = 'revoked'),
    'open_support', (select count(*) from public.kinecheck_support_requests where status in ('open','in_progress','waiting_user')),
    'urgent_support', (select count(*) from public.kinecheck_support_requests where status in ('open','in_progress') and priority in ('urgent','high')),
    'beta_new', (select count(*) from public.beta_applications where status = 'new'),
    'beta_high_score', (select count(*) from public.beta_applications where status in ('new','shortlisted') and triage_band = 'high'),
    'open_reconciliation_issues', (select count(*) from public.kinecheck_reconciliation_issues where status = 'open'),
    'queued_outbox_total', (select count(*) from public.kinecheck_outbox where status in ('queued','failed')),
    -- Backward-compatible alert key now excludes provable QA/test messages.
    'queued_outbox', (
      select count(*)
      from public.kinecheck_outbox o
      where o.status in ('queued','failed')
        and not (
          lower(o.recipient) like '%@example.%'
          or exists (
            select 1 from public.course_access ca
            where lower(ca.email)=lower(o.recipient)
              and lower(coalesce(ca.access_source,'')) in ('beta','manual_test','hotmart_test')
          )
          or exists (
            select 1 from public.course_access ca
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
            select 1 from public.course_access ca
            where lower(ca.email)=lower(o.recipient)
              and lower(coalesce(ca.access_source,'')) in ('beta','manual_test','hotmart_test')
          )
          or exists (
            select 1 from public.course_access ca
            where lower(ca.email)=lower(o.recipient)
              and lower(coalesce(ca.access_source,''))='manual'
              and upper(coalesce(ca.last_event,''))='HOTMART_AREA_TEST'
          )
        )
    ),
    'unread_notifications', (select count(*) from public.kinecheck_notifications where read_at is null),
    'public_page_views', v_page_views,
    'product_views', v_product_view_count,
    'checkout_starts', v_checkout_count,
    'academy_opens', (select count(*) from public.kinecheck_public_events where event_name='academy_open' and occurred_at >= current_date and occurred_at < current_date + interval '1 day'),
    'course_opens', (select count(*) from public.kinecheck_public_events where event_name='course_open' and occurred_at >= current_date and occurred_at < current_date + interval '1 day'),
    'beta_submissions_today', (select count(*) from public.beta_applications where created_at >= current_date and created_at < current_date + interval '1 day'),
    'support_submissions_today', (select count(*) from public.kinecheck_support_requests where created_at >= current_date and created_at < current_date + interval '1 day'),
    'purchase_approvals_today', v_approvals,
    'revocation_events_today', v_revocations,
    'product_to_checkout_rate', case when v_product_view_count > 0 then round(v_checkout_count::numeric / v_product_view_count, 4) else 0 end,
    'checkout_conversion_estimate', case when v_checkout_count > 0 then round(v_approvals::numeric / v_checkout_count, 4) else 0 end,
    'checkout_abandonment_estimate', greatest(v_checkout_count - v_approvals, 0),
    'product_views_by_product', v_product_views,
    'checkout_starts_by_product', v_checkout_starts,
    'generated_at', now()
  );

  insert into public.kinecheck_daily_metrics (metric_date, payload, updated_at)
  values (current_date, v_payload, now())
  on conflict (metric_date) do update
  set payload = excluded.payload, updated_at = now();

  return v_payload;
end;
$function$;
