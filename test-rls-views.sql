-- ============================================
-- RLS Test Script for SECURITY INVOKER Views
-- Purpose: Verify that views properly enforce RLS policies
-- ============================================

-- This script should be run AFTER applying the migration:
-- 20260109000001_fix_security_definer_views_final.sql

-- ============================================
-- Step 1: Verify views have security_invoker = true
-- ============================================

SELECT
  c.relname as view_name,
  CASE
    WHEN c.reloptions::text[] @> ARRAY['security_invoker=true'] THEN 'SECURITY INVOKER ✓'
    ELSE 'SECURITY DEFINER ✗ (INSECURE)'
  END as security_mode,
  CASE
    WHEN c.reloptions::text[] @> ARRAY['security_invoker=true'] THEN 'PASS'
    ELSE 'FAIL - DATA LEAKAGE RISK'
  END as status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('v_prochains_coupons', 'coupons_optimized')
  AND c.relkind = 'v';

-- Expected output:
-- view_name             | security_mode      | status
-- ----------------------+-------------------+-------
-- v_prochains_coupons   | SECURITY INVOKER ✓ | PASS
-- coupons_optimized     | SECURITY INVOKER ✓ | PASS

-- ============================================
-- Step 2: Verify RLS is enabled on underlying tables
-- ============================================

SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity THEN 'ENABLED ✓'
    ELSE 'DISABLED ✗'
  END as rls_status,
  CASE
    WHEN rowsecurity THEN 'PASS'
    ELSE 'FAIL - RLS NOT ENABLED'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'coupons_echeances',
    'souscriptions',
    'investisseurs',
    'tranches',
    'projets'
  )
ORDER BY tablename;

-- Expected output: All tables should have rls_status = 'ENABLED ✓'

-- ============================================
-- Step 3: Check RLS policies exist
-- ============================================

SELECT
  tablename,
  policyname,
  cmd as operation,
  CASE
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'coupons_echeances',
    'souscriptions',
    'investisseurs',
    'tranches',
    'projets'
  )
ORDER BY tablename, policyname;

-- Expected output: Should see policies for SELECT, INSERT, UPDATE, DELETE

-- ============================================
-- Step 4: Manual RLS Testing (requires two users from different orgs)
-- ============================================

-- This section requires manual testing with actual users
-- You'll need:
-- 1. User A from Organization X
-- 2. User B from Organization Y

-- Test as User A (Organization X):
-- Run this query and note the org_ids in the results
-- SELECT DISTINCT org_id FROM v_prochains_coupons;
-- Expected: Should only see Organization X's org_id

-- SELECT DISTINCT org_id FROM coupons_optimized;
-- Expected: Should only see Organization X's org_id

-- Test as User B (Organization Y):
-- Run this query and note the org_ids in the results
-- SELECT DISTINCT org_id FROM v_prochains_coupons;
-- Expected: Should only see Organization Y's org_id

-- SELECT DISTINCT org_id FROM coupons_optimized;
-- Expected: Should only see Organization Y's org_id

-- ============================================
-- Step 5: Test super admin access (if applicable)
-- ============================================

-- If your system has super admins who should see all data:
-- Test as Super Admin:
-- SELECT COUNT(DISTINCT org_id) FROM v_prochains_coupons;
-- Expected: Should see coupons from all organizations

-- SELECT COUNT(DISTINCT org_id) FROM coupons_optimized;
-- Expected: Should see coupons from all organizations

-- ============================================
-- Troubleshooting Queries
-- ============================================

-- If RLS is not working as expected, run these queries:

-- 1. Check current user's role
SELECT current_user, current_role;

-- 2. Check which organizations current user has access to
-- (This will depend on your specific authorization functions)
-- SELECT * FROM memberships WHERE user_id = auth.uid();

-- 3. Check if any functions are marked as SECURITY DEFINER
-- (These bypass RLS)
SELECT
  n.nspname as schema,
  p.proname as function_name,
  CASE p.prosecdef
    WHEN true THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_mode
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;

-- 4. View the actual RLS policy definitions
SELECT
  schemaname,
  tablename,
  policyname,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'coupons_echeances';

-- ============================================
-- Cleanup (Optional - only if you need to revert)
-- ============================================

-- To revert back to SECURITY DEFINER (NOT RECOMMENDED):
-- ALTER VIEW public.v_prochains_coupons SET (security_definer = true);
-- ALTER VIEW public.coupons_optimized SET (security_definer = true);

-- ============================================
-- Summary
-- ============================================

-- After running this script, you should verify:
-- ✓ Both views use SECURITY INVOKER
-- ✓ All underlying tables have RLS enabled
-- ✓ RLS policies exist for all tables
-- ✓ Manual testing shows users only see their organization's data
-- ✓ Super admins (if applicable) can see all data
--
-- If any of these checks fail, the database linter warnings
-- will persist and data leakage is possible.
-- ============================================
