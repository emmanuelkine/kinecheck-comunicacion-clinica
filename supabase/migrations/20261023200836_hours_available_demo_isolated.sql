-- Isolated data model for the public executive demo. Never use these tables for
-- real professional verification, clinical scheduling, or production listings.
create table public.kc_demo_health_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  demo_identifier text not null unique
    check (demo_identifier ~ '^DEMO-[A-Z0-9-]{4,30}$'),
  public_name text not null check (length(trim(public_name)) between 3 and 120),
  profession text not null check (length(trim(profession)) between 3 and 100),
  specialty text not null default '' check (length(trim(specialty)) <= 120),
  region text not null check (length(trim(region)) between 2 and 100),
  comuna text not null check (length(trim(comuna)) between 2 and 100),
  location_label text not null check (length(trim(location_label)) between 3 and 180),
  modality text not null check (modality in ('Presencial', 'Domiciliaria', 'Teleatención')),
  exercise_type text not null check (exercise_type in ('independent', 'institutional')),
  institution_name text,
  contact_type text not null check (contact_type in ('whatsapp', 'institution_whatsapp', 'institution_website')),
  contact_value text not null check (length(trim(contact_value)) between 8 and 1500),
  verification_status text not null default 'demo_unverified'
    check (verification_status = 'demo_unverified'),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (
    (exercise_type = 'independent'
      and contact_type = 'whatsapp'
      and institution_name is null
      and contact_value ~ '^\+?[1-9][0-9]{7,14}$')
    or
    (exercise_type = 'institutional'
      and length(trim(coalesce(institution_name, ''))) between 2 and 180
      and (
        (contact_type = 'institution_whatsapp' and contact_value ~ '^\+?[1-9][0-9]{7,14}$')
        or
        (contact_type = 'institution_website' and contact_value ~ '^https://[^[:space:]<>"'']+$')
      ))
  )
);

create table public.kc_demo_health_slots (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  starts_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_id, owner_user_id)
    references public.kc_demo_health_profiles (id, user_id) on delete cascade
);

create index kc_demo_health_slots_public_search_idx
  on public.kc_demo_health_slots (starts_at, profile_id)
  where status = 'active';
create index kc_demo_health_slots_owner_idx
  on public.kc_demo_health_slots (owner_user_id, starts_at);

alter table public.kc_demo_health_profiles enable row level security;
alter table public.kc_demo_health_profiles force row level security;
alter table public.kc_demo_health_slots enable row level security;
alter table public.kc_demo_health_slots force row level security;

revoke all on public.kc_demo_health_profiles from public, anon, authenticated;
revoke all on public.kc_demo_health_slots from public, anon, authenticated;

-- Public access is limited to fields needed to display and contact a demo profile.
-- The auth owner ID is never selectable by anon.
grant select (
  id, demo_identifier, public_name, profession, specialty, region, comuna,
  location_label, modality, exercise_type, institution_name, contact_type,
  contact_value, verification_status, published, created_at, updated_at
) on public.kc_demo_health_profiles to anon;
grant select (id, profile_id, starts_at, status, created_at, updated_at)
  on public.kc_demo_health_slots to anon;
grant select, insert, update, delete on public.kc_demo_health_profiles to authenticated;
grant select, insert, update, delete on public.kc_demo_health_slots to authenticated;

create policy kc_demo_profiles_public_read
  on public.kc_demo_health_profiles for select to anon, authenticated
  using (published is true);
create policy kc_demo_profiles_owner_read
  on public.kc_demo_health_profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy kc_demo_profiles_owner_insert
  on public.kc_demo_health_profiles for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and verification_status = 'demo_unverified'
    and demo_identifier like 'DEMO-%'
  );
create policy kc_demo_profiles_owner_update
  on public.kc_demo_health_profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and verification_status = 'demo_unverified'
    and demo_identifier like 'DEMO-%'
  );
create policy kc_demo_profiles_owner_delete
  on public.kc_demo_health_profiles for delete to authenticated
  using (user_id = (select auth.uid()));

create policy kc_demo_slots_public_read
  on public.kc_demo_health_slots for select to anon, authenticated
  using (
    status = 'active'
    and starts_at > now()
    and exists (
      select 1 from public.kc_demo_health_profiles p
      where p.id = profile_id and p.published is true
    )
  );
create policy kc_demo_slots_owner_read
  on public.kc_demo_health_slots for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy kc_demo_slots_owner_insert
  on public.kc_demo_health_slots for insert to authenticated
  with check (
    owner_user_id = (select auth.uid())
    and starts_at > now()
    and status = 'active'
    and exists (
      select 1 from public.kc_demo_health_profiles p
      where p.id = profile_id
        and p.user_id = (select auth.uid())
        and p.published is true
    )
  );
create policy kc_demo_slots_owner_update
  on public.kc_demo_health_slots for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (
    owner_user_id = (select auth.uid())
    and (status = 'inactive' or starts_at > now())
    and exists (
      select 1 from public.kc_demo_health_profiles p
      where p.id = profile_id and p.user_id = (select auth.uid())
    )
  );
create policy kc_demo_slots_owner_delete
  on public.kc_demo_health_slots for delete to authenticated
  using (owner_user_id = (select auth.uid()));
