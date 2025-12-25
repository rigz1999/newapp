-- Test and Show Helper Functions - Paris Database
-- This will test if the RLS helper functions work

-- ==============================================
-- STEP 1: Show a specific user's access
-- ==============================================

-- Replace this with YOUR user_id from auth.users
-- Find it by running: SELECT id, email FROM auth.users;

-- Example test (replace the UUID):
DO $$
DECLARE
  test_user_id uuid := 'b905b43b-7d82-4f5f-ae47-535122006696'; -- REPLACE WITH YOUR USER ID
  test_org_id uuid;
  v_is_super boolean;
  v_can_access boolean;
  v_is_admin boolean;
BEGIN
  -- Get first organization ID
  SELECT id INTO test_org_id FROM organizations LIMIT 1;

  RAISE NOTICE '';
  RAISE NOTICE '==== Testing Helper Functions ====';
  RAISE NOTICE 'Test User ID: %', test_user_id;
  RAISE NOTICE 'Test Org ID: %', test_org_id;
  RAISE NOTICE '';

  -- Test by directly querying (simulating what helper functions should do)
  SELECT COALESCE(is_superadmin, false)
  INTO v_is_super
  FROM profiles
  WHERE id = test_user_id;

  RAISE NOTICE 'User is_superadmin in profiles: %', COALESCE(v_is_super, false);

  -- Test membership
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = test_user_id AND org_id = test_org_id
  ) INTO v_can_access;

  RAISE NOTICE 'User has membership in org: %', v_can_access;

  -- Test admin role
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = test_user_id
    AND org_id = test_org_id
    AND role IN ('admin', 'superadmin')
  ) INTO v_is_admin;

  RAISE NOTICE 'User is admin of org: %', v_is_admin;
  RAISE NOTICE '';
END $$;

-- ==============================================
-- STEP 2: Check if functions exist
-- ==============================================

SELECT
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
WHERE p.proname IN ('is_superadmin', 'user_can_access_org', 'user_is_admin_of_org')
ORDER BY p.proname;

-- ==============================================
-- STEP 3: Show what queries would return
-- ==============================================

-- Show all projets with their org access check
SELECT
  p.id,
  p.projet,
  p.org_id,
  o.name as org_name,
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = 'b905b43b-7d82-4f5f-ae47-535122006696' -- REPLACE WITH YOUR USER ID
    AND m.org_id = p.org_id
  ) as should_see_it
FROM projets p
JOIN organizations o ON o.id = p.org_id;

-- ==============================================
-- STEP 4: Show RLS policy details
-- ==============================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'projets'
ORDER BY policyname;
