create table if not exists public.beta_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null unique,
  full_name text not null check (char_length(full_name) between 2 and 120),
  role text not null check (role in ('professional','student','teacher','patient')),
  product_interest text not null check (product_interest in (
    'kinecheck-clinico','kinecheck-estudiante','kinecheck-recupera',
    'comunicacion-clinica','mas-alla-del-dolor','evidencia-aplicada',
    'traumatologia-ortopedia-clinica','pack-estudiante','general'
  )),
  experience text not null default '' check (char_length(experience) <= 1200),
  device text not null check (device in ('mobile','desktop','both')),
  availability text not null default '' check (char_length(availability) <= 500),
  consent_privacy boolean not null check (consent_privacy = true),
  consent_contact boolean not null default false,
  status text not null default 'new' check (status in ('new','shortlisted','invited','active','completed','declined')),
  source text not null default 'website_beta',
  submission_count integer not null default 1 check (submission_count > 0),
  last_submitted_at timestamptz not null default now(),
  notes text not null default ''
);

alter table public.beta_applications enable row level security;
revoke all on table public.beta_applications from public, anon, authenticated;
grant select, insert, update, delete on table public.beta_applications to service_role;

comment on table public.beta_applications is
  'Postulaciones al programa beta KineCheck. No debe contener datos clínicos ni identificadores de pacientes.';
