-- Reopen DEMO writes only for the existing, explicitly authorized staging tester account.
-- Public profile and active-slot SELECT remain unchanged. Operational project is not targeted.
drop policy if exists kc_demo_profiles_pilot_pause_insert on public.kc_demo_health_profiles;
drop policy if exists kc_demo_profiles_pilot_pause_update on public.kc_demo_health_profiles;
drop policy if exists kc_demo_profiles_pilot_pause_delete on public.kc_demo_health_profiles;
drop policy if exists kc_demo_slots_pilot_pause_insert on public.kc_demo_health_slots;
drop policy if exists kc_demo_slots_pilot_pause_update on public.kc_demo_health_slots;
drop policy if exists kc_demo_slots_pilot_pause_delete on public.kc_demo_health_slots;

create policy kc_demo_profiles_pilot_pause_insert
  on public.kc_demo_health_profiles
  as restrictive for insert to authenticated
  with check (user_id = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid and (select auth.uid()) = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid);

create policy kc_demo_profiles_pilot_pause_update
  on public.kc_demo_health_profiles
  as restrictive for update to authenticated
  using ((select auth.uid()) = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid)
  with check (user_id = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid and (select auth.uid()) = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid);

create policy kc_demo_profiles_pilot_pause_delete
  on public.kc_demo_health_profiles
  as restrictive for delete to authenticated
  using ((select auth.uid()) = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid);

create policy kc_demo_slots_pilot_pause_insert
  on public.kc_demo_health_slots
  as restrictive for insert to authenticated
  with check (owner_user_id = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid and (select auth.uid()) = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid);

create policy kc_demo_slots_pilot_pause_update
  on public.kc_demo_health_slots
  as restrictive for update to authenticated
  using ((select auth.uid()) = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid)
  with check (owner_user_id = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid and (select auth.uid()) = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid);

create policy kc_demo_slots_pilot_pause_delete
  on public.kc_demo_health_slots
  as restrictive for delete to authenticated
  using ((select auth.uid()) = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid);