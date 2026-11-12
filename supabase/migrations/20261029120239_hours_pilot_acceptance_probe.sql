-- Create the versioned acceptance record. Access remains blocked by RLS until
-- the subsequent policy and trigger migrations are applied.
create table if not exists public.kc_health_responsibility_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  accepted boolean not null check (accepted is true),
  declaration_version text not null,
  accepted_at timestamptz not null,
  primary key (user_id, declaration_version)
);
alter table public.kc_health_responsibility_acceptances enable row level security;
alter table public.kc_health_responsibility_acceptances force row level security;
revoke all on public.kc_health_responsibility_acceptances from public, anon, authenticated;
grant select, insert on public.kc_health_responsibility_acceptances to authenticated;
