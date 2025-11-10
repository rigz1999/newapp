-- ============================================
-- Phase 1: Setup Superadmin (RUN THIS FIRST)
-- ============================================
-- This script prepares the database for RLS by:
-- 1. Adding the is_superadmin column to profiles
-- 2. Creating helper functions
-- 3. Setting your superadmin status
--
-- RLS is NOT enabled in this phase - your access remains unchanged
-- ============================================

-- Step 1: Add is_superadmin column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_superadmin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_superadmin BOOLEAN DEFAULT false NOT NULL;
    RAISE NOTICE 'Column is_superadmin added to profiles table';
  ELSE
    RAISE NOTICE 'Column is_superadmin already exists';
  END IF;
END $$;

-- Step 2: Create helper function to get user's organization IDs
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS TABLE (org_id uuid)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT m.org_id
  FROM memberships m
  WHERE m.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create helper function to check if user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT p.is_superadmin FROM profiles p WHERE p.id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql;

-- Step 4: Set superadmin status for zrig.ayman@gmail.com
-- This uses the auth.users table to find your user ID
UPDATE profiles
SET is_superadmin = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'zrig.ayman@gmail.com'
);

-- Step 5: Verify the setup
DO $$
DECLARE
  superadmin_count INTEGER;
  superadmin_email TEXT;
BEGIN
  -- Count superadmins
  SELECT COUNT(*), MAX(u.email)
  INTO superadmin_count, superadmin_email
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.is_superadmin = true;

  IF superadmin_count = 0 THEN
    RAISE WARNING 'No superadmin found! Please check that zrig.ayman@gmail.com exists in auth.users';
  ELSIF superadmin_count = 1 THEN
    RAISE NOTICE 'SUCCESS: Superadmin setup complete for %', superadmin_email;
  ELSE
    RAISE NOTICE 'Multiple superadmins found: % total', superadmin_count;
  END IF;
END $$;

-- Display current superadmin status
SELECT
  u.email,
  p.is_superadmin,
  p.role
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.is_superadmin = true;
