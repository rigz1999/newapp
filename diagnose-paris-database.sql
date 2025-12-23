-- DIAGNOSTIC: Check Paris Database State
-- Run this in Supabase SQL Editor to understand current state

-- Check if your profile exists
SELECT
  'Profile Check' as check_type,
  id,
  email,
  full_name,
  is_superadmin
FROM profiles
WHERE email = 'zrig.ayman@gmail.com';

-- Check if is_superadmin column exists
SELECT
  'Column Check' as check_type,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'is_superadmin';

-- Check all profiles (to see what data exists)
SELECT
  'All Profiles' as check_type,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN is_superadmin = true THEN 1 END) as superadmins
FROM profiles;

-- Check RLS status on tables
SELECT
  'RLS Status' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'memberships', 'organizations', 'projets')
ORDER BY tablename;

-- Check if helper functions exist
SELECT
  'Functions Check' as check_type,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_superadmin', 'user_can_access_org', 'user_is_admin_of_org')
ORDER BY routine_name;
