-- Supporting indexes for the institution ownership and membership foreign keys.
create index kc_demo_institutions_owner_user_idx
  on public.kc_demo_institutions(owner_user_id);
create index kc_demo_memberships_professional_user_idx
  on public.kc_demo_institution_memberships(professional_user_id);
create index kc_demo_memberships_profile_user_idx
  on public.kc_demo_institution_memberships(profile_id, professional_user_id);
