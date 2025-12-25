-- Fix Admin Access and RLS Issues in Paris Database
-- Run this in the Paris database SQL Editor
-- This ensures proper RLS configuration for identity tables and helper functions

-- ==============================================
-- STEP 1: Disable RLS on Identity Tables
-- ==============================================
-- These tables should NOT have RLS because helper functions need direct access

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 2: Drop and Recreate Helper Functions
-- ==============================================

-- Drop existing functions
DROP FUNCTION IF EXISTS is_superadmin() CASCADE;
DROP FUNCTION IF EXISTS user_can_access_org(uuid) CASCADE;
DROP FUNCTION IF EXISTS user_is_admin_of_org(uuid) CASCADE;

-- Check if current user is global superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false);
$$;

GRANT EXECUTE ON FUNCTION is_superadmin() TO authenticated, anon;

COMMENT ON FUNCTION is_superadmin() IS
  'Returns true if current user has profiles.is_superadmin = true. This is the ONLY superadmin system.';

-- Check if current user can access an organization
CREATE OR REPLACE FUNCTION user_can_access_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_is_super boolean;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check superadmin first
  SELECT COALESCE(is_superadmin, false)
  INTO v_is_super
  FROM profiles
  WHERE id = v_user_id;

  IF v_is_super THEN
    RETURN true;
  END IF;

  -- Check membership
  RETURN EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = v_user_id
    AND org_id = check_org_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION user_can_access_org(uuid) TO authenticated, anon;

COMMENT ON FUNCTION user_can_access_org(uuid) IS
  'Returns true if user is superadmin OR has membership in the organization.';

-- Check if current user is admin of an organization
CREATE OR REPLACE FUNCTION user_is_admin_of_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_is_super boolean;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check superadmin first
  SELECT COALESCE(is_superadmin, false)
  INTO v_is_super
  FROM profiles
  WHERE id = v_user_id;

  IF v_is_super THEN
    RETURN true;
  END IF;

  -- Check if user has admin role in org
  -- NOTE: 'superadmin' in memberships.role is legacy, treated as 'admin'
  RETURN EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = v_user_id
    AND org_id = check_org_id
    AND role IN ('admin', 'superadmin')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION user_is_admin_of_org(uuid) TO authenticated, anon;

COMMENT ON FUNCTION user_is_admin_of_org(uuid) IS
  'Returns true if user is superadmin OR has admin/superadmin role in the organization.';

-- ==============================================
-- STEP 3: Verification
-- ==============================================

DO $$
DECLARE
  profiles_rls boolean;
  memberships_rls boolean;
  organizations_rls boolean;
  has_is_superadmin boolean;
  has_user_can_access boolean;
  has_user_is_admin boolean;
BEGIN
  -- Check RLS status
  SELECT relrowsecurity INTO profiles_rls
  FROM pg_class
  WHERE relname = 'profiles' AND relnamespace = 'public'::regnamespace;

  SELECT relrowsecurity INTO memberships_rls
  FROM pg_class
  WHERE relname = 'memberships' AND relnamespace = 'public'::regnamespace;

  SELECT relrowsecurity INTO organizations_rls
  FROM pg_class
  WHERE relname = 'organizations' AND relnamespace = 'public'::regnamespace;

  -- Check functions exist
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_superadmin'
  ) INTO has_is_superadmin;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'user_can_access_org'
  ) INTO has_user_can_access;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'user_is_admin_of_org'
  ) INTO has_user_is_admin;

  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'ADMIN ACCESS FIX - PARIS DATABASE';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Status (should all be FALSE):';
  RAISE NOTICE '  - profiles RLS: %', profiles_rls;
  RAISE NOTICE '  - memberships RLS: %', memberships_rls;
  RAISE NOTICE '  - organizations RLS: %', organizations_rls;
  RAISE NOTICE '';
  RAISE NOTICE 'Helper Functions (should all be TRUE):';
  RAISE NOTICE '  - is_superadmin(): %', has_is_superadmin;
  RAISE NOTICE '  - user_can_access_org(): %', has_user_can_access;
  RAISE NOTICE '  - user_is_admin_of_org(): %', has_user_is_admin;
  RAISE NOTICE '';

  IF profiles_rls OR memberships_rls OR organizations_rls THEN
    RAISE EXCEPTION 'RLS should be disabled on identity tables!';
  END IF;

  IF NOT (has_is_superadmin AND has_user_can_access AND has_user_is_admin) THEN
    RAISE EXCEPTION 'Helper functions are missing!';
  END IF;

  RAISE NOTICE '✓ Identity tables RLS disabled';
  RAISE NOTICE '✓ Helper functions created';
  RAISE NOTICE '✓ Admin access should now work';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
END $$;

-- ==============================================
-- STEP 4: Show Current Configuration
-- ==============================================

SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN 'ENABLED'
    ELSE 'DISABLED'
  END AS rls_status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'memberships', 'organizations')
ORDER BY tablename;
