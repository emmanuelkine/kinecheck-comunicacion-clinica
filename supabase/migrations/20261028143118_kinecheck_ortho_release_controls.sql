-- KineCheck Ortho release controls and protected authoring store.
-- This migration prepares QA and commercial configuration without enabling either.
begin;

create extension if not exists pgcrypto with schema extensions;
create schema academy_ortho;
revoke all on schema academy_ortho from public, anon, authenticated;

create table academy_ortho.release_controls (
  course_slug text primary key check (course_slug = 'kinecheck-ortho'),
  content_version text not null,
  editorial_status text not null default 'draft'
    check (editorial_status in ('draft','peer_review','pilot','approved','retired')),
  qa_access_enabled boolean not null default false,
  qa_reference text,
  learner_access_enabled boolean not null default false,
  summative_assessment_enabled boolean not null default false,
  commercial_enabled boolean not null default false,
  otec_issuance_enabled boolean not null default false,
  otec_agreement_reference text,
  otec_authorization_reference text,
  otec_authorized_at timestamptz,
  activated_at timestamptz,
  updated_at timestamptz not null default now(),
  check (not qa_access_enabled or length(trim(coalesce(qa_reference,''))) > 0),
  check (not summative_assessment_enabled or learner_access_enabled),
  check (not commercial_enabled or learner_access_enabled),
  check (not otec_issuance_enabled or (
    length(trim(coalesce(otec_agreement_reference,''))) > 0
    and length(trim(coalesce(otec_authorization_reference,''))) > 0
    and otec_authorized_at is not null
  ))
);

create table academy_ortho.editorial_reviews (
  id uuid primary key default gen_random_uuid(),
  course_slug text not null references academy_ortho.release_controls(course_slug),
  content_version text not null,
  domain text not null check (domain in ('clinical','scientific','pedagogical','accessibility')),
  status text not null default 'pending' check (status in ('pending','changes_requested','approved','superseded')),
  reviewer_reference text,
  evidence_reference text,
  findings jsonb not null default '[]'::jsonb check (jsonb_typeof(findings) = 'array'),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(course_slug,content_version,domain),
  check (status <> 'approved' or (
    length(trim(coalesce(reviewer_reference,''))) > 0
    and length(trim(coalesce(evidence_reference,''))) > 0
    and reviewed_at is not null
  ))
);

create table academy_ortho.pilot_runs (
  id uuid primary key default gen_random_uuid(),
  course_slug text not null references academy_ortho.release_controls(course_slug),
  content_version text not null,
  protocol_reference text not null,
  cohort_reference text,
  participant_count integer check (participant_count is null or participant_count >= 5),
  duration_summary jsonb,
  assessment_summary jsonb,
  accessibility_summary jsonb,
  status text not null default 'planned' check (status in ('planned','running','changes_required','accepted','cancelled')),
  accepted_by_reference text,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'accepted' or (
    participant_count is not null
    and jsonb_typeof(duration_summary) = 'object'
    and jsonb_typeof(assessment_summary) = 'object'
    and jsonb_typeof(accessibility_summary) = 'object'
    and length(trim(coalesce(accepted_by_reference,''))) > 0
    and accepted_at is not null
  ))
);

create table academy_ortho.content_assets (
  id uuid primary key default gen_random_uuid(),
  course_slug text not null references academy_ortho.release_controls(course_slug),
  content_version text not null,
  asset_slug text not null,
  asset_kind text not null check (asset_kind in ('course_data','renderer')),
  display_order smallint not null check (display_order between 1 and 10),
  source text not null check (length(source) > 100 and source !~* '^\s*<(?:!doctype|html)'),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  uploaded_at timestamptz not null default now(),
  source_reference text not null,
  unique(course_slug,content_version,asset_slug),
  unique(course_slug,content_version,display_order)
);

create table academy_ortho.specializations (
  route_slug text primary key,
  title text not null,
  module_ids text[] not null check (cardinality(module_ids) >= 4),
  prerequisite text not null,
  competencies jsonb not null check (jsonb_typeof(competencies) = 'array' and jsonb_array_length(competencies) >= 3),
  assessment_specification jsonb not null check (jsonb_typeof(assessment_specification) = 'object'),
  content_status text not null default 'draft' check (content_status in ('draft','review','approved','retired')),
  assessment_status text not null default 'draft' check (assessment_status in ('draft','review','validated','retired')),
  unique(title)
);

create table academy_ortho.commercial_offers (
  offer_slug text primary key,
  route_slug text references academy_ortho.specializations(route_slug),
  title text not null,
  hotmart_product_id bigint unique,
  license_term_months integer check (license_term_months between 1 and 120),
  price_amount numeric(12,2) check (price_amount >= 0),
  price_currency text check (price_currency is null or price_currency = 'CLP'),
  terms_reference text,
  validation_reference text,
  status text not null default 'unconfigured' check (status in ('unconfigured','validation','approved','active','retired')),
  check (status not in ('approved','active') or (
    hotmart_product_id is not null
    and license_term_months is not null
    and price_amount is not null
    and price_currency = 'CLP'
    and length(trim(coalesce(terms_reference,''))) > 0
    and length(trim(coalesce(validation_reference,''))) > 0
  ))
);

create table academy_ortho.audit (
  id bigint generated always as identity primary key,
  action text not null,
  object_reference text,
  actor_reference text not null,
  detail jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

insert into academy_ortho.release_controls(course_slug,content_version)
values ('kinecheck-ortho','2026.10-authoring-2');

insert into academy_ortho.editorial_reviews(course_slug,content_version,domain)
select 'kinecheck-ortho','2026.10-authoring-2',domain
from unnest(array['clinical','scientific','pedagogical','accessibility']) domain;

insert into academy_ortho.specializations(route_slug,title,module_ids,prerequisite,competencies,assessment_specification) values
('shoulder','Rehabilitación avanzada del hombro',array['m01','m02','m03','m04','m05'],'Formación profesional o estudiante avanzado con bases de anatomía y evaluación MSK.',
 '["Formula hipótesis seguras de hombro","Selecciona medidas relevantes y repetibles","Dosifica y progresa ejercicio según respuesta"]',
 '{"case":"shoulder-longitudinal","weight":70,"oral_or_written_justification":true,"safety_gate":true,"formative_weight":30}'),
('upper-limb','Rehabilitación de codo, muñeca y mano',array['m01','m02','m03','m04','m06'],'Formación profesional o estudiante avanzado con bases de anatomía y evaluación MSK.',
 '["Diferencia fuentes locales, neurales y referidas","Mide movilidad, fuerza y función","Progresa carga respetando estabilidad y demanda"]',
 '{"case":"upper-limb-longitudinal","weight":70,"oral_or_written_justification":true,"safety_gate":true,"formative_weight":30}'),
('hip','Rehabilitación de cadera',array['m01','m02','m03','m04','m07'],'Formación profesional o estudiante avanzado con bases de anatomía y evaluación MSK.',
 '["Diferencia patrones de cadera y pelvis","Interpreta imagen sin sobreatribución","Ajusta carga y tareas a objetivos"]',
 '{"case":"hip-longitudinal","weight":70,"oral_or_written_justification":true,"safety_gate":true,"formative_weight":30}'),
('knee','Rehabilitación de rodilla',array['m01','m02','m03','m04','m08'],'Formación profesional o estudiante avanzado con bases de anatomía y evaluación MSK.',
 '["Prioriza déficits modificables de rodilla","Progresa fuerza y tareas por criterios","Justifica retorno deportivo multidimensional"]',
 '{"case":"knee-longitudinal","weight":70,"oral_or_written_justification":true,"safety_gate":true,"formative_weight":30}'),
('ankle-foot','Rehabilitación de tobillo y pie',array['m01','m02','m03','m04','m09'],'Formación profesional o estudiante avanzado con bases de anatomía y evaluación MSK.',
 '["Diferencia lesión aguda, inestabilidad y sobrecarga","Integra fuerza, equilibrio y exposición","Justifica retorno según demanda"]',
 '{"case":"ankle-foot-longitudinal","weight":70,"oral_or_written_justification":true,"safety_gate":true,"formative_weight":30}'),
('post-op','Rehabilitación posoperatoria',array['m01','m02','m03','m04','m11'],'Acceso a indicación quirúrgica verificable y competencias de evaluación MSK.',
 '["Extrae restricciones específicas del procedimiento","Detecta complicaciones y coordina derivación","Progresa por objetivos sin universalizar plazos"]',
 '{"case":"post-op-longitudinal","weight":70,"oral_or_written_justification":true,"safety_gate":true,"formative_weight":30}'),
('clinical-reasoning','Evaluación y razonamiento clínico musculoesquelético',array['m01','m02','m03','m12'],'Formación profesional o estudiante avanzado con bases de semiología y seguridad.',
 '["Actualiza hipótesis con datos útiles","Interpreta propiedades de medición y pruebas","Explicita incertidumbre y umbrales de derivación"]',
 '{"case":"reasoning-longitudinal","weight":70,"oral_or_written_justification":true,"safety_gate":true,"formative_weight":30}'),
('exercise','Prescripción avanzada del ejercicio',array['m01','m03','m04','m12'],'Formación profesional o estudiante avanzado con bases de fisiología del ejercicio.',
 '["Define FITT-VP ligado a objetivos","Autorregula carga con respuesta y esfuerzo","Adapta ejercicio ante comorbilidad y barreras"]',
 '{"case":"exercise-longitudinal","weight":70,"oral_or_written_justification":true,"safety_gate":true,"formative_weight":30}');

insert into academy_ortho.commercial_offers(offer_slug,route_slug,title) values
('kinecheck-ortho',null,'KineCheck Ortho · programa integral'),
('kinecheck-ortho-shoulder','shoulder','Rehabilitación avanzada del hombro'),
('kinecheck-ortho-upper-limb','upper-limb','Rehabilitación de codo, muñeca y mano'),
('kinecheck-ortho-hip','hip','Rehabilitación de cadera'),
('kinecheck-ortho-knee','knee','Rehabilitación de rodilla'),
('kinecheck-ortho-ankle-foot','ankle-foot','Rehabilitación de tobillo y pie'),
('kinecheck-ortho-post-op','post-op','Rehabilitación posoperatoria'),
('kinecheck-ortho-clinical-reasoning','clinical-reasoning','Evaluación y razonamiento clínico musculoesquelético'),
('kinecheck-ortho-exercise','exercise','Prescripción avanzada del ejercicio');

create function academy_ortho.verify_asset_digest() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.sha256 <> encode(extensions.digest(convert_to(new.source,'UTF8'),'sha256'),'hex') then
    raise exception 'Asset SHA-256 does not match source';
  end if;
  return new;
end $$;
create trigger ortho_asset_digest before insert or update on academy_ortho.content_assets
for each row execute function academy_ortho.verify_asset_digest();

create function academy_ortho.guard_release() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare approved_domains integer; accepted_pilots integer; configured_offers integer;
begin
  if new.learner_access_enabled or new.summative_assessment_enabled or new.commercial_enabled then
    select count(*) into approved_domains from academy_ortho.editorial_reviews r
    where r.course_slug=new.course_slug and r.content_version=new.content_version and r.status='approved';
    select count(*) into accepted_pilots from academy_ortho.pilot_runs p
    where p.course_slug=new.course_slug and p.content_version=new.content_version and p.status='accepted';
    if new.editorial_status <> 'approved' or approved_domains <> 4 or accepted_pilots < 1 then
      raise exception 'Human reviews and an accepted pilot are required before learner release';
    end if;
    if (select count(*) from academy_ortho.content_assets a where a.course_slug=new.course_slug and a.content_version=new.content_version) <> 2 then
      raise exception 'Exactly two protected assets are required';
    end if;
  end if;
  if new.commercial_enabled then
    select count(*) into configured_offers from academy_ortho.commercial_offers where status='active';
    if configured_offers < 1 then raise exception 'An independently validated commercial offer is required'; end if;
  end if;
  new.updated_at := now();
  if new.learner_access_enabled and old.learner_access_enabled is false then new.activated_at := now(); end if;
  return new;
end $$;
create trigger ortho_release_guard before update on academy_ortho.release_controls
for each row execute function academy_ortho.guard_release();

create function academy_ortho.immutable_audit() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin raise exception 'KineCheck Ortho audit is append-only'; end $$;
create trigger ortho_audit_immutable before update or delete on academy_ortho.audit
for each row execute function academy_ortho.immutable_audit();

-- Service-role-only payload retrieval. The Edge Function chooses the environment;
-- the browser never calls this function and never receives future assessment keys.
create function public.kinecheck_ortho_protected_assets(requested_environment text)
returns table(asset_slug text, source text, sha256 text, content_version text)
language plpgsql stable security definer set search_path = '' as $$
declare control academy_ortho.release_controls;
begin
  if requested_environment not in ('staging','production') then raise exception 'Invalid environment'; end if;
  select * into strict control from academy_ortho.release_controls where course_slug='kinecheck-ortho';
  if requested_environment='staging' and not control.qa_access_enabled then raise exception 'Ortho QA access is disabled'; end if;
  if requested_environment='production' and not control.learner_access_enabled then raise exception 'Ortho learner access is disabled'; end if;
  return query select a.asset_slug,a.source,a.sha256,a.content_version
  from academy_ortho.content_assets a
  where a.course_slug=control.course_slug and a.content_version=control.content_version
  order by a.display_order;
end $$;

do $$ declare table_name text; begin
  for table_name in select tablename from pg_tables where schemaname='academy_ortho' loop
    execute format('alter table academy_ortho.%I enable row level security',table_name);
  end loop;
end $$;
revoke all on all tables in schema academy_ortho from public, anon, authenticated;
revoke all on all sequences in schema academy_ortho from public, anon, authenticated;
revoke execute on all functions in schema academy_ortho from public, anon, authenticated;
revoke all on function public.kinecheck_ortho_protected_assets(text) from public, anon, authenticated;
grant execute on function public.kinecheck_ortho_protected_assets(text) to service_role;

comment on schema academy_ortho is 'Private KineCheck Ortho authoring, review, pilot and release records.';
comment on function public.kinecheck_ortho_protected_assets(text) is 'Service-role-only protected asset retrieval; release controls remain disabled by default.';
commit;
