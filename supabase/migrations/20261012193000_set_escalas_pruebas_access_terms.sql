-- Align the source-controlled grant snapshot with the verified production
-- configuration. This changes only future grant lookups; existing course_access
-- rows, including historical per-row terms and expirations, are untouched.

begin;

insert into public.hotmart_product_grants (
  product_id,
  course_slug,
  product_name,
  access_term_months
)
values
  (8289351, 'kinecheck-escalas', 'KineCheck Escalas Clínicas', 12),
  (8289677, 'kinecheck-pruebas-especiales', 'KineCheck Pruebas Especiales', 12)
on conflict (product_id, course_slug) do update
set
  product_name = excluded.product_name,
  access_term_months = excluded.access_term_months;

commit;
