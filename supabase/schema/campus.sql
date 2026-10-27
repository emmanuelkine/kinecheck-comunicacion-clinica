-- Campus owns only campus_* objects. Existing products, auth configuration,
-- entitlements and auth.users triggers are deliberately untouched.
create schema if not exists private;
create table private.campus_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (length(display_name) between 1 and 80),
 academic_level int not null check (academic_level between 1 and 6),
 privacy_version text not null default '2026-10-27',
 created_at timestamptz not null default now()
);
create table private.campus_operators (user_id uuid primary key references auth.users(id) on delete cascade);
create table private.campus_institutions (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 3 and 100),
 active boolean not null default true, created_at timestamptz not null default now()
);
create table private.campus_memberships (
 institution_id uuid not null references private.campus_institutions(id),
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('estudiante','docente','administrador')),
 share_metrics boolean not null default false,
 active boolean not null default true,
 joined_at timestamptz not null default now(), primary key(institution_id,user_id)
);
create index campus_memberships_user_idx on private.campus_memberships(user_id);
create table private.campus_invitations (
 id uuid primary key default gen_random_uuid(), institution_id uuid not null references private.campus_institutions(id),
 email text not null check(length(email) between 3 and 254), role text not null check(role in ('estudiante','docente','administrador')),
 token_hash text not null unique, created_by uuid not null references auth.users(id),
 expires_at timestamptz not null default now()+interval '7 days', used_at timestamptz,
 created_at timestamptz not null default now()
);
create index campus_invitations_institution_idx on private.campus_invitations(institution_id);
create index campus_invitations_creator_idx on private.campus_invitations(created_by);
create table private.campus_case_keys (id text primary key, level int not null, version text not null, questions jsonb not null);
create table private.campus_attempts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 case_id text not null references private.campus_case_keys(id),
 institution_id uuid references private.campus_institutions(id),
 score int not null check(score between 0 and 100), answers jsonb not null,
 version text not null, created_at timestamptz not null default now()
);
create index campus_attempts_user_case_idx on private.campus_attempts(user_id,case_id,created_at desc);
create index campus_attempts_institution_idx on private.campus_attempts(institution_id,user_id);
create index campus_memberships_consent_idx on private.campus_memberships(institution_id,active,share_metrics);
create table private.campus_assignments (
 id uuid primary key default gen_random_uuid(), institution_id uuid not null references private.campus_institutions(id),
 created_by uuid not null references auth.users(id), case_id text not null references private.campus_case_keys(id),
 title text not null check(length(title) between 3 and 120), created_at timestamptz not null default now(), active boolean not null default true
);
create index campus_assignments_institution_idx on private.campus_assignments(institution_id);
create index campus_assignments_creator_idx on private.campus_assignments(created_by);
create table private.campus_audit (
 id bigint generated always as identity primary key, actor uuid references auth.users(id) on delete set null,
 institution_id uuid references private.campus_institutions(id), action text not null, created_at timestamptz not null default now()
);
create index campus_audit_actor_idx on private.campus_audit(actor);
create index campus_audit_institution_idx on private.campus_audit(institution_id);

-- No table is exposed through PostgREST. Invoker RPC wrappers call this single
-- private entry point. SECURITY DEFINER is required because clients have no
-- direct table privileges; every action checks a current verified auth session.
create function private.campus_actor() returns uuid language plpgsql stable security definer set search_path='' as $$
declare actor uuid := auth.uid();
begin
 if actor is null or not exists(select 1 from auth.users u join auth.sessions s on s.user_id=u.id
   where u.id=actor and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<now())
   and s.id::text=auth.jwt()->>'session_id' and (s.not_after is null or s.not_after>now()))
 then raise exception 'Sesión verificada requerida' using errcode='28000'; end if;
 return actor;
end $$;
revoke all on function private.campus_actor() from public,anon,authenticated;

create function private.campus_dispatch(action text, payload jsonb default '{}') returns jsonb
 language plpgsql security definer set search_path='' as $$
declare
 actor uuid := private.campus_actor(); org uuid; actor_role text; operator boolean;
 result jsonb; token text; invitation private.campus_invitations;
 item private.campus_case_keys; answer jsonb; feedback jsonb:='[]'; i int; points int:=0; score int;
 subject uuid; cohort int;
begin
 select exists(select 1 from private.campus_operators where user_id=actor) into operator;
 if action='context' then
  return jsonb_build_object('operator',operator,
   'profile',(select to_jsonb(p) from private.campus_profiles p where p.user_id=actor),
   'memberships',coalesce((select jsonb_agg(jsonb_build_object('institution_id',m.institution_id,'name',o.name,'role',m.role,'share_metrics',m.share_metrics))
    from private.campus_memberships m join private.campus_institutions o on o.id=m.institution_id where m.user_id=actor and m.active and o.active),'[]'),
   'progress',coalesce((select jsonb_agg(r) from (select case_id,max(a.score) best_score,count(*) attempts,max(created_at) last_attempt from private.campus_attempts a where user_id=actor group by case_id) r),'[]'));
 elsif action='profile' then
  if (payload->>'privacy_version') is distinct from '2026-10-27' then raise exception 'Acepta el aviso de privacidad vigente'; end if;
  insert into private.campus_profiles(user_id,display_name,academic_level) values(actor,trim(payload->>'display_name'),(payload->>'academic_level')::int)
   on conflict(user_id) do update set display_name=excluded.display_name,academic_level=excluded.academic_level;
  return jsonb_build_object('saved',true);
 elsif action='create_institution' then
  if not operator then raise exception 'Acceso restringido' using errcode='42501'; end if;
  if (payload->>'authorized') is distinct from 'true' then raise exception 'Se requiere autorización de la institución'; end if;
  insert into private.campus_institutions(name) values(trim(payload->>'name')) returning id into org;
  insert into private.campus_memberships values(org,actor,'administrador',false,true,now());
  insert into private.campus_audit(actor,institution_id,action) values(actor,org,'institution_created');
  return jsonb_build_object('institution_id',org);
 elsif action='join' then
  select * into invitation from private.campus_invitations where token_hash=encode(sha256(convert_to(payload->>'token','UTF8')),'hex') for update;
  if invitation.id is null or invitation.used_at is not null or invitation.expires_at<=now()
    or not exists(select 1 from auth.users where id=actor and lower(email)=invitation.email)
    or not exists(select 1 from private.campus_institutions where id=invitation.institution_id and active)
  then raise exception 'Invitación no válida para esta cuenta o vencida' using errcode='42501'; end if;
  if not exists(select 1 from private.campus_profiles where user_id=actor) then raise exception 'Completa primero tu perfil'; end if;
  insert into private.campus_memberships(institution_id,user_id,role,share_metrics) values(invitation.institution_id,actor,invitation.role,coalesce((payload->>'share_metrics')::boolean,false))
   on conflict(institution_id,user_id) do update set role=excluded.role,share_metrics=excluded.share_metrics,active=true,joined_at=now();
  update private.campus_invitations set used_at=now() where id=invitation.id;
  insert into private.campus_audit(actor,institution_id,action) values(actor,invitation.institution_id,'invitation_accepted');
  return jsonb_build_object('joined',true);
 elsif action='submit' then
  if not exists(select 1 from private.campus_profiles where user_id=actor) then raise exception 'Completa primero tu perfil'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  if exists(select 1 from private.campus_attempts where user_id=actor and created_at>now()-interval '3 seconds') then raise exception 'Espera unos segundos antes de volver a enviar'; end if;
  select * into item from private.campus_case_keys where id=payload->>'case_id';
  if item.id is null or jsonb_typeof(payload->'answers') is distinct from 'array' or jsonb_array_length(payload->'answers')<>jsonb_array_length(item.questions) then raise exception 'Responde todas las preguntas'; end if;
  for i in 0..jsonb_array_length(item.questions)-1 loop
   answer:=payload->'answers'->i;
   if jsonb_typeof(answer) is distinct from 'number' or answer::text!~'^[0-9]+$' or (answer::text)::int>=jsonb_array_length(item.questions->i->'options') then raise exception 'Respuesta inválida'; end if;
   if answer=item.questions->i->'answer' then points:=points+1; end if;
   feedback:=feedback||jsonb_build_array(jsonb_build_object('correct',answer=item.questions->i->'answer','explanation',item.questions->i->>'explanation','expected',item.questions->i->'options'->((item.questions->i->>'answer')::int)));
  end loop;
  org:=nullif(payload->>'institution_id','')::uuid;
  if org is not null and not exists(select 1 from private.campus_memberships m join private.campus_institutions o on o.id=m.institution_id where m.institution_id=org and m.user_id=actor and m.active and m.share_metrics and o.active) then raise exception 'No autorizaste métricas para esta institución' using errcode='42501'; end if;
  score:=round(100.0*points/jsonb_array_length(item.questions));
  insert into private.campus_attempts(user_id,case_id,institution_id,score,answers,version) values(actor,item.id,org,score,payload->'answers',item.version);
  return jsonb_build_object('score',score,'feedback',feedback,'saved',true,'version',item.version);
 elsif action='export' then
  return jsonb_build_object('profile',(select to_jsonb(p) from private.campus_profiles p where user_id=actor),
    'attempts',coalesce((select jsonb_agg(a) from private.campus_attempts a where user_id=actor),'[]'),
    'memberships',coalesce((select jsonb_agg(m) from private.campus_memberships m where user_id=actor),'[]'));
 elsif action='delete_progress' then
  delete from private.campus_attempts where user_id=actor;
  return jsonb_build_object('deleted',true);
 end if;
 org:=nullif(payload->>'institution_id','')::uuid;
 select m.role into actor_role from private.campus_memberships m join private.campus_institutions o on o.id=m.institution_id where m.institution_id=org and m.user_id=actor and m.active and o.active;
 if actor_role is null then raise exception 'Institución no autorizada' using errcode='42501'; end if;
 if action='consent' then
  update private.campus_memberships set share_metrics=coalesce((payload->>'share_metrics')::boolean,false) where institution_id=org and user_id=actor;
  -- Withdrawal immediately removes previous attempts from institutional reports.
  if not coalesce((payload->>'share_metrics')::boolean,false) then update private.campus_attempts set institution_id=null where user_id=actor and institution_id=org; end if;
  insert into private.campus_audit(actor,institution_id,action) values(actor,org,'metrics_consent_changed');
  return jsonb_build_object('saved',true);
 elsif action='leave' then
  if actor_role='administrador' and (select count(*) from private.campus_memberships where institution_id=org and active and role='administrador')<=1 then raise exception 'Debe permanecer un administrador'; end if;
  update private.campus_memberships set active=false,share_metrics=false where institution_id=org and user_id=actor;
  update private.campus_attempts set institution_id=null where user_id=actor and institution_id=org;
  insert into private.campus_audit(actor,institution_id,action) values(actor,org,'membership_left');
  return jsonb_build_object('saved',true);
 elsif action='assignments' then
  return coalesce((select jsonb_agg(a) from (select id,title,case_id,created_at from private.campus_assignments where institution_id=org and active order by created_at desc limit 100) a),'[]');
 end if;
 if actor_role not in ('docente','administrador') then raise exception 'Permisos insuficientes' using errcode='42501'; end if;
 if action='metrics' then
  select count(*) into cohort from private.campus_memberships where institution_id=org and active and share_metrics and role='estudiante';
  -- One whole-cohort report, no arbitrary filters, time windows or row exports:
  -- protects small cohorts and prevents inference through filter differencing.
  if cohort<5 then return jsonb_build_object('suppressed',true,'minimum',5,'message','Las métricas se muestran desde 5 estudiantes con participación autorizada.'); end if;
  select jsonb_build_object('suppressed',false,'minimum',5,'cohort',cohort,
   'activity',case when count(distinct a.user_id)<5 then null else count(distinct a.user_id) end,
   'attempts',case when count(distinct a.user_id)<5 then null else count(*) end,
   'average',case when count(distinct a.user_id)<5 then null else round(avg(a.score)) end)
   into result from private.campus_attempts a join private.campus_memberships m on m.user_id=a.user_id and m.institution_id=a.institution_id
   where a.institution_id=org and m.active and m.share_metrics and m.role='estudiante';
  return result;
 elsif action='assign' then
  insert into private.campus_assignments(institution_id,created_by,case_id,title) values(org,actor,payload->>'case_id',trim(payload->>'title')) returning id into subject;
  insert into private.campus_audit(actor,institution_id,action) values(actor,org,'assignment_created');
  return jsonb_build_object('id',subject);
 elsif action='close_assignment' then
  update private.campus_assignments set active=false where institution_id=org and id=(payload->>'id')::uuid;
  return jsonb_build_object('saved',true);
 end if;
 if actor_role<>'administrador' then raise exception 'Permisos insuficientes' using errcode='42501'; end if;
 if action='invite' then
  if payload->>'role' not in ('estudiante','docente') and not(operator and payload->>'role'='administrador') then raise exception 'Rol no permitido' using errcode='42501'; end if;
  if length(coalesce(payload->>'email',''))>254 or (payload->>'email')!~'^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Correo inválido'; end if;
  if (select count(*) from private.campus_invitations where created_by=actor and created_at>now()-interval '1 hour')>=100 then raise exception 'Límite de invitaciones por hora alcanzado'; end if;
  token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
  insert into private.campus_invitations(institution_id,email,role,token_hash,created_by) values(org,lower(trim(payload->>'email')),payload->>'role',encode(sha256(convert_to(token,'UTF8')),'hex'),actor);
  insert into private.campus_audit(actor,institution_id,action) values(actor,org,'invitation_created');
  return jsonb_build_object('token',token,'expires_days',7);
 elsif action='members' then
  return coalesce((select jsonb_agg(r) from (select m.user_id,m.role,p.display_name,m.joined_at from private.campus_memberships m left join private.campus_profiles p on p.user_id=m.user_id where m.institution_id=org and m.active order by m.joined_at limit 2000) r),'[]');
 elsif action='revoke' then
  subject:=(payload->>'user_id')::uuid;
  if exists(select 1 from private.campus_memberships where institution_id=org and user_id=subject and role='administrador') then raise exception 'No se puede revocar un administrador desde este panel'; end if;
  update private.campus_memberships set active=false,share_metrics=false where institution_id=org and user_id=subject;
  update private.campus_attempts set institution_id=null where institution_id=org and user_id=subject;
  insert into private.campus_audit(actor,institution_id,action) values(actor,org,'membership_revoked');
  return jsonb_build_object('saved',true);
 end if;
 raise exception 'Acción no permitida' using errcode='42501';
end $$;
revoke all on function private.campus_dispatch(text,jsonb) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.campus_dispatch(text,jsonb) to authenticated;
create function public.campus_api(action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.campus_dispatch(action,payload) $$;
revoke all on function public.campus_api(text,jsonb) from public,anon;
grant execute on function public.campus_api(text,jsonb) to authenticated;

-- Private tables are never granted to API roles, even when a future schema
-- setting inadvertently exposes private. RLS supplies an additional deny layer.
do $$ declare t text; begin
 foreach t in array array['profiles','operators','institutions','memberships','invitations','case_keys','attempts','assignments','audit'] loop
  execute format('alter table private.campus_%I enable row level security',t);
  execute format('alter table private.campus_%I force row level security',t);
  execute format('revoke all on private.campus_%I from public,anon,authenticated',t);
 end loop;
end $$;
