-- Aggregated Ortho teaching panel. Reads only real Academy v2 events, no learner identifiers.
begin;

insert into academy_core.versions(
  course_slug,version,title,status,pass_score,max_attempts,duration_minutes,required_activities,instructions
) values (
  'kinecheck-ortho','2026.10-authoring-2',
  'KineCheck Ortho · Rehabilitación Musculoesquelética Avanzada',
  'draft',70,3,120,
  array['m01','m02','m03','m04','m05','m06','m07','m08','m09','m10','m11','m12',
    'case-01','case-02','case-03','case-04','case-05','case-06','case-07','case-08','case-09','case-10','case-11','case-12'],
  'Edición de autoría protegida. Evaluación sumativa bloqueada hasta revisión clínica, científica, pedagógica y pilotaje.'
) on conflict(course_slug,version) do nothing;

create function public.academy_ortho_teacher_metrics() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  claims jsonb := auth.jwt();
  current_course_version text;
  enrollment_count integer := 0;
  completion_count integer := 0;
  approval_count integer := 0;
  attempts_started integer := 0;
  attempts_submitted integer := 0;
  minutes_total numeric := 0;
  measured_attempts integer := 0;
  certificate_requests integer := 0;
  certificates_issued integer := 0;
  certificates_pending integer := 0;
  certificates_revoked integer := 0;
  module_results jsonb := '[]'::jsonb;
  item_results jsonb := '[]'::jsonb;
  score_distribution jsonb := '[]'::jsonb;
  exam_versions jsonb := '[]'::jsonb;
  review_status jsonb := '[]'::jsonb;
  pilot_status jsonb := '[]'::jsonb;
  release_status jsonb := '{}'::jsonb;
  commercial_status jsonb := '[]'::jsonb;
begin
  if uid is null or not exists(
    select 1 from auth.users u join auth.sessions s on s.user_id=u.id
    where u.id=uid and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until<clock_timestamp())
      and s.id=(claims->>'session_id')::uuid
      and (s.not_after is null or s.not_after>clock_timestamp())
  ) then
    raise exception 'Verified active session required' using errcode='42501';
  end if;
  if not exists(select 1 from academy_core.operators where user_id=uid and role='academic') then
    raise exception 'Academic role required' using errcode='42501';
  end if;

  select content_version into current_course_version
  from academy_ortho.release_controls where course_slug='kinecheck-ortho';

  select count(*),
    count(*) filter(where c.enrollment_id is not null),
    count(*) filter(where ap.id is not null and ap.revoked_at is null),
    coalesce(sum(attempts.started),0),coalesce(sum(attempts.submitted),0),
    coalesce(sum(attempts.minutes),0),coalesce(sum(attempts.measured),0),
    count(*) filter(where cert.id is not null),
    count(*) filter(where cert.issued_at is not null and cert.revoked_at is null),
    count(*) filter(where cert.id is not null and cert.issued_at is null and cert.revoked_at is null),
    count(*) filter(where cert.revoked_at is not null)
  into enrollment_count,completion_count,approval_count,attempts_started,attempts_submitted,
    minutes_total,measured_attempts,certificate_requests,certificates_issued,certificates_pending,certificates_revoked
  from academy_core.enrollments e
  join academy_core.versions v on v.id=e.version_id
  left join academy_core.completions c on c.enrollment_id=e.id
  left join academy_core.approvals ap on ap.enrollment_id=e.id
  left join academy_core.certificates cert on cert.approval_id=ap.id
  left join lateral (
    select count(*) started,count(*) filter(where a.submitted_at is not null) submitted,
      coalesce(sum(extract(epoch from (a.submitted_at-a.started_at))/60) filter(where a.submitted_at is not null),0) minutes,
      count(*) filter(where a.submitted_at is not null) measured
    from academy_core.attempts a where a.enrollment_id=e.id
  ) attempts on true
  where v.course_slug='kinecheck-ortho' or v.course_slug like 'kinecheck-ortho-%';

  select coalesce(jsonb_agg(jsonb_build_object(
    'module',x.module,'competency',x.competency,'learningOutcome',x.learning_outcome,
    'responses',x.responses,'points',x.points,'maximum',x.maximum,'meanPercent',x.mean_percent
  ) order by x.module,x.competency),'[]'::jsonb) into module_results
  from (
    select r.module,r.competency,r.learning_outcome,count(*) responses,
      sum(r.points) points,sum(r.maximum) maximum,
      round(100*sum(r.points)/nullif(sum(r.maximum),0),1) mean_percent
    from academy_core.item_results r
    join academy_core.attempts a on a.id=r.attempt_id
    join academy_core.enrollments e on e.id=a.enrollment_id
    join academy_core.versions v on v.id=e.version_id
    where v.course_slug='kinecheck-ortho' or v.course_slug like 'kinecheck-ortho-%'
    group by r.module,r.competency,r.learning_outcome
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
    'itemId',x.item_id,'module',x.module,'learningOutcome',x.learning_outcome,
    'responses',x.responses,'correctResponses',x.correct_responses,
    'errorPercent',round(100*(x.responses-x.correct_responses)::numeric/nullif(x.responses,0),1)
  ) order by x.correct_responses::numeric/nullif(x.responses,0),x.responses desc,x.item_id),'[]'::jsonb)
  into item_results
  from (
    select q->>'id' item_id,q->>'module' module,q->>'learning_outcome' learning_outcome,
      count(*) responses,
      count(*) filter(where a.answers->(q->>'id')=q->'correct_index') correct_responses
    from academy_core.attempts a
    join academy_core.enrollments e on e.id=a.enrollment_id
    join academy_core.versions v on v.id=e.version_id
    cross join lateral jsonb_array_elements(a.snapshot) s
    cross join lateral jsonb_array_elements(s->'questions') q
    where a.submitted_at is not null and q->>'kind'='choice'
      and (v.course_slug='kinecheck-ortho' or v.course_slug like 'kinecheck-ortho-%')
    group by q->>'id',q->>'module',q->>'learning_outcome'
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object('band',b.label,'attempts',b.attempts) order by b.lower_bound),'[]'::jsonb)
  into score_distribution
  from (
    select bands.label,bands.lower_bound,count(a.id) attempts
    from (values ('0–59',0::numeric,60::numeric),('60–69',60,70),('70–79',70,80),('80–89',80,90),('90–100',90,101)) bands(label,lower_bound,upper_bound)
    left join academy_core.attempts a on a.score>=bands.lower_bound and a.score<bands.upper_bound
    left join academy_core.enrollments e on e.id=a.enrollment_id
    left join academy_core.versions v on v.id=e.version_id
      and (v.course_slug='kinecheck-ortho' or v.course_slug like 'kinecheck-ortho-%')
    where a.id is null or v.id is not null
    group by bands.label,bands.lower_bound
  ) b;

  select coalesce(jsonb_agg(jsonb_build_object(
    'version',version,'title',title,'status',status,'passScore',pass_score,
    'maxAttempts',max_attempts,'assessmentActive',status='active' and settings.exams_enabled
  ) order by version desc),'[]'::jsonb)
  into exam_versions
  from academy_core.versions cross join academy_core.settings
  where course_slug='kinecheck-ortho' or course_slug like 'kinecheck-ortho-%';

  select coalesce(jsonb_agg(jsonb_build_object('domain',domain,'status',status,'reviewedAt',reviewed_at)
    order by domain),'[]'::jsonb)
  into review_status from academy_ortho.editorial_reviews
  where course_slug='kinecheck-ortho' and content_version=current_course_version;

  select coalesce(jsonb_agg(jsonb_build_object('status',status,'participantCount',participant_count,'createdAt',created_at)
    order by created_at desc),'[]'::jsonb)
  into pilot_status from academy_ortho.pilot_runs
  where course_slug='kinecheck-ortho' and content_version=current_course_version;

  select jsonb_build_object(
    'editorialStatus',editorial_status,'qaAccessEnabled',qa_access_enabled,
    'learnerAccessEnabled',learner_access_enabled,'assessmentEnabled',summative_assessment_enabled,
    'commercialEnabled',commercial_enabled,'otecIssuanceEnabled',otec_issuance_enabled,
    'contentVersion',content_version
  ) into release_status
  from academy_ortho.release_controls where course_slug='kinecheck-ortho';

  select coalesce(jsonb_agg(jsonb_build_object(
    'offer',offer_slug,'title',title,'route',route_slug,'status',status,
    'productConfigured',hotmart_product_id is not null,
    'licenseConfigured',license_term_months is not null,
    'priceConfigured',price_amount is not null,
    'termsValidated',length(trim(coalesce(validation_reference,'')))>0
  ) order by offer_slug),'[]'::jsonb) into commercial_status
  from academy_ortho.commercial_offers;

  insert into academy_core.audit(actor,action,object_id,detail)
  values(uid,'ortho_teacher_metrics','kinecheck-ortho',jsonb_build_object('courseVersion',current_course_version));

  return jsonb_build_object(
    'courseVersion',current_course_version,
    'status',case when enrollment_count=0 then 'sin_matriculas'
      when attempts_submitted=0 then 'sin_evaluaciones_enviadas' else 'metricas_observadas' end,
    'summary',jsonb_build_object(
      'enrollments',enrollment_count,'completionCount',completion_count,
      'completionRate',case when enrollment_count=0 then null else round(100*completion_count::numeric/enrollment_count,1) end,
      'approvalCount',approval_count,
      'approvalRate',case when enrollment_count=0 then null else round(100*approval_count::numeric/enrollment_count,1) end,
      'attemptsStarted',attempts_started,'attemptsSubmitted',attempts_submitted,
      'averageMinutes',case when measured_attempts=0 then null else round(minutes_total/measured_attempts,1) end,
      'certificatesRequested',certificate_requests,'certificatesIssued',certificates_issued,
      'certificatesPending',certificates_pending,'certificatesRevoked',certificates_revoked
    ),
    'moduleResults',module_results,'itemResults',item_results,'scoreDistribution',score_distribution,
    'assessmentVersions',exam_versions,'editorialReviews',review_status,'pilotRuns',pilot_status,
    'releaseControls',release_status,'commercialOffers',commercial_status,
    'metricsAreObservedEvents',true
  );
end $$;

revoke all on function public.academy_ortho_teacher_metrics() from public,anon,authenticated;
grant execute on function public.academy_ortho_teacher_metrics() to authenticated;
comment on function public.academy_ortho_teacher_metrics() is
  'Aggregated KineCheck Ortho metrics from real Academy v2 events; academic operator only; no student identifiers returned.';
commit;
