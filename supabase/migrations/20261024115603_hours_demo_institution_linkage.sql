-- Relational institution and professional-link flow for the isolated DEMO only.
-- All writes remain limited to the existing authorized staging tester.
create table public.kc_demo_institutions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  demo_identifier text not null unique check (demo_identifier ~ '^DEMO-ORG-[A-Z0-9-]{4,30}$'),
  name text not null check (length(trim(name)) between 2 and 140),
  region text not null check (length(trim(region)) between 2 and 100),
  comuna text not null check (length(trim(comuna)) between 2 and 100),
  booking_url text not null check (booking_url ~ '^https://[^[:space:]<>"'']+$'),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_user_id)
);

create table public.kc_demo_institution_memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.kc_demo_institutions(id) on delete cascade,
  profile_id uuid not null,
  professional_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','rejected','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_id, professional_user_id)
    references public.kc_demo_health_profiles(id, user_id) on delete cascade,
  unique (institution_id, profile_id)
);

create index kc_demo_institution_memberships_profile_idx
  on public.kc_demo_institution_memberships(profile_id, status);
create index kc_demo_institution_memberships_org_idx
  on public.kc_demo_institution_memberships(institution_id, status);

alter table public.kc_demo_institutions enable row level security;
alter table public.kc_demo_institutions force row level security;
alter table public.kc_demo_institution_memberships enable row level security;
alter table public.kc_demo_institution_memberships force row level security;
revoke all on public.kc_demo_institutions, public.kc_demo_institution_memberships from public, anon, authenticated;

grant select (id, demo_identifier, name, region, comuna, booking_url, status, created_at, updated_at)
  on public.kc_demo_institutions to anon;
grant select (id, institution_id, profile_id, status, created_at, updated_at)
  on public.kc_demo_institution_memberships to anon;
grant select, insert, update, delete on public.kc_demo_institutions to authenticated;
grant select, insert, update, delete on public.kc_demo_institution_memberships to authenticated;

create policy kc_demo_institutions_public_read
  on public.kc_demo_institutions for select to anon, authenticated using (status = 'active');
create policy kc_demo_institutions_owner_read
  on public.kc_demo_institutions for select to authenticated using (owner_user_id = (select auth.uid()));
create policy kc_demo_institutions_owner_insert
  on public.kc_demo_institutions for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy kc_demo_institutions_owner_update
  on public.kc_demo_institutions for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));
create policy kc_demo_institutions_owner_delete
  on public.kc_demo_institutions for delete to authenticated
  using (owner_user_id = (select auth.uid()));

create policy kc_demo_memberships_public_active_read
  on public.kc_demo_institution_memberships for select to anon, authenticated
  using (status = 'active');
create policy kc_demo_memberships_participant_read
  on public.kc_demo_institution_memberships for select to authenticated
  using (
    professional_user_id = (select auth.uid())
    or exists (
      select 1 from public.kc_demo_institutions i
      where i.id = institution_id and i.owner_user_id = (select auth.uid())
    )
  );
create policy kc_demo_memberships_owner_insert
  on public.kc_demo_institution_memberships for insert to authenticated
  with check (
    professional_user_id = (select auth.uid())
    and exists (select 1 from public.kc_demo_health_profiles p
      where p.id = profile_id and p.user_id = (select auth.uid()))
  );
create policy kc_demo_memberships_owner_update
  on public.kc_demo_institution_memberships for update to authenticated
  using (exists (select 1 from public.kc_demo_institutions i
    where i.id = institution_id and i.owner_user_id = (select auth.uid())))
  with check (exists (select 1 from public.kc_demo_institutions i
    where i.id = institution_id and i.owner_user_id = (select auth.uid())));
create policy kc_demo_memberships_owner_delete
  on public.kc_demo_institution_memberships for delete to authenticated
  using (professional_user_id = (select auth.uid()) or exists (
    select 1 from public.kc_demo_institutions i
    where i.id = institution_id and i.owner_user_id = (select auth.uid())
  ));

-- A restrictive policy keeps the controlled pilot gate intact, even if later
-- permissive policies are added for a real multi-user pilot.
create policy kc_demo_institutions_test_account_only
  on public.kc_demo_institutions as restrictive for all to authenticated
  using ((select auth.uid()) = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid)
  with check (owner_user_id = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid
    and (select auth.uid()) = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid);
create policy kc_demo_memberships_test_account_only
  on public.kc_demo_institution_memberships as restrictive for all to authenticated
  using ((select auth.uid()) = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid)
  with check (professional_user_id = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid
    and (select auth.uid()) = '9a5052da-48f4-4224-8d1f-c57288ceb150'::uuid);
