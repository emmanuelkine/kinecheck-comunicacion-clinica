-- Métricas de pilotos de Horas Disponibles. No ejecutar sin revisar el esquema de membresías.
-- Los eventos no contienen datos identificatorios ni clínicos de pacientes.
create table if not exists public.kc_hours_pilot_events (
 id uuid primary key default gen_random_uuid(),
 institution_id uuid not null,
 slot_id uuid not null,
 event_type text not null check (event_type in ('published','contact_clicked','confirmed','not_booked','cancelled')),
 actor_user_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 constraint kc_hours_pilot_events_unique_state unique (slot_id,event_type)
);
create index if not exists kc_hours_pilot_events_institution_time
 on public.kc_hours_pilot_events(institution_id,created_at desc);
alter table public.kc_hours_pilot_events enable row level security;
revoke all on public.kc_hours_pilot_events from anon, authenticated;
-- Sin políticas de lectura/escritura hasta vincular autorización institucional real.
-- La aplicación debe registrar eventos mediante un endpoint servidor que compruebe
-- institución, pertenencia del profesional y permiso delegado de secretaría.
-- No interpretar contact_clicked como una reserva ni como ingreso recuperado.
