begin;

insert into public.course_access (
  email,
  course_slug,
  active,
  hotmart_product_id,
  transaction_id,
  last_event,
  updated_at,
  purchase_date,
  warranty_date,
  product_ucode,
  access_source,
  last_event_at
)
select
  owner_email,
  course_slug,
  true,
  null,
  null,
  'OWNER_ACCESS',
  now(),
  now(),
  null,
  null,
  'owner',
  now()
from unnest(array[
  'emmanuelkine@gmail.com',
  'emmanuelkine+owner@gmail.com',
  'emmanuel_fox@hotmail.com'
]::text[]) as owners(owner_email)
cross join unnest(array[
  'kinecheck-clinico',
  'kinecheck-estudiante',
  'kinecheck-recupera',
  'comunicacion-clinica',
  'mas-alla-del-dolor',
  'evidencia-aplicada',
  'traumatologia-ortopedia-clinica'
]::text[]) as products(course_slug)
on conflict (email, course_slug) do update
set
  active = true,
  last_event = 'OWNER_ACCESS',
  updated_at = now(),
  access_source = 'owner',
  last_event_at = now();

commit;
