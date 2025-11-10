-- ============================================
-- EMERGENCY: Disable RLS on All Tables
-- ============================================
-- Use this script if you need to quickly disable
-- Row Level Security and restore full access.
--
-- This script does NOT delete policies or functions,
-- it only disables RLS enforcement.
-- ============================================

-- Disable RLS on core business tables
ALTER TABLE projets DISABLE ROW LEVEL SECURITY;
ALTER TABLE investisseurs DISABLE ROW LEVEL SECURITY;
ALTER TABLE paiements DISABLE ROW LEVEL SECURITY;
ALTER TABLE tranches DISABLE ROW LEVEL SECURITY;
ALTER TABLE souscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupons_echeances DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proofs DISABLE ROW LEVEL SECURITY;

-- Disable RLS on system tables
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_reminder_settings DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT
  table_name,
  CASE
    WHEN relrowsecurity = false THEN '✓ RLS DISABLED'
    ELSE '✗ RLS STILL ENABLED'
  END AS rls_status
FROM pg_class
JOIN information_schema.tables ON tablename = relname
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
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS DISABLED ON ALL TABLES';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Row Level Security has been disabled.';
  RAISE NOTICE 'All authenticated users can now access all data.';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT:';
  RAISE NOTICE '- This is an emergency measure';
  RAISE NOTICE '- Your data is no longer isolated by organization';
  RAISE NOTICE '- Re-enable RLS when the issue is resolved';
  RAISE NOTICE '';
  RAISE NOTICE 'To re-enable RLS:';
  RAISE NOTICE '1. Fix the issue that required disabling RLS';
  RAISE NOTICE '2. Run verify_superadmin.sql to check setup';
  RAISE NOTICE '3. Run phase2_enable_rls.sql to re-enable RLS';
  RAISE NOTICE '========================================';
END $$;
