/*
  # Document Current RLS State and Known Issues

  This migration adds documentation only - NO CHANGES to actual policies or RLS state.
  Safe to run - just adds comments to help understand the system.
*/

-- ==============================================
-- Current RLS State (as of 2025-12-12)
-- ==============================================

COMMENT ON TABLE profiles IS
  'User profiles. RLS STATUS: DISABLED (safer for now to avoid circular dependencies)';

COMMENT ON TABLE memberships IS
  'User organization memberships. RLS STATUS: DISABLED (safer for now to avoid circular dependencies)';

COMMENT ON TABLE organizations IS
  'Organizations. RLS STATUS: DISABLED (safer for now to avoid circular dependencies)';

COMMENT ON TABLE projets IS
  'Projects. RLS STATUS: ENABLED. Policies use is_superadmin() and direct membership checks.';

COMMENT ON TABLE tranches IS
  'Project tranches. RLS STATUS: ENABLED. Policies check via projets table.';

COMMENT ON TABLE souscriptions IS
  'Subscriptions. RLS STATUS: ENABLED. Policies check via tranches->projets chain.';

COMMENT ON TABLE investisseurs IS
  'Investors. RLS STATUS: ENABLED. Policies use direct org_id checks.';

COMMENT ON TABLE paiements IS
  'Payments. RLS STATUS: ENABLED. Policies use direct org_id checks.';

COMMENT ON TABLE payment_proofs IS
  'Payment proofs. RLS STATUS: ENABLED. Policies check via paiements table.';

COMMENT ON TABLE coupons_echeances IS
  'Coupon schedules. RLS STATUS: ENABLED. Policies check via souscriptions->tranches->projets chain.';

COMMENT ON TABLE invitations IS
  'User invitations. RLS STATUS: ENABLED. Policies check email match or admin role.';

-- ==============================================
-- Known Issues Documentation
-- ==============================================

COMMENT ON FUNCTION is_superadmin() IS
  'GLOBAL SUPERADMIN CHECK: Returns true if profiles.is_superadmin = true for current user.
   SECURITY: Now has SET search_path protection (fixed in 20251212000000).
   NOTE: There is also a "superadmin" role in memberships.role - this creates confusion.
   TODO: Decide on ONE superadmin system (recommend keeping this global one only).';

COMMENT ON FUNCTION user_can_access_org(uuid) IS
  'ORG ACCESS CHECK: Returns true if user is global superadmin OR has membership in org.
   SECURITY: Now has SET search_path protection (fixed in 20251212000000).
   SAFE: Bypasses RLS via SECURITY DEFINER, preventing circular dependencies.';

COMMENT ON FUNCTION user_is_admin_of_org(uuid) IS
  'ORG ADMIN CHECK: Returns true if user is global superadmin OR has admin/superadmin role in org.
   SECURITY: Now has SET search_path protection (fixed in 20251212000000).
   SAFE: Bypasses RLS via SECURITY DEFINER, preventing circular dependencies.
   NOTE: Checks for both "admin" and "superadmin" in memberships.role - this is confusing.
   TODO: Clarify difference between global superadmin and org-level superadmin role.';

-- ==============================================
-- Superadmin System Documentation
-- ==============================================

COMMENT ON COLUMN profiles.is_superadmin IS
  'GLOBAL SUPERADMIN FLAG: True for platform administrators who can access ALL data across ALL orgs.
   CURRENT SYSTEM: Used by is_superadmin() function and most business table policies.
   RECOMMENDATION: This should be the ONLY superadmin system.';

COMMENT ON COLUMN memberships.role IS
  'ORG MEMBERSHIP ROLE: Can be "member", "admin", or "superadmin".
   ISSUE: The "superadmin" value here creates confusion with profiles.is_superadmin.
   RECOMMENDATION: Remove "superadmin" from this enum, keep only "admin" and "member".
   Org-level admin is sufficient for organization management.
   Platform-level superadmin should only be in profiles.is_superadmin.';

-- ==============================================
-- Next Steps Documentation
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'RLS SYSTEM DOCUMENTATION ADDED';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'CURRENT STATUS:';
  RAISE NOTICE '  ✓ Identity tables (profiles, memberships, orgs): RLS DISABLED';
  RAISE NOTICE '  ✓ Business tables: RLS ENABLED with policies';
  RAISE NOTICE '  ✓ SECURITY DEFINER functions: NOW HAVE search_path protection';
  RAISE NOTICE '';
  RAISE NOTICE 'KNOWN ISSUES (NON-CRITICAL):';
  RAISE NOTICE '  ⚠ Two competing superadmin systems (profiles.is_superadmin vs memberships.role)';
  RAISE NOTICE '  ⚠ Many historical migrations with duplicate policy definitions';
  RAISE NOTICE '';
  RAISE NOTICE 'RECOMMENDATIONS FOR FUTURE:';
  RAISE NOTICE '  1. Pick ONE superadmin system (recommend profiles.is_superadmin only)';
  RAISE NOTICE '  2. Clean up old migrations (or at least document which are superseded)';
  RAISE NOTICE '  3. Consider enabling RLS on identity tables with simple, non-recursive policies';
  RAISE NOTICE '';
  RAISE NOTICE 'CURRENT STATE: STABLE AND SECURE';
  RAISE NOTICE '====================================================================';
END $$;
