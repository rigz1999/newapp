-- ============================================
-- Diagnostic: Why RLS Failed
-- ============================================
-- Run this in Supabase SQL Editor to find out why
-- the superadmin check didn't work
-- ============================================

-- Check 1: Your current session in SQL Editor
SELECT
  '=== SQL EDITOR SESSION ===' as info,
  auth.uid() as my_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as my_email,
  (SELECT is_superadmin FROM profiles WHERE id = auth.uid()) as my_superadmin_flag,
  is_superadmin() as function_returns;

-- Check 2: All users with superadmin flag set
SELECT
  '=== ALL SUPERADMINS IN DB ===' as info,
  u.id as user_id,
  u.email,
  p.is_superadmin
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.is_superadmin = true;

-- Check 3: Your organization memberships
SELECT
  '=== YOUR ORG MEMBERSHIPS ===' as info,
  o.id as org_id,
  o.name as org_name,
  m.role as your_role
FROM memberships m
JOIN organizations o ON m.org_id = o.id
WHERE m.user_id = auth.uid();

-- Check 4: Test if the problem is user ID mismatch
SELECT
  '=== DIAGNOSIS ===' as info,
  CASE
    WHEN auth.uid() IN (SELECT id FROM profiles WHERE is_superadmin = true)
    THEN '✓ Your SQL Editor user IS marked as superadmin'
    ELSE '✗ Your SQL Editor user is NOT marked as superadmin'
  END as sql_editor_status,
  CASE
    WHEN (SELECT email FROM auth.users WHERE id = auth.uid()) = 'zrig.ayman@gmail.com'
    THEN '✓ You are logged in as zrig.ayman@gmail.com'
    ELSE '✗ You are NOT logged in as zrig.ayman@gmail.com'
  END as email_check;

-- Check 5: Show the mismatch (if any)
DO $$
DECLARE
  current_user_email TEXT;
  superadmin_email TEXT;
  current_is_superadmin BOOLEAN;
BEGIN
  -- Get current user info
  SELECT email INTO current_user_email
  FROM auth.users WHERE id = auth.uid();

  -- Get superadmin info
  SELECT u.email INTO superadmin_email
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.is_superadmin = true
  LIMIT 1;

  -- Check if current user is superadmin
  SELECT is_superadmin FROM profiles
  WHERE id = auth.uid()
  INTO current_is_superadmin;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'ROOT CAUSE ANALYSIS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Current SQL Editor user: %', current_user_email;
  RAISE NOTICE 'Superadmin in database: %', superadmin_email;
  RAISE NOTICE 'Are they the same? %', CASE WHEN current_user_email = superadmin_email THEN 'YES' ELSE 'NO - THIS IS THE PROBLEM!' END;
  RAISE NOTICE '';

  IF current_user_email != superadmin_email THEN
    RAISE WARNING 'PROBLEM FOUND:';
    RAISE WARNING 'The superadmin flag is set for: %', superadmin_email;
    RAISE WARNING 'But you are logged in as: %', current_user_email;
    RAISE WARNING '';
    RAISE WARNING 'SOLUTION: Set the superadmin flag for YOUR current user';
    RAISE WARNING 'Run: UPDATE profiles SET is_superadmin = true WHERE id = auth.uid();';
  ELSIF current_is_superadmin IS NULL THEN
    RAISE WARNING 'PROBLEM: You do not have a profile record!';
    RAISE WARNING 'Create one first, then set superadmin flag';
  ELSIF current_is_superadmin = false THEN
    RAISE WARNING 'PROBLEM: Your profile exists but is_superadmin is false';
    RAISE WARNING 'Run: UPDATE profiles SET is_superadmin = true WHERE id = auth.uid();';
  ELSE
    RAISE NOTICE '✓ Everything looks correct!';
    RAISE NOTICE 'The RLS failure was likely due to a different issue.';
  END IF;

  RAISE NOTICE '========================================';
END $$;
