-- Empty staging tables for the Hours Available pilot. DEMO data remains isolated.
create table if not exists public.kc_health_professionals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 3 and 120),
  profession text not null check (length(trim(profession)) between 3 and 100),
  registration_number text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','rejected')),
  created_at timestamptz not null default now()
);
create table if not exists public.kc_health_institutions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  legal_name text not null,
  public_name text not null,
  institution_type text not null,
  comuna text not null,
  region text not null,
  contact_email text not null,
  verification_status text not null default 'pending',
  created_at timestamptz not null default now()
);
create table if not exists public.kc_health_institution_members (
  institution_id uuid not null references public.kc_health_institutions(id) on delete cascade,
  professional_id uuid not null references auth.users(id) on delete cascade,
  membership_status text not null default 'pending'
    check (membership_status in ('pending','active','revoked')),
  created_at timestamptz not null default now(),
  primary key (institution_id, professional_id)
);
create table if not exists public.kc_health_slots (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references auth.users(id) on delete cascade,
  specialty text not null,
  region text not null,
  comuna text not null,
  starts_at timestamptz not null,
  location_text text not null,
  public_contact text not null,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  facility_type text,
  modality text,
  booking_url text,
  expires_at timestamptz
);
