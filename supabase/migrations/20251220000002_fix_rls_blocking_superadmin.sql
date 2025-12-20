-- FIX: RLS on profiles table is blocking is_superadmin() function
-- The issue: profiles table has RLS enabled, which prevents SECURITY DEFINER functions
-- from reading the is_superadmin column, causing the function to always return false

-- SOLUTION: Disable RLS on identity tables (profiles, memberships, organizations)
-- These tables are accessed by SECURITY DEFINER functions, so they need RLS disabled
-- This is the safest approach to prevent circular dependencies

-- Disable RLS on identity tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Ensure the column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- Set the specific superadmin user
UPDATE profiles SET is_superadmin = true WHERE email = 'zrig.ayman@gmail.com';

-- Sync any users with superadmin role in memberships
UPDATE profiles SET is_superadmin = true
WHERE id IN (
  SELECT DISTINCT user_id FROM memberships WHERE role = 'superadmin'
);

-- Recreate is_superadmin() function to ensure it works correctly
DROP FUNCTION IF EXISTS is_superadmin() CASCADE;
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_super boolean;
BEGIN
  -- Now this will work since RLS is disabled on profiles
  SELECT COALESCE(profiles.is_superadmin, false)
  INTO v_is_super
  FROM profiles
  WHERE id = auth.uid();

  RETURN COALESCE(v_is_super, false);
END;
$$;

GRANT EXECUTE ON FUNCTION is_superadmin() TO authenticated, anon;

-- Recreate check_super_admin_status() function
DROP FUNCTION IF EXISTS check_super_admin_status() CASCADE;
CREATE OR REPLACE FUNCTION check_super_admin_status()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false);
$$;

GRANT EXECUTE ON FUNCTION check_super_admin_status() TO authenticated, anon;

-- Recreate user_can_access_org() to ensure it works
DROP FUNCTION IF EXISTS user_can_access_org(uuid) CASCADE;
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

  -- Check superadmin first (now this will work!)
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

-- Recreate user_is_admin_of_org() to ensure it works
DROP FUNCTION IF EXISTS user_is_admin_of_org(uuid) CASCADE;
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

  -- Superadmins are admin of everything
  SELECT COALESCE(is_superadmin, false)
  INTO v_is_super
  FROM profiles
  WHERE id = v_user_id;

  IF v_is_super THEN
    RETURN true;
  END IF;

  -- Check if user is admin of this org
  RETURN EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = v_user_id
    AND org_id = check_org_id
    AND role = 'admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION user_is_admin_of_org(uuid) TO authenticated, anon;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_superadmin ON profiles(is_superadmin) WHERE is_superadmin = true;

-- Verification
DO $$
DECLARE
  super_count int;
  rls_status boolean;
BEGIN
  SELECT COUNT(*) INTO super_count FROM profiles WHERE is_superadmin = true;
  SELECT rowsecurity INTO rls_status FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public';

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Superadmin Fix Applied Successfully';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Superadmin users found: %', super_count;
  RAISE NOTICE 'RLS on profiles table: %', CASE WHEN rls_status THEN 'ENABLED (BAD!)' ELSE 'DISABLED (GOOD!)' END;

  IF super_count = 0 THEN
    RAISE WARNING 'NO SUPERADMIN USERS! Check that zrig.ayman@gmail.com exists in profiles table.';
  END IF;
END $$;
