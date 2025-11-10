-- ============================================
-- Verification Script
-- ============================================
-- Run this script after Phase 1 to verify:
-- 1. The is_superadmin column exists
-- 2. Your user is set as superadmin
-- 3. Helper functions are created
-- ============================================

-- Check 1: Verify is_superadmin column exists
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'profiles' AND column_name = 'is_superadmin'
    )
    THEN '✓ PASS: is_superadmin column exists in profiles table'
    ELSE '✗ FAIL: is_superadmin column NOT found in profiles table'
  END AS column_check;

-- Check 2: Verify superadmin user is set
SELECT
  CASE
    WHEN COUNT(*) > 0
    THEN '✓ PASS: Superadmin user(s) found: ' || STRING_AGG(u.email, ', ')
    ELSE '✗ FAIL: No superadmin users found'
  END AS superadmin_check
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.is_superadmin = true;

-- Check 3: List all superadmins
SELECT
  u.email,
  p.is_superadmin,
  p.created_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.is_superadmin = true;

-- Check 4: Verify helper functions exist
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_org_ids')
    THEN '✓ PASS: get_user_org_ids() function exists'
    ELSE '✗ FAIL: get_user_org_ids() function NOT found'
  END AS function_check_1;

SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin')
    THEN '✓ PASS: is_superadmin() function exists'
    ELSE '✗ FAIL: is_superadmin() function NOT found'
  END AS function_check_2;

-- Check 5: Verify RLS is still disabled
SELECT
  table_name,
  CASE
    WHEN relrowsecurity = false THEN '✓ RLS is DISABLED (correct for Phase 1)'
    ELSE '✗ RLS is ENABLED (should be disabled at this stage)'
  END AS rls_status
FROM pg_class
JOIN information_schema.tables ON table_name = relname
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'projets', 'investisseurs', 'paiements', 'tranches',
    'souscriptions', 'coupons_echeances', 'payment_proofs',
    'organizations', 'memberships', 'invitations', 'profiles',
    'user_reminder_settings'
  )
ORDER BY table_name;

-- Summary
DO $$
DECLARE
  column_exists BOOLEAN;
  superadmin_exists BOOLEAN;
  function1_exists BOOLEAN;
  function2_exists BOOLEAN;
  all_checks_pass BOOLEAN;
BEGIN
  -- Check column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_superadmin'
  ) INTO column_exists;

  -- Check superadmin
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE is_superadmin = true
  ) INTO superadmin_exists;

  -- Check functions
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_user_org_ids'
  ) INTO function1_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin'
  ) INTO function2_exists;

  all_checks_pass := column_exists AND superadmin_exists AND function1_exists AND function2_exists;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Column exists: %', CASE WHEN column_exists THEN '✓ YES' ELSE '✗ NO' END;
  RAISE NOTICE 'Superadmin set: %', CASE WHEN superadmin_exists THEN '✓ YES' ELSE '✗ NO' END;
  RAISE NOTICE 'get_user_org_ids(): %', CASE WHEN function1_exists THEN '✓ YES' ELSE '✗ NO' END;
  RAISE NOTICE 'is_superadmin(): %', CASE WHEN function2_exists THEN '✓ YES' ELSE '✗ NO' END;
  RAISE NOTICE '========================================';

  IF all_checks_pass THEN
    RAISE NOTICE 'RESULT: ✓ ALL CHECKS PASSED';
    RAISE NOTICE '';
    RAISE NOTICE 'You are ready to proceed with Phase 2!';
    RAISE NOTICE 'Run phase2_enable_rls.sql to enable RLS policies.';
  ELSE
    RAISE WARNING 'RESULT: ✗ SOME CHECKS FAILED';
    RAISE WARNING '';
    RAISE WARNING 'DO NOT proceed to Phase 2 yet!';
    RAISE WARNING 'Review the Phase 1 script and ensure it ran successfully.';
  END IF;

  RAISE NOTICE '========================================';
END $$;
