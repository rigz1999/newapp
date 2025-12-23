-- Check RLS status on key tables
SELECT
  tablename,
  CASE WHEN rowsecurity = true THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'memberships', 'organizations', 'projets')
ORDER BY tablename;
