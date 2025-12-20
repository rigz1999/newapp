-- Fix superadmin RLS issue: Add missing is_superadmin column and recreate RPC function
-- This migration fixes the critical issue where superadmin accounts can't see any data
-- because the is_superadmin column doesn't exist on the profiles table

-- Add the missing is_superadmin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_superadmin ON profiles(is_superadmin) WHERE is_superadmin = true;

-- Recreate the check_super_admin_status() RPC function that the frontend calls
CREATE OR REPLACE FUNCTION check_super_admin_status()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false);
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_super_admin_status() TO authenticated;

-- Update any users who have 'superadmin' role in memberships to also have is_superadmin = true
-- This ensures consistency between the two superadmin systems
UPDATE profiles
SET is_superadmin = true
WHERE id IN (
  SELECT DISTINCT user_id
  FROM memberships
  WHERE role = 'superadmin'
);

-- Add a comment documenting the column
COMMENT ON COLUMN profiles.is_superadmin IS 'Indicates if user is a superadmin with full system access, bypassing all RLS policies';
