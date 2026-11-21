-- Academy v2: isolated opt-in workflow. No existing course, flag or purchase is updated.
-- No questions are seeded; both activation switches default to false.
begin;
create schema academy_core;
revoke all on schema academy_core from public, anon, authenticated;

create table academy_core.settings (
 id boolean primary key default true check(id), exams_enabled boolean not null default false,
 otec_enabled boolean not null default false
);
insert into academy_core.settings(id) values(true);
create table academy_core.operators (
 user_id uuid references auth.users(id), role text check(role in('academic','registrar','certifier','billing')),
 primary key(user_id,role)
);
create table academy_core.versions (
 id uuid primary key default gen_random_uuid(), course_slug text not null, version text not null,
 title text not null, status text not null default 'draft' check(status in('draft','approved','active','retired')),
 pass_score numeric not null default 70 check(pass_score between 1 and 100),
 max_attempts int not null default 3 check(max_attempts between 1 and 10),
 duration_minutes int not null default 60 check(duration_minutes between 10 and 240),
 required_activities text[] not null check(cardinality(required_activities)>0),
 instructions text not null, approval_reference text, approved_by uuid references auth.users(id),
 approved_at timestamptz, unique(course_slug,version),
 check(status='draft' or (approval_reference is not null and length(trim(approval_reference))>0 and approved_by is not null and approved_at is not null))
);
create table academy_core.items (
 id uuid primary key default gen_random_uuid(), version_id uuid not null references academy_core.versions(id),
 case_id text not null, stage int not null check(stage between 1 and 7), item_order int not null,
 module text not null, learning_outcome text not null, competency text not null,
 cognitive_level text not null check(cognitive_level in('fundamentals','interpretation','reasoning','uncertainty','safety_communication')),
 estimated_difficulty text not null check(estimated_difficulty in('low','medium','high')),
 kind text not null check(kind in('choice','justification')), points numeric not null check(points>0 and points<=100),
 context text not null, prompt text not null, options jsonb, correct_index int,
 rubric jsonb not null default '[]', rationale text not null, source_uri text not null,
 distractor_explanations jsonb not null default '[]', critical boolean not null default false,
 critical_criterion text not null default '',
 validation_status text not null default 'draft' check(validation_status in('draft','validated')),
 reviewer_id uuid references auth.users(id), review_reference text,
 unique(version_id,case_id,stage,item_order),
 check((kind='choice' and jsonb_typeof(options)='array' and jsonb_array_length(options)>=3
   and correct_index>=0 and correct_index<jsonb_array_length(options))
   or (kind='justification' and correct_index is null and jsonb_typeof(rubric)='array' and jsonb_array_length(rubric)>0)),
 check(validation_status='draft' or (reviewer_id is not null and length(trim(review_reference))>0)),
 check(not critical or length(trim(critical_criterion))>0)
);
create table academy_core.enrollments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 version_id uuid not null references academy_core.versions(id),
 terms_reference text not null check(length(trim(terms_reference))>0),
 enrolled_at timestamptz not null default now(), administrative_clearance boolean not null default false,
 unique(user_id,version_id)
);
create table academy_core.completions (
 enrollment_id uuid primary key references academy_core.enrollments(id), completed_at timestamptz not null default now(),
 evidence_reference text not null check(length(trim(evidence_reference))>0), verified_activities text[] not null,
 verified_by uuid not null references auth.users(id)
);
create table academy_core.attempts (
 id uuid primary key default gen_random_uuid(), enrollment_id uuid not null references academy_core.enrollments(id),
 attempt_number int not null, started_at timestamptz not null default now(), deadline timestamptz not null,
 status text not null default 'in_progress' check(status in('in_progress','pending_review','graded','expired')),
 current_step int not null default 1, snapshot jsonb not null, answers jsonb not null default '{}',
 submitted_at timestamptz, score numeric check(score between 0 and 100), passed boolean,
 unique(enrollment_id,attempt_number)
);
create unique index academy_one_open_attempt on academy_core.attempts(enrollment_id) where status='in_progress';
create table academy_core.reviews (
 attempt_id uuid primary key references academy_core.attempts(id), reviewer_id uuid not null references auth.users(id),
 reviewed_at timestamptz not null default now(), grades jsonb not null,
 rationale text not null check(length(trim(rationale))>0)
);
create table academy_core.item_results (
 attempt_id uuid references academy_core.attempts(id), item_id uuid not null,
 module text not null, learning_outcome text not null, competency text not null,
 points numeric not null, maximum numeric not null, critical_met boolean,
 primary key(attempt_id,item_id)
);
create table academy_core.approvals (
 id uuid primary key default gen_random_uuid(), enrollment_id uuid not null unique references academy_core.enrollments(id),
 attempt_id uuid not null unique references academy_core.attempts(id), approved_at timestamptz not null default now(),
 revoked_at timestamptz, revocation_reason text
);
create table academy_core.issuers (
 id uuid primary key default gen_random_uuid(), name text not null,
 agreement_reference text not null, authorization_reference text not null, enabled boolean not null default false,
 check(length(trim(agreement_reference))>0 and length(trim(authorization_reference))>0)
);
create table academy_core.certificates (
 id uuid primary key default gen_random_uuid(), approval_id uuid not null unique references academy_core.approvals(id),
 requested_at timestamptz not null default now(), issued_at timestamptz, issuer_id uuid references academy_core.issuers(id),
 external_id text, document_url text, document_sha256 text, unit_cost numeric(12,2),
 currency text not null default 'CLP' check(currency='CLP'), issued_by uuid references auth.users(id),
 revoked_at timestamptz, revocation_reason text,
 reconciliation_status text not null default 'pending' check(reconciliation_status in('pending','reconciled','credit_required','credited')),
 reconciliation_reference text, unique(issuer_id,external_id),
 check(issued_at is null or (issuer_id is not null and length(trim(external_id))>0
  and document_url is not null and document_url like 'https://%' and document_sha256 is not null and document_sha256 ~ '^[a-f0-9]{64}$'
  and unit_cost is not null and unit_cost>=0 and issued_by is not null))
);
create table academy_core.audit (
 id bigint generated always as identity primary key, actor uuid not null references auth.users(id),
 action text not null, object_id text, at timestamptz not null default now(), detail jsonb not null default '{}'
);

-- The browser receives only current prompts. Answers, future stages and grading keys never leave this schema.
create function academy_core.attempt_view(a academy_core.attempts) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',a.id,'attemptNumber',a.attempt_number,'status',a.status,
  'startedAt',a.started_at,'deadline',a.deadline,'step',a.current_step,
  'steps',jsonb_array_length(a.snapshot),'score',a.score,'passed',a.passed,
  'stage',case when a.status='in_progress' then (
   select jsonb_build_object('caseId',s->>'caseId','stage',s->'stage','questions',(
    select jsonb_agg(q-'correct_index'-'rationale'-'source_uri'-'distractor_explanations'-'reviewer_id'-'review_reference'-'validation_status')
    from jsonb_array_elements(s->'questions') q)) from (select a.snapshot->(a.current_step-1) s) x
  ) else null end)
$$;
create function academy_core.frozen_bank() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from academy_core.versions where id=case when tg_op='DELETE' then old.version_id else new.version_id end and status<>'draft')
  or (tg_op='UPDATE' and exists(select 1 from academy_core.versions where id=old.version_id and status<>'draft')) then
  raise exception 'Published bank is immutable; create a new version';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create function academy_core.snapshot_item(item academy_core.items) returns jsonb
language sql volatile security invoker set search_path='' as $$
 with shuffled as materialized (
  select value,ordinality-1 old_index,random() rank from jsonb_array_elements(coalesce(item.options,'[]')) with ordinality
 ), numbered as (select value,old_index,row_number() over(order by rank)-1 new_index from shuffled)
 select case when item.kind='choice' then to_jsonb(item)||jsonb_build_object(
  'options',(select jsonb_agg(value order by new_index) from numbered),
  'correct_index',(select new_index from numbered where old_index=item.correct_index)) else to_jsonb(item) end
$$;
create function academy_core.frozen_version() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.status<>'draft' and ((to_jsonb(new)-'status')<>(to_jsonb(old)-'status')
  or (new.status<>old.status and not(old.status='approved' and new.status='active') and new.status<>'retired')) then
  raise exception 'Approved assessment parameters are immutable';
 end if;
 return new;
end $$;
create trigger academy_version_immutable before update on academy_core.versions
 for each row execute function academy_core.frozen_version();
create trigger academy_frozen_bank before insert or update or delete on academy_core.items
 for each row execute function academy_core.frozen_bank();
create function academy_core.immutable_record() returns trigger language plpgsql security invoker set search_path='' as $$
begin raise exception 'Append-only academic evidence'; end $$;
create trigger academy_audit_immutable before update or delete on academy_core.audit
 for each row execute function academy_core.immutable_record();
create trigger academy_reviews_immutable before update or delete on academy_core.reviews
 for each row execute function academy_core.immutable_record();
create trigger academy_completion_immutable before update or delete on academy_core.completions
 for each row execute function academy_core.immutable_record();

-- Sole client entry point; this definer is explicitly revoked from PUBLIC/anon below.
-- No caller-supplied identity, score, role or certificate validity is trusted.
create function public.academy_workflow(action text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid := auth.uid(); claims jsonb := auth.jwt(); mail text;
 e academy_core.enrollments; v academy_core.versions; a academy_core.attempts;
 ap academy_core.approvals; cert academy_core.certificates; op_role text;
 output jsonb; steps jsonb; stage_data jsonb; q jsonb; answer jsonb; g jsonb; dimension jsonb;
 grade numeric; total numeric:=0; safe boolean:=true; cnt int; k text; now_at timestamptz:=clock_timestamp();
 month_start date; issuer academy_core.issuers;
begin
 if uid is null or not exists(select 1 from auth.users u join auth.sessions s on s.user_id=u.id
  where u.id=uid and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<now_at)
   and s.id=(claims->>'session_id')::uuid and (s.not_after is null or s.not_after>now_at)) then
  raise exception 'Verified active session required' using errcode='42501';
 end if;
 if jsonb_typeof(payload)<>'object' or octet_length(payload::text)>100000 then raise exception 'Invalid payload'; end if;
 select lower(email) into mail from auth.users where id=uid;
 op_role := case when action in('approve_version','activate_version','review','revoke_approval') then 'academic'
  when action in('enroll','verify_completion','clear_administration') then 'registrar'
  when action in('issue_certificate','revoke_certificate') then 'certifier'
  when action in('monthly_report','reconcile') then 'billing' end;
 if op_role is not null and not exists(select 1 from academy_core.operators where user_id=uid and role=op_role) then
  raise exception 'Academic role required: %',op_role using errcode='42501';
 end if;

 if action in('approve_version','activate_version') then
  select * into strict v from academy_core.versions where id=(payload->>'versionId')::uuid for update;
  if action='approve_version' then
   if v.status<>'draft' then raise exception 'Draft required'; end if;
   select count(*),coalesce(sum(points),0) into cnt,total from academy_core.items where version_id=v.id;
   if cnt<7 or total<>100 or length(trim(coalesce(payload->>'reference','')))=0 then raise exception 'Validated 100-point form required'; end if;
   if exists(select 1 from academy_core.items where version_id=v.id and (validation_status<>'validated'
    or reviewer_id is null or review_reference is null or length(trim(source_uri))=0
    or length(trim(module))=0 or length(trim(learning_outcome))=0 or length(trim(competency))=0
    or (kind='choice' and jsonb_array_length(distractor_explanations)<>jsonb_array_length(options)))) then
    raise exception 'Every item requires academic review, source and metadata';
   end if;
   if exists(select 1 from (select case_id,count(distinct stage) n from academy_core.items where version_id=v.id group by case_id) x where n<>7)
    or (select coalesce(sum(points),0) from academy_core.items where version_id=v.id and kind='justification')<50
    or (select coalesce(sum(points),0) from academy_core.items where version_id=v.id and cognitive_level='fundamentals')>15
    or not exists(select 1 from academy_core.items where version_id=v.id and critical) then
    raise exception 'Seven-stage cases, justified reasoning and critical safety required';
   end if;
   for q in select to_jsonb(i) from academy_core.items i where version_id=v.id and kind='justification' loop
    select sum((x->>'maximum')::numeric) into grade from jsonb_array_elements(q->'rubric') x;
    if grade is distinct from (q->>'points')::numeric or exists(select 1 from jsonb_array_elements(q->'rubric') x
     where length(trim(coalesce(x->>'id','')))=0 or (x->>'maximum')::numeric<=0) then raise exception 'Invalid analytic rubric'; end if;
   end loop;
   update academy_core.versions set status='approved',approval_reference=payload->>'reference',approved_by=uid,approved_at=now_at where id=v.id;
  else
   if v.status<>'approved' or not coalesce((select exams_enabled from academy_core.settings where id),false) then raise exception 'Approved version and enabled pilot required'; end if;
   update academy_core.versions set status='active' where id=v.id;
  end if;
  output:=jsonb_build_object('versionId',v.id,'action',action);

 elsif action='enroll' then
  select * into strict v from academy_core.versions where id=(payload->>'versionId')::uuid;
  if v.status<>'active' then raise exception 'Active version required'; end if;
  if not exists(select 1 from public.course_access ca join auth.users u on lower(ca.email)=lower(u.email)
    where u.id=(payload->>'studentId')::uuid and ca.course_slug=v.course_slug and ca.active
    and (ca.access_expires_at is null or ca.access_expires_at>now_at)) then raise exception 'Active course entitlement required'; end if;
  insert into academy_core.enrollments(user_id,version_id,terms_reference)
   values((payload->>'studentId')::uuid,v.id,payload->>'termsReference') returning * into e;
  output:=jsonb_build_object('enrollmentId',e.id);

 elsif action in('dashboard','item_analysis','review_queue') then
  if not exists(select 1 from academy_core.operators where user_id=uid and role='academic') then raise exception 'Academic role required' using errcode='42501'; end if;
  if action='dashboard' then
   select coalesce(jsonb_agg(x),'[]') into output from (
    select enrolled.id,enrolled.user_id,version_row.course_slug,version_row.version,enrolled.enrolled_at,
     (c.enrollment_id is not null) course_completed,(p.id is not null and p.revoked_at is null) course_passed,
     greatest(enrolled.enrolled_at,c.completed_at,(select max(coalesce(t.submitted_at,t.started_at)) from academy_core.attempts t where t.enrollment_id=enrolled.id)) last_activity_at,
     (select count(*) from academy_core.attempts t where t.enrollment_id=enrolled.id) attempts_started,
     (select count(*) from academy_core.attempts t where t.enrollment_id=enrolled.id and t.submitted_at is not null) exams_submitted,
     (select jsonb_agg(jsonb_build_object('id',t.id,'number',t.attempt_number,'status',t.status,'score',t.score,'passed',t.passed)) from academy_core.attempts t where t.enrollment_id=enrolled.id) attempts,
     certificate_row.id certificate_id,certificate_row.requested_at,certificate_row.issued_at,certificate_row.revoked_at
    from academy_core.enrollments enrolled join academy_core.versions version_row on version_row.id=enrolled.version_id
    left join academy_core.completions c on c.enrollment_id=enrolled.id
    left join academy_core.approvals p on p.enrollment_id=enrolled.id
    left join academy_core.certificates certificate_row on certificate_row.approval_id=p.id
   ) x;
  elsif action='item_analysis' then
   -- Descriptive only: sample size is real; no discrimination/validity estimate is fabricated.
   select coalesce(jsonb_agg(x),'[]') into output from (
    select question_row->>'id' item_id,question_row->>'module' module,question_row->>'learning_outcome' learning_outcome,question_row->>'competency' competency,
     count(*) responses, count(*) filter(where attempt_row.answers->(question_row->>'id')=question_row->'correct_index') correct_responses
    from academy_core.attempts attempt_row cross join lateral jsonb_array_elements(attempt_row.snapshot) s
     cross join lateral jsonb_array_elements(s->'questions') question_row
    where attempt_row.submitted_at is not null and question_row->>'kind'='choice' group by 1,2,3,4
   ) x;
  else
   select coalesce(jsonb_agg(x),'[]') into output from (
    select attempt_row.id,attempt_row.enrollment_id,attempt_row.submitted_at,attempt_row.deadline,
     version_row.title,version_row.version,attempt_row.answers,
     (select jsonb_agg(jsonb_build_object('id',question_row->>'id','caseId',question_row->>'case_id','stage',question_row->'stage',
      'prompt',question_row->>'prompt','context',question_row->>'context','rubric',question_row->'rubric','points',question_row->'points',
      'critical',question_row->'critical')) from jsonb_array_elements(attempt_row.snapshot) stage_row
      cross join lateral jsonb_array_elements(stage_row->'questions') question_row where question_row->>'kind'='justification') questions
    from academy_core.attempts attempt_row join academy_core.enrollments enrolled on enrolled.id=attempt_row.enrollment_id
    join academy_core.versions version_row on version_row.id=enrolled.version_id
    where attempt_row.status='pending_review' and enrolled.user_id<>uid
   ) x;
  end if;
  insert into academy_core.audit(actor,action) values(uid,action);
  return jsonb_build_object('rows',output);

 elsif action='monthly_report' then
  if coalesce(payload->>'month','') !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'Month must be YYYY-MM'; end if;
  month_start:=(payload->>'month'||'-01')::date;
  select coalesce(jsonb_agg(x),'[]') into output from (
   select enrolled.user_id student_id,version_row.title course,p.approved_at,c.issued_at,c.id certificate_id,c.external_id,
    i.name issuer,c.unit_cost,c.currency,c.reconciliation_status,c.reconciliation_reference,c.revoked_at
   from academy_core.certificates c join academy_core.approvals p on p.id=c.approval_id
   join academy_core.enrollments enrolled on enrolled.id=p.enrollment_id join academy_core.versions version_row on version_row.id=enrolled.version_id
   join academy_core.issuers i on i.id=c.issuer_id
   where (c.issued_at at time zone 'America/Santiago')::date>=month_start
    and (c.issued_at at time zone 'America/Santiago')::date<(month_start+interval '1 month')::date
   order by c.issued_at,c.id
  ) x;
  insert into academy_core.audit(actor,action,detail) values(uid,action,jsonb_build_object('month',payload->>'month'));
  return jsonb_build_object('month',payload->>'month','timezone','America/Santiago','rows',output);

 else
  -- Object identity is always resolved in the database and checked before returning data.
  if action in('stage','review') then
   select * into strict a from academy_core.attempts where id=(payload->>'attemptId')::uuid for update;
   select * into strict e from academy_core.enrollments where id=a.enrollment_id for update;
  elsif action in('issue_certificate','revoke_certificate','reconcile') then
   select * into strict cert from academy_core.certificates where id=(payload->>'certificateId')::uuid for update;
   select * into strict ap from academy_core.approvals where id=cert.approval_id for update;
   select * into strict e from academy_core.enrollments where id=ap.enrollment_id for update;
  else
   select * into strict e from academy_core.enrollments where id=(payload->>'enrollmentId')::uuid for update;
  end if;
  select * into strict v from academy_core.versions where id=e.version_id;
  if op_role is null and e.user_id<>uid then raise exception 'Own enrollment required' using errcode='42501'; end if;
  if op_role is null and not exists(select 1 from public.course_access ca where lower(ca.email)=mail
   and ca.course_slug=v.course_slug and ca.active and (ca.access_expires_at is null or ca.access_expires_at>now_at)) then
   raise exception 'Active course entitlement required' using errcode='42501';
  end if;

  if action='verify_completion' then
   if jsonb_typeof(payload->'activities') is distinct from 'array'
    or ((payload->'activities') @> to_jsonb(v.required_activities)) is distinct from true then raise exception 'All required activities must be verified'; end if;
   insert into academy_core.completions(enrollment_id,evidence_reference,verified_activities,verified_by)
    values(e.id,payload->>'evidenceReference',v.required_activities,uid) on conflict(enrollment_id) do nothing;
   output:=jsonb_build_object('courseCompleted',true);
  elsif action='clear_administration' then
   if length(trim(coalesce(payload->>'reference','')))=0 then raise exception 'Administrative evidence required'; end if;
   update academy_core.enrollments set administrative_clearance=true where id=e.id;
   output:=jsonb_build_object('administrativeClearance',true);
  elsif action='status' then
   select * into ap from academy_core.approvals where enrollment_id=e.id;
   select * into cert from academy_core.certificates where approval_id=ap.id;
   select jsonb_build_object('courseCompleted',exists(select 1 from academy_core.completions where enrollment_id=e.id),
    'coursePassed',ap.id is not null and ap.revoked_at is null,
    'certificateIssued',cert.issued_at is not null and cert.revoked_at is null and ap.revoked_at is null,
    'certificate',case when cert.id is not null then jsonb_build_object('id',cert.id,'requestedAt',cert.requested_at,
     'issuedAt',cert.issued_at,'revokedAt',cert.revoked_at,'url',case when cert.revoked_at is null and ap.revoked_at is null then cert.document_url end) end,
    'course',v.title,'version',v.version,'passingScore',v.pass_score,'maxAttempts',v.max_attempts,'durationMinutes',v.duration_minutes,
    'instructions',v.instructions,'criticalRules',(select jsonb_agg(distinct i.critical_criterion) from academy_core.items i where i.version_id=v.id and i.critical),
    'assessmentActive',v.status='active' and coalesce((select exams_enabled from academy_core.settings where id),false),
    'otecActive',coalesce((select otec_enabled from academy_core.settings where id),false),
    'competencies',coalesce((select jsonb_agg(jsonb_build_object('attemptId',r.attempt_id,'module',r.module,
     'learningOutcome',r.learning_outcome,'competency',r.competency,'points',r.points,'maximum',r.maximum,'criticalMet',r.critical_met))
     from academy_core.item_results r join academy_core.attempts t on t.id=r.attempt_id where t.enrollment_id=e.id),'[]'),
    'reviews',coalesce((select jsonb_agg(jsonb_build_object('attemptId',r.attempt_id,'reviewedAt',r.reviewed_at,'grades',r.grades,'feedback',r.rationale))
     from academy_core.reviews r join academy_core.attempts t on t.id=r.attempt_id where t.enrollment_id=e.id),'[]'),
    'attempts',coalesce((select jsonb_agg(academy_core.attempt_view(t) order by t.attempt_number) from academy_core.attempts t where t.enrollment_id=e.id),'[]')) into output;
  elsif action='start' then
   if not coalesce((select exams_enabled from academy_core.settings where id),false) or v.status<>'active' then raise exception 'Competency assessment is not active'; end if;
   if not exists(select 1 from academy_core.completions where enrollment_id=e.id) then raise exception 'Complete required activities before the exam'; end if;
   if exists(select 1 from academy_core.approvals where enrollment_id=e.id and revoked_at is null) then raise exception 'Course already approved'; end if;
   update academy_core.attempts set status='expired',passed=false where enrollment_id=e.id and status='in_progress' and deadline<=now_at;
   select * into a from academy_core.attempts where enrollment_id=e.id and status='in_progress';
   if a.id is null then
    if exists(select 1 from academy_core.attempts where enrollment_id=e.id and status='pending_review') then raise exception 'Human review pending'; end if;
    select count(*) into cnt from academy_core.attempts where enrollment_id=e.id;
    if cnt>=v.max_attempts then raise exception 'Attempt limit reached'; end if;
    -- Shuffle whole cases, keep their seven stages sequential, snapshot every key server-side.
    with case_ranks as materialized (
     select case_id,random() rank from academy_core.items where version_id=v.id group by case_id
    )
    select jsonb_agg(jsonb_build_object('caseId',case_id,'stage',stage,'questions',questions) order by case_rank,stage) into steps
    from (
     select i.case_id,i.stage,c.rank case_rank,jsonb_agg(academy_core.snapshot_item(i) order by random()) questions
     from academy_core.items i join case_ranks c using(case_id)
     where i.version_id=v.id and i.validation_status='validated' group by i.case_id,i.stage,c.rank
    ) x;
    if steps is null then raise exception 'Validated bank unavailable'; end if;
    insert into academy_core.attempts(enrollment_id,attempt_number,deadline,snapshot)
     values(e.id,cnt+1,now_at+make_interval(mins=>v.duration_minutes),steps) returning * into a;
   end if;
   output:=academy_core.attempt_view(a);
  elsif action='stage' then
   if a.status<>'in_progress' then return academy_core.attempt_view(a); end if;
   if a.deadline<=now_at then
    update academy_core.attempts set status='expired',passed=false where id=a.id returning * into a;
    insert into academy_core.audit(actor,action,object_id) values(uid,'attempt_expired',a.id::text);
    return academy_core.attempt_view(a);
   end if;
   if (payload->>'step')::int<a.current_step then return academy_core.attempt_view(a); end if;
   if (payload->>'step')::int is distinct from a.current_step then raise exception 'Sequential stage required'; end if;
   stage_data:=a.snapshot->(a.current_step-1);
   if jsonb_typeof(payload->'answers') is distinct from 'object'
     or (select count(*) from jsonb_object_keys(payload->'answers'))<>jsonb_array_length(stage_data->'questions') then raise exception 'Answer every current question'; end if;
   for q in select value from jsonb_array_elements(stage_data->'questions') loop
    answer:=payload->'answers'->(q->>'id');
    if q->>'kind'='choice' then
     if jsonb_typeof(answer) is distinct from 'number' or (answer::text)::numeric<>trunc((answer::text)::numeric)
       or (answer::text)::int<0 or (answer::text)::int>=jsonb_array_length(q->'options') then raise exception 'Invalid option'; end if;
    elsif jsonb_typeof(answer) is distinct from 'string' or length(trim(answer#>>'{}'))=0 or length(answer#>>'{}')>10000 then
     raise exception 'Written justification required';
    end if;
   end loop;
   update academy_core.attempts set answers=answers||(payload->'answers'),current_step=current_step+1,
    status=case when current_step=jsonb_array_length(snapshot) then 'pending_review' else status end,
    submitted_at=case when current_step=jsonb_array_length(snapshot) then now_at else submitted_at end
    where id=a.id returning * into a;
   output:=academy_core.attempt_view(a);
  elsif action='review' then
   if e.user_id=uid then raise exception 'Self assessment is prohibited'; end if;
   if a.status<>'pending_review' then raise exception 'Submitted attempt awaiting review required'; end if;
   if length(trim(coalesce(payload->>'rationale','')))=0 or jsonb_typeof(payload->'grades') is distinct from 'object' then raise exception 'Human review and rationale required'; end if;
   for q in select question.value from jsonb_array_elements(a.snapshot) s cross join lateral jsonb_array_elements(s->'questions') question loop
    if q->>'kind'='choice' then
     grade:=case when a.answers->(q->>'id')=q->'correct_index' then (q->>'points')::numeric else 0 end;
     if (q->>'critical')::boolean and grade=0 then safe:=false; end if;
    else
     g:=payload->'grades'->(q->>'id'); grade:=0;
     if length(trim(coalesce(g->>'feedback','')))=0 then raise exception 'Item feedback required'; end if;
     for dimension in select value from jsonb_array_elements(q->'rubric') loop
      answer:=g->'dimensions'->(dimension->>'id');
      if jsonb_typeof(answer) is distinct from 'number' or (answer::text)::numeric<0
       or (answer::text)::numeric>(dimension->>'maximum')::numeric then raise exception 'Rubric score outside bounds'; end if;
      grade:=grade+(answer::text)::numeric;
     end loop;
     if (q->>'critical')::boolean then
      if jsonb_typeof(g->'safe') is distinct from 'boolean' then raise exception 'Critical safety judgement required'; end if;
      safe:=safe and (g->>'safe')::boolean;
     end if;
    end if;
    insert into academy_core.item_results(attempt_id,item_id,module,learning_outcome,competency,points,maximum,critical_met)
     values(a.id,(q->>'id')::uuid,q->>'module',q->>'learning_outcome',q->>'competency',grade,(q->>'points')::numeric,
     case when (q->>'critical')::boolean then case when q->>'kind'='choice' then grade>0 else (g->>'safe')::boolean end end);
    total:=total+grade;
   end loop;
   insert into academy_core.reviews(attempt_id,reviewer_id,grades,rationale) values(a.id,uid,payload->'grades',payload->>'rationale');
   update academy_core.attempts set score=total,passed=(total>=v.pass_score and safe),status='graded' where id=a.id returning * into a;
   if a.passed then insert into academy_core.approvals(enrollment_id,attempt_id) values(e.id,a.id); end if;
   output:=jsonb_build_object('attemptId',a.id,'score',total,'passed',a.passed,'criticalCompetenciesMet',safe);
  elsif action='request_certificate' then
   if not coalesce((select otec_enabled from academy_core.settings where id),false) then raise exception 'OTEC agreement not active'; end if;
   select * into ap from academy_core.approvals where enrollment_id=e.id and revoked_at is null;
   if ap.id is null or not e.administrative_clearance then raise exception 'Valid approval and administrative clearance required'; end if;
   insert into academy_core.certificates(approval_id) values(ap.id) on conflict(approval_id) do nothing;
   select * into cert from academy_core.certificates where approval_id=ap.id;
   output:=jsonb_build_object('certificateId',cert.id,'requestedAt',cert.requested_at,'issuedAt',cert.issued_at);
  elsif action='issue_certificate' then
   select * into strict issuer from academy_core.issuers where id=(payload->>'issuerId')::uuid;
   if not coalesce((select otec_enabled from academy_core.settings where id),false) or not issuer.enabled or ap.revoked_at is not null
    or not e.administrative_clearance then raise exception 'Issuance not authorized'; end if;
   if cert.issued_at is not null or cert.revoked_at is not null then raise exception 'Certificate already issued or revoked'; end if;
   update academy_core.certificates set issuer_id=issuer.id,issued_at=now_at,external_id=payload->>'externalId',
    document_url=payload->>'documentUrl',document_sha256=payload->>'sha256',unit_cost=(payload->>'unitCost')::numeric,
    issued_by=uid where id=cert.id;
   output:=jsonb_build_object('certificateId',cert.id,'issuedAt',now_at);
  elsif action in('revoke_approval','revoke_certificate') then
   if length(trim(coalesce(payload->>'reason','')))=0 then raise exception 'Revocation reason required'; end if;
   if action='revoke_approval' then
    update academy_core.approvals set revoked_at=now_at,revocation_reason=payload->>'reason' where enrollment_id=e.id returning * into ap;
   end if;
   update academy_core.certificates set revoked_at=now_at,revocation_reason=payload->>'reason',
    reconciliation_status=case when issued_at is not null then 'credit_required' else reconciliation_status end
    where approval_id=ap.id;
   output:=jsonb_build_object('revoked',true);
  elsif action='reconcile' then
   if cert.issued_at is null or length(trim(coalesce(payload->>'reference','')))=0 then raise exception 'Issued document and reconciliation reference required'; end if;
   update academy_core.certificates set reconciliation_status=case when revoked_at is null then 'reconciled' else 'credited' end,
    reconciliation_reference=payload->>'reference' where id=cert.id;
   output:=jsonb_build_object('reconciled',true);
  else raise exception 'Unknown action'; end if;
 end if;
 if action<>'status' then
  insert into academy_core.audit(actor,action,object_id,detail) values(uid,action,coalesce(a.id::text,e.id::text,v.id::text),
   jsonb_build_object('reference',coalesce(payload->>'reference',payload->>'evidenceReference',payload->>'reason')));
 end if;
 return output;
end $$;

do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='academy_core' loop
  execute format('alter table academy_core.%I enable row level security',t);
 end loop;
end $$;
revoke all on all tables in schema academy_core from public,anon,authenticated;
revoke all on all sequences in schema academy_core from public,anon,authenticated;
revoke execute on all functions in schema academy_core from public,anon,authenticated;
revoke all on function public.academy_workflow(text,jsonb) from public,anon,authenticated;
grant execute on function public.academy_workflow(text,jsonb) to authenticated;
comment on function public.academy_workflow(text,jsonb) is
 'Opt-in Academy v2; checked active session, entitlement, ownership and explicit academic roles; no legacy data writes.';
-- Public verification is intentionally minimal: never return student identifiers, names or document URLs.
create function public.academy_certificate_verify(certificate_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('found',true,'id',c.id,'externalId',c.external_id,'course',v.title,
  'version',v.version,'issuer',i.name,'issuedAt',c.issued_at,
  'valid',c.revoked_at is null and p.revoked_at is null,'sha256',c.document_sha256)
  from academy_core.certificates c join academy_core.approvals p on p.id=c.approval_id
  join academy_core.enrollments e on e.id=p.enrollment_id join academy_core.versions v on v.id=e.version_id
  join academy_core.issuers i on i.id=c.issuer_id where c.id=certificate_id and c.issued_at is not null),
  jsonb_build_object('found',false))
$$;
revoke all on function public.academy_certificate_verify(uuid) from public,anon,authenticated;
grant execute on function public.academy_certificate_verify(uuid) to anon,authenticated;
commit;
