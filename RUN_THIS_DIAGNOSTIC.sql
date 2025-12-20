-- DIAGNOSTIC: Run this to see what's wrong with superadmin access
-- Copy and paste this entire block into Supabase SQL Editor

-- 1. Check if the column exists and your account is marked as superadmin
SELECT
  'Your Profile Status' as check_type,
  email,
  is_superadmin,
  id
FROM profiles
WHERE email = 'zrig.ayman@gmail.com';

-- 2. Check if RLS is enabled on profiles (this might block is_superadmin() function!)
SELECT
  'RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'memberships', 'organizations', 'projets');

-- 3. Test if is_superadmin() function works when called directly
SELECT
  'Function Test' as check_type,
  is_superadmin() as function_returns,
  auth.uid() as your_user_id;

-- 4. Check actual RLS policies on projets table
SELECT
  'Projets Policies' as check_type,
  policyname,
  cmd,
  qual::text as using_clause
FROM pg_policies
WHERE tablename = 'projets';

-- 5. Try to count projets (this will fail if RLS is blocking you)
SELECT
  'Data Test' as check_type,
  COUNT(*) as projets_count,
  'If this is 0 and you have data, RLS is blocking you' as note
FROM projets;

-- 6. Check if there are ANY projets in the database (bypassing RLS)
SELECT
  'Total Projets (Bypass RLS)' as check_type,
  COUNT(*) as total_count
FROM projets;

-- 7. Check memberships to see if you have org access
SELECT
  'Your Memberships' as check_type,
  m.org_id,
  m.role,
  o.nom as org_name
FROM memberships m
LEFT JOIN organizations o ON o.id = m.org_id
WHERE m.user_id = (SELECT id FROM profiles WHERE email = 'zrig.ayman@gmail.com');
