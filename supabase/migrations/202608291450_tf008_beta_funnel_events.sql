-- TF-008: eventos mínimos del embudo beta y reporte agregado.
-- No almacena nombres, correos, RUT, teléfonos, texto clínico ni contenido de casos en eventos.

alter table public.kinecheck_public_events
  drop constraint if exists kinecheck_public_events_event_name_check;

alter table public.kinecheck_public_events
  add constraint kinecheck_public_events_event_name_check
  check (event_name = any (array[
    'page_view'::text,
    'product_view'::text,
    'checkout_start'::text,
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
    'return_session'::text
  ]));

create or replace function public.kinecheck_beta_funnel_report()
returns table (
  invited bigint,
  account_created bigint,
  license_activated bigint,
  academy_opened bigint,
  product_opened bigint,
  first_activity bigint,
  return_session bigint
)
language sql
security definer
set search_path = public, auth
as $$
  with cohort as (
    select distinct lower(ca.email) as email
    from public.course_access ca
    where ca.access_source = 'beta'
  ),
  cohort_users as (
    select c.email, u.id as user_id
    from cohort c
    left join auth.users u on lower(u.email) = c.email
  ),
  stages as (
    select
      cu.email,
      cu.user_id,
      exists (
        select 1 from public.course_access ca
        where lower(ca.email) = cu.email
          and ca.access_source = 'beta'
          and ca.active = true
      ) as has_license,
      exists (
        select 1 from public.kinecheck_public_events e
        where e.user_id = cu.user_id and e.is_qa = false and e.event_name = 'academy_opened'
      ) as has_academy,
      exists (
        select 1 from public.kinecheck_public_events e
        where e.user_id = cu.user_id and e.is_qa = false and e.event_name = 'product_opened'
      ) as has_product,
      exists (
        select 1 from public.kinecheck_public_events e
        where e.user_id = cu.user_id and e.is_qa = false and e.event_name = 'first_activity'
      ) as has_activity,
      exists (
        select 1 from public.kinecheck_public_events e
        where e.user_id = cu.user_id and e.is_qa = false and e.event_name = 'return_session'
      ) as has_return
    from cohort_users cu
  )
  select
    count(*)::bigint,
    count(*) filter (where user_id is not null)::bigint,
    count(*) filter (where has_license)::bigint,
    count(*) filter (where has_academy)::bigint,
    count(*) filter (where has_product)::bigint,
    count(*) filter (where has_activity)::bigint,
    count(*) filter (where has_return)::bigint
  from stages;
$$;

comment on function public.kinecheck_beta_funnel_report() is
  'TF-008: reporte agregado del embudo beta. La cohorte se define por course_access.access_source=beta; no devuelve identificadores personales.';

revoke all on function public.kinecheck_beta_funnel_report() from public, anon, authenticated;
grant execute on function public.kinecheck_beta_funnel_report() to service_role;
