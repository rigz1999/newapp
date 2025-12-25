-- Diagnose and Fix User Access Issues in Paris Database
-- Run this in the Paris database SQL Editor

-- ==============================================
-- STEP 1: Diagnostic - Show Current User Info
-- ==============================================

-- Check current user
SELECT
  'Current User ID: ' || COALESCE(auth.uid()::text, 'NULL') as info;

-- Check if user has a profile
SELECT
  'Profile exists: ' || CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as info,
  'Is superadmin: ' || COALESCE(bool_or(is_superadmin)::text, 'false') as superadmin_status
FROM profiles
WHERE id = auth.uid();

-- Check user's memberships
SELECT
  m.id,
  m.user_id,
  m.org_id,
  m.role,
  o.name as org_name
FROM memberships m
LEFT JOIN organizations o ON o.id = m.org_id
WHERE m.user_id = auth.uid();

-- Check all organizations
SELECT
  id,
  name,
  owner_id
FROM organizations
ORDER BY created_at;

-- ==============================================
-- STEP 2: Test Helper Functions
-- ==============================================

-- Test is_superadmin()
SELECT
  'is_superadmin() returns: ' || COALESCE(is_superadmin()::text, 'NULL') as test_result;

-- Test user_can_access_org() for each org
SELECT
  o.id,
  o.name,
  user_can_access_org(o.id) as can_access
FROM organizations o;

-- Test user_is_admin_of_org() for each org
SELECT
  o.id,
  o.name,
  user_is_admin_of_org(o.id) as is_admin
FROM organizations o;

-- ==============================================
-- STEP 3: Check RLS Status
-- ==============================================

SELECT
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  COUNT(p.policyname) as policy_count
FROM pg_class c
LEFT JOIN pg_policies p ON p.tablename = c.relname
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relname IN ('profiles', 'memberships', 'organizations', 'projets', 'tranches', 'souscriptions')
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;

-- ==============================================
-- STEP 4: Show What Current User Can See
-- ==============================================

-- Try to see projets
SELECT
  'Projets visible to current user: ' || COUNT(*)::text as info
FROM projets;

-- If user can't see anything, let's check why
SELECT
  p.id,
  p.projet,
  p.org_id,
  o.name as org_name,
  user_can_access_org(p.org_id) as can_access_calc
FROM projets p
LEFT JOIN organizations o ON o.id = p.org_id
LIMIT 5;

-- ==============================================
-- STEP 5: EMERGENCY FIX - Grant Current User Access
-- ==============================================

-- This will grant the current user admin access to the first organization if they have none
DO $$
DECLARE
  v_user_id uuid;
  v_first_org_id uuid;
  v_membership_count int;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user!';
  END IF;

  -- Check if user has any memberships
  SELECT COUNT(*) INTO v_membership_count
  FROM memberships
  WHERE user_id = v_user_id;

  RAISE NOTICE 'User % has % membership(s)', v_user_id, v_membership_count;

  -- If user has no memberships, add them to first org as admin
  IF v_membership_count = 0 THEN
    SELECT id INTO v_first_org_id
    FROM organizations
    ORDER BY created_at
    LIMIT 1;

    IF v_first_org_id IS NOT NULL THEN
      INSERT INTO memberships (user_id, org_id, role)
      VALUES (v_user_id, v_first_org_id, 'admin')
      ON CONFLICT (user_id, org_id) DO NOTHING;

      RAISE NOTICE '✓ Added user to organization % as admin', v_first_org_id;
    ELSE
      RAISE NOTICE '⚠ No organizations found to add user to';
    END IF;
  END IF;
END $$;

-- ==============================================
-- STEP 6: Verify Fix
-- ==============================================

-- Show user's memberships after fix
SELECT
  'After Fix - User Memberships:' as info,
  m.role,
  o.name as org_name,
  user_can_access_org(m.org_id) as can_access_now
FROM memberships m
JOIN organizations o ON o.id = m.org_id
WHERE m.user_id = auth.uid();

-- Show what user can see now
SELECT
  'After Fix - Projets Visible: ' || COUNT(*)::text as info
FROM projets;

-- Final summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'If you still cannot see anything, please share:';
  RAISE NOTICE '1. Your user ID from the first query';
  RAISE NOTICE '2. The membership table results';
  RAISE NOTICE '3. The helper function test results';
  RAISE NOTICE '====================================================================';
END $$;
