-- Module 1 documentary audit. This creates a new protected authoring edition;
-- it does not record peer approval and keeps every external release gate closed.
begin;

update academy_ortho.release_controls
set content_version = '2026.10-authoring-3',
    editorial_status = 'draft',
    qa_access_enabled = false,
    learner_access_enabled = false,
    summative_assessment_enabled = false,
    commercial_enabled = false,
    otec_issuance_enabled = false
where course_slug = 'kinecheck-ortho';

insert into academy_ortho.editorial_reviews(course_slug,content_version,domain,status)
select 'kinecheck-ortho','2026.10-authoring-3',domain,'pending'
from unnest(array['clinical','scientific','pedagogical','accessibility']) domain
on conflict(course_slug,content_version,domain) do nothing;

insert into academy_core.versions(
  course_slug,version,title,status,pass_score,max_attempts,duration_minutes,required_activities,instructions
) values (
  'kinecheck-ortho','2026.10-authoring-3',
  'KineCheck Ortho · Rehabilitación Musculoesquelética Avanzada',
  'draft',70,3,120,
  array['m01','m02','m03','m04','m05','m06','m07','m08','m09','m10','m11','m12',
    'case-01','case-02','case-03','case-04','case-05','case-06','case-07','case-08','case-09','case-10','case-11','case-12'],
  'Edición de autoría protegida. Módulo 1 auditado documentalmente; revisión humana y pilotaje pendientes.'
) on conflict(course_slug,version) do nothing;

insert into academy_ortho.audit(action,object_reference,actor_reference,detail)
values(
  'module_claim_audit_completed',
  'kinecheck-ortho/2026.10-authoring-3/m01',
  'internal-documentary-audit-2026-10-28',
  jsonb_build_object(
    'module','m01',
    'previousVersion','2026.10-authoring-2',
    'evidenceReference','docs/academic/kinecheck-ortho/MODULE_01_CLAIM_AUDIT.md',
    'candidateSearchResults',101,
    'atomicClaims',30,
    'humanPeerReview',false,
    'pilotCompleted',false
  )
);

commit;
