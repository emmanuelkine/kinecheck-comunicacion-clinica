alter table public.kinecheck_public_events
  add column if not exists user_id uuid null references auth.users(id) on delete set null,
  add column if not exists is_qa boolean not null default false;

update public.kinecheck_public_events
set is_qa = true
where is_qa = false
  and (path ilike '%?qa=%' or path ilike '%&qa=%');

create index if not exists kinecheck_public_events_user_time_idx
  on public.kinecheck_public_events(user_id, occurred_at desc)
  where user_id is not null;

create index if not exists kinecheck_public_events_user_event_time_idx
  on public.kinecheck_public_events(user_id, event_name, occurred_at desc)
  where user_id is not null;

create index if not exists kinecheck_public_events_nonqa_time_idx
  on public.kinecheck_public_events(occurred_at desc)
  where is_qa = false;
