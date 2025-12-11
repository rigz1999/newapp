-- ==============================================
-- DIAGNOSTIC QUERIES FOR RLS ISSUES
-- Run these as your admin user to debug 403 errors
-- ==============================================

-- 1. Check your current user ID and profile
SELECT
  auth.uid() as my_user_id,
  p.email,
  p.is_superadmin,
  p.name
FROM profiles p
WHERE p.id = auth.uid();

-- 2. Check your memberships
SELECT
  m.org_id,
  m.role,
  o.name as org_name
FROM memberships m
JOIN organizations o ON o.id = m.org_id
WHERE m.user_id = auth.uid();

-- 3. Test the access functions with your org_id
-- Replace 'YOUR_ORG_ID_HERE' with your actual org_id from query 2
SELECT
  user_can_access_org('YOUR_ORG_ID_HERE'::uuid) as can_access,
  user_is_admin_of_org('YOUR_ORG_ID_HERE'::uuid) as is_admin,
  user_is_superadmin() as is_superadmin;

-- 4. Check RLS status on all tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 5. Check all policies on projets table
SELECT
  policyname,
  cmd,
  roles,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'projets';

-- 6. Check function permissions
SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('user_can_access_org', 'user_is_admin_of_org', 'user_is_superadmin')
ORDER BY routine_name;

-- 7. Check table grants for authenticated role
SELECT
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'authenticated'
AND table_schema = 'public'
AND table_name IN ('profiles', 'memberships', 'organizations', 'projets')
ORDER BY table_name, privilege_type;

-- 8. Try to manually check if you can access a specific org
-- Replace 'YOUR_ORG_ID_HERE' with your actual org_id
SELECT EXISTS (
  SELECT 1
  FROM memberships
  WHERE user_id = auth.uid()
  AND org_id = 'YOUR_ORG_ID_HERE'::uuid
) as has_membership;

-- 9. Check if there are any conflicting policies
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
HAVING COUNT(*) > 4
ORDER BY policy_count DESC;

-- 10. Test INSERT into projets (won't actually insert, just test the policy)
-- Replace with your actual org_id and test data
EXPLAIN (VERBOSE, FORMAT TEXT)
INSERT INTO projets (org_id, nom, statut)
VALUES ('YOUR_ORG_ID_HERE'::uuid, 'Test Project', 'en_cours');
-- Don't run this, just use EXPLAIN to see if the policy check would pass
