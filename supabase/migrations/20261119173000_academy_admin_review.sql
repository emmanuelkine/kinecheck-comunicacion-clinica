-- Private persistence for the KineCheck Academy academic-validation panel.
-- This migration does not enable OTEC or certificate issuance.

create table if not exists public.academy_academic_review_instruments (
  id text primary key,
  instrument_version text not null unique,
  panel_data jsonb not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  active boolean not null default false,
  installed_by uuid references auth.users(id) on delete set null,
  installed_at timestamptz not null default now(),
  constraint academy_instrument_singleton_id check (id = 'academy-otec-private-instrument'),
  constraint academy_instrument_data_object check (jsonb_typeof(panel_data) = 'object'),
  constraint academy_instrument_eight_courses check (coalesce((panel_data #>> '{counts,courses}')::integer, 0) = 8),
  constraint academy_instrument_eighty_variants check (coalesce((panel_data #>> '{counts,variants}')::integer, 0) = 80),
  constraint academy_instrument_not_scorable check (coalesce(panel_data ->> 'scorable', '') = 'false'),
  constraint academy_instrument_otec_blocked check (coalesce(panel_data #>> '{baseline,otec}', '') = 'BLOQUEADA'),
  constraint academy_instrument_certificates_blocked check (coalesce(panel_data #>> '{baseline,certificates}', '') = 'BLOQUEADOS')
);

create table if not exists public.academy_academic_review_state (
  id text primary key,
  instrument_version text not null,
  revision bigint not null default 0 check (revision >= 0),
  state jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint academy_review_singleton_id check (id = 'academy-otec-private-review'),
  constraint academy_review_state_object check (jsonb_typeof(state) = 'object'),
  constraint academy_review_otec_blocked check (coalesce(state #>> '{otec,status}', '') = 'BLOQUEADA'),
  constraint academy_review_certificates_disabled check (coalesce(state #>> '{otec,certificatesEnabled}', '') = 'false')
);

create table if not exists public.academy_academic_review_events (
  id bigint generated always as identity primary key,
  state_id text not null references public.academy_academic_review_state(id) on delete restrict,
  sequence bigint not null check (sequence > 0),
  event_type text not null check (event_type in ('pair_reviewed', 'source_gap_reviewed', 'course_reviewed', 'pilot_recorded')),
  entity_id text not null,
  reviewer text not null,
  instrument_version text not null,
  occurred_at timestamptz not null,
  previous_hash text,
  event_hash text not null check (event_hash ~ '^[0-9a-f]{64}$'),
  payload jsonb not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  unique (state_id, sequence),
  unique (state_id, event_hash)
);

alter table public.academy_academic_review_instruments enable row level security;
alter table public.academy_academic_review_instruments force row level security;
alter table public.academy_academic_review_state enable row level security;
alter table public.academy_academic_review_state force row level security;
alter table public.academy_academic_review_events enable row level security;
alter table public.academy_academic_review_events force row level security;

revoke all on table public.academy_academic_review_instruments from public, anon, authenticated;
revoke all on table public.academy_academic_review_state from public, anon, authenticated;
revoke all on table public.academy_academic_review_events from public, anon, authenticated;
revoke all on sequence public.academy_academic_review_events_id_seq from public, anon, authenticated;
grant select, insert, update on table public.academy_academic_review_instruments to service_role;
grant select, insert, update on table public.academy_academic_review_state to service_role;
grant select, insert on table public.academy_academic_review_events to service_role;
grant usage, select on sequence public.academy_academic_review_events_id_seq to service_role;

insert into public.academy_academic_review_state (id, instrument_version, revision, state)
values (
  'academy-otec-private-review',
  'candidate-2026-11-19.2',
  0,
  jsonb_build_object(
    'schemaVersion', '1.0',
    'instrumentVersion', 'candidate-2026-11-19.2',
    'reviewer', 'Klgo. Mtr. Emmanuel Zúñiga',
    'updatedAt', null,
    'pairReviews', '{}'::jsonb,
    'gapReviews', '{}'::jsonb,
    'courseReviews', '{}'::jsonb,
    'pilotRecords', '[]'::jsonb,
    'eventLog', '[]'::jsonb,
    'otec', jsonb_build_object('status', 'BLOQUEADA', 'certificatesEnabled', false)
  )
)
on conflict (id) do nothing;

create or replace function public.kc_academy_review_commit(
  p_instrument_version text,
  p_expected_revision bigint,
  p_state jsonb,
  p_event jsonb,
  p_actor_user_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state_id constant text := 'academy-otec-private-review';
  v_current_revision bigint;
  v_previous_hash text;
  v_next_revision bigint;
  v_event_hash text;
begin
  if p_actor_user_id is null or p_expected_revision < 0 then
    raise exception using errcode = '22023', message = 'invalid academy review commit';
  end if;
  if p_instrument_version <> 'candidate-2026-11-19.2'
     or coalesce(p_state ->> 'instrumentVersion', '') <> p_instrument_version
     or coalesce(p_state #>> '{otec,status}', '') <> 'BLOQUEADA'
     or coalesce(p_state #>> '{otec,certificatesEnabled}', '') <> 'false'
     or jsonb_typeof(p_state -> 'eventLog') <> 'array' then
    raise exception using errcode = '22023', message = 'invalid or unsafe academy review state';
  end if;

  select revision
    into v_current_revision
    from public.academy_academic_review_state
   where id = v_state_id
   for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'academy review state is not initialized';
  end if;
  if v_current_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'academy review state changed; reload before saving';
  end if;

  v_next_revision := v_current_revision + 1;
  if jsonb_array_length(p_state -> 'eventLog') <> v_next_revision
     or coalesce((p_event ->> 'sequence')::bigint, 0) <> v_next_revision
     or coalesce(p_event ->> 'instrumentVersion', '') <> p_instrument_version
     or coalesce(p_event ->> 'hash', '') !~ '^[0-9a-f]{64}$'
     or coalesce((p_state -> 'eventLog' -> (p_expected_revision::integer)) ->> 'hash', '') <> coalesce(p_event ->> 'hash', '') then
    raise exception using errcode = '22023', message = 'academy review event does not match state';
  end if;

  select event_hash
    into v_previous_hash
    from public.academy_academic_review_events
   where state_id = v_state_id
   order by sequence desc
   limit 1;
  if (p_event ->> 'previousHash') is distinct from v_previous_hash then
    raise exception using errcode = '22023', message = 'academy review event chain mismatch';
  end if;

  v_event_hash := p_event ->> 'hash';
  update public.academy_academic_review_state
     set state = p_state,
         revision = v_next_revision,
         instrument_version = p_instrument_version,
         updated_by = p_actor_user_id,
         updated_at = now()
   where id = v_state_id;

  insert into public.academy_academic_review_events (
    state_id, sequence, event_type, entity_id, reviewer, instrument_version,
    occurred_at, previous_hash, event_hash, payload, actor_user_id
  ) values (
    v_state_id,
    v_next_revision,
    p_event ->> 'type',
    p_event ->> 'entityId',
    p_event ->> 'reviewer',
    p_instrument_version,
    (p_event ->> 'at')::timestamptz,
    nullif(p_event ->> 'previousHash', ''),
    v_event_hash,
    coalesce(p_event -> 'payload', '{}'::jsonb),
    p_actor_user_id
  );

  return v_next_revision;
end;
$$;

revoke all on function public.kc_academy_review_commit(text, bigint, jsonb, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.kc_academy_review_commit(text, bigint, jsonb, jsonb, uuid) to service_role;

comment on table public.academy_academic_review_instruments is
  'Paquete privado de ocho cursos y 80 variantes. No se incluye en el repositorio público y sólo service_role puede leerlo.';
comment on table public.academy_academic_review_state is
  'Estado privado del panel de validación Academy. Sin acceso anon/authenticated; sólo la Edge Function autorizada usa service_role.';
comment on table public.academy_academic_review_events is
  'Bitácora inmutable y encadenada de decisiones académicas; OTEC y certificados permanecen bloqueados.';
comment on function public.kc_academy_review_commit(text, bigint, jsonb, jsonb, uuid) is
  'Commit atómico con control de revisión optimista. Sólo service_role.';
