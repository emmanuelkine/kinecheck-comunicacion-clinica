begin;

insert into public.hotmart_product_grants (
  product_id,
  course_slug,
  product_name
)
values (
  8208817,
  'evidencia-aplicada',
  'KineCheck Evidencia Aplicada'
)
on conflict (product_id, course_slug) do update
set product_name = excluded.product_name;

commit;
