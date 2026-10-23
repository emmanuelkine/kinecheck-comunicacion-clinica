-- Temporary write freeze for Horas Disponibles DEMO until the controlled pilot is approved.
-- Public SELECT remains available so visitors can inspect existing DEMO content.
-- Reverse with a reviewed migration that drops these six restrictive policies.
create policy kc_demo_profiles_pilot_pause_insert
  on public.kc_demo_health_profiles
  as restrictive for insert to authenticated
  with check (false);

create policy kc_demo_profiles_pilot_pause_update
  on public.kc_demo_health_profiles
  as restrictive for update to authenticated
  using (false) with check (false);

create policy kc_demo_profiles_pilot_pause_delete
  on public.kc_demo_health_profiles
  as restrictive for delete to authenticated
  using (false);

create policy kc_demo_slots_pilot_pause_insert
  on public.kc_demo_health_slots
  as restrictive for insert to authenticated
  with check (false);

create policy kc_demo_slots_pilot_pause_update
  on public.kc_demo_health_slots
  as restrictive for update to authenticated
  using (false) with check (false);

create policy kc_demo_slots_pilot_pause_delete
  on public.kc_demo_health_slots
  as restrictive for delete to authenticated
  using (false);
