-- REVERT TO NUCLEAR REBUILD STATE (the one that actually worked)
-- The nuclear rebuild had RLS DISABLED on identity tables - that was correct
-- Migration 20251212000200 re-enabled it with circular dependencies - that broke everything

-- Identity tables: RLS DISABLED (back to nuclear rebuild state)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Add the is_superadmin column if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- Set your superadmin account
UPDATE profiles SET is_superadmin = true WHERE email = 'zrig.ayman@gmail.com';

-- Recreate is_superadmin() exactly as nuclear rebuild had it
DROP FUNCTION IF EXISTS is_superadmin() CASCADE;
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

-- Recreate check_super_admin_status() for frontend
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

-- Recreate user_can_access_org() exactly as nuclear rebuild had it
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
  IF v_user_id IS NULL THEN RETURN false; END IF;

  -- Check superadmin first (works because profiles has NO RLS!)
  SELECT COALESCE(is_superadmin, false) INTO v_is_super
  FROM profiles WHERE id = v_user_id;

  IF v_is_super THEN RETURN true; END IF;

  -- Check membership (works because memberships has NO RLS!)
  RETURN EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_user_id AND org_id = check_org_id
  );
END;
$$;
GRANT EXECUTE ON FUNCTION user_can_access_org(uuid) TO authenticated, anon;

-- Recreate user_is_admin_of_org() exactly as nuclear rebuild had it
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
  IF v_user_id IS NULL THEN RETURN false; END IF;

  -- Superadmins are admin of everything
  SELECT COALESCE(is_superadmin, false) INTO v_is_super
  FROM profiles WHERE id = v_user_id;

  IF v_is_super THEN RETURN true; END IF;

  -- Check if user is admin of this org
  RETURN EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_user_id AND org_id = check_org_id AND role = 'admin'
  );
END;
$$;
GRANT EXECUTE ON FUNCTION user_is_admin_of_org(uuid) TO authenticated, anon;

-- Drop any policies on identity tables (they shouldn't have any)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'memberships', 'organizations')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    RAISE NOTICE 'Dropped policy % on %', pol.policyname, pol.tablename;
  END LOOP;
END $$;

-- Verify
DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'REVERTED TO NUCLEAR REBUILD STATE';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Identity tables (NO RLS):';
  RAISE NOTICE '  - profiles';
  RAISE NOTICE '  - memberships';
  RAISE NOTICE '  - organizations';
  RAISE NOTICE '';
  RAISE NOTICE 'Superadmin: zrig.ayman@gmail.com';
  RAISE NOTICE '===========================================';
END $$;
