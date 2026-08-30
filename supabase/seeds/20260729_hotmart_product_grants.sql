-- KineCheck
-- Snapshot técnico de producción actualizado: 2026-08-30
-- Tabla: public.hotmart_product_grants
--
-- Este archivo contiene únicamente identificadores públicos de productos,
-- slugs internos, nombres descriptivos y vigencias comerciales.
-- No contiene secretos.

begin;

alter table public.hotmart_product_grants
  add column if not exists access_term_months smallint;

insert into public.hotmart_product_grants (
  product_id,
  course_slug,
  product_name,
  access_term_months
)
values
  (8150019, 'kinecheck-clinico', null, 12),
  (8150019, 'kinecheck-clinico-curso', 'KineCheck Clínico: curso profesional y guía complementaria', 12),
  (8154796, 'kinecheck-estudiante', null, 12),
  (8157431, 'kinecheck-recupera', null, 3),
  (8192814, 'comunicacion-clinica', null, 12),
  (8194777, 'mas-alla-del-dolor', null, 12),
  (8195982, 'kinecheck-estudiante', 'Pack KineCheck Estudiante', 12),
  (8195982, 'mas-alla-del-dolor', 'Pack KineCheck Estudiante', 12),
  (8205453, 'traumatologia-ortopedia-clinica', null, 12),
  (8208817, 'evidencia-aplicada', 'KineCheck Evidencia Aplicada', 12),
  -- Vigencia pendiente de evidencia directa del panel Hotmart. No inventar.
  (8289351, 'kinecheck-escalas', 'KineCheck Escalas Clínicas', null),
  (8289677, 'kinecheck-pruebas-especiales', 'KineCheck Pruebas Especiales', null),
  (8330940, 'dolor-lumbar-persistente', 'KineCheck · Dolor Lumbar Persistente', 12),
  (8340185, 'dolor-musculoesqueletico', 'Dolor Musculoesquelético: del mecanismo a la decisión clínica', 12)
on conflict (product_id, course_slug) do update
set
  product_name = excluded.product_name,
  access_term_months = excluded.access_term_months;

commit;
