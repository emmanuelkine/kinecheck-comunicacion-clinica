-- KineCheck Evalúa MVP: private teacher-owned evaluation records.
create table if not exists public.evalua_evaluations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  max_points numeric(8,2) not null check (max_points > 0),
  exigency numeric(5,2) not null check (exigency > 0 and exigency <= 100),
  notes text,
  rubric_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.evalua_submissions (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evalua_evaluations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  original_filename text not null,
  storage_path text,
  status text not null default 'pending' check (status in ('pending','processing','review','approved','error')),
  grading_result jsonb,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.evalua_evaluations enable row level security;
alter table public.evalua_submissions enable row level security;
revoke all on public.evalua_evaluations from anon;
revoke all on public.evalua_submissions from anon;
grant select,insert,update,delete on public.evalua_evaluations to authenticated;
grant select,insert,update,delete on public.evalua_submissions to authenticated;
create policy "evalua_evaluations_owner_select" on public.evalua_evaluations for select to authenticated using ((select auth.uid()) = owner_id);
create policy "evalua_evaluations_owner_insert" on public.evalua_evaluations for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "evalua_evaluations_owner_update" on public.evalua_evaluations for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "evalua_evaluations_owner_delete" on public.evalua_evaluations for delete to authenticated using ((select auth.uid()) = owner_id);
create policy "evalua_submissions_owner_select" on public.evalua_submissions for select to authenticated using ((select auth.uid()) = owner_id);
create policy "evalua_submissions_owner_insert" on public.evalua_submissions for insert to authenticated with check ((select auth.uid()) = owner_id and exists (select 1 from public.evalua_evaluations e where e.id=evaluation_id and e.owner_id=(select auth.uid())));
create policy "evalua_submissions_owner_update" on public.evalua_submissions for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "evalua_submissions_owner_delete" on public.evalua_submissions for delete to authenticated using ((select auth.uid()) = owner_id);
