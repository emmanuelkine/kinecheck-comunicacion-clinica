-- KineCheck · vigencias comerciales por producto
-- Política:
--   KineCheck Recupera: 3 meses
--   KineCheck Clínico, Estudiante, cursos y Pack Estudiante: 12 meses
--   Las licencias activas existentes al ejecutar esta migración quedan
--   expresamente grandfathered y conservan su condición original.
--
-- Esta migración NO utiliza warranty_date.

begin;

alter table public.course_access
  add column if not exists access_expires_at timestamp with time zone;

alter table public.course_access
  add column if not exists access_term_months smallint;

alter table public.course_access
  add column if not exists access_grandfathered boolean not null default false;

alter table public.hotmart_product_grants
  add column if not exists access_term_months smallint;

-- Vigencias aplicables a compras futuras.
update public.hotmart_product_grants
set access_term_months = case
  when product_id = 8157431 then 3
  when product_id in (
    8150019,
    8154796,
    8192814,
    8194777,
    8195982,
    8205453,
    8208817
  ) then 12
  else access_term_months
end
where product_id in (
  8150019,
  8154796,
  8157431,
  8192814,
  8194777,
  8195982,
  8205453,
  8208817
);

-- Configuración única. effective_at se fija en el momento real en que
-- la migración se ejecuta; las compras anteriores no reciben vencimiento.
create table if not exists public.kinecheck_access_policy (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default true,
  effective_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.kinecheck_access_policy enable row level security;

insert into public.kinecheck_access_policy (
  singleton,
  enabled,
  effective_at,
  updated_at
)
values (
  true,
  true,
  now(),
  now()
)
on conflict (singleton) do update
set
  enabled = true,
  updated_at = now();

-- Protege de forma explícita las licencias comerciales activas existentes.
-- No se incluyen accesos de propietario, pruebas ni licencias ya revocadas.
update public.course_access
set access_grandfathered = true
where active = true
  and access_expires_at is null
  and lower(coalesce(access_source, '')) = 'hotmart'
  and upper(coalesce(last_event, '')) <> 'OWNER_ACCESS';

-- Restricciones defensivas sin asumir que la migración se ejecutará una sola vez.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'course_access_term_months_valid'
      and conrelid = 'public.course_access'::regclass
  ) then
    alter table public.course_access
      add constraint course_access_term_months_valid
      check (access_term_months is null or access_term_months between 1 and 120);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'hotmart_product_grants_term_months_valid'
      and conrelid = 'public.hotmart_product_grants'::regclass
  ) then
    alter table public.hotmart_product_grants
      add constraint hotmart_product_grants_term_months_valid
      check (access_term_months is null or access_term_months between 1 and 120);
  end if;
end
$$;

create index if not exists course_access_expiry_active_idx
  on public.course_access (access_expires_at)
  where active = true and access_expires_at is not null;

create index if not exists course_access_email_course_expiry_idx
  on public.course_access (lower(email), course_slug, access_expires_at);

-- Calcula o conserva la vigencia antes de cada escritura comercial.
create or replace function public.kinecheck_apply_access_term()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy_enabled boolean := false;
  v_effective_at timestamp with time zone;
  v_term_months smallint;
  v_event_at timestamp with time zone;
  v_base timestamp with time zone;
  v_same_transaction boolean := false;
begin
  -- Los accesos de propietario nunca vencen por política comercial.
  if upper(coalesce(new.last_event, '')) = 'OWNER_ACCESS'
     or lower(coalesce(new.access_source, '')) = 'owner'
  then
    new.access_expires_at := null;
    new.access_term_months := null;
    new.access_grandfathered := true;
    return new;
  end if;

  -- Solo administra licencias concedidas por compras Hotmart.
  if lower(coalesce(new.access_source, '')) not in ('hotmart', 'hotmart_test') then
    return new;
  end if;

  select enabled, effective_at
  into v_policy_enabled, v_effective_at
  from public.kinecheck_access_policy
  where singleton = true;

  if not coalesce(v_policy_enabled, false) or v_effective_at is null then
    return new;
  end if;

  select hpg.access_term_months
  into v_term_months
  from public.hotmart_product_grants hpg
  where hpg.product_id::text = new.hotmart_product_id::text
    and hpg.course_slug = new.course_slug
  limit 1;

  -- Productos aún no configurados mantienen el comportamiento anterior.
  if v_term_months is null then
    return new;
  end if;

  v_event_at := coalesce(new.last_event_at, new.purchase_date, now());

  if tg_op = 'UPDATE' then
    v_same_transaction := new.transaction_id is not distinct from old.transaction_id;

    -- Un reembolso/cancelación elimina el beneficio grandfathered.
    if new.active = false
       and upper(coalesce(new.last_event, '')) in (
         'PURCHASE_CANCELED',
         'PURCHASE_CHARGEBACK',
         'PURCHASE_EXPIRED',
         'PURCHASE_REFUNDED',
         'PURCHASE_DELAYED',
         'CANCELED',
         'CANCELLED',
         'CHARGEBACK',
         'EXPIRED',
         'REFUNDED',
         'DELAYED'
       )
    then
      new.access_grandfathered := false;
      new.access_expires_at := old.access_expires_at;
      new.access_term_months := old.access_term_months;
      return new;
    end if;

    -- Las licencias legítimamente existentes conservan acceso sin vencimiento.
    if old.access_grandfathered then
      new.access_grandfathered := true;
      new.access_expires_at := null;
      new.access_term_months := null;
      return new;
    end if;

    -- Eventos APPROVED/COMPLETE de la misma transacción no deben sumar meses.
    if v_same_transaction and old.access_expires_at is not null then
      new.access_expires_at := old.access_expires_at;
      new.access_term_months := old.access_term_months;
      return new;
    end if;
  end if;

  if new.active = false then
    if tg_op = 'UPDATE' then
      new.access_expires_at := old.access_expires_at;
      new.access_term_months := old.access_term_months;
    end if;
    return new;
  end if;

  -- Una compra anterior a la entrada en vigor no se vuelve retroactivamente temporal.
  if v_event_at < v_effective_at then
    new.access_grandfathered := true;
    new.access_expires_at := null;
    new.access_term_months := null;
    return new;
  end if;

  -- Renovaciones con una transacción nueva suman tiempo desde la fecha mayor:
  -- el vencimiento vigente o el nuevo evento de compra.
  if tg_op = 'UPDATE'
     and not v_same_transaction
     and old.access_expires_at is not null
  then
    v_base := greatest(old.access_expires_at, v_event_at);
  else
    v_base := v_event_at;
  end if;

  new.access_grandfathered := false;
  new.access_term_months := v_term_months;
  new.access_expires_at := v_base + make_interval(months => v_term_months::integer);

  return new;
end;
$$;

drop trigger if exists kinecheck_apply_access_term_trigger
  on public.course_access;

create trigger kinecheck_apply_access_term_trigger
before insert or update on public.course_access
for each row
execute function public.kinecheck_apply_access_term();

-- Desactiva de manera centralizada las licencias cuyo plazo terminó.
-- Así también quedan bloqueadas las aplicaciones que todavía consultan active=true.
create or replace function public.deactivate_expired_course_access()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  update public.course_access
  set
    active = false,
    last_event = 'ACCESS_TERM_EXPIRED',
    updated_at = now(),
    last_event_at = greatest(coalesce(last_event_at, access_expires_at), access_expires_at)
  where active = true
    and access_expires_at is not null
    and access_expires_at <= now()
    and lower(coalesce(access_source, '')) <> 'owner'
    and upper(coalesce(last_event, '')) <> 'OWNER_ACCESS';

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.kinecheck_apply_access_term() from public;
revoke all on function public.deactivate_expired_course_access() from public;
grant execute on function public.deactivate_expired_course_access() to service_role;

revoke all on table public.kinecheck_access_policy from anon, authenticated;

commit;
