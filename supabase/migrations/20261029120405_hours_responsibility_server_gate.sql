create or replace function public.kc_stamp_hours_declaration()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'La declaración debe registrarse desde la identidad autenticada' using errcode='42501';
  end if;
  if new.accepted is not true then
    raise exception 'Se requiere aceptar la declaración' using errcode='23514';
  end if;
  if tg_op='UPDATE' then
    raise exception 'La aceptación es un registro inmutable' using errcode='42501';
  end if;
  new.declaration_version:='2026-10-29-v1';
  new.accepted_at:=statement_timestamp();
  return new;
end;
$$;
create trigger kc_hours_declaration_stamp
  before insert or update on public.kc_health_responsibility_acceptances
  for each row execute function public.kc_stamp_hours_declaration();
grant select,insert on public.kc_health_responsibility_acceptances to authenticated;
create policy kc_hours_declaration_owner_read on public.kc_health_responsibility_acceptances
  for select to authenticated using(user_id=(select auth.uid()));
create policy kc_hours_declaration_owner_insert on public.kc_health_responsibility_acceptances
  for insert to authenticated with check(user_id=(select auth.uid()) and accepted is true);
create or replace function public.kc_require_hours_declaration()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.status='active' and new.starts_at<=now() then
    raise exception 'Solo se pueden publicar horas futuras' using errcode='23514';
  end if;
  if new.booking_url is not null and (length(new.booking_url)>1500 or
    new.booking_url !~ '^https://[^/@[:space:]]+([/?#][^[:space:]<>"'']*)?$') then
    raise exception 'El enlace de agendamiento debe usar HTTPS y no incluir credenciales' using errcode='23514';
  end if;
  if new.status='active' and not public.kc_hours_professional_is_listable(new.professional_id) then
    raise exception 'Publicación requiere aceptación y verificación independiente vigente' using errcode='42501';
  end if;
  return new;
end;
$$;
create trigger kc_hours_slot_declaration_gate
  before insert or update of status,professional_id on public.kc_health_slots
  for each row execute function public.kc_require_hours_declaration();
