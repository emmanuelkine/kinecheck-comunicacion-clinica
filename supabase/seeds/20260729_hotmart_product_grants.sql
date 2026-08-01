-- KineCheck
-- Snapshot de producción actualizado: 2026-08-01
-- Tabla: public.hotmart_product_grants
--
-- Este archivo contiene únicamente identificadores públicos de productos,
-- slugs internos de cursos y nombres descriptivos. No contiene secretos.

begin;

insert into public.hotmart_product_grants (
  product_id,
  course_slug,
  product_name
)
values
  (8150019, 'kinecheck-clinico', null),
  (8154796, 'kinecheck-estudiante', null),
  (8157431, 'kinecheck-recupera', null),
  (8192814, 'comunicacion-clinica', null),
  (8194777, 'mas-alla-del-dolor', null),
  (8195982, 'kinecheck-estudiante', 'Pack KineCheck Estudiante'),
  (8195982, 'mas-alla-del-dolor', 'Pack KineCheck Estudiante'),
  (8205453, 'traumatologia-ortopedia-clinica', null),
  (8208817, 'evidencia-aplicada', 'KineCheck Evidencia Aplicada')
on conflict (product_id, course_slug) do update
set product_name = excluded.product_name;

commit;
