-- ============================================
-- Fix SECURITY DEFINER Views - Final Fix
-- Created: 2026-01-09
-- Purpose: Convert SECURITY DEFINER views to SECURITY INVOKER to enforce RLS
--
-- Issue: Database linter detected two views with SECURITY DEFINER property:
-- 1. public.v_prochains_coupons
-- 2. public.coupons_optimized
--
-- SECURITY DEFINER views bypass RLS policies and run with creator's permissions,
-- which can cause data leakage across organizations in multi-tenant applications.
--
-- Solution: Set security_invoker = true to enforce RLS policies based on the
-- querying user's context, not the view creator's.
--
-- Verified: All underlying tables have RLS enabled:
-- - coupons_echeances
-- - souscriptions
-- - investisseurs
-- - tranches
-- - projets
-- ============================================

-- First, verify views exist before altering them
DO $$
BEGIN
  -- Check if v_prochains_coupons exists
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_prochains_coupons') THEN
    -- Set security_invoker = true on v_prochains_coupons
    -- This ensures the view enforces RLS policies of the querying user
    ALTER VIEW public.v_prochains_coupons SET (security_invoker = true);
    RAISE NOTICE 'Fixed v_prochains_coupons: Set security_invoker = true';
  ELSE
    RAISE WARNING 'View v_prochains_coupons does not exist';
  END IF;

  -- Check if coupons_optimized exists
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'coupons_optimized') THEN
    -- Set security_invoker = true on coupons_optimized
    -- This ensures the view enforces RLS policies of the querying user
    ALTER VIEW public.coupons_optimized SET (security_invoker = true);
    RAISE NOTICE 'Fixed coupons_optimized: Set security_invoker = true';
  ELSE
    RAISE WARNING 'View coupons_optimized does not exist';
  END IF;
END $$;

-- Update view comments to document the security setting
COMMENT ON VIEW public.v_prochains_coupons IS
  'Next upcoming coupon per subscription.
   Uses SECURITY INVOKER to enforce RLS policies based on the querying user.
   Users can only see coupons for projects in their authorized organizations.';

COMMENT ON VIEW public.coupons_optimized IS
  'Optimized view of coupons with pre-calculated fields.
   Regular view (not materialized) ensures real-time data updates.
   Uses SECURITY INVOKER to enforce RLS policies based on the querying user.
   When a coupon is marked as paid, it immediately shows as "paye" not "en_retard".
   Users can only see coupons for projects in their authorized organizations.';

-- Verify the security settings were applied correctly
DO $$
DECLARE
  v_invoker_1 boolean;
  v_invoker_2 boolean;
BEGIN
  -- Check v_prochains_coupons
  SELECT (reloptions::text[] @> ARRAY['security_invoker=true'])
  INTO v_invoker_1
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'v_prochains_coupons';

  -- Check coupons_optimized
  SELECT (reloptions::text[] @> ARRAY['security_invoker=true'])
  INTO v_invoker_2
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'coupons_optimized';

  IF v_invoker_1 THEN
    RAISE NOTICE 'Verified: v_prochains_coupons has security_invoker = true';
  ELSE
    RAISE WARNING 'Verification failed: v_prochains_coupons does not have security_invoker = true';
  END IF;

  IF v_invoker_2 THEN
    RAISE NOTICE 'Verified: coupons_optimized has security_invoker = true';
  ELSE
    RAISE WARNING 'Verification failed: coupons_optimized does not have security_invoker = true';
  END IF;
END $$;

-- ============================================
-- Migration Notes:
-- ============================================
-- This migration is safe to run multiple times (idempotent).
-- It only alters the security context of existing views,
-- not their structure or data.
--
-- After applying this migration:
-- 1. Users will only see data they have access to via RLS policies
-- 2. Multi-tenant data isolation will be properly enforced
-- 3. The database linter warnings should be resolved
--
-- Testing:
-- To verify RLS is working correctly after this migration:
-- 1. Connect as a user from Organization A
-- 2. Query: SELECT * FROM v_prochains_coupons;
-- 3. Verify: Only coupons from Organization A's projects are returned
-- 4. Connect as a user from Organization B
-- 5. Query: SELECT * FROM v_prochains_coupons;
-- 6. Verify: Only coupons from Organization B's projects are returned
-- ============================================
