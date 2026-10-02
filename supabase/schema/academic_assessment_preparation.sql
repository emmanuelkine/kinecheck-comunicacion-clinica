-- Production snapshot: academic assessment preparation, 2026-10-02.
-- Applied with Supabase execute_sql because the CLI was unavailable in the execution environment.
-- Idempotent and intentionally keeps assessment/certification activation disabled.

begin;

create table if not exists public.course_assessment_configs (
  course_slug text primary key,
  title text not null,
  content_version text not null,
  status text not null default 'prepared_not_active'
    check (status in ('draft','prepared_not_active','pilot','active','retired')),
  proposed_pass_score numeric(5,2) not null default 80 check (proposed_pass_score between 0 and 100),
  proposed_max_attempts smallint not null default 2 check (proposed_max_attempts between 1 and 10),
  objective_item_count smallint not null default 15 check (objective_item_count between 0 and 100),
  case_points smallint not null default 70 check (case_points between 0 and 100),
  safety_gate text not null,
  case_prompt text not null,
  rubric jsonb not null default '[]'::jsonb,
  activation_requirements jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.course_assessment_configs enable row level security;
revoke all on public.course_assessment_configs from anon, authenticated;
comment on table public.course_assessment_configs is
  'Protected assessment specifications. Read only through authenticated Edge Function; no answer keys are stored here.';

insert into public.platform_feature_flags (key, enabled, config, updated_at)
values (
  'academic_assessment_pilot', false,
  '{"status":"prepared_not_active","ownerPreview":true,"note":"Do not enable until item review, pilot and written OTEC approval."}'::jsonb,
  now()
)
on conflict (key) do update set enabled = false, config = excluded.config, updated_at = now();

insert into public.course_academic_change_backups (course_slug, source_kind, source_version, payload)
select course_slug, 'pre_assessment_platform_safety', content_version, to_jsonb(t)
from public.course_academic_load t
where not exists (
  select 1 from public.course_academic_change_backups b
  where b.course_slug=t.course_slug and b.source_kind='pre_assessment_platform_safety'
);

update public.course_academic_load
set certificate_ready = false,
    activity_payload = coalesce(activity_payload,'{}'::jsonb) || jsonb_build_object(
      'assessmentStatus','prepared_not_active',
      'otecPreparation',coalesce(activity_payload->'otecPreparation','{}'::jsonb) || jsonb_build_object(
        'status','preparation','senceCourse',false,'requiresSignedAgreement',true,
        'requiresWrittenProgramApproval',true,'requiresCertificateTemplateApproval',true
      )
    ),
    updated_at = now();

with shared as (
  select '[{"dimension":"Identificación del problema","maximum":14},{"dimension":"Uso de evidencia","maximum":14},{"dimension":"Decisión y justificación","maximum":14},{"dimension":"Seguridad y alcance","maximum":14},{"dimension":"Comunicación y seguimiento","maximum":14}]'::jsonb rubric,
         '["Aprobación escrita del programa por la OTEC","Banco y claves revisados contra fuentes originales","Pilotaje temporal y análisis de ítems completados","Trazabilidad server-side verificada","Convenio y plantilla de certificado formalizados"]'::jsonb activation
), rows(course_slug,title,content_version,safety_gate,case_prompt) as (
  values
  ('kinecheck-clinico-curso','KineCheck Clínico','2026.08.06-profesional-1','No retrasar derivación cuando la combinación de historia y hallazgos exige evaluación urgente; una bandera aislada no confirma diagnóstico.','Persona con dolor musculoesquelético, hallazgos funcionales, una señal de posible patología seria y factores contextuales: prioriza triage, formula hipótesis, selecciona medidas y propone manejo o derivación.'),
  ('comunicacion-clinica','Comunicación Clínica','2026.09.30-academic-load-1','No entregar falsa certeza, minimizar síntomas ni usar una imagen o etiqueta aislada como causa demostrada.','Persona preocupada por una etiqueta diagnóstica y una imagen: explora preocupaciones, comunica incertidumbre, comprueba comprensión y acuerda un plan.'),
  ('mas-alla-del-dolor','Más allá del dolor','2026-08-current','No diagnosticar dolor nociplástico por descarte ni equipararlo automáticamente con sensibilización central.','Dolor persistente con información incompleta sobre mecanismos, sueño, actividad, expectativas y función: construye una formulación provisional y un plan multimodal.'),
  ('evidencia-aplicada','KineCheck Evidencia Aplicada','2026.09.30-academic-load-1','No convertir asociación en causalidad, significación estadística en beneficio clínico ni ausencia de evidencia en evidencia de ausencia.','Pregunta clínica con un estudio o guía resumida: formula la pregunta, identifica diseño, interpreta efecto y certeza, y decide aplicabilidad.'),
  ('traumatologia-ortopedia-clinica','Traumatología y Ortopedia Clínica','2026-07-course07','No retrasar atención urgente ni indicar tratamientos farmacológicos fuera del alcance profesional.','Escenario de fractura expuesta, articulación caliente o compromiso neurológico: diferencia prioridad de derivación, medidas iniciales y acciones reservadas a equipos habilitados.'),
  ('dolor-lumbar-persistente','Dolor Lumbar Persistente','2026.09.30-academic-load-1','Síntomas compatibles con cauda equina u otra patología seria requieren coordinación urgente; una red flag aislada no confirma diagnóstico.','Dolor lumbar persistente con PROMs, factores pronósticos y cambio clínico: realiza triage, interpreta mediciones y diseña una progresión funcional.'),
  ('dolor-musculoesqueletico','Dolor Musculoesquelético','2026.09.30-academic-load-1','No convertir una prueba aislada en diagnóstico ni presentar un mecanismo hipotético como demostrado.','Cuadro musculoesquelético con hallazgos ambiguos: diferencia constructos, formula hipótesis coexistentes y escoge una intervención reevaluable.'),
  ('ejercicio-terapeutico','Ejercicio Terapéutico','edge-course-key-v21','No aplicar una dosis universal ni progresar ante inestabilidad o riesgo que requiere evaluación o derivación.','Persona con objetivo funcional, comorbilidades, respuesta previa y barreras: elabora una prescripción FITT-VP, condiciones de seguridad y regla de progresión.')
)
insert into public.course_assessment_configs (
  course_slug,title,content_version,status,proposed_pass_score,proposed_max_attempts,
  objective_item_count,case_points,safety_gate,case_prompt,rubric,activation_requirements,updated_at
)
select course_slug,title,content_version,'prepared_not_active',80,2,
       case when course_slug='traumatologia-ortopedia-clinica' then 15 else 15 end,
       case when course_slug='traumatologia-ortopedia-clinica' then 0 else 70 end,
       safety_gate,case_prompt,shared.rubric,shared.activation,now()
from rows cross join shared
on conflict (course_slug) do update set
  title=excluded.title, content_version=excluded.content_version, status='prepared_not_active',
  proposed_pass_score=excluded.proposed_pass_score, proposed_max_attempts=excluded.proposed_max_attempts,
  objective_item_count=excluded.objective_item_count, case_points=excluded.case_points,
  safety_gate=excluded.safety_gate, case_prompt=excluded.case_prompt, rubric=excluded.rubric,
  activation_requirements=excluded.activation_requirements, updated_at=now();

update public.course_completion_requirements
set auto_certificate=false,
    requirements=coalesce(requirements,'{}'::jsonb) || jsonb_build_object(
      'assessmentStatus','prepared_not_active',
      'proposedPassScore',80,
      'safetyGateRequired',true,
      'activationBlockedBy','otec_certification_active'
    ),
    updated_at=now();

insert into public.course_completion_requirements
  (course_slug,content_version,verification_mode,auto_certificate,requirements,updated_at)
values
  ('ejercicio-terapeutico','edge-course-key-v21','assessment_prepared_not_active',false,
   '{"otecStatus":"preparation","assessmentStatus":"prepared_not_active","proposedPassScore":80,"safetyGateRequired":true,"activationBlockedBy":"otec_certification_active"}'::jsonb,now())
on conflict (course_slug) do update set
  content_version=excluded.content_version, verification_mode=excluded.verification_mode,
  auto_certificate=false, requirements=excluded.requirements, updated_at=now();

commit;
