\set ON_ERROR_STOP on

DO $$
DECLARE
  required_table text;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'course_access',
    'hotmart_purchases',
    'hotmart_product_grants',
    'platform_cases',
    'platform_case_events',
    'platform_user_preferences',
    'beta_applications'
  ]
  LOOP
    IF to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION 'Required table is missing after restore: %', required_table;
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'deactivate_expired_course_access'
  ) THEN
    RAISE EXCEPTION 'Required expiry function is missing after restore';
  END IF;
END $$;

SELECT
  current_database() AS restored_database,
  count(*) FILTER (WHERE schemaname = 'public') AS public_tables_with_rls
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;

SELECT
  'restore_validation_passed' AS status,
  now() AT TIME ZONE 'utc' AS validated_at_utc;
