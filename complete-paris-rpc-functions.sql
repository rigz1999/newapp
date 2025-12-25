-- Complete RPC Functions Setup for Paris Database
-- This script creates ALL necessary RPC and helper functions
-- Safe to run multiple times (uses CREATE OR REPLACE)

-- ==============================================
-- STEP 1: Helper Functions Used by RLS Policies
-- ==============================================

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
-- STEP 2: Frontend RPC Functions
-- ==============================================

-- This is called by the useAuth hook in the frontend
CREATE OR REPLACE FUNCTION check_super_admin_status()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT is_superadmin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION check_super_admin_status() TO authenticated, anon;

-- ==============================================
-- STEP 3: Verification
-- ==============================================

-- List all functions we just created
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE
    WHEN p.proname = 'is_superadmin' THEN '✓ Helper - checks if user is superadmin'
    WHEN p.proname = 'user_can_access_org' THEN '✓ Helper - checks org access'
    WHEN p.proname = 'user_is_admin_of_org' THEN '✓ Helper - checks org admin role'
    WHEN p.proname = 'check_super_admin_status' THEN '✓ RPC - called by frontend useAuth hook'
    ELSE 'Unknown'
  END as description
FROM pg_proc p
WHERE p.proname IN (
  'is_superadmin',
  'user_can_access_org',
  'user_is_admin_of_org',
  'check_super_admin_status'
)
ORDER BY p.proname;
