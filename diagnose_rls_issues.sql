-- ============================================
-- RLS DIAGNOSTIC SCRIPT
-- ============================================
-- This script helps diagnose RLS issues
-- ============================================

-- Check 1: Is RLS enabled on tables?
SELECT
  table_name,
  CASE
    WHEN relrowsecurity = true THEN '⚠️  RLS ENABLED'
    ELSE '✓ RLS DISABLED'
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

-- Check 2: Does is_superadmin column exist?
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'profiles' AND column_name = 'is_superadmin'
    )
    THEN '✓ is_superadmin column exists'
    ELSE '✗ is_superadmin column MISSING'
  END AS column_status;

-- Check 3: Who is marked as superadmin?
SELECT
  u.email,
  p.is_superadmin,
  p.created_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.is_superadmin DESC, u.email;

-- Check 4: Test the is_superadmin() function with current user
SELECT
  auth.uid() as current_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as current_email,
  is_superadmin() as is_current_user_superadmin,
  (SELECT is_superadmin FROM profiles WHERE id = auth.uid()) as superadmin_column_value;

-- Check 5: Do helper functions exist?
SELECT
  proname as function_name,
  CASE
    WHEN proname = 'get_user_org_ids' THEN '✓ Organization lookup function exists'
    WHEN proname = 'is_superadmin' THEN '✓ Superadmin check function exists'
  END as status
FROM pg_proc
WHERE proname IN ('get_user_org_ids', 'is_superadmin')
ORDER BY proname;

-- Check 6: What organizations does current user belong to?
SELECT
  o.id as org_id,
  o.name as org_name,
  m.role as user_role
FROM memberships m
JOIN organizations o ON m.org_id = o.id
WHERE m.user_id = auth.uid();

-- Check 7: List all policies on projets table (example)
SELECT
  pol.polname as policy_name,
  pol.polcmd as policy_command,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'projets';

-- Check 8: Count records in main tables (as current user)
DO $$
DECLARE
  projets_count INT;
  investisseurs_count INT;
  paiements_count INT;
BEGIN
  SELECT COUNT(*) INTO projets_count FROM projets;
  SELECT COUNT(*) INTO investisseurs_count FROM investisseurs;
  SELECT COUNT(*) INTO paiements_count FROM paiements;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'RECORD COUNTS (visible to current user):';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Projets: %', projets_count;
  RAISE NOTICE 'Investisseurs: %', investisseurs_count;
  RAISE NOTICE 'Paiements: %', paiements_count;
  RAISE NOTICE '========================================';

  IF projets_count = 0 AND investisseurs_count = 0 AND paiements_count = 0 THEN
    RAISE WARNING 'You cannot see any records! This indicates an RLS policy issue.';
  END IF;
END $$;

-- Summary
DO $$
DECLARE
  rls_enabled BOOLEAN;
  column_exists BOOLEAN;
  is_superadmin_val BOOLEAN;
  has_memberships BOOLEAN;
BEGIN
  -- Check if RLS is enabled on any table
  SELECT EXISTS (
    SELECT 1 FROM pg_class pc
    JOIN information_schema.tables t ON pc.relname = t.table_name
    WHERE t.table_schema = 'public'
    AND pc.relrowsecurity = true
    AND t.table_name = 'projets'
  ) INTO rls_enabled;

  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_superadmin'
  ) INTO column_exists;

  -- Check if current user is superadmin
  BEGIN
    SELECT is_superadmin() INTO is_superadmin_val;
  EXCEPTION
    WHEN OTHERS THEN
      is_superadmin_val := false;
  END;

  -- Check if user has memberships
  SELECT EXISTS (
    SELECT 1 FROM memberships WHERE user_id = auth.uid()
  ) INTO has_memberships;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Current user: %', (SELECT email FROM auth.users WHERE id = auth.uid());
  RAISE NOTICE 'RLS enabled: %', CASE WHEN rls_enabled THEN '⚠️  YES' ELSE '✓ NO' END;
  RAISE NOTICE 'is_superadmin column exists: %', CASE WHEN column_exists THEN '✓ YES' ELSE '✗ NO' END;
  RAISE NOTICE 'Current user is superadmin: %', CASE WHEN is_superadmin_val THEN '✓ YES' ELSE '✗ NO' END;
  RAISE NOTICE 'User has memberships: %', CASE WHEN has_memberships THEN '✓ YES' ELSE '✗ NO' END;
  RAISE NOTICE '========================================';

  -- Provide recommendations
  IF rls_enabled AND NOT is_superadmin_val AND NOT has_memberships THEN
    RAISE WARNING 'PROBLEM IDENTIFIED:';
    RAISE WARNING '- RLS is enabled';
    RAISE WARNING '- You are NOT a superadmin';
    RAISE WARNING '- You have NO organization memberships';
    RAISE WARNING 'SOLUTION: Either set yourself as superadmin OR add membership';
  ELSIF rls_enabled AND column_exists AND NOT is_superadmin_val THEN
    RAISE WARNING 'PROBLEM: RLS enabled but you are not superadmin';
    RAISE WARNING 'Run this to fix:';
    RAISE WARNING 'UPDATE profiles SET is_superadmin = true WHERE id = auth.uid();';
  ELSIF rls_enabled AND NOT column_exists THEN
    RAISE WARNING 'PROBLEM: RLS enabled but is_superadmin column missing!';
    RAISE WARNING 'Run disable_rls.sql immediately, then run Phase 1';
  ELSIF NOT rls_enabled THEN
    RAISE NOTICE 'Status: RLS is disabled - no access restrictions';
  ELSE
    RAISE NOTICE 'Status: Setup looks correct!';
  END IF;

  RAISE NOTICE '========================================';
END $$;
