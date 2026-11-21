-- KineCheck Quality & Impact. Additive; never writes Academy approval/licensing tables.
-- Requires the audited Academy academic registry and Campus institutional registry.
begin;
create schema if not exists qi_internal;
revoke all on schema qi_internal from public,anon;

create table private.qi_program_versions (
 id uuid primary key default gen_random_uuid(),
 course_slug text not null references public.course_academic_load(course_slug),
 version text not null check(length(version) between 1 and 80),
 dossier jsonb not null check(jsonb_typeof(dossier)='object'),
 source text not null check(length(source) between 3 and 2000),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(course_slug,version)
);
create table private.qi_instruments (
 id uuid primary key default gen_random_uuid(), program_id uuid not null references private.qi_program_versions(id),
 kind text not null check(kind in ('learning','competency')),
 version text not null check(length(version) between 1 and 80),
 title text not null check(length(title) between 3 and 200),
 specification jsonb not null, validation_source text not null check(length(validation_source) between 10 and 2000),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(program_id,kind,version)
);
create table private.qi_cohorts (
 id uuid primary key default gen_random_uuid(), program_id uuid not null references private.qi_program_versions(id),
 institution_id uuid references private.campus_institutions(id),
 name text not null check(length(name) between 3 and 160),
 starts_on date not null, ends_on date not null check(ends_on>=starts_on),
 learning_id uuid references private.qi_instruments(id), competency_id uuid references private.qi_instruments(id),
 data_mode text not null default 'real' check(data_mode in ('real','test')),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table private.qi_staff (
 cohort_id uuid not null references private.qi_cohorts(id), user_id uuid not null references auth.users(id),
 role text not null check(role in ('academic','analyst')), active boolean not null default true,
 granted_by uuid not null references auth.users(id), updated_at timestamptz not null default now(),
 primary key(cohort_id,user_id)
);
create table private.qi_participants (
 cohort_id uuid not null references private.qi_cohorts(id), user_id uuid not null references auth.users(id),
 source_ref text not null, registered_at timestamptz not null default now(),
 started_at timestamptz, start_source text, -- observed progress is explicitly not a historical start date
 followup_consent boolean not null default false, consent_version text, consent_at timestamptz,
 primary key(cohort_id,user_id)
);
create table private.qi_attempts (
 id uuid primary key default gen_random_uuid(), cohort_id uuid not null, user_id uuid not null,
 instrument_id uuid not null references private.qi_instruments(id),
 phase text not null check(phase in ('pre','post','competency')),
 answers jsonb not null, objective_points numeric not null, objective_max numeric not null,
 created_at timestamptz not null default now(),
 foreign key(cohort_id,user_id) references private.qi_participants(cohort_id,user_id),
 unique(cohort_id,user_id,instrument_id,phase)
);
create table private.qi_reviews (
 id uuid primary key default gen_random_uuid(), attempt_id uuid not null references private.qi_attempts(id) on delete cascade,
 scores jsonb not null, score numeric not null check(score between 0 and 100),
 feedback text not null check(length(feedback) between 10 and 6000),
 assessor uuid not null references auth.users(id), revision integer not null,
 created_at timestamptz not null default now(), unique(attempt_id,revision)
);
create table private.qi_surveys (
 id uuid primary key default gen_random_uuid(), cohort_id uuid not null,user_id uuid not null,
 kind text not null check(kind in ('experience','followup')),
 day integer not null default 0 check(day in (0,30,90,120)),
 instrument_version text not null, answers jsonb not null,
 created_at timestamptz not null default now(),
 foreign key(cohort_id,user_id) references private.qi_participants(cohort_id,user_id),
 unique(cohort_id,user_id,kind,day),
 check((kind='experience' and day=0) or (kind='followup' and day>0))
);
create table private.qi_evidence (
 id uuid primary key default gen_random_uuid(), cohort_id uuid references private.qi_cohorts(id),
 owner_id uuid not null references auth.users(id),
 classification text not null check(classification in ('academic','self_report','external','clinical_measured','official_requirement')),
 filename text not null check(length(filename) between 1 and 100), contents text not null check(octet_length(contents) between 1 and 102400),
 sha256 text not null, provenance text not null check(length(provenance) between 10 and 2000),
 evidence_date date not null, version text not null check(length(version) between 1 and 80),
 responsible text not null check(length(responsible) between 3 and 200),
 created_at timestamptz not null default now()
);
create table private.qi_records (
 id uuid primary key default gen_random_uuid(), cohort_id uuid references private.qi_cohorts(id),
 kind text not null check(kind in ('history','improvement','incident','cel','commitment','evidence_review')),
 record_key text not null check(length(record_key) between 1 and 120),
 revision integer not null, previous_id uuid unique references private.qi_records(id),
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 evidence_id uuid references private.qi_evidence(id) on delete set null,evidence_manifest jsonb not null default '{}',
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create unique index qi_global_record_revision on private.qi_records(kind,record_key,revision) where cohort_id is null;
create unique index qi_cohort_record_revision on private.qi_records(cohort_id,kind,record_key,revision) where cohort_id is not null;
create table private.qi_reports (
 id uuid primary key default gen_random_uuid(),cohort_id uuid not null references private.qi_cohorts(id),
 period_start date not null,period_end date not null,revision integer not null,
 snapshot jsonb not null,sha256 text not null,
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 unique(cohort_id,period_start,revision),check(period_end=(period_start+interval '4 months')::date)
);
create table private.qi_approvals (
 report_id uuid primary key references private.qi_reports(id),
 approved_by uuid not null references auth.users(id),approved_at timestamptz not null default now(),
 note text not null check(length(note) between 10 and 2000)
);
create table private.qi_followup_notices (
 cohort_id uuid not null,user_id uuid not null,day integer not null check(day in (30,90,120)),
 created_at timestamptz not null default now(),
 foreign key(cohort_id,user_id) references private.qi_participants(cohort_id,user_id),primary key(cohort_id,user_id,day)
);
create table private.qi_audit (
 id bigint generated always as identity primary key,actor uuid references auth.users(id) on delete set null,
 action text not null,cohort_id uuid,object_id uuid,details jsonb not null default '{}',created_at timestamptz not null default now()
);
create index qi_cohort_program on private.qi_cohorts(program_id);
create index qi_cohort_institution on private.qi_cohorts(institution_id);
create index qi_staff_user on private.qi_staff(user_id);
create index qi_participant_user on private.qi_participants(user_id);
create index qi_attempt_user on private.qi_attempts(user_id);
create index qi_attempt_instrument on private.qi_attempts(instrument_id);
create index qi_review_attempt on private.qi_reviews(attempt_id,revision desc);
create index qi_survey_user on private.qi_surveys(user_id);
create index qi_evidence_owner on private.qi_evidence(owner_id);
create index qi_evidence_cohort on private.qi_evidence(cohort_id);
create index qi_record_cohort on private.qi_records(cohort_id,kind,record_key,revision desc);
create index qi_record_evidence on private.qi_records(evidence_id);
create index qi_report_cohort on private.qi_reports(cohort_id,period_start);
create index qi_program_author on private.qi_program_versions(created_by);
create index qi_instrument_author on private.qi_instruments(created_by);
create index qi_cohort_author on private.qi_cohorts(created_by);
create index qi_cohort_learning on private.qi_cohorts(learning_id);
create index qi_cohort_competency on private.qi_cohorts(competency_id);
create index qi_staff_grantor on private.qi_staff(granted_by);
create index qi_review_assessor on private.qi_reviews(assessor);
create index qi_record_author on private.qi_records(created_by);
create index qi_report_author on private.qi_reports(created_by);
create index qi_approval_author on private.qi_approvals(approved_by);
create index qi_audit_actor on private.qi_audit(actor);

-- Private, RLS deny-by-default tables. Only checked RPCs can read/write.
do $$ declare t record;begin
 for t in select tablename from pg_tables where schemaname='private' and tablename like 'qi_%' loop
  execute format('alter table private.%I enable row level security',t.tablename);
  execute format('revoke all on private.%I from public,anon,authenticated',t.tablename);
 end loop;
end $$;

create function qi_internal.actor() returns uuid language plpgsql stable security definer set search_path='' as $$
declare a uuid:=auth.uid();begin
 if a is null or not exists(select 1 from auth.users u join auth.sessions s on s.user_id=u.id
  where u.id=a and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<now())
  and s.id::text=auth.jwt()->>'session_id' and (s.not_after is null or s.not_after>now()))
 then raise exception 'Sesión verificada requerida' using errcode='28000';end if;
 return a;
end $$;
create function qi_internal.is_admin(a uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.campus_operators where user_id=a)
$$;
create function qi_internal.role_for(c uuid,a uuid) returns text language sql stable security definer set search_path='' as $$
 select case when qi_internal.is_admin(a) then 'admin' else (
 select s.role from private.qi_staff s join private.qi_cohorts q on q.id=s.cohort_id
 where s.cohort_id=c and s.user_id=a and s.active and (q.institution_id is null or exists(
  select 1 from private.campus_memberships m join private.campus_institutions i on i.id=m.institution_id
  where m.institution_id=q.institution_id and m.user_id=a and m.active and i.active and m.role in ('docente','administrador')))) end
$$;
create function qi_internal.participates(c uuid,a uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.qi_participants p join private.qi_cohorts q on q.id=p.cohort_id
 where p.cohort_id=c and p.user_id=a and (q.institution_id is null or exists(
 select 1 from private.campus_memberships m join private.campus_institutions i on i.id=m.institution_id
 where m.institution_id=q.institution_id and m.user_id=a and m.active and i.active)))
$$;
create function qi_internal.shareable(c uuid,a uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.qi_cohorts q where q.id=c and (q.institution_id is null or exists(
 select 1 from private.campus_memberships m join private.campus_institutions i on i.id=m.institution_id
 where m.institution_id=q.institution_id and m.user_id=a and m.active and m.share_metrics and i.active and m.role='estudiante')))
$$;
create function qi_internal.metric(k text,l text,v numeric,n numeric,d numeric,m numeric,u text,definition text,src text) returns jsonb
 language sql immutable set search_path='' as $$ select jsonb_build_object('key',k,'label',l,'value',round(v,2),'numerator',n,'denominator',d,'missing',m,'unit',u,'definition',definition,'source',src) $$;

-- Summary contains aggregates only. No survey text, responses, emails or student identifiers.
create function qi_internal.summary(c uuid,from_date date,to_date date) returns jsonb language plpgsql security definer set search_path='' as $$
declare q private.qi_cohorts;pr private.qi_program_versions; metrics jsonb; paired jsonb; followups jsonb; competencies jsonb;
 n int;initiated int;completed int;passed int;np int;nf int;ns int;pre_avg numeric;post_avg numeric;sat numeric;
 pairs int;delta numeric;rel numeric;rel_n int;records jsonb;digest text;continuity jsonb;documents jsonb;incident_n int;resolved_n int;resolution_hours numeric;improved_n int;
begin
 select * into q from private.qi_cohorts where id=c;
 if q.id is null then raise exception 'Cohorte no encontrada';end if;
 if from_date is null or to_date is null or to_date<=from_date or to_date>from_date+interval '25 months' then raise exception 'Periodo inválido';end if;
 select * into pr from private.qi_program_versions where id=q.program_id;
 -- Cohort population is fixed by enrolment observed before the exclusive period end;
 -- the period scopes outcomes, not an invented historical enrolment date.
 with p as(select * from private.qi_participants p where p.cohort_id=c and p.registered_at<to_date and qi_internal.shareable(c,p.user_id))
 select count(*),count(*) filter(where started_at<to_date),
 count(*) filter(where exists(select 1 from public.course_completions x where x.user_id=p.user_id and x.course_slug=pr.course_slug and x.content_version=pr.dossier->>'content_version' and x.completed_at>=from_date and x.completed_at<to_date)),
 count(*) filter(where exists(select 1 from public.course_assessment_attempts x where x.user_id=p.user_id and x.course_slug=pr.course_slug and x.content_version=pr.dossier->>'content_version' and x.submitted_at>=from_date and x.submitted_at<to_date and x.passed))
 into n,initiated,completed,passed from p;
 with scored as(
 select a.user_id,a.phase,coalesce((select r.score from private.qi_reviews r where r.attempt_id=a.id order by revision desc limit 1),
 case when jsonb_array_length(i.specification->'rubric')=0 then 100*a.objective_points/nullif(a.objective_max,0) end) score
 from private.qi_attempts a join private.qi_instruments i on i.id=a.instrument_id join private.qi_participants p on p.cohort_id=a.cohort_id and p.user_id=a.user_id
 where a.cohort_id=c and a.instrument_id=q.learning_id and a.created_at>=from_date and a.created_at<to_date and p.registered_at<to_date and qi_internal.shareable(c,a.user_id)),
 pairs_cte as(select x.user_id,x.score pre,y.score post from scored x join scored y on y.user_id=x.user_id and y.phase='post' where x.phase='pre' and x.score is not null and y.score is not null)
 select (select count(score) from scored where phase='pre'),(select count(score) from scored where phase='post'),
 (select avg(score) from scored where phase='pre'),(select avg(score) from scored where phase='post'),
 count(*),avg(post-pre),avg(100*(post-pre)/nullif(pre,0)),count(*) filter(where pre<>0)
 into np,nf,pre_avg,post_avg,pairs,delta,rel,rel_n from pairs_cte;
 select count(*),avg((s.answers->>'global')::numeric) into ns,sat from private.qi_surveys s join private.qi_participants p on p.cohort_id=s.cohort_id and p.user_id=s.user_id
 where s.cohort_id=c and s.kind='experience' and s.created_at>=from_date and s.created_at<to_date and p.registered_at<to_date and qi_internal.shareable(c,s.user_id);
 metrics:=jsonb_build_array(
 qi_internal.metric('enrolled','Participantes registrados',n,n,n,0,'personas','Personas vinculadas a esta cohorte antes del fin; no equivale a todas las matrículas Hotmart.','qi_participants / course_access'),
 qi_internal.metric('started','Inicio registrado',initiated,initiated,n,n-initiated,'personas','Inicio prospectivo registrado; no se reconstruye desde una fecha de actualización.','qi_participants.started_at'),
 qi_internal.metric('completion','Finalización verificada',100.0*completed/nullif(n,0),completed,n,n-completed,'%','Finalizaciones de la misma versión verificadas en Academy dentro del periodo / participantes registrados.','course_completions'),
 qi_internal.metric('approval','Aprobación verificada',100.0*passed/nullif(n,0),passed,n,n-passed,'%','Participantes con intento aprobado de la evaluación vigente de Academy dentro del periodo / registrados. Sin intento no implica reprobación.','course_assessment_attempts.passed'),
 qi_internal.metric('pre','Promedio inicial',pre_avg,np,np,n-np,'/100','Media de puntuaciones iniciales completas, instrumento fijo de la cohorte.','qi_attempts / qi_reviews'),
 qi_internal.metric('post','Promedio final',post_avg,nf,nf,n-nf,'/100','Media de puntuaciones finales completas, instrumento fijo de la cohorte.','qi_attempts / qi_reviews'),
 qi_internal.metric('change','Cambio absoluto pareado',delta,pairs,pairs,n-pairs,'puntos','Media pos menos pre de las mismas personas con el mismo instrumento y versión, ambos dentro del periodo.','qi_attempts / qi_reviews'),
 qi_internal.metric('relative','Cambio relativo pareado',rel,rel_n,rel_n,pairs-rel_n,'%','Media de 100*(pos-pre)/pre; se excluyen bases iguales a cero y se informa su cantidad como datos faltantes.','qi_attempts / qi_reviews'),
 qi_internal.metric('satisfaction','Satisfacción global voluntaria',sat,ns,n,n-ns,'/5','Media de satisfacción global de quienes responden; no mide aprendizaje.','qi_surveys / experience-v1'));
 select coalesce(jsonb_agg(r),'[]') into followups from (
 select day,
 (select count(*) from private.qi_participants p join public.course_completions x on x.user_id=p.user_id and x.course_slug=pr.course_slug and x.content_version=pr.dossier->>'content_version'
 where p.cohort_id=c and p.registered_at<to_date and qi_internal.shareable(c,p.user_id) and x.completed_at+make_interval(days=>day)>=from_date and x.completed_at+make_interval(days=>day)<to_date) eligible,
 (select count(*) from private.qi_surveys s join private.qi_participants p on p.cohort_id=s.cohort_id and p.user_id=s.user_id where s.cohort_id=c and s.kind='followup' and s.day=days.day and s.created_at<to_date and p.registered_at<to_date and qi_internal.shareable(c,s.user_id) and exists(select 1 from public.course_completions x where x.user_id=s.user_id and x.course_slug=pr.course_slug and x.content_version=pr.dossier->>'content_version' and x.completed_at+make_interval(days=>days.day)>=from_date and x.completed_at+make_interval(days=>days.day)<to_date)) responses,
 (select count(*) from private.qi_surveys s join private.qi_participants p on p.cohort_id=s.cohort_id and p.user_id=s.user_id where s.cohort_id=c and s.kind='followup' and s.day=days.day and (s.answers->>'applied')::boolean and s.created_at<to_date and p.registered_at<to_date and qi_internal.shareable(c,s.user_id) and exists(select 1 from public.course_completions x where x.user_id=s.user_id and x.course_slug=pr.course_slug and x.content_version=pr.dossier->>'content_version' and x.completed_at+make_interval(days=>days.day)>=from_date and x.completed_at+make_interval(days=>days.day)<to_date)) applied
 from (values(30),(90),(120)) days(day)) r;
 select coalesce(jsonb_agg(r),'[]') into competencies from (
 select dim->>'dimension' dimension,dim->>'id' dimension_id,count(*) observations,
 round(avg((v.scores->>(dim->>'id'))::numeric),2) average,(dim->>'maximum')::numeric maximum,
 jsonb_agg((v.scores->>(dim->>'id'))::numeric order by a.created_at) distribution
 from private.qi_attempts a join private.qi_instruments i on i.id=a.instrument_id
 join lateral(select * from private.qi_reviews where attempt_id=a.id order by revision desc limit 1) v on true
 cross join lateral jsonb_array_elements(i.specification->'rubric') dim
 where a.cohort_id=c and a.phase='competency' and a.created_at>=from_date and a.created_at<to_date and qi_internal.shareable(c,a.user_id)
 group by dim->>'id',dim->>'dimension',dim->>'maximum') r;
 select coalesce(jsonb_agg(to_jsonb(r)-'created_by'),'[]') into records from (
 select distinct on(kind,record_key) id,kind,record_key,revision,payload,evidence_id,created_at,created_by
 from private.qi_records where cohort_id=c order by kind,record_key,revision desc) r
 where (r.kind='history' and (r.payload->>'event_date')::date>=from_date and (r.payload->>'event_date')::date<to_date)
 or (r.kind='incident' and (r.payload->>'opened_at')::timestamptz>=from_date and (r.payload->>'opened_at')::timestamptz<to_date)
 or (r.kind='improvement' and coalesce(nullif(r.payload->>'implemented_on','')::date,r.created_at::date)>=from_date and coalesce(nullif(r.payload->>'implemented_on','')::date,r.created_at::date)<to_date)
 or (r.kind in('commitment','evidence_review') and r.created_at>=from_date and r.created_at<to_date);
 select count(*),count(*) filter(where nullif(r->'payload'->>'resolved_at','') is not null),avg(extract(epoch from ((r->'payload'->>'resolved_at')::timestamptz-(r->'payload'->>'opened_at')::timestamptz))/3600) filter(where nullif(r->'payload'->>'resolved_at','') is not null)
 into incident_n,resolved_n,resolution_hours from jsonb_array_elements(records) r where r->>'kind'='incident';
 select count(*) into improved_n from jsonb_array_elements(records) r where r->>'kind'='improvement' and r->'payload'->>'status' in('implemented','reevaluated');
 metrics:=metrics||jsonb_build_array(
 qi_internal.metric('incidents','Incidencias registradas',incident_n,incident_n,incident_n,0,'incidencias','Incidencias de calidad detectadas en el periodo; no se infieren tiempos desde la última actualización del soporte.','qi_records / incident'),
 qi_internal.metric('resolution','Tiempo medio de resolución',resolution_hours,resolved_n,incident_n,incident_n-resolved_n,'horas','Media de fecha de resolución menos fecha de detección; se excluyen incidencias sin fecha de cierre.','qi_records / incident'),
 qi_internal.metric('improvements','Mejoras implementadas',improved_n,improved_n,improved_n,0,'acciones','Última revisión de cada acción implementada o reevaluada en el periodo.','qi_records / improvement'));
 select coalesce(jsonb_agg(jsonb_build_object('month',t.month_label,'documented',t.documented) order by t.month_label),'[]') into continuity from (
 select to_char(month_point,'YYYY-MM') month_label,exists(
  select 1 from (select distinct on(record_key) * from private.qi_records where cohort_id=c and kind='history' order by record_key,revision desc) history
  join private.qi_evidence e on e.id=history.evidence_id
  where q.data_mode='real' and (history.payload->>'event_date')::date>=month_point and (history.payload->>'event_date')::date<month_point+interval '1 month'
  and (select r.payload->>'status' from private.qi_records r where r.cohort_id=c and r.kind='evidence_review' and r.evidence_id=e.id order by r.created_at desc limit 1)='accepted') documented
 from generate_series(date_trunc('month',to_date::timestamp)-interval '24 months',date_trunc('month',to_date::timestamp)-interval '1 month',interval '1 month') month_point) t;
 select coalesce(jsonb_agg(t),'[]') into documents from (
 select e.classification,count(*) available,count(*) filter(where (select r.payload->>'status' from private.qi_records r where r.cohort_id=c and r.kind='evidence_review' and r.evidence_id=e.id order by r.created_at desc limit 1)='accepted') reviewed
 from private.qi_evidence e where e.cohort_id=c and e.evidence_date>=from_date and e.evidence_date<to_date group by e.classification) t;
 select encode(sha256(convert_to(coalesce(jsonb_agg(t order by t::text)::text,'[]'),'UTF8')),'hex') into digest from (
 select jsonb_build_object('attempt',a.id,'instrument',a.instrument_id,'answers_hash',encode(sha256(convert_to(a.answers::text,'UTF8')),'hex'),'review',r.id,'score',r.score) t
 from private.qi_attempts a left join lateral(select id,score from private.qi_reviews where attempt_id=a.id order by revision desc limit 1) r on true
 where a.cohort_id=c and a.created_at>=from_date and a.created_at<to_date and qi_internal.shareable(c,a.user_id)) src;
 return jsonb_build_object('schema_version','qi-summary-v1','updated_at',now(),'cohort',to_jsonb(q),'program',to_jsonb(pr),
 'period',jsonb_build_object('from',from_date,'to_exclusive',to_date),'metrics',metrics,
 'paired',jsonb_build_object('n',pairs,'relative_n',rel_n,'missing',n-pairs,'instrument_id',q.learning_id),
 'followups',followups,'competencies',competencies,'records',records,'source_digest',digest,'continuity',continuity,'evidence_summary',documents,
 'limitations',jsonb_build_array('No se infiere competencia clínica ni resultados en pacientes desde una prueba.','Seguimiento voluntario: transferencia profesional autoinformada.','El registro de licencias es mutable; la matrícula histórica y la fecha de inicio pueden faltar.','Los periodos anteriores sin evidencia permanecen sin acreditar.','CEL: requisitos preliminares pendientes de validación oficial.','Aprobación y certificados conservan sus reglas de Academy.'));
end $$;

create function qi_internal.validate_instrument(s jsonb,kind text) returns void language plpgsql set search_path='' as $$
declare q jsonb;r jsonb;lev jsonb;seen text[]:='{}';mx numeric:=0;begin
 if jsonb_typeof(s) is distinct from 'object' or jsonb_typeof(s->'questions') is distinct from 'array' or jsonb_typeof(s->'rubric') is distinct from 'array'
 or jsonb_array_length(s->'questions')>60 or jsonb_array_length(s->'rubric')>12 then raise exception 'Instrumento inválido';end if;
 for q in select * from jsonb_array_elements(s->'questions') loop
  if q->>'id' is null or q->>'id'=any(seen) or (q->>'id')!~'^[a-z][a-z0-9_]{0,49}$' or length(coalesce(q->>'prompt','')) not between 10 and 3000
  or jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options') not between 2 and 8
  or coalesce(q->>'answer','')!~'^[0-9]$' or (q->>'answer')::int>=jsonb_array_length(q->'options')
  or coalesce(q->>'points','')!~'^[0-9]{1,3}$' or (q->>'points')::int not between 1 and 100
  or length(coalesce(q->>'feedback','')) not between 10 and 3000 then raise exception 'Pregunta inválida';end if;
  if exists(select 1 from jsonb_array_elements(q->'options') o where jsonb_typeof(o)<>'string' or length(o#>>'{}') not between 1 and 1500) then raise exception 'Opciones inválidas';end if;
  seen:=array_append(seen,q->>'id');mx:=mx+(q->>'points')::numeric;
 end loop;
 seen:='{}';
 for r in select * from jsonb_array_elements(s->'rubric') loop
  if r->>'id' is null or r->>'id'=any(seen) or (r->>'id')!~'^[a-z][a-z0-9_]{0,49}$' or length(coalesce(r->>'dimension','')) not between 3 and 200
  or coalesce(r->>'maximum','')!~'^[0-9]{1,3}$' or (r->>'maximum')::int not between 1 and 100
  or jsonb_typeof(r->'levels') is distinct from 'array' or jsonb_array_length(r->'levels') not between 2 and 10 then raise exception 'Rúbrica inválida';end if;
  for lev in select * from jsonb_array_elements(r->'levels') loop
   if jsonb_typeof(lev->'score') is distinct from 'number' or (lev->>'score')::numeric<0 or (lev->>'score')::numeric>(r->>'maximum')::numeric
   or length(coalesce(lev->>'descriptor','')) not between 5 and 2000 then raise exception 'Nivel de rúbrica inválido';end if;
  end loop;
  if not exists(select 1 from jsonb_array_elements(r->'levels') l where (l->>'score')::numeric=0) or not exists(select 1 from jsonb_array_elements(r->'levels') l where l->>'score'=r->>'maximum') then raise exception 'Rúbrica sin extremos explícitos';end if;
  seen:=array_append(seen,r->>'id');mx:=mx+(r->>'maximum')::numeric;
 end loop;
 if mx=0 or (kind='competency' and jsonb_array_length(s->'rubric')=0) or (jsonb_array_length(s->'rubric')>0 and length(coalesce(s->>'case_prompt',''))<30) then raise exception 'Falta caso o criterios explícitos';end if;
end $$;

create function qi_internal.notify(c uuid) returns void language plpgsql security definer set search_path='' as $$
declare q private.qi_cohorts;pr private.qi_program_versions;source jsonb;
begin
 select * into q from private.qi_cohorts where id=c;
  select * into pr from private.qi_program_versions where id=q.program_id;
  for source in select jsonb_build_object('user_id',p.user_id,'email',u.email,'day',d.day) from private.qi_participants p join auth.users u on u.id=p.user_id
   cross join (values(30),(90),(120)) d(day)
   where p.cohort_id=c and p.followup_consent and qi_internal.participates(c,p.user_id)
   and exists(select 1 from public.course_completions x where x.user_id=p.user_id and x.course_slug=pr.course_slug and x.content_version=pr.dossier->>'content_version' and x.completed_at+make_interval(days=>d.day)<=now())
   and not exists(select 1 from private.qi_surveys s where s.cohort_id=c and s.user_id=p.user_id and s.kind='followup' and s.day=d.day)
   and not exists(select 1 from private.qi_followup_notices n where n.cohort_id=c and n.user_id=p.user_id and n.day=d.day)
  loop
   insert into private.qi_followup_notices(cohort_id,user_id,day) values(c,(source->>'user_id')::uuid,(source->>'day')::int) on conflict do nothing;
   if found then
    insert into public.kinecheck_notifications(email,notification_type,title,body,course_slug,action_url,action_label,dedupe_key,metadata)
    values(source->>'email','quality_followup','Seguimiento voluntario de tu aprendizaje','Tu seguimiento está disponible. Puedes retirar el consentimiento en Calidad y aprendizaje.',pr.course_slug,'/academy/calidad/','Responder seguimiento','qi:'||c::text||':'||(source->>'user_id')||':'||(source->>'day'),jsonb_build_object('day',source->'day')) on conflict(dedupe_key) do nothing;
   end if;
  end loop;

end $$;

create function qi_internal.configure(action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=qi_internal.actor(); admin boolean; role text;c uuid;obj uuid;subject uuid;
 q private.qi_cohorts;pr private.qi_program_versions;inst private.qi_instruments;att private.qi_attempts;
 rec private.qi_records;report private.qi_reports;source jsonb;v jsonb;it jsonb;ans jsonb;out jsonb;prev uuid;
 item_index int;points numeric:=0;mx numeric:=0;score numeric;revision int;day int;start_date date;end_date date;em text;
begin
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>160000 then raise exception 'Datos inválidos';end if;
 admin:=qi_internal.is_admin(actor);c:=nullif(p_payload->>'cohort_id','')::uuid;
 if c is not null then select * into q from private.qi_cohorts where id=c;if q.id is null then raise exception 'Acceso restringido' using errcode='42501';end if;end if;
 role:=qi_internal.role_for(c,actor);
 if role is not null then insert into private.qi_audit(actor,action,cohort_id) values(actor,action,c);end if;
 if action='context' then
  return jsonb_build_object('admin',admin,'privacy_version','qi-2026-10-28','retention_months',24,
  'courses',case when admin then (select coalesce(jsonb_agg(jsonb_build_object('course_slug',course_slug,'title',title,'content_version',content_version,'audited_minutes',audited_minutes,'methodology',methodology)),'[]') from public.course_academic_load) else '[]'::jsonb end,
  'programs',(select coalesce(jsonb_agg(p order by p.created_at desc),'[]') from private.qi_program_versions p where admin or exists(select 1 from private.qi_cohorts x where x.program_id=p.id and (qi_internal.role_for(x.id,actor) is not null or qi_internal.participates(x.id,actor)))),
  'cohorts',(select coalesce(jsonb_agg(to_jsonb(x)||jsonb_build_object('role',qi_internal.role_for(x.id,actor),'participant',qi_internal.participates(x.id,actor)) order by x.starts_on desc),'[]') from private.qi_cohorts x where admin or qi_internal.role_for(x.id,actor) is not null or qi_internal.participates(x.id,actor)),
  'institutions',case when admin then (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name)),'[]') from private.campus_institutions where active) else '[]'::jsonb end,
  'instruments',case when admin then (select coalesce(jsonb_agg(to_jsonb(i)-'specification'-'validation_source'-'created_by'),'[]') from private.qi_instruments i) else '[]'::jsonb end);
 elsif action='program_create' then
  if not admin then raise exception 'Acceso restringido' using errcode='42501';end if;
  source:=p_payload->'dossier';
  if jsonb_typeof(source) is distinct from 'object' or exists(select 1 from unnest(array['name','responsibles','valid_from','valid_to','objectives','outcomes','competencies','audience','entry_requirements','contents','workload','methodologies','evaluation','bibliography','change_reason','content_version']) k where length(coalesce(source->>k,''))<2)
  or length(source::text)>50000 or (source->>'valid_to')::date<(source->>'valid_from')::date then raise exception 'Completa el expediente y la procedencia';end if;
  insert into private.qi_program_versions(course_slug,version,dossier,source,created_by) values(p_payload->>'course_slug',p_payload->>'version',source,p_payload->>'source',actor) returning id into obj;
  return jsonb_build_object('id',obj);
 elsif action='instrument_create' then
  if not admin then raise exception 'Acceso restringido' using errcode='42501';end if;
  perform qi_internal.validate_instrument(p_payload->'specification',p_payload->>'kind');
  insert into private.qi_instruments(program_id,kind,version,title,specification,validation_source,created_by) values((p_payload->>'program_id')::uuid,p_payload->>'kind',p_payload->>'version',p_payload->>'title',p_payload->'specification',p_payload->>'validation_source',actor) returning id into obj;
  return jsonb_build_object('id',obj);
 elsif action='cohort_create' then
  if not admin then raise exception 'Acceso restringido' using errcode='42501';end if;
  if exists(select 1 from private.qi_instruments i where i.id in (nullif(p_payload->>'learning_id','')::uuid,nullif(p_payload->>'competency_id','')::uuid) and i.program_id<>(p_payload->>'program_id')::uuid)
  or (nullif(p_payload->>'learning_id','') is not null and not exists(select 1 from private.qi_instruments where id=(p_payload->>'learning_id')::uuid and kind='learning'))
  or (nullif(p_payload->>'competency_id','') is not null and not exists(select 1 from private.qi_instruments where id=(p_payload->>'competency_id')::uuid and kind='competency')) then raise exception 'Instrumento de otra versión o tipo';end if;
  insert into private.qi_cohorts(program_id,institution_id,name,starts_on,ends_on,learning_id,competency_id,data_mode,created_by)
  values((p_payload->>'program_id')::uuid,nullif(p_payload->>'institution_id','')::uuid,p_payload->>'name',(p_payload->>'starts_on')::date,(p_payload->>'ends_on')::date,nullif(p_payload->>'learning_id','')::uuid,nullif(p_payload->>'competency_id','')::uuid,coalesce(p_payload->>'data_mode','real'),actor) returning id into obj;
  return jsonb_build_object('id',obj);
 elsif action='staff_set' then
  if not admin or c is null then raise exception 'Acceso restringido' using errcode='42501';end if;
  select id into subject from auth.users where lower(email)=lower(trim(p_payload->>'email')) and email_confirmed_at is not null;
  if subject is null then raise exception 'Cuenta confirmada requerida';end if;
  insert into private.qi_staff(cohort_id,user_id,role,active,granted_by) values(c,subject,p_payload->>'role',coalesce((p_payload->>'active')::boolean,true),actor)
  on conflict(cohort_id,user_id) do update set role=excluded.role,active=excluded.active,granted_by=actor,updated_at=now();
  return jsonb_build_object('saved',true);
 elsif action='participant_add' then
  if role not in ('admin','academic') or role is null or c is null then raise exception 'Acceso restringido' using errcode='42501';end if;
  select * into pr from private.qi_program_versions where id=q.program_id;
  select id,lower(email) into subject,em from auth.users where lower(email)=lower(trim(p_payload->>'email')) and email_confirmed_at is not null;
  select jsonb_build_object('source','course_access','access_source',access_source,'transaction_id',transaction_id,'observed_at',now()) into source
  from public.course_access where lower(email)=em and course_slug=pr.course_slug and active and (access_expires_at is null or access_expires_at>now())
  and (q.data_mode='test' or (lower(access_source) not in ('owner','beta','manual_test','hotmart_test','manual_review') and coalesce(last_event,'') not in ('OWNER_ACCESS','HOTMART_AREA_TEST','HOTMART_REVIEW_ACCESS')));
  if subject is null or source is null then raise exception 'No hay matrícula habilitada verificable';end if;
  if q.institution_id is not null and not exists(select 1 from private.campus_memberships m join private.campus_institutions i on i.id=m.institution_id where m.institution_id=q.institution_id and m.user_id=subject and m.role='estudiante' and m.active and m.share_metrics and i.active) then raise exception 'Vínculo institucional no autorizado';end if;
  insert into private.qi_participants(cohort_id,user_id,source_ref) values(c,subject,source::text) on conflict do nothing;
  return jsonb_build_object('saved',true);
 elsif action='cel_records' then
  if not admin then raise exception 'Acceso restringido' using errcode='42501';end if;
  return coalesce((select jsonb_agg(r) from(select distinct on(record_key) * from private.qi_records where kind='cel' and cohort_id is null order by record_key,revision desc) r),'[]');
 end if;
 return null;
end $$;

create function qi_internal.records(action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=qi_internal.actor(); admin boolean; role text;c uuid;obj uuid;subject uuid;
 q private.qi_cohorts;pr private.qi_program_versions;inst private.qi_instruments;att private.qi_attempts;
 rec private.qi_records;report private.qi_reports;source jsonb;v jsonb;it jsonb;ans jsonb;out jsonb;prev uuid;
 item_index int;points numeric:=0;mx numeric:=0;score numeric;revision int;day int;start_date date;end_date date;em text;
begin
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>160000 then raise exception 'Datos inválidos';end if;
 admin:=qi_internal.is_admin(actor);c:=nullif(p_payload->>'cohort_id','')::uuid;
 if c is not null then select * into q from private.qi_cohorts where id=c;if q.id is null then raise exception 'Acceso restringido' using errcode='42501';end if;end if;
 role:=qi_internal.role_for(c,actor);
 if role is not null then insert into private.qi_audit(actor,action,cohort_id) values(actor,action,c);end if;
 if action in ('record_save','evidence_upload','evidence_file') and c is null then
  if not admin then raise exception 'Acceso restringido' using errcode='42501';end if;
 elsif c is null or (role is null and not qi_internal.participates(c,actor)) then raise exception 'Acceso restringido' using errcode='42501';end if;
 if action='record_save' then
  if (c is null and not admin) or (c is not null and (role is null or role not in ('admin','academic'))) then raise exception 'Acceso restringido' using errcode='42501';end if;
  source:=p_payload->'record';
  if jsonb_typeof(source) is distinct from 'object' or length(source::text)>20000 or length(coalesce(source->>'title','')) not between 3 and 300 then raise exception 'Registro inválido';end if;
  obj:=nullif(p_payload->>'evidence_id','')::uuid;
  if obj is not null and not exists(select 1 from private.qi_evidence e where e.id=obj and e.cohort_id is not distinct from c) then raise exception 'Evidencia de otro ámbito' using errcode='42501';end if;
  if p_payload->>'kind'='cel' then
   if not admin or c is not null or source->>'status' is null or source->>'status' not in ('sin_evidencia','parcial','disponible','pendiente_validacion','validado_documentalmente') or source->>'basis' is distinct from 'preliminary_unverified' then raise exception 'Requisito CEL preliminar inválido';end if;
   if source->>'status'<>'sin_evidencia' and obj is null then raise exception 'Asocia una evidencia';end if;
   if source->>'status'='validado_documentalmente' and (length(coalesce(source->>'external_validation',''))<20 or not exists(select 1 from private.qi_evidence where id=obj and classification='official_requirement')) then raise exception 'Falta validación documental oficial';end if;
  elsif p_payload->>'kind'='history' then
   if obj is null or source->>'origin' is null or source->>'origin' not in ('recovered','new') or nullif(source->>'event_date','') is null or (source->>'event_date')::date>current_date then raise exception 'Historia sin procedencia verificable';end if;
  elsif p_payload->>'kind'='improvement' then
   if length(coalesce(source->>'problem',''))<5 or length(coalesce(source->>'source_indicator',''))<3 or length(coalesce(source->>'responsible',''))<3 or length(coalesce(source->>'proposed_action',''))<5 or source->>'status' is null or source->>'status' not in ('proposed','in_progress','implemented','reevaluated') then raise exception 'Acción de mejora incompleta';end if;
   if source->>'status' in ('implemented','reevaluated') and (nullif(source->>'implemented_on','') is null or (source->>'implemented_on')::date>current_date) then raise exception 'Falta fecha real de implementación';end if;
   if source->>'status'='reevaluated' and (length(coalesce(source->>'reevaluation',''))<10 or obj is null) then raise exception 'Falta evidencia de reevaluación';end if;
  elsif p_payload->>'kind'='incident' then
   if nullif(source->>'opened_at','') is null or (source->>'opened_at')::timestamptz>now() or (nullif(source->>'resolved_at','') is not null and ((source->>'resolved_at')::timestamptz<(source->>'opened_at')::timestamptz or (source->>'resolved_at')::timestamptz>now())) then raise exception 'Fechas de incidencia inválidas';end if;
  elsif p_payload->>'kind'='evidence_review' then
   if obj is null or source->>'status' is null or source->>'status' not in ('accepted','rejected') or length(coalesce(source->>'rationale',''))<10 then raise exception 'Revisión documental incompleta';end if;
  elsif p_payload->>'kind'<>'commitment' then raise exception 'Tipo de registro no permitido';end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(c::text,'global')||(p_payload->>'kind')||(p_payload->>'record_key'),0));
  select * into rec from private.qi_records old_record where cohort_id is not distinct from c and kind=p_payload->>'kind' and record_key=p_payload->>'record_key' order by old_record.revision desc limit 1;
  prev:=nullif(p_payload->>'previous_id','')::uuid;
  if rec.id is distinct from prev then raise exception 'El registro cambió. Recarga antes de guardar';end if;
  insert into private.qi_records(cohort_id,kind,record_key,revision,previous_id,payload,evidence_id,evidence_manifest,created_by)
  values(c,p_payload->>'kind',p_payload->>'record_key',coalesce(rec.revision,0)+1,prev,source,obj,coalesce((select to_jsonb(e)-'contents'-'owner_id' from private.qi_evidence e where id=obj),'{}'),actor) returning id into obj;
  return jsonb_build_object('id',obj);
 elsif action='report_create' then
  if role not in ('admin','academic') or role is null then raise exception 'Acceso restringido' using errcode='42501';end if;
  start_date:=(p_payload->>'from')::date;end_date:=(start_date+interval '4 months')::date;
  if end_date>current_date then raise exception 'El periodo cuatrimestral aún no finaliza';end if;
  source:=qi_internal.summary(c,start_date,end_date);
  perform pg_advisory_xact_lock(hashtextextended(c::text||start_date::text,0));
  select coalesce(max(r.revision),0)+1 into revision from private.qi_reports r where cohort_id=c and period_start=start_date;
  insert into private.qi_reports(cohort_id,period_start,period_end,revision,snapshot,sha256,created_by)
  values(c,start_date,end_date,revision,source,encode(sha256(convert_to(source::text,'UTF8')),'hex'),actor) returning id into obj;
  return jsonb_build_object('id',obj,'revision',revision);
 elsif action in ('report_read','report_approve') then
  if role is null then raise exception 'Acceso restringido' using errcode='42501';end if;
  select * into report from private.qi_reports where id=(p_payload->>'id')::uuid and cohort_id=c;
  if report.id is null then raise exception 'Acceso restringido' using errcode='42501';end if;
  if action='report_approve' then
   if not admin then raise exception 'Aprobación administrativa requerida' using errcode='42501';end if;
   insert into private.qi_approvals(report_id,approved_by,note) values(report.id,actor,p_payload->>'note');
  end if;
  return to_jsonb(report)||jsonb_build_object('approval',(select to_jsonb(a) from private.qi_approvals a where report_id=report.id));
 elsif action='notify_due' then
  if not admin then raise exception 'Acceso restringido' using errcode='42501';end if;
  perform qi_internal.notify(c);
  return jsonb_build_object('saved',true,'channel','existing_in_app_notifications');
 elsif action='erase_personal' then
  if not qi_internal.participates(c,actor) or p_payload->>'confirm' is distinct from 'ELIMINAR' then raise exception 'Confirmación requerida';end if;
  delete from public.kinecheck_notifications where dedupe_key like 'qi:'||c::text||':'||actor::text||':%';
  delete from private.qi_surveys where cohort_id=c and user_id=actor;
  delete from private.qi_attempts where cohort_id=c and user_id=actor;
  delete from private.qi_evidence where cohort_id=c and owner_id=actor;
  delete from private.qi_followup_notices where cohort_id=c and user_id=actor;
  update private.qi_participants set followup_consent=false,consent_at=now() where cohort_id=c and user_id=actor;
  insert into private.qi_audit(actor,action,cohort_id) values(actor,'personal_quality_data_erased',c);
  return jsonb_build_object('deleted',true);
 elsif action='retention_purge' then
  if not admin then raise exception 'Acceso restringido' using errcode='42501';end if;
  delete from private.qi_surveys where cohort_id=c and created_at<now()-interval '24 months';
  delete from private.qi_attempts where cohort_id=c and created_at<now()-interval '24 months';
  delete from private.qi_evidence where cohort_id=c and created_at<now()-interval '24 months';
  return jsonb_build_object('purged',true,'retention_months',24);
 end if;
 raise exception 'Acción no permitida' using errcode='42501';
end $$;

create function qi_internal.dispatch(action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=qi_internal.actor(); admin boolean; role text;c uuid;obj uuid;subject uuid;
 q private.qi_cohorts;pr private.qi_program_versions;inst private.qi_instruments;att private.qi_attempts;
 rec private.qi_records;report private.qi_reports;source jsonb;v jsonb;it jsonb;ans jsonb;out jsonb;prev uuid;
 item_index int;points numeric:=0;mx numeric:=0;score numeric;revision int;day int;start_date date;end_date date;em text;
begin
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>160000 then raise exception 'Datos inválidos';end if;
 admin:=qi_internal.is_admin(actor);c:=nullif(p_payload->>'cohort_id','')::uuid;
 if c is not null then select * into q from private.qi_cohorts where id=c;if q.id is null then raise exception 'Acceso restringido' using errcode='42501';end if;end if;
 role:=qi_internal.role_for(c,actor);
 if action in('context','program_create','instrument_create','cohort_create','staff_set','participant_add','cel_records') then return qi_internal.configure(action,p_payload);end if;
 if action in('record_save','report_create','report_read','report_approve','notify_due','erase_personal','retention_purge') then return qi_internal.records(action,p_payload);end if;
 if action in ('record_save','evidence_upload','evidence_file') and c is null then
  if not admin then raise exception 'Acceso restringido' using errcode='42501';end if;
 elsif c is null or (role is null and not qi_internal.participates(c,actor)) then raise exception 'Acceso restringido' using errcode='42501';end if;
 if action='workspace' then
  if role is null then raise exception 'Acceso restringido' using errcode='42501';end if;
  return jsonb_build_object('instruments',case when role in('admin','academic') then (select coalesce(jsonb_agg(i),'[]') from private.qi_instruments i where program_id=q.program_id) else '[]'::jsonb end,
   'pending',case when role in ('admin','academic') then (select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('reviews',coalesce((select jsonb_agg(r order by r.revision) from private.qi_reviews r where attempt_id=a.id),'[]'))),'[]') from private.qi_attempts a where cohort_id=c) else '[]'::jsonb end,
   'records',(select coalesce(jsonb_agg(r order by created_at desc),'[]') from private.qi_records r where cohort_id=c),
   'evidence',(select coalesce(jsonb_agg(to_jsonb(e)-'contents'-'owner_id'),'[]') from private.qi_evidence e where cohort_id=c),
   'reports',(select coalesce(jsonb_agg(to_jsonb(r)-'snapshot'||jsonb_build_object('approval',(select to_jsonb(a) from private.qi_approvals a where report_id=r.id)) order by r.created_at desc),'[]') from private.qi_reports r where cohort_id=c));
 elsif action='summary' then
  if role is null then raise exception 'Acceso restringido' using errcode='42501';end if;
  return qi_internal.summary(c,(p_payload->>'from')::date,(p_payload->>'to')::date);
 elsif action='learner' then
  if not qi_internal.participates(c,actor) then raise exception 'Acceso restringido' using errcode='42501';end if;
  return jsonb_build_object('participation',(select to_jsonb(p)-'source_ref' from private.qi_participants p where cohort_id=c and user_id=actor),
   'instruments',(select coalesce(jsonb_agg(to_jsonb(i)-'validation_source'-'created_by'-'specification'||jsonb_build_object('specification',(i.specification-'questions')||jsonb_build_object('questions',(select coalesce(jsonb_agg(x-'answer'-'feedback'),'[]') from jsonb_array_elements(i.specification->'questions') x)))),'[]') from private.qi_instruments i where id in(q.learning_id,q.competency_id)),
   'attempts',(select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('reviews',coalesce((select jsonb_agg(to_jsonb(r)-'assessor' order by r.revision) from private.qi_reviews r where attempt_id=a.id),'[]'))),'[]') from private.qi_attempts a where cohort_id=c and user_id=actor),
   'surveys',(select coalesce(jsonb_agg(s),'[]') from private.qi_surveys s where cohort_id=c and user_id=actor),
   'completed_at',(select min(completed_at) from public.course_completions x join private.qi_program_versions p on p.id=q.program_id where x.user_id=actor and x.course_slug=p.course_slug and x.content_version=p.dossier->>'content_version'),
   'server_time',now());
 elsif action in ('start','consent','submit','survey') then
  if not qi_internal.participates(c,actor) then raise exception 'Acceso restringido' using errcode='42501';end if;
  if action='start' then
   update private.qi_participants set started_at=coalesce(started_at,now()),start_source=coalesce(start_source,'quality_participation_observed') where cohort_id=c and user_id=actor;
   return jsonb_build_object('saved',true);
  elsif action='consent' then
   if p_payload->>'privacy_version' is distinct from 'qi-2026-10-28' then raise exception 'Acepta el aviso de privacidad vigente';end if;
   update private.qi_participants set followup_consent=coalesce((p_payload->>'consent')::boolean,false),consent_version='qi-2026-10-28',consent_at=now() where cohort_id=c and user_id=actor;
   insert into private.qi_audit(actor,action,cohort_id) values(actor,'followup_consent_changed',c);
   if p_payload->>'consent' is distinct from 'true' then
    delete from public.kinecheck_notifications where dedupe_key like 'qi:'||c::text||':'||actor::text||':%';
   end if;
   return jsonb_build_object('saved',true);
  elsif action='submit' then
   select * into inst from private.qi_instruments where id=(p_payload->>'instrument_id')::uuid;
   if inst.id is null or inst.program_id<>q.program_id or not((p_payload->>'phase' in ('pre','post') and inst.id=q.learning_id) or (p_payload->>'phase'='competency' and inst.id=q.competency_id)) then raise exception 'Instrumento no asignado';end if;
   ans:=p_payload->'answers';
   if jsonb_typeof(ans) is distinct from 'object' or jsonb_typeof(ans->'choices') is distinct from 'array' or jsonb_array_length(ans->'choices')<>jsonb_array_length(inst.specification->'questions') or length(coalesce(ans->>'case_response',''))>20000 or (jsonb_array_length(inst.specification->'rubric')>0 and length(trim(coalesce(ans->>'case_response','')))<30) then raise exception 'Responde todas las preguntas y el caso';end if;
   if p_payload->>'phase'='pre' and exists(select 1 from private.qi_attempts where cohort_id=c and user_id=actor and phase='post' and instrument_id=inst.id) then raise exception 'La evaluación inicial debe preceder a la final';end if;
   for item_index in 0..jsonb_array_length(inst.specification->'questions')-1 loop
    it:=inst.specification->'questions'->item_index;v:=ans->'choices'->item_index;
    if jsonb_typeof(v) is distinct from 'number' or v::text!~'^[0-9]$' or (v::text)::int>=jsonb_array_length(it->'options') then raise exception 'Respuesta inválida';end if;
    mx:=mx+(it->>'points')::numeric;if v=it->'answer' then points:=points+(it->>'points')::numeric;end if;
   end loop;
   insert into private.qi_attempts(cohort_id,user_id,instrument_id,phase,answers,objective_points,objective_max) values(c,actor,inst.id,p_payload->>'phase',ans,points,mx) returning id into obj;
   update private.qi_participants set started_at=coalesce(started_at,now()),start_source=coalesce(start_source,'quality_assessment_observed') where cohort_id=c and user_id=actor;
   return jsonb_build_object('id',obj,'pending_review',jsonb_array_length(inst.specification->'rubric')>0,'message','Respuesta registrada. La rúbrica admite decisiones diferentes justificadas. La revisión formativa no cambia la aprobación de Academy.');
  else
   ans:=p_payload->'answers';day:=coalesce((p_payload->>'day')::int,0);
   if jsonb_typeof(ans) is distinct from 'object' or length(ans::text)>14000 then raise exception 'Encuesta inválida';end if;
   if p_payload->>'kind'='experience' then
    for it in select to_jsonb(k) from unnest(array['access','objectives','contents','platform','assessments','relevance','feedback','support','global','recommend']) k loop
     if jsonb_typeof(ans->(it#>>'{}')) is distinct from 'number' or (ans->>(it#>>'{}'))!~'^[0-9]{1,2}$' or (ans->>(it#>>'{}'))::int<(case when it#>>'{}'='recommend' then 0 else 1 end) or (ans->>(it#>>'{}'))::int>(case when it#>>'{}'='recommend' then 10 else 5 end) then raise exception 'Escala de experiencia inválida';end if;
    end loop;
    ans:=jsonb_build_object('access',ans->'access','objectives',ans->'objectives','contents',ans->'contents','platform',ans->'platform','assessments',ans->'assessments','relevance',ans->'relevance','feedback',ans->'feedback','support',ans->'support','global',ans->'global','recommend',ans->'recommend');
   elsif p_payload->>'kind'='followup' then
    select * into pr from private.qi_program_versions where id=q.program_id;
    if day not in(30,90,120) or jsonb_typeof(ans->'applied') is distinct from 'boolean' or not exists(select 1 from private.qi_participants where cohort_id=c and user_id=actor and followup_consent)
    or not exists(select 1 from public.course_completions x where x.user_id=actor and x.course_slug=pr.course_slug and x.content_version=pr.dossier->>'content_version' and x.completed_at+make_interval(days=>day)<=now()) then raise exception 'Seguimiento no disponible o sin consentimiento';end if;
    if exists(select 1 from unnest(array['context','changes','barriers','useful','needs']) k where jsonb_typeof(ans->k) is distinct from 'string' or length(ans->>k) not between 2 and 2000) then raise exception 'Completa las seis preguntas';end if;
    ans:=jsonb_build_object('applied',ans->'applied','context',ans->'context','changes',ans->'changes','barriers',ans->'barriers','useful',ans->'useful','needs',ans->'needs');
   else raise exception 'Encuesta no reconocida';end if;
   insert into private.qi_surveys(cohort_id,user_id,kind,day,instrument_version,answers) values(c,actor,p_payload->>'kind',day,case when day=0 then 'experience-v1' else 'followup-v1' end,ans);
   return jsonb_build_object('saved',true);
  end if;
 elsif action='review' then
  if role not in ('admin','academic') or role is null then raise exception 'Acceso restringido' using errcode='42501';end if;
  select * into att from private.qi_attempts where id=(p_payload->>'attempt_id')::uuid and cohort_id=c for update;
  if att.id is null or att.user_id=actor then raise exception 'Revisión no permitida' using errcode='42501';end if;
  select * into inst from private.qi_instruments where id=att.instrument_id;source:=p_payload->'scores';
  if jsonb_typeof(source) is distinct from 'object' or (select count(*) from jsonb_object_keys(source))<>jsonb_array_length(inst.specification->'rubric') or jsonb_array_length(inst.specification->'rubric')=0 then raise exception 'Puntúa cada dimensión de la rúbrica';end if;
  points:=att.objective_points;mx:=att.objective_max;
  for it in select * from jsonb_array_elements(inst.specification->'rubric') loop
   if jsonb_typeof(source->(it->>'id')) is distinct from 'number' or not exists(select 1 from jsonb_array_elements(it->'levels') l where l->'score'=source->(it->>'id')) then raise exception 'Puntuación fuera de la rúbrica';end if;
   points:=points+(source->>(it->>'id'))::numeric;mx:=mx+(it->>'maximum')::numeric;
  end loop;
  select coalesce(max(r.revision),0)+1 into revision from private.qi_reviews r where attempt_id=att.id;
  insert into private.qi_reviews(attempt_id,scores,score,feedback,assessor,revision) values(att.id,source,round(100*points/mx,2),p_payload->>'feedback',actor,revision) returning id into obj;
  return jsonb_build_object('id',obj,'score',round(100*points/mx,2),'revision',revision);
 elsif action='evidence_upload' then
  if role is null and (p_payload->>'classification'<>'self_report' or not exists(select 1 from private.qi_participants where cohort_id=c and user_id=actor and followup_consent)) then raise exception 'Evidencia voluntaria no autorizada' using errcode='42501';end if;
  if p_payload->>'anonymized' is distinct from 'true' or (p_payload->>'filename')!~'^[a-zA-Z0-9_-]{1,90}\.txt$' or (p_payload->>'evidence_date')::date>current_date then raise exception 'Adjunta texto anonimizado y confirma su revisión';end if;
  if (select count(*) from private.qi_evidence where cohort_id is not distinct from c and owner_id=actor)>=50 then raise exception 'Límite de archivos alcanzado';end if;
  insert into private.qi_evidence(cohort_id,owner_id,classification,filename,contents,sha256,provenance,evidence_date,version,responsible)
  values(c,actor,p_payload->>'classification',p_payload->>'filename',p_payload->>'contents',encode(sha256(convert_to(p_payload->>'contents','UTF8')),'hex'),p_payload->>'provenance',(p_payload->>'evidence_date')::date,p_payload->>'version',p_payload->>'responsible') returning id into obj;
  return jsonb_build_object('id',obj,'status','pending_review');
 elsif action='evidence_file' then
  select to_jsonb(e) into out from private.qi_evidence e where id=(p_payload->>'id')::uuid and cohort_id is not distinct from c and (owner_id=actor or role in ('admin','academic'));
  if out is null then raise exception 'Acceso restringido' using errcode='42501';end if;return out;
 end if;
 raise exception 'Acción no permitida' using errcode='42501';
end $$;

-- Existing pg_cron infrastructure runs only this module's isolated maintenance.
-- No external email, no third-party submission, no automatic report approval.
create function qi_internal.maintenance() returns void language plpgsql security invoker set search_path='' as $$
declare c private.qi_cohorts;period_begin date;period_finish date;snapshot jsonb;
begin
 for c in select * from private.qi_cohorts where data_mode='real' loop
  perform qi_internal.notify(c.id);
  period_begin:=greatest(c.starts_on,c.created_at::date);
  while (period_begin+interval '4 months')::date<=current_date loop
   period_finish:=(period_begin+interval '4 months')::date;
   perform pg_advisory_xact_lock(hashtextextended(c.id::text||period_begin::text,0));
   if not exists(select 1 from private.qi_reports where cohort_id=c.id and qi_reports.period_start=period_begin) then
    snapshot:=qi_internal.summary(c.id,period_begin,period_finish);
    insert into private.qi_reports(cohort_id,period_start,period_end,revision,snapshot,sha256,created_by)
    values(c.id,period_begin,period_finish,1,snapshot,encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'),c.created_by);
   end if;
   period_begin:=period_finish;
  end loop;
  delete from private.qi_surveys where cohort_id=c.id and created_at<now()-interval '24 months';
  delete from private.qi_attempts where cohort_id=c.id and created_at<now()-interval '24 months';
  delete from private.qi_evidence where cohort_id=c.id and created_at<now()-interval '24 months';
 end loop;
 insert into private.qi_audit(action) values('scheduled_maintenance_completed');
end $$;
create function qi_internal.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
 insert into private.qi_audit(actor,action,cohort_id,object_id,details)
 values(auth.uid(),tg_table_name||':'||lower(tg_op),nullif(row_data->>'cohort_id','')::uuid,coalesce(nullif(row_data->>'id',''),nullif(row_data->>'user_id',''),nullif(row_data->>'report_id',''))::uuid,
 jsonb_strip_nulls(jsonb_build_object('role',row_data->'role','active',row_data->'active','followup_consent',row_data->'followup_consent','consent_version',row_data->'consent_version','version',row_data->'version','revision',row_data->'revision')));
 return case when tg_op='DELETE' then old else new end;
end $$;
create function qi_internal.prevent_rewrite() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='qi_records' and tg_op='UPDATE' and (to_jsonb(new)->>'evidence_id') is null and (to_jsonb(new)-'evidence_id')=(to_jsonb(old)-'evidence_id') then return new;end if;
 raise exception 'Registro inmutable: crea una nueva versión';
end $$;
do $$ declare t text;begin
 foreach t in array array['qi_program_versions','qi_instruments','qi_cohorts','qi_staff','qi_participants','qi_attempts','qi_reviews','qi_surveys','qi_evidence','qi_records','qi_reports','qi_approvals'] loop
  execute format('create trigger qi_audit_change after insert or update or delete on private.%I for each row execute function qi_internal.audit_change()',t);
 end loop;
 foreach t in array array['qi_program_versions','qi_instruments','qi_cohorts','qi_records','qi_reports','qi_approvals'] loop
  execute format('create trigger qi_immutable before update or delete on private.%I for each row execute function qi_internal.prevent_rewrite()',t);
 end loop;
end $$;
-- Local PostgreSQL tests may not have pg_cron. Hosted prerequisites are checked at release.
do $$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('kinecheck-quality-impact-maintenance','45 11 * * *','select qi_internal.maintenance();');
 end if;
end $$;

-- No exposed SECURITY DEFINER function: a single invoker wrapper delegates to
-- the isolated, authenticated dispatcher. Helpers have no caller EXECUTE rights.
revoke all on all functions in schema qi_internal from public,anon,authenticated;
grant usage on schema qi_internal to authenticated;
grant execute on function qi_internal.dispatch(text,jsonb) to authenticated;
create function public.quality_impact_api(action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select qi_internal.dispatch(action,payload) $$;
revoke all on function public.quality_impact_api(text,jsonb) from public,anon;
grant execute on function public.quality_impact_api(text,jsonb) to authenticated;
commit;
