-- Source-of-truth for the critical automation functions currently deployed.
-- Definitions and privileges are intentionally preserved without behavioral
-- changes; access-consistency hardening lives in the preceding migration.

begin;

create or replace function public.kinecheck_cleanup_automation_data()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_login integer := 0;
  v_notifications integer := 0;
  v_runs integer := 0;
  v_issues integer := 0;
  v_beta integer := 0;
  v_support integer := 0;
  v_public_events integer := 0;
begin
  delete from public.platform_login_limits
  where updated_at < now() - interval '30 days';
  get diagnostics v_login = row_count;

  delete from public.kinecheck_notifications
  where read_at is not null
    and read_at < now() - interval '180 days';
  get diagnostics v_notifications = row_count;

  delete from public.kinecheck_automation_runs
  where started_at < now() - interval '365 days';
  get diagnostics v_runs = row_count;

  delete from public.kinecheck_reconciliation_issues
  where status in ('resolved','ignored')
    and coalesce(resolved_at, last_seen_at) < now() - interval '180 days';
  get diagnostics v_issues = row_count;

  delete from public.beta_applications
  where status in ('declined','completed')
    and updated_at < now() - interval '365 days';
  get diagnostics v_beta = row_count;

  delete from public.kinecheck_support_requests
  where (status = 'spam' and updated_at < now() - interval '30 days')
     or (
       status in ('resolved','closed')
       and updated_at < now() - interval '730 days'
     );
  get diagnostics v_support = row_count;

  delete from public.kinecheck_public_events
  where occurred_at < now() - interval '400 days';
  get diagnostics v_public_events = row_count;

  delete from public.kinecheck_daily_metrics
  where metric_date < current_date - 730;

  return jsonb_build_object(
    'login_limits', v_login,
    'notifications', v_notifications,
    'automation_runs', v_runs,
    'reconciliation_issues', v_issues,
    'beta_applications', v_beta,
    'support_requests', v_support,
    'public_events', v_public_events
  );
end;
$function$;

create or replace function public.kinecheck_generate_expiry_notifications()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_count integer := 0;
  v_rows integer := 0;
  v_days integer;
  v_rec record;
  v_key text;
  v_title text;
  v_body text;
begin
  for v_days in select unnest(array[30, 7, 1])
  loop
    for v_rec in
      select lower(email) as email, course_slug, access_expires_at
      from public.course_access
      where active = true
        and access_expires_at is not null
        and lower(coalesce(access_source, '')) <> 'owner'
        and upper(coalesce(last_event, '')) <> 'OWNER_ACCESS'
        and access_expires_at >
          now() + make_interval(days => v_days) - interval '12 hours'
        and access_expires_at <=
          now() + make_interval(days => v_days) + interval '12 hours'
    loop
      v_key := 'expiry-' || v_days::text || ':' || v_rec.email || ':'
        || v_rec.course_slug || ':' || v_rec.access_expires_at::text;
      v_title := case
        when v_days = 1 then 'Tu acceso vence mañana'
        else 'Tu acceso vence en ' || v_days::text || ' días'
      end;
      v_body := 'La licencia de ' || v_rec.course_slug || ' finaliza el '
        || to_char(
          v_rec.access_expires_at at time zone 'America/Santiago',
          'DD-MM-YYYY'
        ) || '.';

      insert into public.kinecheck_notifications (
        email,
        notification_type,
        title,
        body,
        course_slug,
        action_url,
        action_label,
        dedupe_key,
        metadata
      ) values (
        v_rec.email,
        'license_expiry_warning',
        v_title,
        v_body,
        v_rec.course_slug,
        '/platform/#settings',
        'Revisar licencia',
        v_key,
        jsonb_build_object(
          'days_remaining', v_days,
          'expires_at', v_rec.access_expires_at
        )
      ) on conflict (dedupe_key) do nothing;
      get diagnostics v_rows = row_count;
      v_count := v_count + v_rows;

      insert into public.kinecheck_outbox (
        channel,
        recipient,
        template_key,
        payload,
        dedupe_key
      ) values (
        'email',
        v_rec.email,
        'license_expiry_warning',
        jsonb_build_object(
          'title', v_title,
          'body', v_body,
          'course_slug', v_rec.course_slug,
          'expires_at', v_rec.access_expires_at,
          'action_url', 'https://kinecheck.cl/platform/#settings'
        ),
        'email:' || v_key
      ) on conflict (dedupe_key) do nothing;
    end loop;
  end loop;

  return v_count;
end;
$function$;

create or replace function public.kinecheck_reconcile_hotmart_access()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_started timestamptz := clock_timestamp();
  v_rec record;
  v_access record;
  v_created integer := 0;
  v_repaired integer := 0;
  v_revoked integer := 0;
  v_issues integer := 0;
  v_rows integer := 0;
  v_email_hash text;
begin
  insert into public.kinecheck_reconciliation_issues (
    issue_key,
    issue_type,
    severity,
    product_id,
    transaction_id,
    details,
    last_seen_at
  )
  select
    'unmapped-product:' || hp.product_id::text,
    'unmapped_product',
    'critical',
    hp.product_id,
    hp.transaction_id,
    jsonb_build_object('event_name', hp.event_name, 'status', hp.status),
    v_started
  from public.hotmart_purchases hp
  where not exists (
    select 1
    from public.hotmart_product_grants g
    where g.product_id = hp.product_id
  )
  on conflict (issue_key) do update
  set status = 'open',
      last_seen_at = excluded.last_seen_at,
      details = excluded.details,
      resolved_at = null;
  get diagnostics v_rows = row_count;
  v_issues := v_issues + v_rows;

  for v_rec in
    select distinct on (lower(hp.buyer_email), g.course_slug)
      lower(trim(hp.buyer_email)) as email,
      hp.transaction_id,
      hp.product_id,
      hp.event_name,
      hp.purchased_at,
      hp.last_event_at,
      g.course_slug
    from public.hotmart_purchases hp
    join public.hotmart_product_grants g on g.product_id = hp.product_id
    where hp.status = 'active'
      and trim(coalesce(hp.buyer_email, '')) <> ''
    order by
      lower(hp.buyer_email),
      g.course_slug,
      hp.last_event_at desc,
      hp.transaction_id desc
  loop
    select ca.* into v_access
    from public.course_access ca
    where lower(ca.email) = v_rec.email
      and ca.course_slug = v_rec.course_slug
    order by ca.updated_at desc nulls last
    limit 1;

    if not found then
      insert into public.course_access (
        email,
        course_slug,
        active,
        hotmart_product_id,
        transaction_id,
        last_event,
        updated_at,
        purchase_date,
        access_source,
        last_event_at
      ) values (
        v_rec.email,
        v_rec.course_slug,
        true,
        v_rec.product_id::text,
        v_rec.transaction_id,
        v_rec.event_name,
        now(),
        coalesce(v_rec.purchased_at, v_rec.last_event_at),
        'hotmart',
        v_rec.last_event_at
      );
      v_created := v_created + 1;
    elsif lower(coalesce(v_access.access_source, '')) <> 'owner'
      and upper(coalesce(v_access.last_event, '')) <> 'OWNER_ACCESS'
      and coalesce(
        v_access.last_event_at,
        '-infinity'::timestamptz
      ) <= v_rec.last_event_at
      and (
        v_access.active is distinct from true
        or v_access.transaction_id is distinct from v_rec.transaction_id
        or v_access.hotmart_product_id is distinct from v_rec.product_id::text
      )
    then
      update public.course_access
      set active = true,
          hotmart_product_id = v_rec.product_id::text,
          transaction_id = v_rec.transaction_id,
          last_event = v_rec.event_name,
          purchase_date = coalesce(
            purchase_date,
            v_rec.purchased_at,
            v_rec.last_event_at
          ),
          access_source = 'hotmart',
          last_event_at = v_rec.last_event_at,
          updated_at = now()
      where lower(email) = v_rec.email
        and course_slug = v_rec.course_slug
        and lower(coalesce(access_source, '')) <> 'owner'
        and upper(coalesce(last_event, '')) <> 'OWNER_ACCESS';
      get diagnostics v_rows = row_count;
      v_repaired := v_repaired + v_rows;
    end if;
  end loop;

  for v_rec in
    select
      lower(trim(hp.buyer_email)) as email,
      hp.transaction_id,
      hp.product_id,
      hp.event_name,
      hp.last_event_at,
      g.course_slug
    from public.hotmart_purchases hp
    join public.hotmart_product_grants g on g.product_id = hp.product_id
    where hp.status = 'revoked'
      and trim(coalesce(hp.buyer_email, '')) <> ''
  loop
    update public.course_access
    set active = false,
        last_event = v_rec.event_name,
        last_event_at = v_rec.last_event_at,
        updated_at = now()
    where lower(email) = v_rec.email
      and course_slug = v_rec.course_slug
      and transaction_id = v_rec.transaction_id
      and lower(coalesce(access_source, '')) <> 'owner'
      and upper(coalesce(last_event, '')) <> 'OWNER_ACCESS'
      and coalesce(last_event_at, '-infinity'::timestamptz)
        <= v_rec.last_event_at
      and active = true;
    get diagnostics v_rows = row_count;
    v_revoked := v_revoked + v_rows;
  end loop;

  for v_rec in
    select
      ca.email,
      ca.course_slug,
      ca.transaction_id,
      ca.hotmart_product_id
    from public.course_access ca
    where ca.active = true
      and lower(coalesce(ca.access_source, '')) in ('hotmart','hotmart_test')
      and not exists (
        select 1
        from public.hotmart_purchases hp
        where hp.transaction_id = ca.transaction_id
          and hp.product_id::text = ca.hotmart_product_id::text
      )
  loop
    v_email_hash := encode(
      extensions.digest(convert_to(lower(v_rec.email), 'UTF8'), 'sha256'),
      'hex'
    );
    insert into public.kinecheck_reconciliation_issues (
      issue_key,
      issue_type,
      severity,
      email_hash,
      course_slug,
      transaction_id,
      details,
      last_seen_at
    ) values (
      'orphan-access:' || v_email_hash || ':' || v_rec.course_slug,
      'orphan_active_access',
      'high',
      v_email_hash,
      v_rec.course_slug,
      v_rec.transaction_id,
      jsonb_build_object('product_id', v_rec.hotmart_product_id),
      v_started
    ) on conflict (issue_key) do update
      set status = 'open',
          last_seen_at = excluded.last_seen_at,
          details = excluded.details,
          resolved_at = null;
    v_issues := v_issues + 1;
  end loop;

  update public.kinecheck_reconciliation_issues
  set status = 'resolved', resolved_at = now()
  where status = 'open'
    and issue_type in ('unmapped_product','orphan_active_access')
    and last_seen_at < v_started;

  return jsonb_build_object(
    'created', v_created,
    'repaired', v_repaired,
    'revoked', v_revoked,
    'issues_seen', v_issues
  );
end;
$function$;

create or replace function public.kinecheck_triage_beta()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_count integer := 0;
begin
  update public.beta_applications
  set triage_score =
        (case
          when device = 'both' then 2
          when device in ('mobile','desktop') then 1
          else 0
        end)
      + (case
          when char_length(trim(experience)) >= 120 then 2
          when char_length(trim(experience)) >= 40 then 1
          else 0
        end)
      + (case when char_length(trim(availability)) >= 30 then 1 else 0 end)
      + (case when consent_contact then 1 else 0 end),
      triage_band = case
        when (
          (case
            when device = 'both' then 2
            when device in ('mobile','desktop') then 1
            else 0
          end)
          + (case
              when char_length(trim(experience)) >= 120 then 2
              when char_length(trim(experience)) >= 40 then 1
              else 0
            end)
          + (case
              when char_length(trim(availability)) >= 30 then 1
              else 0
            end)
          + (case when consent_contact then 1 else 0 end)
        ) >= 5 then 'high'
        when (
          (case
            when device = 'both' then 2
            when device in ('mobile','desktop') then 1
            else 0
          end)
          + (case
              when char_length(trim(experience)) >= 120 then 2
              when char_length(trim(experience)) >= 40 then 1
              else 0
            end)
          + (case
              when char_length(trim(availability)) >= 30 then 1
              else 0
            end)
          + (case when consent_contact then 1 else 0 end)
        ) >= 3 then 'medium'
        else 'low'
      end,
      triage_reasons = jsonb_build_array(
        case
          when device = 'both' then 'puede probar móvil y computador'
          else 'dispone de un dispositivo principal'
        end,
        case
          when char_length(trim(experience)) >= 120
            then 'experiencia descrita con detalle'
          else 'experiencia breve'
        end,
        case
          when char_length(trim(availability)) >= 30
            then 'disponibilidad informada'
          else 'disponibilidad limitada'
        end,
        case
          when consent_contact then 'autoriza contacto beta'
          else 'sin consentimiento de contacto adicional'
        end
      ),
      triaged_at = now(),
      updated_at = now()
  where status in ('new','shortlisted')
    and (triaged_at is null or updated_at > triaged_at);

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

create or replace function public.run_kinecheck_daily_automation()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_run_id bigint;
  v_expired integer;
  v_reconcile jsonb;
  v_notifications integer;
  v_beta integer;
  v_cleanup jsonb;
  v_metrics jsonb;
  v_result jsonb;
begin
  insert into public.kinecheck_automation_runs (job_name, source)
  values ('daily_operations', 'pg_cron')
  returning id into v_run_id;

  begin
    v_expired := public.deactivate_expired_course_access();
    v_reconcile := public.kinecheck_reconcile_hotmart_access();
    v_notifications := public.kinecheck_generate_expiry_notifications();
    v_beta := public.kinecheck_triage_beta();
    v_cleanup := public.kinecheck_cleanup_automation_data();
    v_metrics := public.kinecheck_rollup_daily_metrics();

    v_result := jsonb_build_object(
      'expired_deactivated', v_expired,
      'reconciliation', v_reconcile,
      'notifications_created', v_notifications,
      'beta_triaged', v_beta,
      'cleanup', v_cleanup,
      'metrics', v_metrics
    );

    update public.kinecheck_automation_runs
    set finished_at = now(),
        status = 'passed',
        metrics = v_result
    where id = v_run_id;

    return v_result;
  exception when others then
    update public.kinecheck_automation_runs
    set finished_at = now(),
        status = 'failed',
        error_message = sqlerrm
    where id = v_run_id;
    raise;
  end;
end;
$function$;

revoke all on function public.kinecheck_cleanup_automation_data()
from public, anon, authenticated;
revoke all on function public.kinecheck_generate_expiry_notifications()
from public, anon, authenticated;
revoke all on function public.kinecheck_reconcile_hotmart_access()
from public, anon, authenticated;
revoke all on function public.kinecheck_triage_beta()
from public, anon, authenticated;
revoke all on function public.run_kinecheck_daily_automation()
from public, anon, authenticated;

grant execute on function public.kinecheck_cleanup_automation_data()
to service_role;
grant execute on function public.kinecheck_generate_expiry_notifications()
to service_role;
grant execute on function public.kinecheck_reconcile_hotmart_access()
to service_role;
grant execute on function public.kinecheck_triage_beta()
to service_role;
grant execute on function public.run_kinecheck_daily_automation()
to service_role;

commit;
