-- Support owner/profile FK checks and cascades without scanning the demo slots.
create index kc_demo_health_slots_profile_owner_idx
  on public.kc_demo_health_slots (profile_id, owner_user_id);
