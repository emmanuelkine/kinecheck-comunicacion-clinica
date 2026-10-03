-- Consent-based engagement metrics for the public free-resource library.
alter table public.kinecheck_public_events
  drop constraint if exists kinecheck_public_events_event_name_check;

alter table public.kinecheck_public_events
  add constraint kinecheck_public_events_event_name_check
  check (event_name = any (array[
    'page_view'::text,
    'product_view'::text,
    'checkout_start'::text,
    'buy_click'::text,
    'hotmart_outbound'::text,
    'access_error'::text,
    'academy_open'::text,
    'beta_view'::text,
    'beta_submit_success'::text,
    'support_view'::text,
    'support_submit_success'::text,
    'platform_login_view'::text,
    'platform_login_success'::text,
    'course_open'::text,
    'academy_opened'::text,
    'product_opened'::text,
    'first_activity'::text,
    'return_session'::text,
    'free_resource_open'::text,
    'ebook_download'::text
  ]));

create schema if not exists private;

create or replace view private.kinecheck_free_resource_daily
with (security_invoker = true)
as
select
  (occurred_at at time zone 'America/Santiago')::date as metric_date,
  event_name,
  coalesce(metadata ->> 'resource', 'unknown') as resource,
  coalesce(metadata ->> 'format', 'web') as format,
  coalesce(device_class, 'unknown') as device_class,
  count(*)::bigint as total_events,
  count(distinct session_id)::bigint as approximate_unique_sessions
from public.kinecheck_public_events
where event_name in ('free_resource_open', 'ebook_download')
  and is_qa = false
group by 1, 2, 3, 4, 5;

comment on view private.kinecheck_free_resource_daily is
  'Consent-based daily aggregate of free-library opens and eBook download intents; excludes QA events.';

revoke all on private.kinecheck_free_resource_daily from public, anon, authenticated;
