create table if not exists public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_slug text not null,
  rating smallint not null check (rating between 1 and 5),
  recommends boolean not null default false,
  best_part text,
  improvement text,
  public_comment boolean not null default true,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_slug)
);

alter table public.course_reviews enable row level security;

create policy "Users can read their own reviews"
on public.course_reviews for select
to authenticated
using (auth.uid() = user_id);

create policy "Service role manages reviews"
on public.course_reviews for all
to service_role
using (true)
with check (true);

create index if not exists course_reviews_course_slug_idx on public.course_reviews(course_slug);
create index if not exists course_reviews_approved_idx on public.course_reviews(approved) where approved = true;
