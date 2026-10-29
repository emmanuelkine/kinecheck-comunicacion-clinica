-- Isolated Hours Available pilot. Applying this migration does NOT open service.
-- Real activation additionally requires a reviewed release record and explicit pilot start.
create schema if not exists kc_hours_private;
revoke all on schema kc_hours_private from public;
grant usage on schema kc_hours_private to anon, authenticated;

create table kc_hours_private.release (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  legal_approved boolean not null default false,
  review_reference text,
  updated_at timestamptz not null default now(),
  check(not legal_approved or coalesce(length(trim(review_reference)),0) >= 8)
);
insert into kc_hours_private.release(singleton) values(true);
create table kc_hours_private.operators(user_id uuid primary key references auth.users(id) on delete cascade);
create table kc_hours_private.pilots (
  subject_type text not null check(subject_type in ('professional','institution')),
  subject_id uuid not null,
  started_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null default (statement_timestamp()+interval '1440 hours'),
  status text not null default 'active' check(status in ('active','paused')),
  activated_by uuid not null references auth.users(id),
  primary key(subject_type,subject_id),
  check(expires_at=started_at+interval '1440 hours')
);
create table kc_hours_private.staff (
  institution_id uuid not null references public.kc_health_institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check(role in ('admin','secretary')),
  active boolean not null default true,
  granted_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key(institution_id,user_id)
);
create index kc_hours_staff_user_idx on kc_hours_private.staff(user_id,institution_id) where active;
create table kc_hours_private.delegations (
  institution_id uuid not null,
  professional_id uuid not null,
  secretary_id uuid not null,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key(institution_id,professional_id,secretary_id),
  foreign key(institution_id,professional_id) references public.kc_health_institution_members(institution_id,professional_id) on delete cascade,
  foreign key(institution_id,secretary_id) references kc_hours_private.staff(institution_id,user_id) on delete cascade
);
create index kc_hours_delegations_secretary_idx on kc_hours_private.delegations(secretary_id,institution_id,professional_id) where active;
create table kc_hours_private.invitations (
  token_hash text primary key,
  institution_id uuid not null references public.kc_health_institutions(id) on delete cascade,
  email text not null check(length(email) between 5 and 180),
  role text not null check(role in ('professional','admin','secretary')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '7 days',
  used_at timestamptz
);
create index kc_hours_invite_institution_idx on kc_hours_private.invitations(institution_id,created_at);
create table kc_hours_private.reports (
  slot_id uuid not null references public.kc_health_slots(id) on delete cascade,
  category text not null check(category in ('not_available','incorrect_information','suspected_fraud','unsafe_link')),
  day date not null default current_date,
  reports integer not null default 1 check(reports between 1 and 20),
  resolved_at timestamptz,
  primary key(slot_id,category,day)
);
create table kc_hours_private.metrics (
  slot_id uuid not null references public.kc_health_slots(id) on delete cascade,
  day date not null default current_date,
  contacts integer not null default 0 check(contacts between 0 and 10000),
  booked integer not null default 0 check(booked between 0 and 1),
  primary key(slot_id,day)
);
create table kc_hours_private.audit (
  id bigint generated always as identity primary key,
  actor uuid references auth.users(id) on delete set null,
  action text not null,
  institution_id uuid,
  subject_id uuid,
  created_at timestamptz not null default now()
);
create index kc_hours_audit_institution_idx on kc_hours_private.audit(institution_id,created_at desc);
create table kc_hours_private.rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  writes integer not null default 1,
  primary key(user_id,window_start)
);
-- Internal tables are deliberately inaccessible to Data API roles, with forced RLS.
do $$ declare t text; begin
  foreach t in array array['release','operators','pilots','staff','delegations','invitations','reports','metrics','audit','rate_limits'] loop
    execute format('alter table kc_hours_private.%I enable row level security',t);
    execute format('alter table kc_hours_private.%I force row level security',t);
    execute format('revoke all on kc_hours_private.%I from public,anon,authenticated',t);
  end loop;
end $$;

alter table public.kc_health_professionals add column is_active boolean not null default true;
alter table public.kc_health_professionals add column is_suspended boolean not null default false;
alter table public.kc_health_institutions add column is_active boolean not null default true;
alter table public.kc_health_institutions add column is_suspended boolean not null default false;
alter table public.kc_health_institutions add constraint kc_hours_institution_verification check(verification_status in ('pending','verified','rejected'));
alter table public.kc_health_institution_members add column professional_consent boolean not null default false;
alter table public.kc_health_slots add column institution_id uuid references public.kc_health_institutions(id);
alter table public.kc_health_slots add column created_by uuid references auth.users(id) on delete set null;
alter table public.kc_health_slots add column updated_at timestamptz not null default now();
alter table public.kc_health_slots add column is_suspended boolean not null default false;
alter table public.kc_health_slots add column deactivation_reason text;
create index kc_hours_members_professional_idx on public.kc_health_institution_members(professional_id,institution_id);
create index kc_hours_members_page_idx on public.kc_health_institution_members(institution_id,membership_status,professional_id);
create index kc_hours_institutions_owner_idx on public.kc_health_institutions(owner_user_id,id);
create index kc_hours_slots_professional_idx on public.kc_health_slots(professional_id,starts_at,id);
create index kc_hours_slots_institution_idx on public.kc_health_slots(institution_id,starts_at,id);
create index kc_hours_slots_created_by_idx on public.kc_health_slots(created_by);
create index kc_hours_slots_search_idx on public.kc_health_slots(starts_at,id) where status='active' and not is_suspended;

create function kc_hours_private.actor() returns uuid language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); claims jsonb:=auth.jwt();
begin
 if u is null or coalesce((claims->>'is_anonymous')::boolean,false) or not exists(
   select 1 from auth.users a join auth.sessions s on s.user_id=a.id
   where a.id=u and a.email_confirmed_at is not null and (a.banned_until is null or a.banned_until<=now())
     and s.id::text=claims->>'session_id' and (s.not_after is null or s.not_after>now())
 ) then raise exception 'Sesión válida y correo confirmado requeridos' using errcode='42501'; end if;
 return u;
end $$;
create function kc_hours_private.is_admin(org uuid,u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.kc_health_institutions i where i.id=org and i.owner_user_id=u)
 or exists(select 1 from kc_hours_private.staff s where s.institution_id=org and s.user_id=u and s.role='admin' and s.active)
$$;
create function kc_hours_private.pilot_active(kind text,subject uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from kc_hours_private.release r where r.singleton and r.enabled and r.legal_approved)
 and exists(select 1 from kc_hours_private.pilots p where p.subject_type=kind and p.subject_id=subject and p.status='active' and p.started_at<=now() and p.expires_at>now())
$$;
create function kc_hours_private.professional_ready(subject uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.kc_health_professionals p join public.kc_health_responsibility_acceptances a on a.user_id=p.user_id
 where p.user_id=subject and p.verification_status='verified' and p.is_active and not p.is_suspended
 and a.declaration_version='2026-10-29-v1' and a.accepted)
$$;
create function kc_hours_private.institution_ready(org uuid,pro uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.kc_health_institutions i join public.kc_health_institution_members m on m.institution_id=i.id
 where i.id=org and i.is_active and not i.is_suspended and i.verification_status='verified'
 and m.professional_id=pro and m.professional_consent and m.membership_status='active')
$$;
create function kc_hours_private.can_manage(org uuid,pro uuid,u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select case when org is null then u=pro else
 exists(select 1 from public.kc_health_institution_members m where m.institution_id=org and m.professional_id=pro
 and m.membership_status='active' and m.professional_consent)
 and (u=pro or kc_hours_private.is_admin(org,u) or exists(
 select 1 from kc_hours_private.staff s join kc_hours_private.delegations d on d.institution_id=s.institution_id and d.secretary_id=s.user_id
 where s.institution_id=org and s.user_id=u and s.active and s.role='secretary' and d.professional_id=pro and d.active)) end
$$;
create function kc_hours_private.slot_visible(pro uuid,org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select kc_hours_private.professional_ready(pro) and case when org is null then kc_hours_private.pilot_active('professional',pro)
 else kc_hours_private.institution_ready(org,pro) and kc_hours_private.pilot_active('institution',org) end
$$;
create function kc_hours_private.safe_url(value text) returns boolean language sql immutable set search_path='' as $$
 select value is not null and length(value)<=1500
 and value ~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,63}(/[A-Za-z0-9._~!$&()*+,;=:@%/?#-]*)?$'
 and value !~* '^https://([^/]*\.)?(localhost|local|internal|invalid|test|example)(/|$)'
 and value !~* '^https://[^/]*\.\.'
$$;

-- Remove broad legacy client write paths. All new writes use the checked API below.
revoke insert,update,delete on public.kc_health_professionals,public.kc_health_institutions,public.kc_health_institution_members,public.kc_health_slots,public.kc_health_responsibility_acceptances from anon,authenticated;
revoke select on public.kc_health_slots from authenticated;
grant select(id,specialty,region,comuna,starts_at,location_text,public_contact,status,created_at,facility_type,modality,booking_url,expires_at) on public.kc_health_slots to authenticated;
drop policy kc_slots_owner_insert on public.kc_health_slots;
drop policy kc_slots_owner_update on public.kc_health_slots;
drop policy kc_slots_public_read on public.kc_health_slots;
create policy kc_slots_public_read on public.kc_health_slots for select to anon,authenticated using(
 status='active' and not is_suspended and starts_at>now() and (expires_at is null or expires_at>now())
 and kc_hours_private.slot_visible(professional_id,institution_id));
-- Public direct reads expose only the existing non-identifying columns; RPC search
-- returns the public professional name but never Auth email, declarations or staff.
create policy kc_slots_team_read on public.kc_health_slots for select to authenticated using(
 kc_hours_private.can_manage(institution_id,professional_id,(select auth.uid())));
revoke execute on function public.kc_hours_professional_is_listable(uuid) from public,anon,authenticated;
revoke execute on function public.kc_require_hours_declaration() from public,anon,authenticated;
drop trigger kc_hours_slot_declaration_gate on public.kc_health_slots;
create or replace function public.kc_require_hours_declaration() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.professional_id is distinct from old.professional_id or new.institution_id is distinct from old.institution_id) then
   raise exception 'No se puede trasladar una hora a otro profesional o institución' using errcode='42501'; end if;
 -- Revalidate every column update, including an edited booking link or date.
 if new.status='active' then
   if new.starts_at<=now() or new.expires_at is null or new.expires_at>new.starts_at or new.expires_at<=now() then
     raise exception 'Solo se pueden publicar horas futuras vigentes' using errcode='23514'; end if;
   if new.is_suspended or not kc_hours_private.slot_visible(new.professional_id,new.institution_id) then
     raise exception 'Publicación requiere piloto activo, aceptación y verificación independiente vigente' using errcode='42501'; end if;
   if not kc_hours_private.safe_url(new.booking_url) then
     raise exception 'Enlace oficial HTTPS válido requerido' using errcode='23514'; end if;
 end if;
 new.updated_at:=statement_timestamp();
 return new;
end $$;
create trigger kc_hours_slot_declaration_gate before insert or update on public.kc_health_slots for each row execute function public.kc_require_hours_declaration();

create function kc_hours_private.api(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare
 u uuid:=kc_hours_private.actor(); org uuid:=nullif(payload->>'institution_id','')::uuid;
 pro uuid:=nullif(payload->>'professional_id','')::uuid; target uuid:=nullif(payload->>'user_id','')::uuid;
 sid uuid:=nullif(payload->>'slot_id','')::uuid; s public.kc_health_slots; i public.kc_health_institutions;
 v jsonb; tok text; inv kc_hours_private.invitations; kind text; subject uuid;
 n integer; off integer:=greatest(0,least(coalesce((payload->>'offset')::integer,0),10000));
begin
 if pg_column_size(payload)>12000 then raise exception 'Solicitud demasiado grande' using errcode='22023'; end if;
 if action not in ('context','members','staff','slots','metrics','reports','invitations') then
   insert into kc_hours_private.rate_limits(user_id,window_start) values(u,date_trunc('hour',now()))
   on conflict(user_id,window_start) do update set writes=kc_hours_private.rate_limits.writes+1 returning writes into n;
   if n>300 then raise exception 'Demasiadas operaciones. Intenta más tarde.' using errcode='54000'; end if;
 end if;
 if action='context' then
   return jsonb_build_object('user_id',u,'operator',exists(select 1 from kc_hours_private.operators o where o.user_id=u),
   'release_ready',(select enabled and legal_approved from kc_hours_private.release where singleton),
   'profile',(select to_jsonb(p) from public.kc_health_professionals p where p.user_id=u),
   'accepted',exists(select 1 from public.kc_health_responsibility_acceptances a where a.user_id=u and a.declaration_version='2026-10-29-v1'),
   'institutions',coalesce((select jsonb_agg(to_jsonb(x)) from (
     select inst.id,inst.public_name,inst.verification_status,inst.is_active,
     case when inst.owner_user_id=u then 'owner' else coalesce(st.role,'professional') end as role
     from public.kc_health_institutions inst left join kc_hours_private.staff st on st.institution_id=inst.id and st.user_id=u and st.active
     where inst.owner_user_id=u or st.user_id=u or exists(select 1 from public.kc_health_institution_members m where m.institution_id=inst.id and m.professional_id=u and m.professional_consent) order by inst.public_name limit 100) x),'[]'::jsonb),
   'memberships',coalesce((select jsonb_agg(to_jsonb(x)) from (
     select m.institution_id,inst.public_name,m.membership_status,m.professional_consent
     from public.kc_health_institution_members m join public.kc_health_institutions inst on inst.id=m.institution_id where m.professional_id=u) x),'[]'::jsonb),
   'pilots',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('state',case when p.expires_at<=now() then 'expired' else p.status end))
     from kc_hours_private.pilots p where (p.subject_type='professional' and p.subject_id=u) or (p.subject_type='institution' and (kc_hours_private.is_admin(p.subject_id,u) or exists(select 1 from kc_hours_private.staff st where st.institution_id=p.subject_id and st.user_id=u and st.active) or exists(select 1 from public.kc_health_institution_members m where m.institution_id=p.subject_id and m.professional_id=u and m.professional_consent)))),'[]'::jsonb));
 elsif action='profile' then
   if payload->>'accepted' is distinct from 'true' then raise exception 'Debes aceptar la declaración para continuar' using errcode='23514'; end if;
   insert into public.kc_health_professionals(user_id,full_name,profession) values(u,trim(payload->>'full_name'),trim(payload->>'profession'))
   on conflict(user_id) do update set full_name=excluded.full_name,profession=excluded.profession,
     verification_status=case when kc_health_professionals.full_name<>excluded.full_name or kc_health_professionals.profession<>excluded.profession then 'pending' else kc_health_professionals.verification_status end;
   insert into public.kc_health_responsibility_acceptances(user_id,accepted,declaration_version) values(u,true,'2026-10-29-v1') on conflict do nothing;
 elsif action='profile_active' then
   update public.kc_health_professionals set is_active=(payload->>'active')::boolean where user_id=u;
 elsif action='create_institution' then
   if (select count(*) from public.kc_health_institutions where owner_user_id=u)>=10 then raise exception 'Límite de instituciones alcanzado'; end if;
   if length(trim(payload->>'legal_name')) not between 3 and 180 or length(trim(payload->>'public_name')) not between 3 and 180
     or coalesce(payload->>'contact_email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or length(coalesce(payload->>'region','')) not between 3 and 100 or length(coalesce(payload->>'comuna','')) not between 2 and 100
     or coalesce(payload->>'institution_type','') not in ('Clínica','Hospital','Centro médico o centro de salud','Centro odontológico','Clínica veterinaria','Otro establecimiento') then
     raise exception 'Completa los datos válidos de la institución' using errcode='22023'; end if;
   insert into public.kc_health_institutions(owner_user_id,legal_name,public_name,institution_type,region,comuna,contact_email)
   values(u,trim(payload->>'legal_name'),trim(payload->>'public_name'),payload->>'institution_type',payload->>'region',payload->>'comuna',lower(payload->>'contact_email')) returning id into org;
   v:=jsonb_build_object('institution_id',org);
 elsif action='institution_active' then
   if not kc_hours_private.is_admin(org,u) then raise exception 'Permisos institucionales insuficientes' using errcode='42501'; end if;
   update public.kc_health_institutions set is_active=(payload->>'active')::boolean where id=org;
 elsif action='invite' then
   if not kc_hours_private.is_admin(org,u) then raise exception 'Permisos institucionales insuficientes' using errcode='42501'; end if;
   kind:=payload->>'role';
   if kind not in ('professional','secretary','admin') or kind is null or coalesce(payload->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invitación inválida' using errcode='22023'; end if;
   if kind='admin' and not exists(select 1 from public.kc_health_institutions where id=org and owner_user_id=u) then raise exception 'Solo el responsable asigna administradores' using errcode='42501'; end if;
   tok:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
   insert into kc_hours_private.invitations(token_hash,institution_id,email,role,created_by)
   values(encode(sha256(convert_to(tok,'UTF8')),'hex'),org,lower(trim(payload->>'email')),kind,u);
   v:=jsonb_build_object('token',tok,'expires_in_days',7);
 elsif action='accept_invite' then
   select * into inv from kc_hours_private.invitations where token_hash=encode(sha256(convert_to(payload->>'token','UTF8')),'hex') for update;
   if not found or inv.used_at is not null or inv.expires_at<=now() or inv.email<>(select lower(email) from auth.users where id=u) then raise exception 'Invitación inválida, vencida o destinada a otra cuenta' using errcode='42501'; end if;
   org:=inv.institution_id;
   if not kc_hours_private.is_admin(org,inv.created_by) then raise exception 'La autorización de la invitación fue revocada' using errcode='42501'; end if;
   if inv.role='professional' then
     if payload->>'consent' is distinct from 'true' or not exists(select 1 from public.kc_health_professionals where user_id=u) then raise exception 'Registra tu perfil y acepta el vínculo institucional' using errcode='23514'; end if;
     insert into public.kc_health_institution_members(institution_id,professional_id,professional_consent) values(org,u,true)
     on conflict(institution_id,professional_id) do update set professional_consent=true,membership_status='pending';
   else
     if not kc_hours_private.is_admin(org,inv.created_by) then raise exception 'La autorización de la invitación fue revocada' using errcode='42501'; end if;
     insert into kc_hours_private.staff(institution_id,user_id,role,granted_by) values(org,u,inv.role,inv.created_by)
     on conflict(institution_id,user_id) do update set role=excluded.role,active=true,granted_by=excluded.granted_by,updated_at=now();
   end if;
   update kc_hours_private.invitations set used_at=now() where token_hash=inv.token_hash;
 elsif action='invitations' then
   if not kc_hours_private.is_admin(org,u) then raise exception 'Permisos institucionales insuficientes' using errcode='42501'; end if;
   return coalesce((select jsonb_agg(to_jsonb(x)) from (select token_hash,email,role,expires_at from kc_hours_private.invitations where institution_id=org and used_at is null and expires_at>now() order by created_at desc limit 50 offset off) x),'[]'::jsonb);
 elsif action='revoke_invitation' then
   if not kc_hours_private.is_admin(org,u) then raise exception 'Permisos institucionales insuficientes' using errcode='42501'; end if;
   update kc_hours_private.invitations set used_at=now() where institution_id=org and token_hash=payload->>'token_hash' and used_at is null;
 elsif action='member_status' then
   if not kc_hours_private.is_admin(org,u) then raise exception 'Permisos institucionales insuficientes' using errcode='42501'; end if;
   if payload->>'status' not in ('active','revoked') or payload->>'status' is null then raise exception 'Estado inválido'; end if;
   update public.kc_health_institution_members set membership_status=payload->>'status' where institution_id=org and professional_id=pro and professional_consent;
   if not found then raise exception 'El profesional debe aceptar el vínculo primero' using errcode='42501'; end if;
   if payload->>'status'='revoked' then update kc_hours_private.delegations set active=false,updated_at=now() where institution_id=org and professional_id=pro; end if;
 elsif action='revoke_membership' then
   update public.kc_health_institution_members set membership_status='revoked',professional_consent=false where institution_id=org and professional_id=u;
   update kc_hours_private.delegations set active=false,updated_at=now() where institution_id=org and professional_id=u;
 elsif action='revoke_staff' then
   if not kc_hours_private.is_admin(org,u) then raise exception 'Permisos institucionales insuficientes' using errcode='42501'; end if;
   if exists(select 1 from kc_hours_private.staff where institution_id=org and user_id=target and role='admin')
      and not exists(select 1 from public.kc_health_institutions where id=org and owner_user_id=u) then raise exception 'Solo el responsable revoca administradores' using errcode='42501'; end if;
   update kc_hours_private.staff set active=false,updated_at=now() where institution_id=org and user_id=target;
   update kc_hours_private.delegations set active=false,updated_at=now() where institution_id=org and secretary_id=target;
   update kc_hours_private.invitations set used_at=now() where institution_id=org and email=(select lower(email) from auth.users where id=target) and used_at is null;
 elsif action='delegate' then
   if not exists(select 1 from public.kc_health_institution_members where institution_id=org and professional_id=u and membership_status='active' and professional_consent)
     or not exists(select 1 from kc_hours_private.staff where institution_id=org and user_id=target and role='secretary' and active) then raise exception 'Se requiere vínculo y secretaria autorizados' using errcode='42501'; end if;
   insert into kc_hours_private.delegations(institution_id,professional_id,secretary_id,active) values(org,u,target,(payload->>'active')::boolean)
   on conflict(institution_id,professional_id,secretary_id) do update set active=excluded.active,updated_at=now();
 elsif action='staff' then
   if not kc_hours_private.is_admin(org,u) and not exists(select 1 from public.kc_health_institution_members where institution_id=org and professional_id=u and professional_consent) then raise exception 'Institución no autorizada' using errcode='42501'; end if;
   return coalesce((select jsonb_agg(to_jsonb(x)) from (
     select st.user_id,st.role,st.active,coalesce(p.full_name,au.email,'Cuenta de equipo') as name,
     exists(select 1 from kc_hours_private.delegations d where d.institution_id=org and d.professional_id=u and d.secretary_id=st.user_id and d.active) as delegated
     from kc_hours_private.staff st left join public.kc_health_professionals p on p.user_id=st.user_id join auth.users au on au.id=st.user_id where st.institution_id=org order by st.user_id limit 50 offset off) x),'[]'::jsonb);
 elsif action='members' then
   if not kc_hours_private.is_admin(org,u) and not exists(select 1 from kc_hours_private.staff where institution_id=org and user_id=u and active and role='secretary') and not exists(select 1 from public.kc_health_institution_members where institution_id=org and professional_id=u and professional_consent) then raise exception 'Institución no autorizada' using errcode='42501'; end if;
   return jsonb_build_object('total',(select count(*) from public.kc_health_institution_members m where m.institution_id=org and (kc_hours_private.is_admin(org,u) or kc_hours_private.can_manage(org,m.professional_id,u))),
   'rows',coalesce((select jsonb_agg(to_jsonb(x)) from (
     select m.professional_id,p.full_name,p.profession,p.verification_status,m.membership_status,m.professional_consent
     from public.kc_health_institution_members m join public.kc_health_professionals p on p.user_id=m.professional_id
     where m.institution_id=org and (kc_hours_private.is_admin(org,u) or kc_hours_private.can_manage(org,m.professional_id,u))
       and (coalesce(payload->>'search','')='' or position(lower(left(payload->>'search',100)) in lower(p.full_name||' '||p.profession))>0)
     order by p.full_name,m.professional_id limit 50 offset off) x),'[]'::jsonb));
 elsif action='start_pilot' then
   kind:=case when org is null then 'professional' else 'institution' end;subject:=coalesce(org,u);
   if org is null then
     if not kc_hours_private.professional_ready(u) then raise exception 'Verificación y declaración requeridas' using errcode='42501'; end if;
   else
     if not kc_hours_private.is_admin(org,u) or not exists(select 1 from public.kc_health_institutions where id=org and verification_status='verified' and is_active and not is_suspended) then raise exception 'Institución verificada y autorización requeridas' using errcode='42501'; end if;
   end if;
   if not exists(select 1 from kc_hours_private.release where singleton and enabled and legal_approved) then raise exception 'El piloto aún no está habilitado' using errcode='42501'; end if;
   insert into kc_hours_private.pilots(subject_type,subject_id,activated_by) values(kind,subject,u) on conflict do nothing;
   select to_jsonb(p) into v from kc_hours_private.pilots p where p.subject_type=kind and p.subject_id=subject;
 elsif action='save_slot' then
   if sid is not null then
     select * into s from public.kc_health_slots where id=sid for update;
     if not found then raise exception 'Hora no disponible' using errcode='42501'; end if;
     if s.is_suspended then raise exception 'Publicación suspendida por moderación' using errcode='42501'; end if;
     org:=s.institution_id;pro:=s.professional_id;
   else pro:=coalesce(pro,u); end if;
   if not kc_hours_private.can_manage(org,pro,u) then raise exception 'Sin autorización para esta agenda' using errcode='42501'; end if;
   if length(trim(coalesce(payload->>'specialty',''))) not between 3 and 120 or length(trim(coalesce(payload->>'comuna',''))) not between 2 and 100
     or length(trim(coalesce(payload->>'region',''))) not between 3 and 100 or length(trim(coalesce(payload->>'location_text',''))) not between 3 and 200
     or length(coalesce(payload->>'public_contact',''))>180
     or coalesce(payload->>'modality','') not in ('Presencial','Teleconsulta')
     or coalesce(payload->>'facility_type','') not in ('Consulta particular','Centro médico o centro de salud','Clínica','Hospital','Centro odontológico','Clínica veterinaria','Otro establecimiento')
     or (payload->>'starts_at')::timestamptz>now()+interval '180 days' then raise exception 'Datos de hora inválidos' using errcode='22023'; end if;
   if sid is null and (select count(*) from public.kc_health_slots where professional_id=pro and status='active' and starts_at>now())>=500 then raise exception 'Límite de publicaciones activas alcanzado'; end if;
   if sid is null then
     insert into public.kc_health_slots(professional_id,institution_id,created_by,specialty,region,comuna,starts_at,expires_at,location_text,facility_type,modality,public_contact,booking_url)
     values(pro,org,u,payload->>'specialty',payload->>'region',payload->>'comuna',(payload->>'starts_at')::timestamptz,(payload->>'starts_at')::timestamptz,payload->>'location_text',payload->>'facility_type',payload->>'modality',coalesce(payload->>'public_contact',''),payload->>'booking_url') returning id into sid;
   else
     update public.kc_health_slots set specialty=payload->>'specialty',region=payload->>'region',comuna=payload->>'comuna',starts_at=(payload->>'starts_at')::timestamptz,expires_at=(payload->>'starts_at')::timestamptz,
       location_text=payload->>'location_text',facility_type=payload->>'facility_type',modality=payload->>'modality',public_contact=coalesce(payload->>'public_contact',''),booking_url=payload->>'booking_url'
     where id=sid;
   end if;
   v:=jsonb_build_object('slot_id',sid);
 elsif action='deactivate_slot' then
   select * into s from public.kc_health_slots where id=sid for update;
   -- Professionals can always withdraw their own slots, even after revocation/expiry.
   if not found or (s.professional_id<>u and not kc_hours_private.can_manage(s.institution_id,s.professional_id,u)) then raise exception 'Sin autorización para esta agenda' using errcode='42501'; end if;
   update public.kc_health_slots set status='inactive',deactivation_reason=case when payload->>'booked'='true' then 'booked' else 'cancelled' end where id=sid;
   if payload->>'booked'='true' then insert into kc_hours_private.metrics(slot_id,booked) values(sid,1) on conflict(slot_id,day) do update set booked=1; end if;
   org:=s.institution_id;
 elsif action='slots' then
   if org is not null and not kc_hours_private.is_admin(org,u) and not exists(select 1 from kc_hours_private.staff where institution_id=org and user_id=u and active) and not exists(select 1 from public.kc_health_institution_members where institution_id=org and professional_id=u and professional_consent) then raise exception 'Institución no autorizada' using errcode='42501'; end if;
   return coalesce((select jsonb_agg(to_jsonb(x)) from (
     select sl.*,p.full_name from public.kc_health_slots sl join public.kc_health_professionals p on p.user_id=sl.professional_id
     where (case when org is null then sl.professional_id=u else sl.institution_id=org and kc_hours_private.can_manage(org,sl.professional_id,u) end)
       and (pro is null or sl.professional_id=pro)
     order by sl.starts_at desc,sl.id limit 50 offset off) x),'[]'::jsonb);
 elsif action='metrics' then
   if not kc_hours_private.is_admin(org,u) then raise exception 'Permisos institucionales insuficientes' using errcode='42501'; end if;
   return jsonb_build_object('enabled_professionals',(select count(*) from public.kc_health_institution_members where institution_id=org and membership_status='active' and professional_consent),
     'published',(select count(*) from public.kc_health_slots where institution_id=org),
     'currently_available',(select count(*) from public.kc_health_slots sl where institution_id=org and sl.status='active' and not sl.is_suspended and sl.starts_at>now() and sl.expires_at>now() and kc_hours_private.slot_visible(sl.professional_id,org)),
     'contacts',(select coalesce(sum(m.contacts),0) from kc_hours_private.metrics m join public.kc_health_slots sl on sl.id=m.slot_id where sl.institution_id=org),
     'booked',(select count(*) from public.kc_health_slots where institution_id=org and deactivation_reason='booked'),
     'pricing_basis','enabled_professionals','automatic_charges',false);
 elsif action in ('verify_professional','verify_institution','suspend_slot','suspend_professional','reports') then
   if not exists(select 1 from kc_hours_private.operators where user_id=u) then raise exception 'Acceso restringido a moderación' using errcode='42501'; end if;
   if action='reports' then return coalesce((select jsonb_agg(to_jsonb(x)) from (select * from kc_hours_private.reports where resolved_at is null order by day desc limit 50 offset off) x),'[]'::jsonb); end if;
   if action in ('verify_professional','verify_institution') then
     if not kc_hours_private.safe_url(payload->>'evidence_url') then raise exception 'Fuente independiente HTTPS requerida'; end if;
     if action='verify_professional' then update public.kc_health_professionals set verification_status='verified' where user_id=pro;
     else update public.kc_health_institutions set verification_status='verified' where id=org; end if;
     -- Evidence references carry no uploaded credentials or patient information.
     insert into kc_hours_private.audit(actor,action,institution_id,subject_id) values(u,action||':'||left(payload->>'evidence_url',1500),org,coalesce(pro,org));
   elsif action='suspend_slot' then
     update public.kc_health_slots set is_suspended=true,status='inactive',deactivation_reason='moderation' where id=sid;
     update kc_hours_private.reports set resolved_at=now() where slot_id=sid and resolved_at is null;
   else update public.kc_health_professionals set is_suspended=true where user_id=pro; end if;
 else raise exception 'Acción desconocida' using errcode='22023';
 end if;
 insert into kc_hours_private.audit(actor,action,institution_id,subject_id) values(u,action,org,coalesce(sid,pro,target));
 return coalesce(v,'{}'::jsonb)||jsonb_build_object('ok',true);
end $$;

create function kc_hours_private.search(filters jsonb default '{}') returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
 select s.id,p.full_name,p.profession,s.specialty,s.region,s.comuna,s.starts_at,s.location_text,s.facility_type,s.modality,s.booking_url,s.public_contact,i.public_name as institution_name
 from public.kc_health_slots s join public.kc_health_professionals p on p.user_id=s.professional_id left join public.kc_health_institutions i on i.id=s.institution_id
 where s.status='active' and not s.is_suspended and s.starts_at>now() and s.expires_at>now() and kc_hours_private.slot_visible(s.professional_id,s.institution_id)
 and (coalesce(filters->>'specialty','')='' or position(lower(left(filters->>'specialty',100)) in lower(p.profession||' '||s.specialty))>0)
 and (coalesce(filters->>'region','')='' or replace(lower(s.region),'región de ','')=replace(lower(filters->>'region'),'región de ',''))
 and (coalesce(filters->>'comuna','')='' or position(lower(left(filters->>'comuna',100)) in lower(s.comuna))>0)
 and (coalesce(filters->>'facility_type','')='' or s.facility_type=filters->>'facility_type')
 and (coalesce(filters->>'modality','')='' or s.modality=filters->>'modality')
 and (nullif(filters->>'date','') is null or (s.starts_at at time zone 'America/Santiago')::date=(filters->>'date')::date)
 and (nullif(filters->>'hours','') is null or (filters->>'hours')::integer=0 or s.starts_at<=now()+make_interval(hours=>least(4320,greatest(1,(filters->>'hours')::integer))))
 order by s.starts_at,s.id limit 24 offset greatest(0,least(10000,coalesce((filters->>'offset')::integer,0)))
 ) x
$$;
create function kc_hours_private.public_event(slot_id uuid,event text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.kc_health_slots s where s.id=slot_id and s.status='active' and not s.is_suspended and s.starts_at>now() and s.expires_at>now() and kc_hours_private.slot_visible(s.professional_id,s.institution_id)) then return jsonb_build_object('received',true); end if;
 if event='contact' then
   insert into kc_hours_private.metrics(slot_id,contacts) values(slot_id,1)
   on conflict on constraint metrics_pkey do update set contacts=kc_hours_private.metrics.contacts+1 where kc_hours_private.metrics.contacts<10000;
 elsif event in ('not_available','incorrect_information','suspected_fraud','unsafe_link') then
   insert into kc_hours_private.reports(slot_id,category) values(slot_id,event)
   on conflict on constraint reports_pkey do update set reports=kc_hours_private.reports.reports+1 where kc_hours_private.reports.reports<20;
 else raise exception 'Categoría inválida' using errcode='22023'; end if;
 -- Reports never suspend publications automatically. Human moderation is required.
 return jsonb_build_object('received',true);
end $$;
-- Only a bounded set of invoker wrappers is exposed by PostgREST.
create function public.kc_hours_api(action text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select kc_hours_private.api(action,payload)$$;
create function public.kc_hours_search(filters jsonb default '{}') returns jsonb language sql stable security invoker set search_path='' as $$select kc_hours_private.search(filters)$$;
create function public.kc_hours_public_event(slot_id uuid,event text) returns jsonb language sql security invoker set search_path='' as $$select kc_hours_private.public_event(slot_id,event)$$;
revoke all on all functions in schema kc_hours_private from public,anon,authenticated;
grant execute on function kc_hours_private.api(text,jsonb) to authenticated;
grant execute on function kc_hours_private.search(jsonb),kc_hours_private.public_event(uuid,text),kc_hours_private.slot_visible(uuid,uuid) to anon,authenticated;
grant execute on function kc_hours_private.can_manage(uuid,uuid,uuid) to authenticated;
revoke all on function public.kc_hours_api(text,jsonb),public.kc_hours_search(jsonb),public.kc_hours_public_event(uuid,text) from public,anon,authenticated;
grant execute on function public.kc_hours_api(text,jsonb) to authenticated;
grant execute on function public.kc_hours_search(jsonb),public.kc_hours_public_event(uuid,text) to anon,authenticated;
notify pgrst,'reload schema';
