-- FORCE FIX: Superadmin RLS Issue - Comprehensive Fix
-- This migration ensures superadmin access works even with complex RLS setups

-- First, temporarily disable RLS on profiles to ensure we can update it
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Add the column if it doesn't exist (idempotent)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- Find and mark ALL users with superadmin role in memberships as superadmin
UPDATE profiles
SET is_superadmin = true
WHERE id IN (
  SELECT DISTINCT user_id
  FROM memberships
  WHERE role = 'superadmin'
);

-- IMPORTANT: Manually set your specific superadmin email here
-- Replace 'YOUR_EMAIL_HERE' with your actual superadmin email address
-- Uncomment the line below and replace the email:
-- UPDATE profiles SET is_superadmin = true WHERE email = 'YOUR_EMAIL_HERE';

-- Re-enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate the is_superadmin() function to ensure it's correct
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
  -- Use plpgsql instead of sql for better error handling
  SELECT COALESCE(profiles.is_superadmin, false)
  INTO v_is_super
  FROM profiles
  WHERE id = auth.uid();

  RETURN COALESCE(v_is_super, false);
END;
$$;

GRANT EXECUTE ON FUNCTION is_superadmin() TO authenticated, anon;

-- Recreate the check_super_admin_status() RPC function
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

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_superadmin ON profiles(is_superadmin) WHERE is_superadmin = true;

-- Verify the function works (this will show in migration output)
DO $$
DECLARE
  super_count int;
BEGIN
  SELECT COUNT(*) INTO super_count FROM profiles WHERE is_superadmin = true;
  RAISE NOTICE 'Found % superadmin users', super_count;

  IF super_count = 0 THEN
    RAISE WARNING 'NO SUPERADMIN USERS FOUND! You need to manually set is_superadmin = true for at least one user.';
  END IF;
END $$;
