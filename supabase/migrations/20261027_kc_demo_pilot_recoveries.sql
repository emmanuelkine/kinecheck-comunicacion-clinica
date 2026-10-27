-- Aplicada exclusivamente en Supabase STAGING el 27-10-2026.
-- La demo solo contiene horas ficticias; NO ejecutar en producción.
create table if not exists public.kc_demo_pilot_recoveries (
 slot_id uuid primary key references public.kc_demo_health_slots(id) on delete cascade,
 institution_id uuid not null references public.kc_demo_institutions(id) on delete cascade,
 confirmed_by uuid not null references auth.users(id),
 confirmed_at timestamptz not null default now()
);
alter table public.kc_demo_pilot_recoveries enable row level security;
revoke all on public.kc_demo_pilot_recoveries from anon, authenticated;
create or replace function public.kc_demo_confirm_recovery(p_institution uuid,p_slot uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or not exists (
  select 1 from public.kc_demo_institutions i
  join public.kc_demo_institution_memberships m on m.institution_id=i.id and m.status='active'
  join public.kc_demo_health_slots s on s.profile_id=m.profile_id
  where i.id=p_institution and s.id=p_slot and i.owner_user_id=auth.uid()
 ) then raise exception 'No autorizado para confirmar esta hora'; end if;
 insert into public.kc_demo_pilot_recoveries(slot_id,institution_id,confirmed_by)
 values(p_slot,p_institution,auth.uid()) on conflict(slot_id) do nothing;
 return found;
end $$;
revoke all on function public.kc_demo_confirm_recovery(uuid,uuid) from public,anon;
grant execute on function public.kc_demo_confirm_recovery(uuid,uuid) to authenticated;
create or replace function public.kc_demo_pilot_summary(p_institution uuid)
returns table(published bigint,recovered bigint) language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.kc_demo_institutions i where i.id=p_institution and i.owner_user_id=auth.uid()) then
 raise exception 'No autorizado para consultar esta institución'; end if;
 return query select count(distinct s.id),count(distinct r.slot_id)
 from public.kc_demo_health_slots s
 join public.kc_demo_institution_memberships m on m.profile_id=s.profile_id and m.institution_id=p_institution and m.status='active'
 left join public.kc_demo_pilot_recoveries r on r.slot_id=s.id and r.institution_id=p_institution;
end $$;
revoke all on function public.kc_demo_pilot_summary(uuid) from public,anon;
grant execute on function public.kc_demo_pilot_summary(uuid) to authenticated;
