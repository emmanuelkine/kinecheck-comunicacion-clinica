-- Keep beta grant/revoke semantics symmetrical for product aliases.

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
  v_requested text;
  v_targets text[] := array[]::text[];
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
    foreach v_requested in array v_slugs loop
      v_requested := lower(trim(coalesce(v_requested, '')));
      if v_requested = 'pack-estudiante' then
        v_targets := v_targets || array['kinecheck-estudiante', 'mas-alla-del-dolor'];
      elsif v_requested = 'kinecheck-clinico' then
        v_targets := v_targets || array['kinecheck-clinico', 'kinecheck-clinico-curso'];
      else
        v_targets := array_append(v_targets, v_requested);
      end if;
    end loop;

    update public.course_access
    set active = false,
        last_event = 'BETA_ACCESS_REVOKED',
        last_event_at = now(),
        updated_at = now()
    where email = v_email
      and lower(coalesce(access_source, '')) = 'beta'
      and active = true
      and course_slug = any(v_targets);
  end if;

  get diagnostics v_updated = row_count;

  return jsonb_build_object(
    'email', v_email,
    'revokedCount', v_updated,
    'revokedAt', now()
  );
end;
$$;

revoke all on function public.kinecheck_revoke_beta_access(text, text[]) from public, anon, authenticated;
grant execute on function public.kinecheck_revoke_beta_access(text, text[]) to service_role;
