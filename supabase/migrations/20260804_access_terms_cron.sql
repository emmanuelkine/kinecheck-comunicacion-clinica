-- KineCheck · cierre automático de licencias vencidas
-- Ejecuta cada minuto la función central que cambia active a false.
-- El bloque es tolerante: si pg_cron no está habilitado en el proyecto,
-- la migración no destruye ni modifica licencias y course-key seguirá
-- ejecutando la misma función al validar la biblioteca.

begin;

do $$
declare
  v_job record;
begin
  begin
    execute 'create extension if not exists pg_cron with schema extensions';
  exception
    when insufficient_privilege then
      raise notice 'pg_cron no pudo habilitarse por falta de privilegios.';
    when others then
      raise notice 'pg_cron no pudo habilitarse: %', sqlerrm;
  end;

  if to_regclass('cron.job') is null then
    raise notice 'pg_cron no está disponible; no se creó la tarea programada.';
    return;
  end if;

  for v_job in
    execute $query$
      select jobid
      from cron.job
      where jobname = 'kinecheck-expire-course-access'
    $query$
  loop
    execute 'select cron.unschedule($1)' using v_job.jobid;
  end loop;

  execute $schedule$
    select cron.schedule(
      'kinecheck-expire-course-access',
      '* * * * *',
      'select public.deactivate_expired_course_access();'
    )
  $schedule$;

  raise notice 'Tarea kinecheck-expire-course-access programada cada minuto.';
exception
  when others then
    raise notice 'No fue posible programar la expiración automática: %', sqlerrm;
end
$$;

commit;
