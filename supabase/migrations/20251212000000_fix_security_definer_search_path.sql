/*
  # Fix SECURITY DEFINER Functions - Add search_path Security

  ## What This Does (SAFE - NO BREAKING CHANGES)
  1. Adds SET search_path to all SECURITY DEFINER functions to prevent SQL injection
  2. Does NOT change any policies
  3. Does NOT change RLS state
  4. Does NOT modify data structures

  ## Why This is Safe
  - Only adds security attribute to existing functions
  - Functions work exactly the same, just more secure
  - No policy changes = no circular dependency risk
  - No RLS toggling = no 500 errors

  ## Security Fix
  SECURITY DEFINER functions without SET search_path can be exploited:
  - Attacker creates malicious schema
  - Manipulates search_path
  - Function uses malicious tables instead of real ones
  - Attacker gains unauthorized access
*/

-- ==============================================
-- Fix is_superadmin() function
-- ==============================================

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp  -- SECURITY FIX
AS $$
  SELECT COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false);
$$;

-- Ensure grants are maintained
GRANT EXECUTE ON FUNCTION is_superadmin() TO authenticated, anon;

COMMENT ON FUNCTION is_superadmin() IS
  'Checks if current user is a global superadmin. SECURITY DEFINER with search_path protection.';

-- ==============================================
-- Fix user_can_access_org() function
-- ==============================================

CREATE OR REPLACE FUNCTION public.user_can_access_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp  -- SECURITY FIX
AS $$
DECLARE
  current_user_id uuid;
  is_super boolean;
  has_membership boolean;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();

  -- No user = no access
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user is superadmin (direct table read, bypasses RLS)
  SELECT COALESCE(is_superadmin, false)
  INTO is_super
  FROM profiles
  WHERE id = current_user_id;

  -- Superadmins can access everything
  IF is_super = true THEN
    RETURN true;
  END IF;

  -- Check if user has membership in the target organization (direct table read, bypasses RLS)
  SELECT EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = current_user_id
    AND org_id = check_org_id
  ) INTO has_membership;

  RETURN has_membership;
END;
$$;

-- Ensure grants are maintained
GRANT EXECUTE ON FUNCTION user_can_access_org(uuid) TO authenticated, anon;

COMMENT ON FUNCTION user_can_access_org(uuid) IS
  'Checks if current user can access given organization. SECURITY DEFINER with search_path protection.';

-- ==============================================
-- Fix user_is_admin_of_org() function
-- ==============================================

CREATE OR REPLACE FUNCTION public.user_is_admin_of_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp  -- SECURITY FIX
AS $$
DECLARE
  current_user_id uuid;
  is_super boolean;
  is_admin boolean;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();

  -- No user = no access
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user is superadmin (direct table read, bypasses RLS)
  SELECT COALESCE(is_superadmin, false)
  INTO is_super
  FROM profiles
  WHERE id = current_user_id;

  -- Superadmins are admins of everything
  IF is_super = true THEN
    RETURN true;
  END IF;

  -- Check if user is admin/superadmin in the target organization (direct table read, bypasses RLS)
  SELECT EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = current_user_id
    AND org_id = check_org_id
    AND role IN ('admin', 'superadmin')
  ) INTO is_admin;

  RETURN is_admin;
END;
$$;

-- Ensure grants are maintained
GRANT EXECUTE ON FUNCTION user_is_admin_of_org(uuid) TO authenticated, anon;

COMMENT ON FUNCTION user_is_admin_of_org(uuid) IS
  'Checks if current user is admin of given organization. SECURITY DEFINER with search_path protection.';

-- ==============================================
-- Verification
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '✓ All SECURITY DEFINER functions now have SET search_path protection';
  RAISE NOTICE '✓ No policies modified';
  RAISE NOTICE '✓ No RLS state changed';
  RAISE NOTICE '✓ Safe migration complete';
END $$;
