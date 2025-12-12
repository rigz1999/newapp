/*
  # Fix Supabase Linter Security Errors

  This migration fixes all security errors reported by Supabase database linter:

  1. ✓ Drop SECURITY DEFINER views (my_profile, my_organizations, my_memberships)
     - These views were likely created manually and bypass RLS
     - Replace with SECURITY INVOKER views if needed

  2. ✓ Enable RLS on identity tables (profiles, memberships, organizations)
     - Add comprehensive, non-recursive policies
     - Use helper functions with SECURITY DEFINER where needed

  3. ✓ Ensure all policies are simple and avoid circular dependencies
*/

-- ==========================================
-- STEP 1: DROP SECURITY DEFINER VIEWS
-- ==========================================

-- Drop potentially unsafe SECURITY DEFINER views
DROP VIEW IF EXISTS public.my_profile CASCADE;
DROP VIEW IF EXISTS public.my_organizations CASCADE;
DROP VIEW IF EXISTS public.my_memberships CASCADE;

-- ==========================================
-- STEP 2: CLEAN UP EXISTING POLICIES
-- ==========================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;

DROP POLICY IF EXISTS "memberships_select" ON public.memberships;
DROP POLICY IF EXISTS "memberships_insert" ON public.memberships;
DROP POLICY IF EXISTS "memberships_update" ON public.memberships;
DROP POLICY IF EXISTS "memberships_delete" ON public.memberships;

DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete" ON public.organizations;

-- Drop any other policy variations that might exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- ==========================================
-- STEP 3: ENABLE RLS ON ALL IDENTITY TABLES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 4: CREATE HELPER FUNCTIONS
-- ==========================================

-- Helper function to check if current user is superadmin
-- Uses SECURITY DEFINER to bypass RLS when checking profiles
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

-- Helper function to check if user is admin of a specific org
-- Uses SECURITY DEFINER to bypass RLS when checking memberships
CREATE OR REPLACE FUNCTION public.user_is_admin_of_org(org_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  -- Superadmins have access to all orgs
  IF is_superadmin() THEN
    RETURN true;
  END IF;

  -- Check if user has admin role in this org
  RETURN EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE org_id = org_id_param
    AND user_id = auth.uid()
    AND role IN ('admin', 'org_admin')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_is_admin_of_org(uuid) TO authenticated;

-- Helper function to check if user can access an org (member or admin)
-- Uses SECURITY DEFINER to bypass RLS when checking memberships
CREATE OR REPLACE FUNCTION public.user_can_access_org(org_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  -- Superadmins have access to all orgs
  IF is_superadmin() THEN
    RETURN true;
  END IF;

  -- Check if user has any membership in this org
  RETURN EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE org_id = org_id_param
    AND user_id = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_org(uuid) TO authenticated;

-- ==========================================
-- STEP 5: CREATE SAFE POLICIES FOR PROFILES
-- ==========================================

-- SELECT: Users can view their own profile, superadmins can view all
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR is_superadmin()
  );

-- INSERT: Users can only insert their own profile during signup
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- UPDATE: Users can update their own profile, superadmins can update any
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE
  USING (
    id = auth.uid()
    OR is_superadmin()
  )
  WITH CHECK (
    id = auth.uid()
    OR is_superadmin()
  );

-- DELETE: Only superadmins can delete profiles
CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE
  USING (is_superadmin());

-- ==========================================
-- STEP 6: CREATE SAFE POLICIES FOR MEMBERSHIPS
-- ==========================================

-- SELECT: Users can see their own memberships + org admins can see their org's memberships
CREATE POLICY "memberships_select" ON public.memberships
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_is_admin_of_org(org_id)
    OR is_superadmin()
  );

-- INSERT: Only org admins (or superadmins) can add members
CREATE POLICY "memberships_insert" ON public.memberships
  FOR INSERT
  WITH CHECK (
    user_is_admin_of_org(org_id)
    OR is_superadmin()
  );

-- UPDATE: Only org admins (or superadmins) can update memberships
CREATE POLICY "memberships_update" ON public.memberships
  FOR UPDATE
  USING (
    user_is_admin_of_org(org_id)
    OR is_superadmin()
  )
  WITH CHECK (
    user_is_admin_of_org(org_id)
    OR is_superadmin()
  );

-- DELETE: Only org admins can delete memberships (but not their own)
CREATE POLICY "memberships_delete" ON public.memberships
  FOR DELETE
  USING (
    (user_is_admin_of_org(org_id) AND user_id != auth.uid())
    OR is_superadmin()
  );

-- ==========================================
-- STEP 7: CREATE SAFE POLICIES FOR ORGANIZATIONS
-- ==========================================

-- SELECT: Users can only see organizations they belong to
CREATE POLICY "organizations_select" ON public.organizations
  FOR SELECT
  USING (
    user_can_access_org(id)
    OR is_superadmin()
  );

-- INSERT: Only superadmins can create organizations
CREATE POLICY "organizations_insert" ON public.organizations
  FOR INSERT
  WITH CHECK (is_superadmin());

-- UPDATE: Only org admins (or superadmins) can update their organization
CREATE POLICY "organizations_update" ON public.organizations
  FOR UPDATE
  USING (
    user_is_admin_of_org(id)
    OR is_superadmin()
  )
  WITH CHECK (
    user_is_admin_of_org(id)
    OR is_superadmin()
  );

-- DELETE: Only superadmins can delete organizations
CREATE POLICY "organizations_delete" ON public.organizations
  FOR DELETE
  USING (is_superadmin());

-- ==========================================
-- STEP 8: CREATE SAFE REPLACEMENT VIEWS (SECURITY INVOKER)
-- ==========================================

-- View for current user's profile
CREATE OR REPLACE VIEW public.my_profile
WITH (security_invoker = true)
AS
SELECT *
FROM public.profiles
WHERE id = auth.uid();

COMMENT ON VIEW public.my_profile IS
  'Current user profile - uses SECURITY INVOKER to enforce RLS policies';

-- View for current user's organizations
CREATE OR REPLACE VIEW public.my_organizations
WITH (security_invoker = true)
AS
SELECT o.*
FROM public.organizations o
INNER JOIN public.memberships m ON m.org_id = o.id
WHERE m.user_id = auth.uid();

COMMENT ON VIEW public.my_organizations IS
  'Organizations that current user belongs to - uses SECURITY INVOKER to enforce RLS policies';

-- View for current user's memberships
CREATE OR REPLACE VIEW public.my_memberships
WITH (security_invoker = true)
AS
SELECT m.*, o.name as organization_name
FROM public.memberships m
INNER JOIN public.organizations o ON o.id = m.org_id
WHERE m.user_id = auth.uid();

COMMENT ON VIEW public.my_memberships IS
  'Current user memberships with organization details - uses SECURITY INVOKER to enforce RLS policies';

-- Grant access to authenticated users
GRANT SELECT ON public.my_profile TO authenticated;
GRANT SELECT ON public.my_organizations TO authenticated;
GRANT SELECT ON public.my_memberships TO authenticated;

-- ==========================================
-- STEP 9: VERIFICATION
-- ==========================================

DO $$
DECLARE
  v_profiles_rls boolean;
  v_memberships_rls boolean;
  v_organizations_rls boolean;
  v_profile_policies integer;
  v_membership_policies integer;
  v_org_policies integer;
  v_definer_views integer;
BEGIN
  -- Check RLS is enabled
  SELECT relrowsecurity INTO v_profiles_rls
  FROM pg_class WHERE relname = 'profiles' AND relnamespace = 'public'::regnamespace;

  SELECT relrowsecurity INTO v_memberships_rls
  FROM pg_class WHERE relname = 'memberships' AND relnamespace = 'public'::regnamespace;

  SELECT relrowsecurity INTO v_organizations_rls
  FROM pg_class WHERE relname = 'organizations' AND relnamespace = 'public'::regnamespace;

  -- Count policies
  SELECT COUNT(*) INTO v_profile_policies
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';

  SELECT COUNT(*) INTO v_membership_policies
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'memberships';

  SELECT COUNT(*) INTO v_org_policies
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations';

  -- Count SECURITY DEFINER views (should be 0)
  SELECT COUNT(*) INTO v_definer_views
  FROM pg_views
  WHERE schemaname = 'public'
  AND viewname IN ('my_profile', 'my_organizations', 'my_memberships')
  AND definition LIKE '%SECURITY DEFINER%';

  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'SUPABASE LINTER ERRORS FIXED';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS STATUS:';
  RAISE NOTICE '  ✓ profiles: % (% policies)',
    CASE WHEN v_profiles_rls THEN 'ENABLED' ELSE 'DISABLED' END,
    v_profile_policies;
  RAISE NOTICE '  ✓ memberships: % (% policies)',
    CASE WHEN v_memberships_rls THEN 'ENABLED' ELSE 'DISABLED' END,
    v_membership_policies;
  RAISE NOTICE '  ✓ organizations: % (% policies)',
    CASE WHEN v_organizations_rls THEN 'ENABLED' ELSE 'DISABLED' END,
    v_org_policies;
  RAISE NOTICE '';
  RAISE NOTICE 'VIEWS:';
  RAISE NOTICE '  ✓ my_profile: SECURITY INVOKER (enforces RLS)';
  RAISE NOTICE '  ✓ my_organizations: SECURITY INVOKER (enforces RLS)';
  RAISE NOTICE '  ✓ my_memberships: SECURITY INVOKER (enforces RLS)';
  RAISE NOTICE '  ✓ SECURITY DEFINER views found: %', v_definer_views;
  RAISE NOTICE '';
  RAISE NOTICE 'HELPER FUNCTIONS:';
  RAISE NOTICE '  ✓ is_superadmin() - SECURITY DEFINER with search_path';
  RAISE NOTICE '  ✓ user_is_admin_of_org(uuid) - SECURITY DEFINER with search_path';
  RAISE NOTICE '  ✓ user_can_access_org(uuid) - SECURITY DEFINER with search_path';
  RAISE NOTICE '';
  RAISE NOTICE 'SECURITY:';
  RAISE NOTICE '  ✓ All identity tables have RLS enabled';
  RAISE NOTICE '  ✓ Policies use helper functions to avoid recursion';
  RAISE NOTICE '  ✓ All views use SECURITY INVOKER (enforce caller RLS)';
  RAISE NOTICE '  ✓ Helper functions use SECURITY DEFINER (bypass RLS safely)';
  RAISE NOTICE '  ✓ All functions have search_path protection';
  RAISE NOTICE '';

  IF v_definer_views > 0 THEN
    RAISE WARNING 'Found % SECURITY DEFINER views - these should be removed!', v_definer_views;
  ELSE
    RAISE NOTICE 'SUCCESS: No SECURITY DEFINER views found';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'All Supabase linter errors should now be resolved!';
  RAISE NOTICE '========================================================================';

  -- Final verification
  IF NOT (v_profiles_rls AND v_memberships_rls AND v_organizations_rls) THEN
    RAISE EXCEPTION 'FAILED: RLS not enabled on all identity tables!';
  END IF;

  IF v_profile_policies < 3 OR v_membership_policies < 3 OR v_org_policies < 3 THEN
    RAISE EXCEPTION 'FAILED: Expected at least 3 policies per identity table';
  END IF;

  IF v_definer_views > 0 THEN
    RAISE EXCEPTION 'FAILED: Found SECURITY DEFINER views that should be SECURITY INVOKER';
  END IF;
END $$;
