-- VERIFY RLS POLICIES WERE APPLIED
-- Run this to check if the nuclear rebuild actually worked

-- Check RLS status on tables
SELECT
  'RLS Status Check' as check_type,
  tablename,
  CASE
    WHEN tablename IN ('profiles', 'memberships', 'organizations') THEN 'Should be DISABLED'
    ELSE 'Should be ENABLED'
  END as expected_status,
  CASE
    WHEN rowsecurity = true THEN 'ENABLED'
    ELSE 'DISABLED'
  END as actual_status,
  CASE
    WHEN tablename IN ('profiles', 'memberships', 'organizations') AND rowsecurity = false THEN '✓ CORRECT'
    WHEN tablename NOT IN ('profiles', 'memberships', 'organizations') AND rowsecurity = true THEN '✓ CORRECT'
    ELSE '✗ WRONG'
  END as status_check
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'memberships', 'organizations',
    'projets', 'tranches', 'souscriptions',
    'investisseurs', 'paiements', 'payment_proofs',
    'coupons_echeances', 'invitations', 'user_reminder_settings'
  )
ORDER BY tablename;

-- Check policies on projets table
SELECT
  'Projets Policies' as check_type,
  policyname,
  cmd as command,
  CASE
    WHEN policyname LIKE 'projets_%' THEN '✓ NEW POLICY'
    ELSE '✗ OLD POLICY'
  END as policy_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'projets'
ORDER BY policyname;

-- Check if helper functions exist and have correct security
SELECT
  'Helper Functions Check' as check_type,
  routine_name,
  security_type,
  CASE
    WHEN security_type = 'DEFINER' THEN '✓ SECURITY DEFINER'
    ELSE '✗ NOT SECURE'
  END as security_check
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_superadmin', 'user_can_access_org', 'user_is_admin_of_org', 'check_super_admin_status')
ORDER BY routine_name;

-- Count total policies (should be 0 on identity tables, >0 on business tables)
SELECT
  'Policy Count' as check_type,
  tablename,
  COUNT(*) as policy_count,
  CASE
    WHEN tablename IN ('profiles', 'memberships', 'organizations') AND COUNT(*) = 0 THEN '✓ NO POLICIES (correct)'
    WHEN tablename NOT IN ('profiles', 'memberships', 'organizations') AND COUNT(*) > 0 THEN '✓ HAS POLICIES (correct)'
    ELSE '✗ UNEXPECTED'
  END as policy_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'memberships', 'organizations',
    'projets', 'tranches', 'souscriptions'
  )
GROUP BY tablename
ORDER BY tablename;
