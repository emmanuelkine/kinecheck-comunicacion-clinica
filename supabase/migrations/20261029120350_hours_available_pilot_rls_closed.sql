-- Close all staging tables before granting least-privilege access.
alter table public.kc_health_professionals enable row level security;
alter table public.kc_health_professionals force row level security;
alter table public.kc_health_institutions enable row level security;
alter table public.kc_health_institutions force row level security;
alter table public.kc_health_institution_members enable row level security;
alter table public.kc_health_institution_members force row level security;
alter table public.kc_health_slots enable row level security;
alter table public.kc_health_slots force row level security;
revoke all on public.kc_health_professionals, public.kc_health_institutions,
  public.kc_health_institution_members, public.kc_health_slots
  from public, anon, authenticated;
