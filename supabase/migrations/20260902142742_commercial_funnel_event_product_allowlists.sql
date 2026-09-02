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
    'return_session'::text
  ]));

alter table public.kinecheck_public_events
  drop constraint if exists kinecheck_public_events_product_slug_check;

alter table public.kinecheck_public_events
  add constraint kinecheck_public_events_product_slug_check
  check (product_slug is null or product_slug = any (array[
    'banderas-clinicas'::text,
    'comunicacion-clinica'::text,
    'dolor-lumbar-persistente'::text,
    'dolor-musculoesqueletico'::text,
    'evidencia-aplicada'::text,
    'kinecheck-clinico'::text,
    'kinecheck-estudiante'::text,
    'kinecheck-recupera'::text,
    'mas-alla-del-dolor'::text,
    'pack-estudiante'::text,
    'pack-kinecheck-estudiante'::text,
    'traumatologia-ortopedia-clinica'::text
  ]));
