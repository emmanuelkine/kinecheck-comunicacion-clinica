grant select, insert on public.kc_health_professionals to authenticated;
grant select, insert on public.kc_health_institutions to authenticated;
grant select, insert, update on public.kc_health_slots to authenticated;
grant select (id,specialty,region,comuna,starts_at,location_text,public_contact,
  status,created_at,facility_type,modality,booking_url,expires_at)
  on public.kc_health_slots to anon;
grant select (id,specialty,region,comuna,starts_at,location_text,public_contact,
  status,created_at,facility_type,modality,booking_url,expires_at)
  on public.kc_health_slots to authenticated;
create policy kc_professional_self_insert on public.kc_health_professionals
  for insert to authenticated with check(user_id=(select auth.uid()) and verification_status='pending');
create policy kc_professional_self_read on public.kc_health_professionals
  for select to authenticated using(user_id=(select auth.uid()));
create policy kc_institution_owner_pending_insert on public.kc_health_institutions
  for insert to authenticated with check(owner_user_id=(select auth.uid()) and verification_status='pending');
create policy kc_institution_owner_read on public.kc_health_institutions
  for select to authenticated using(owner_user_id=(select auth.uid()));
create or replace function public.kc_hours_professional_is_listable(subject uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.kc_health_professionals p
  join public.kc_health_responsibility_acceptances a on a.user_id=p.user_id
    and a.declaration_version='2026-10-29-v1' and a.accepted is true
  where p.user_id=subject and p.verification_status='verified') $$;
revoke all on function public.kc_hours_professional_is_listable(uuid) from public;
grant execute on function public.kc_hours_professional_is_listable(uuid) to anon,authenticated;
create policy kc_slots_public_read on public.kc_health_slots for select to anon,authenticated
  using(status='active' and starts_at>now() and (expires_at is null or expires_at>now())
    and public.kc_hours_professional_is_listable(professional_id));
create policy kc_slots_owner_read on public.kc_health_slots for select to authenticated
  using(professional_id=(select auth.uid()));
create policy kc_slots_owner_insert on public.kc_health_slots for insert to authenticated
  with check(professional_id=(select auth.uid()) and status='active' and starts_at>now()
    and exists(select 1 from public.kc_health_professionals p
      where p.user_id=(select auth.uid()) and p.verification_status='verified'));
create policy kc_slots_owner_update on public.kc_health_slots for update to authenticated
  using(professional_id=(select auth.uid()))
  with check(professional_id=(select auth.uid()) and (status='inactive' or starts_at>now()));
