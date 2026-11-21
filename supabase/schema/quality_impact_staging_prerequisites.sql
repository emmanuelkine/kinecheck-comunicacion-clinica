-- Staging-only: exact column/constraint snapshots from production, 2026-10-28.
-- No users, licences, responses, programs or results are copied.
begin;
create table if not exists public.course_academic_load(
course_slug text not null,
title text not null,
content_version text default ''::text not null,
audited_minutes integer not null,
certifiable_hours numeric(5,2) not null,
module_load jsonb default '[]'::jsonb not null,
methodology text default ''::text not null,
certificate_ready boolean default false not null,
audit_date date default CURRENT_DATE not null,
notes text default ''::text not null,
updated_at timestamp with time zone default now() not null,
activity_payload jsonb default '{}'::jsonb not null,
CHECK ((audited_minutes > 0)),
CHECK ((certifiable_hours > (0)::numeric)),
PRIMARY KEY (course_slug)
);
alter table public.course_academic_load enable row level security;
revoke all on public.course_academic_load from anon,authenticated;

create table if not exists public.course_completions(
user_id uuid not null,
email text not null,
course_slug text not null,
content_version text not null,
course_title text not null,
audited_minutes integer not null,
certifiable_hours numeric(5,2) not null,
completed_at timestamp with time zone not null,
verification_method text not null,
verification_level text not null,
score numeric(5,2),
evidence jsonb default '{}'::jsonb not null,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null,
PRIMARY KEY (user_id, course_slug, content_version)
);
alter table public.course_completions enable row level security;
revoke all on public.course_completions from anon,authenticated;

create table if not exists public.course_assessment_attempts(
id uuid default gen_random_uuid() not null,
user_id uuid not null,
email text not null,
course_slug text not null,
content_version text not null,
attempt_number smallint not null,
item_ids jsonb default '[]'::jsonb not null,
answers jsonb,
score numeric(5,2),
passed boolean,
safety_gate_passed boolean,
started_at timestamp with time zone default now() not null,
submitted_at timestamp with time zone,
created_at timestamp with time zone default now() not null,
updated_at timestamp with time zone default now() not null,
CHECK (((attempt_number >= 1) AND (attempt_number <= 20))),
PRIMARY KEY (id),
UNIQUE (user_id, course_slug, content_version, attempt_number)
);
alter table public.course_assessment_attempts enable row level security;
revoke all on public.course_assessment_attempts from anon,authenticated;
commit;
