-- Check projets RLS policies

-- Show all policies on projets table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'projets'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relname = 'projets';
