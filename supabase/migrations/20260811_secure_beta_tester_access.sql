-- Secure temporary beta tester access for KineCheck.
-- Grants are server-side, tied to the authenticated email, expiring and revocable.
-- Ordinary anon/authenticated users cannot invoke grant/revoke functions.

create or replace function public.kinecheck_grant_beta_access(
  p_email text,
  p_course_slugs text[],
  p_days integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_days integer := coalesce(p_days, 7);
  v_expires_at timestamptz;
  v_requested text;
  v_slug text;
  v_expanded text[];
  v_product_id text;
  v_existing_source text;
  v_granted text[] := array[]::text[];
  v_preserved text[] := array[]::text[];
  v_processed text[] := array[]::text[];
begin
  if v_email = '' or position('@' in v_email) <= 1 then
    raise exception 'Correo beta inválido';
  end if;

  if v_days < 1 or v_days > 30 then
    raise exception 'La duración beta debe estar entre 1 y 30 días';
  end if;

  if p_course_slugs is null or cardinality(p_course_slugs) = 0 then
    raise exception 'Debes indicar al menos un producto o curso beta';
  end if;

  v_expires_at := now() + make_interval(days => v_days);

  foreach v_requested in array p_course_slugs loop
    v_requested := lower(trim(coalesce(v_requested, '')));

    if v_requested in ('all', '*') then
      v_expanded := array[
        'kinecheck-clinico',
        'kinecheck-clinico-curso',
        'kinecheck-estudiante',
        'kinecheck-recupera',
        'comunicacion-clinica',
        'mas-alla-del-dolor',
        'evidencia-aplicada',
        'traumatologia-ortopedia-clinica',
        'kinecheck-escalas',
        'kinecheck-pruebas-especiales'
      ];
    elsif v_requested = 'pack-estudiante' then
      v_expanded := array['kinecheck-estudiante', 'mas-alla-del-dolor'];
    elsif v_requested = 'kinecheck-clinico' then
      v_expanded := array['kinecheck-clinico', 'kinecheck-clinico-curso'];
    else
      v_expanded := array[v_requested];
    end if;

    foreach v_slug in array v_expanded loop
      if v_slug = any(v_processed) then
        continue;
      end if;
      v_processed := array_append(v_processed, v_slug);

      v_product_id := case v_slug
        when 'kinecheck-clinico' then '8150019'
        when 'kinecheck-clinico-curso' then '8150019'
        when 'kinecheck-estudiante' then '8154796'
        when 'kinecheck-recupera' then '8157431'
        when 'comunicacion-clinica' then '8192814'
        when 'mas-alla-del-dolor' then '8194777'
        when 'evidencia-aplicada' then '8208817'
        when 'traumatologia-ortopedia-clinica' then '8205453'
        when 'kinecheck-escalas' then '8289351'
        when 'kinecheck-pruebas-especiales' then '8289677'
        else null
      end;

      if v_product_id is null then
        raise exception 'Producto beta no soportado: %', v_slug;
      end if;

      select ca.access_source
      into v_existing_source
      from public.course_access ca
      where ca.email = v_email
        and ca.course_slug = v_slug;

      -- Never replace a commercial, owner, or manual entitlement.
      if found and lower(coalesce(v_existing_source, '')) <> 'beta' then
        v_preserved := array_append(v_preserved, v_slug);
        continue;
      end if;

      insert into public.course_access (
        email,
        course_slug,
        active,
        hotmart_product_id,
        transaction_id,
        last_event,
        updated_at,
        purchase_date,
        warranty_date,
        product_ucode,
        access_source,
        last_event_at,
        access_expires_at,
        access_term_months,
        access_grandfathered
      ) values (
        v_email,
        v_slug,
        true,
        v_product_id,
        'beta:' || v_slug,
        'BETA_ACCESS_GRANTED',
        now(),
        now(),
        null,
        'BETA',
        'beta',
        now(),
        v_expires_at,
        null,
        false
      )
      on conflict (email, course_slug) do update
      set active = true,
          hotmart_product_id = excluded.hotmart_product_id,
          transaction_id = excluded.transaction_id,
          last_event = 'BETA_ACCESS_GRANTED',
          updated_at = now(),
          purchase_date = now(),
          warranty_date = null,
          product_ucode = 'BETA',
          access_source = 'beta',
          last_event_at = now(),
          access_expires_at = v_expires_at,
          access_term_months = null,
          access_grandfathered = false;

      v_granted := array_append(v_granted, v_slug);
    end loop;
  end loop;

  return jsonb_build_object(
    'email', v_email,
    'days', v_days,
    'expiresAt', v_expires_at,
    'grantedSlugs', to_jsonb(v_granted),
    'preservedExistingSlugs', to_jsonb(v_preserved)
  );
end;
$$;

create or replace function public.kinecheck_revoke_beta_access(
  p_email text,
  p_course_slugs text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_updated integer := 0;
  v_slugs text[] := p_course_slugs;
begin
  if v_email = '' or position('@' in v_email) <= 1 then
    raise exception 'Correo beta inválido';
  end if;

  if v_slugs is null
     or cardinality(v_slugs) = 0
     or exists (
       select 1
       from unnest(v_slugs) x
       where lower(trim(x)) in ('all', '*')
     ) then
    update public.course_access
    set active = false,
        last_event = 'BETA_ACCESS_REVOKED',
        last_event_at = now(),
        updated_at = now()
    where email = v_email
      and lower(coalesce(access_source, '')) = 'beta'
      and active = true;
  else
    update public.course_access
    set active = false,
        last_event = 'BETA_ACCESS_REVOKED',
        last_event_at = now(),
        updated_at = now()
    where email = v_email
      and lower(coalesce(access_source, '')) = 'beta'
      and active = true
      and course_slug = any(
        array(
          select distinct case lower(trim(x))
            when 'pack-estudiante' then 'kinecheck-estudiante'
            else lower(trim(x))
          end
          from unnest(v_slugs) x
        )
      );
  end if;

  get diagnostics v_updated = row_count;

  return jsonb_build_object(
    'email', v_email,
    'revokedCount', v_updated,
    'revokedAt', now()
  );
end;
$$;

-- Application/SSO backends that consult this helper also recognize a valid beta
-- entitlement, while keeping the existing owner and Hotmart checks unchanged.
create or replace function public.has_course_access(p_course_slug text, p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    lower(trim(p_email)) in (
      'emmanuelkine@gmail.com',
      'emmanuelkine+owner@gmail.com',
      'emmanuel_fox@hotmail.com'
    )
    or exists (
      select 1
      from public.course_access ca
      where ca.email = lower(trim(p_email))
        and ca.course_slug = p_course_slug
        and ca.active = true
        and lower(coalesce(ca.access_source, '')) = 'beta'
        and (ca.access_expires_at is null or ca.access_expires_at > now())
    )
    or exists (
      select 1
      from public.hotmart_purchases as purchase
      inner join public.hotmart_product_grants as g
        on g.product_id = purchase.product_id
      where lower(trim(purchase.buyer_email)) = lower(trim(p_email))
        and g.course_slug = p_course_slug
        and purchase.status = 'active'
    );
$$;

-- Beta grants are operational test access, not commercial purchase events.
-- Avoid generating generic purchase/license emails for them.
create or replace function public.kinecheck_course_access_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(new.email));
  v_title text;
  v_body text;
  v_type text;
  v_key text;
  v_action text := '/platform/#library';
  v_is_owner boolean := lower(coalesce(new.access_source, '')) = 'owner'
    or upper(coalesce(new.last_event, '')) = 'OWNER_ACCESS';
begin
  if v_is_owner or lower(coalesce(new.access_source, '')) = 'beta' then
    return new;
  end if;

  if new.active = true and (
    tg_op = 'INSERT'
    or old.active is distinct from true
    or old.transaction_id is distinct from new.transaction_id
  ) then
    v_type := 'license_activated';
    v_title := 'Tu acceso está activo';
    v_body := 'KineCheck habilitó ' || new.course_slug || ' para tu cuenta.';
    v_key := 'license-active:' || v_email || ':' || new.course_slug || ':' || coalesce(new.transaction_id, 'none');
  elsif tg_op = 'UPDATE' and old.active = true and new.active = false then
    v_type := case
      when upper(coalesce(new.last_event, '')) = 'ACCESS_TERM_EXPIRED' then 'license_expired'
      else 'license_deactivated'
    end;
    v_title := case
      when v_type = 'license_expired' then 'Tu período de acceso finalizó'
      else 'Tu acceso fue desactivado'
    end;
    v_body := case
      when v_type = 'license_expired' then 'Finalizó la vigencia de ' || new.course_slug || '. Puedes revisar opciones de renovación.'
      else 'La licencia de ' || new.course_slug || ' cambió de estado por ' || coalesce(new.last_event, 'un evento comercial') || '.'
    end;
    v_key := v_type || ':' || v_email || ':' || new.course_slug || ':' || coalesce(new.transaction_id, 'none') || ':' || coalesce(new.last_event, 'unknown');
  else
    return new;
  end if;

  insert into public.kinecheck_notifications (
    email, notification_type, title, body, course_slug,
    action_url, action_label, dedupe_key, metadata
  ) values (
    v_email, v_type, v_title, v_body, new.course_slug,
    v_action, 'Revisar mi cuenta', v_key,
    jsonb_build_object(
      'transaction_id', new.transaction_id,
      'event', new.last_event,
      'expires_at', new.access_expires_at
    )
  ) on conflict (dedupe_key) do nothing;

  insert into public.kinecheck_outbox (
    channel, recipient, template_key, payload, dedupe_key
  ) values (
    'email', v_email, v_type,
    jsonb_build_object(
      'title', v_title,
      'body', v_body,
      'course_slug', new.course_slug,
      'action_url', 'https://kinecheck.cl/platform/'
    ),
    'email:' || v_key
  ) on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

revoke all on function public.kinecheck_grant_beta_access(text, text[], integer) from public, anon, authenticated;
revoke all on function public.kinecheck_revoke_beta_access(text, text[]) from public, anon, authenticated;
grant execute on function public.kinecheck_grant_beta_access(text, text[], integer) to service_role;
grant execute on function public.kinecheck_revoke_beta_access(text, text[]) to service_role;

comment on function public.kinecheck_grant_beta_access(text, text[], integer)
is 'Otorga acceso beta temporal por correo sin sustituir licencias comerciales existentes. Solo service_role.';
comment on function public.kinecheck_revoke_beta_access(text, text[])
is 'Revoca exclusivamente accesos con access_source=beta. Solo service_role.';
