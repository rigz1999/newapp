-- Fix Admin Access with Proper RLS Policies in Paris Database
-- Run this in the Paris database SQL Editor
-- This keeps RLS enabled but adds proper policies for frontend access

-- ==============================================
-- STEP 1: Enable RLS on Identity Tables
-- ==============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 2: Drop All Existing Policies on Identity Tables
-- ==============================================
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all profiles policies
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
    END LOOP;

    -- Drop all memberships policies
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'memberships'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON memberships', r.policyname);
    END LOOP;

    -- Drop all organizations policies (except anon select - needed for invitations)
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'organizations'
        AND policyname != 'organizations_anon_select'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organizations', r.policyname);
    END LOOP;
END $$;

-- ==============================================
-- STEP 3: Recreate Helper Functions
-- ==============================================
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

-- ==============================================
-- STEP 4: Create Simple Policies for Identity Tables
-- ==============================================

-- PROFILES POLICIES
-- Users can view all profiles (needed for displaying names)
CREATE POLICY "profiles_select_all"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own profile
CREATE POLICY "profiles_insert_own"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Only superadmins can delete profiles
CREATE POLICY "profiles_delete_superadmin"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (is_superadmin());

-- MEMBERSHIPS POLICIES
-- Users can view all memberships (needed for role checks)
CREATE POLICY "memberships_select_all"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert memberships
CREATE POLICY "memberships_insert_admin"
  ON memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (user_is_admin_of_org(org_id));

-- Only admins can update memberships
CREATE POLICY "memberships_update_admin"
  ON memberships
  FOR UPDATE
  TO authenticated
  USING (user_is_admin_of_org(org_id));

-- Only admins can delete memberships
CREATE POLICY "memberships_delete_admin"
  ON memberships
  FOR DELETE
  TO authenticated
  USING (user_is_admin_of_org(org_id));

-- ORGANIZATIONS POLICIES
-- Keep existing anon_select for invitations (if it exists)
-- Authenticated users can view organizations they have access to
CREATE POLICY "organizations_auth_select"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (user_can_access_org(id));

-- Only superadmins can insert organizations
CREATE POLICY "organizations_insert"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

-- Only admins can update their organization
CREATE POLICY "organizations_update"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (user_is_admin_of_org(id))
  WITH CHECK (user_is_admin_of_org(id));

-- Only superadmins can delete organizations
CREATE POLICY "organizations_delete"
  ON organizations
  FOR DELETE
  TO authenticated
  USING (is_superadmin());

-- ==============================================
-- STEP 5: Verification
-- ==============================================
DO $$
DECLARE
  profiles_rls boolean;
  memberships_rls boolean;
  organizations_rls boolean;
  profiles_policies int;
  memberships_policies int;
  organizations_policies int;
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

  -- Count policies
  SELECT COUNT(*) INTO profiles_policies
  FROM pg_policies
  WHERE tablename = 'profiles';

  SELECT COUNT(*) INTO memberships_policies
  FROM pg_policies
  WHERE tablename = 'memberships';

  SELECT COUNT(*) INTO organizations_policies
  FROM pg_policies
  WHERE tablename = 'organizations';

  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'ADMIN ACCESS FIX V2 - PARIS DATABASE';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Status (should all be TRUE):';
  RAISE NOTICE '  - profiles RLS: %', profiles_rls;
  RAISE NOTICE '  - memberships RLS: %', memberships_rls;
  RAISE NOTICE '  - organizations RLS: %', organizations_rls;
  RAISE NOTICE '';
  RAISE NOTICE 'Policy Counts:';
  RAISE NOTICE '  - profiles policies: %', profiles_policies;
  RAISE NOTICE '  - memberships policies: %', memberships_policies;
  RAISE NOTICE '  - organizations policies: %', organizations_policies;
  RAISE NOTICE '';

  IF NOT (profiles_rls AND memberships_rls AND organizations_rls) THEN
    RAISE EXCEPTION 'RLS should be enabled on identity tables!';
  END IF;

  IF profiles_policies < 4 OR memberships_policies < 4 OR organizations_policies < 4 THEN
    RAISE WARNING 'Some policies might be missing!';
  END IF;

  RAISE NOTICE '✓ Identity tables RLS enabled';
  RAISE NOTICE '✓ Policies created for frontend access';
  RAISE NOTICE '✓ Helper functions available';
  RAISE NOTICE '✓ Admin access should now work';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
END $$;

-- Show all policies
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'memberships', 'organizations')
ORDER BY tablename, policyname;
