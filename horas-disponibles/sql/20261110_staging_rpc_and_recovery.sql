-- STAGING-VALIDATED COMPONENTS ONLY. NOT A COMPLETE PRODUCTION MIGRATION.
-- Requires audited kc_hours_private schema and all dependent objects first.
-- Do not run on production before schema comparison, RLS tests, legal approval and backup.
create table if not exists kc_hours_private.recovery_confirmations (
 slot_id uuid primary key references public.kc_health_slots(id) on delete restrict,
 institution_id uuid not null references public.kc_health_institutions(id),
 confirmed_by uuid not null references auth.users(id),
 confirmed_at timestamptz not null default now(),
 evidence_reference text not null,
 constraint evidence_reference_length check (length(trim(evidence_reference)) between 5 and 120)
);
alter table kc_hours_private.recovery_confirmations enable row level security;
revoke all on kc_hours_private.recovery_confirmations from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.kc_hours_pilot_api(action text, payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin if auth.uid() is null or auth.role() <> 'authenticated' then raise exception 'Autenticación requerida' using errcode='42501'; end if; return kc_hours_private.api(action,coalesce(payload,'{}'::jsonb)); end $function$
;
revoke all on function public.kc_hours_pilot_api(text,jsonb) from public,anon;
grant execute on function public.kc_hours_pilot_api(text,jsonb) to authenticated;
CREATE OR REPLACE FUNCTION public.kc_hours_recovery_api(action text, institution_id uuid, slot_id uuid DEFAULT NULL::uuid, evidence_reference text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=kc_hours_private.actor(); s public.kc_health_slots; n bigint; inserted_id uuid;
begin
 if auth.role()<>'authenticated' or not kc_hours_private.is_admin(institution_id,u) then raise exception 'Permisos institucionales insuficientes' using errcode='42501'; end if;
 if not exists(select 1 from public.kc_health_institutions i where i.id=institution_id and i.verification_status='verified' and i.is_active and not i.is_suspended) then raise exception 'Institución no habilitada' using errcode='42501'; end if;
 if action='summary' then
  select count(*) into n from kc_hours_private.recovery_confirmations rc where rc.institution_id=kc_hours_recovery_api.institution_id;
  return jsonb_build_object('attendances_verified',n,'definition','Atención declarada y confirmada externamente por administrador; no demuestra atribución causal a KineCheck');
 elsif action='confirm' then
  if slot_id is null then raise exception 'Hora requerida' using errcode='22023'; end if;
  select * into s from public.kc_health_slots where id=slot_id for update;
  if not found or s.institution_id is distinct from institution_id or s.status<>'inactive' or s.deactivation_reason<>'booked' or s.starts_at>now()
    then raise exception 'La hora debe pertenecer a la institución, haber transcurrido y constar como reservada' using errcode='23514'; end if;
  if evidence_reference is null or length(trim(evidence_reference)) not between 5 and 120 or evidence_reference ~* '(@|https?://|[0-9]{7,})'
    then raise exception 'Referencia interna no identificable de 5 a 120 caracteres, sin datos de pacientes' using errcode='22023'; end if;
  insert into kc_hours_private.recovery_confirmations(slot_id,institution_id,confirmed_by,evidence_reference)
  values(slot_id,institution_id,u,trim(evidence_reference)) on conflict(slot_id) do nothing returning recovery_confirmations.slot_id into inserted_id;
  return jsonb_build_object('confirmed',true,'slot_id',slot_id,'already_registered',inserted_id is null);
 else raise exception 'Operación desconocida' using errcode='22023'; end if;
end $function$
;
revoke all on function public.kc_hours_recovery_api(text,uuid,uuid,text) from public,anon;
grant execute on function public.kc_hours_recovery_api(text,uuid,uuid,text) to authenticated;
