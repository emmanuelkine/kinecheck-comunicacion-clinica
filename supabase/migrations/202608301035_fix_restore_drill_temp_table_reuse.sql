create or replace function public.run_kinecheck_config_restore_drill()
returns public.kinecheck_restore_drills
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  grants_snapshot jsonb;
  policy_snapshot jsonb;
  flags_snapshot jsonb;
  grants_source_count integer;
  policy_source_count integer;
  flags_source_count integer;
  grants_restore_count integer;
  policy_restore_count integer;
  flags_restore_count integer;
  grants_source_hash text;
  policy_source_hash text;
  flags_source_hash text;
  grants_restore_hash text;
  policy_restore_hash text;
  flags_restore_hash text;
  passed boolean;
  result public.kinecheck_restore_drills;
begin
  select coalesce(jsonb_agg(to_jsonb(t) order by product_id, course_slug), '[]'::jsonb), count(*)
    into grants_snapshot, grants_source_count from public.hotmart_product_grants t;
  select coalesce(jsonb_agg(to_jsonb(t) order by singleton), '[]'::jsonb), count(*)
    into policy_snapshot, policy_source_count from public.kinecheck_access_policy t;
  select coalesce(jsonb_agg(to_jsonb(t) order by key), '[]'::jsonb), count(*)
    into flags_snapshot, flags_source_count from public.platform_feature_flags t;

  grants_source_hash := md5(grants_snapshot::text);
  policy_source_hash := md5(policy_snapshot::text);
  flags_source_hash := md5(flags_snapshot::text);

  drop table if exists pg_temp.restore_hotmart_product_grants;
  drop table if exists pg_temp.restore_kinecheck_access_policy;
  drop table if exists pg_temp.restore_platform_feature_flags;

  create temporary table restore_hotmart_product_grants
    (like public.hotmart_product_grants including defaults including constraints) on commit drop;
  create temporary table restore_kinecheck_access_policy
    (like public.kinecheck_access_policy including defaults including constraints) on commit drop;
  create temporary table restore_platform_feature_flags
    (like public.platform_feature_flags including defaults including constraints) on commit drop;

  insert into restore_hotmart_product_grants
    select * from jsonb_populate_recordset(null::public.hotmart_product_grants, grants_snapshot);
  insert into restore_kinecheck_access_policy
    select * from jsonb_populate_recordset(null::public.kinecheck_access_policy, policy_snapshot);
  insert into restore_platform_feature_flags
    select * from jsonb_populate_recordset(null::public.platform_feature_flags, flags_snapshot);

  select count(*), md5(coalesce(jsonb_agg(to_jsonb(t) order by product_id, course_slug), '[]'::jsonb)::text)
    into grants_restore_count, grants_restore_hash from restore_hotmart_product_grants t;
  select count(*), md5(coalesce(jsonb_agg(to_jsonb(t) order by singleton), '[]'::jsonb)::text)
    into policy_restore_count, policy_restore_hash from restore_kinecheck_access_policy t;
  select count(*), md5(coalesce(jsonb_agg(to_jsonb(t) order by key), '[]'::jsonb)::text)
    into flags_restore_count, flags_restore_hash from restore_platform_feature_flags t;

  passed := grants_source_count = grants_restore_count
    and policy_source_count = policy_restore_count
    and flags_source_count = flags_restore_count
    and grants_source_hash = grants_restore_hash
    and policy_source_hash = policy_restore_hash
    and flags_source_hash = flags_restore_hash;

  insert into public.kinecheck_restore_drills(status, manifest, validation)
  values (
    case when passed then 'passed' else 'failed' end,
    jsonb_build_object(
      'generated_at', now(),
      'scope', jsonb_build_array('hotmart_product_grants','kinecheck_access_policy','platform_feature_flags'),
      'contains_personal_data', false,
      'external_disaster_backup', false
    ),
    jsonb_build_object(
      'hotmart_product_grants', jsonb_build_object('source_count', grants_source_count, 'restored_count', grants_restore_count, 'source_hash', grants_source_hash, 'restored_hash', grants_restore_hash),
      'kinecheck_access_policy', jsonb_build_object('source_count', policy_source_count, 'restored_count', policy_restore_count, 'source_hash', policy_source_hash, 'restored_hash', policy_restore_hash),
      'platform_feature_flags', jsonb_build_object('source_count', flags_source_count, 'restored_count', flags_restore_count, 'source_hash', flags_source_hash, 'restored_hash', flags_restore_hash)
    )
  ) returning * into result;

  return result;
end;
$$;
