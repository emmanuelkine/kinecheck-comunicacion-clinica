-- Fail-closed, atomic rate limiting for public beta intake. No client access.
create table if not exists public.kinecheck_public_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.kinecheck_public_rate_limits enable row level security;
revoke all on public.kinecheck_public_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.kinecheck_public_rate_limits to service_role;

create or replace function public.kinecheck_try_public_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if p_key_hash is null or length(p_key_hash) <> 64
     or p_key_hash !~ '^[a-f0-9]{64}$'
     or p_limit < 1 or p_limit > 100
     or p_window_seconds < 60 or p_window_seconds > 86400 then
    return false;
  end if;

  insert into public.kinecheck_public_rate_limits as existing
    (key_hash, window_started_at, request_count, updated_at)
  values (p_key_hash, now(), 1, now())
  on conflict (key_hash) do update set
    request_count = case
      when existing.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1
      else least(existing.request_count + 1, p_limit + 1)
    end,
    window_started_at = case
      when existing.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now()
      else existing.window_started_at
    end,
    updated_at = now()
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.kinecheck_try_public_rate_limit(text, integer, integer)
from public, anon, authenticated;
grant execute on function public.kinecheck_try_public_rate_limit(text, integer, integer)
to service_role;
