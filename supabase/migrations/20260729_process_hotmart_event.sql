CREATE OR REPLACE FUNCTION public.process_hotmart_event(p_event_id text, p_event_name text, p_transaction_id text, p_product_id bigint, p_buyer_email text, p_buyer_name text, p_status text, p_purchased_at timestamp with time zone, p_event_at timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ 
declare 
  v_email text := 
    lower(trim(coalesce(p_buyer_email, ''))); 
 
  v_status text := 
    lower(trim(coalesce(p_status, ''))); 
 
  v_incoming_priority integer := 
    case 
      when lower(trim(coalesce(p_status, ''))) = 'revoked' then 20 
      when lower(trim(coalesce(p_status, ''))) = 'active' then 10 
      else 0 
    end; 
 
  v_purchase_applied boolean := false; 
 
  v_grant record; 
  v_grant_count integer := 0; 
 
  v_access_exists boolean; 
  v_access_last_event_at timestamp with time zone; 
  v_access_last_event text; 
  v_access_source text; 
  v_access_priority integer; 
begin 
  /* 
   * 1. Idempotencia: 
   * un mismo evento de Hotmart se procesa una sola vez. 
   */ 
  insert into public.hotmart_webhook_events ( 
    event_id, 
    event_name, 
    transaction_id 
  ) 
  values ( 
    p_event_id, 
    p_event_name, 
    p_transaction_id 
  ) 
  on conflict (event_id) do nothing; 
 
  if not found then 
    return 'duplicate'; 
  end if; 
 
  /* 
   * 2. Registra la compra y protege el orden temporal. 
   * 
   * Si dos eventos tienen la misma fecha: 
   * revoked tiene prioridad sobre active. 
   */ 
  insert into public.hotmart_purchases ( 
    transaction_id, 
    product_id, 
    buyer_email, 
    buyer_name, 
    status, 
    event_name, 
    purchased_at, 
    last_event_at, 
    raw_event_id 
  ) 
  values ( 
    p_transaction_id, 
    p_product_id, 
    v_email, 
    nullif(trim(p_buyer_name), ''), 
    v_status, 
    p_event_name, 
    p_purchased_at, 
    p_event_at, 
    p_event_id 
  ) 
  on conflict (transaction_id, product_id) do update 
  set 
    buyer_email = excluded.buyer_email, 
 
    buyer_name = coalesce( 
      excluded.buyer_name, 
      public.hotmart_purchases.buyer_name 
    ), 
 
    status = excluded.status, 
    event_name = excluded.event_name, 
 
    purchased_at = coalesce( 
      public.hotmart_purchases.purchased_at, 
      excluded.purchased_at 
    ), 
 
    last_event_at = excluded.last_event_at, 
    raw_event_id = excluded.raw_event_id 
 
  where
    excluded.last_event_at >
      public.hotmart_purchases.last_event_at

    or (
      excluded.last_event_at =
        public.hotmart_purchases.last_event_at

      and
        case
          when excluded.status = 'revoked' then 20
          when excluded.status = 'active' then 10
          else 0
        end
        >=
        case
          when public.hotmart_purchases.status = 'revoked' then 20
          when public.hotmart_purchases.status = 'active' then 10
          else 0
        end
    )

  returning true into v_purchase_applied;

  /*
   * Un evento antiguo queda registrado en el historial,
   * pero no modifica ninguna licencia.
   */
  if not coalesce(v_purchase_applied, false) then
    return 'stale_event';
  end if;

  /*
   * 3. Procesa TODOS los permisos asociados al producto.
   *
   * Esto permite que un pack conceda dos o más cursos.
   */
  for v_grant in
    select
      course_slug
    from public.hotmart_product_grants
    where product_id = p_product_id
    order by course_slug
  loop
    v_grant_count := v_grant_count + 1;

    /*
     * Evita que dos eventos simultáneos generen
     * duplicados para el mismo usuario y curso.
     */
    perform pg_advisory_xact_lock(
      hashtext(v_email || '|' || v_grant.course_slug)
    );

    select
      ca.last_event_at,
      ca.last_event,
      ca.access_source
    into
      v_access_last_event_at,
      v_access_last_event,
      v_access_source
    from public.course_access ca
    where lower(ca.email) = v_email
      and ca.course_slug = v_grant.course_slug
    order by ca.updated_at desc nulls last
    limit 1;

    v_access_exists := found;

    /*
     * El acceso propietario nunca debe ser reemplazado
     * por eventos comerciales.
     */
    if v_access_exists
       and (
         upper(coalesce(v_access_last_event, '')) = 'OWNER_ACCESS'
         or lower(coalesce(v_access_source, '')) = 'owner'
       )
    then
      continue;
    end if;

    v_access_priority :=
      case
        when upper(coalesce(v_access_last_event, '')) in (
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
        ) then 20

        when upper(coalesce(v_access_last_event, '')) in (
          'PURCHASE_APPROVED',
          'PURCHASE_COMPLETE',
          'APPROVED',
          'COMPLETE'
        ) then 10

        else 0
      end;

    /*
     * 4. Crea una licencia cuando aún no existe.
     */
    if not v_access_exists then
      insert into public.course_access (
        email,
        course_slug,
        active,
        hotmart_product_id,
        transaction_id,
        last_event,
        updated_at,
        purchase_date,
        access_source,
        last_event_at
      )
      values (
        v_email,
        v_grant.course_slug,
        v_status = 'active',
        p_product_id::text,
        p_transaction_id,
        p_event_name,
        now(),

        case
          when v_status = 'active'
            then coalesce(
              p_purchased_at,
              p_event_at
            )
          else p_purchased_at
        end,

        case
          when v_email like '%@example.com'
            then 'hotmart_test'
          else 'hotmart'
        end,

        p_event_at
      );

    /*
     * 5. Actualiza solo si el evento es más reciente.
     *
     * En igualdad de fecha, revoked gana sobre active.
     */
    elsif
      v_access_last_event_at is null

      or p_event_at > v_access_last_event_at

      or (
        p_event_at = v_access_last_event_at
        and v_incoming_priority >= v_access_priority
      )
    then
      update public.course_access
      set
        email = v_email,
        active = v_status = 'active',
        hotmart_product_id = p_product_id::text,
        transaction_id = p_transaction_id,
        last_event = p_event_name,
        updated_at = now(),

        purchase_date =
          case
            when v_status = 'active'
              then coalesce(
                public.course_access.purchase_date,
                p_purchased_at,
                p_event_at
              )
            else public.course_access.purchase_date
          end,

        access_source =
          case
            when v_email like '%@example.com'
              then 'hotmart_test'
            else 'hotmart'
          end,

        last_event_at = p_event_at

      where lower(email) = v_email
        and course_slug = v_grant.course_slug
        and upper(coalesce(last_event, '')) <> 'OWNER_ACCESS'
        and lower(coalesce(access_source, '')) <> 'owner';
    end if;
  end loop;

  /*
   * Producto recibido desde Hotmart sin mapeo interno.
   */
  if v_grant_count = 0 then
    return 'unmapped_product';
  end if;

  return v_status;
end;
$function$