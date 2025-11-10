-- ============================================
-- SIMPLE WORKING RLS (with superadmin)
-- ============================================
-- This version is simplified to actually work
-- ============================================

-- Step 1: Create simple helper function
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS TABLE (org_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT m.org_id
  FROM memberships m
  WHERE m.user_id = auth.uid();
$$;

-- Step 2: Create superadmin check (direct, no exception handling)
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT p.is_superadmin FROM profiles p WHERE p.id = auth.uid()),
    false
  );
$$;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE projets ENABLE ROW LEVEL SECURITY;
ALTER TABLE investisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tranches ENABLE ROW LEVEL SECURITY;
ALTER TABLE souscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons_echeances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reminder_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SIMPLE POLICIES - Tables with org_id
-- ============================================

-- PROJETS
DROP POLICY IF EXISTS "projets_policy" ON projets;
CREATE POLICY "projets_policy" ON projets
  FOR ALL
  USING (
    (SELECT is_superadmin()) = true
    OR org_id IN (SELECT get_user_org_ids())
  );

-- INVESTISSEURS
DROP POLICY IF EXISTS "investisseurs_policy" ON investisseurs;
CREATE POLICY "investisseurs_policy" ON investisseurs
  FOR ALL
  USING (
    (SELECT is_superadmin()) = true
    OR org_id IN (SELECT get_user_org_ids())
  );

-- PAIEMENTS
DROP POLICY IF EXISTS "paiements_policy" ON paiements;
CREATE POLICY "paiements_policy" ON paiements
  FOR ALL
  USING (
    (SELECT is_superadmin()) = true
    OR org_id IN (SELECT get_user_org_ids())
  );

-- ============================================
-- POLICIES - Tables linked through parent
-- ============================================

-- TRANCHES (through projet)
DROP POLICY IF EXISTS "tranches_policy" ON tranches;
CREATE POLICY "tranches_policy" ON tranches
  FOR ALL
  USING (
    (SELECT is_superadmin()) = true
    OR EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

-- SOUSCRIPTIONS (through projet)
DROP POLICY IF EXISTS "souscriptions_policy" ON souscriptions;
CREATE POLICY "souscriptions_policy" ON souscriptions
  FOR ALL
  USING (
    (SELECT is_superadmin()) = true
    OR EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = souscriptions.projet_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

-- COUPONS_ECHEANCES (through souscription -> projet)
DROP POLICY IF EXISTS "coupons_echeances_policy" ON coupons_echeances;
CREATE POLICY "coupons_echeances_policy" ON coupons_echeances
  FOR ALL
  USING (
    (SELECT is_superadmin()) = true
    OR EXISTS (
      SELECT 1 FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      WHERE s.id = coupons_echeances.souscription_id
      AND p.org_id IN (SELECT get_user_org_ids())
    )
  );

-- PAYMENT_PROOFS (through paiement)
DROP POLICY IF EXISTS "payment_proofs_policy" ON payment_proofs;
CREATE POLICY "payment_proofs_policy" ON payment_proofs
  FOR ALL
  USING (
    (SELECT is_superadmin()) = true
    OR EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND paiements.org_id IN (SELECT get_user_org_ids())
    )
  );

-- ============================================
-- SYSTEM TABLES
-- ============================================

-- ORGANIZATIONS
DROP POLICY IF EXISTS "organizations_policy" ON organizations;
CREATE POLICY "organizations_policy" ON organizations
  FOR ALL
  USING (
    (SELECT is_superadmin()) = true
    OR id IN (SELECT get_user_org_ids())
  );

-- MEMBERSHIPS
DROP POLICY IF EXISTS "memberships_policy" ON memberships;
CREATE POLICY "memberships_policy" ON memberships
  FOR ALL
  USING (
    (SELECT is_superadmin()) = true
    OR user_id = auth.uid()
    OR org_id IN (SELECT get_user_org_ids())
  );

-- INVITATIONS
DROP POLICY IF EXISTS "invitations_policy" ON invitations;
CREATE POLICY "invitations_policy" ON invitations
  FOR ALL
  USING (
    (SELECT is_superadmin()) = true
    OR org_id IN (SELECT get_user_org_ids())
  );

-- PROFILES
DROP POLICY IF EXISTS "profiles_policy" ON profiles;
CREATE POLICY "profiles_policy" ON profiles
  FOR ALL
  USING (
    (SELECT is_superadmin()) = true
    OR id = auth.uid()
  );

-- USER_REMINDER_SETTINGS
DROP POLICY IF EXISTS "user_reminder_settings_policy" ON user_reminder_settings;
CREATE POLICY "user_reminder_settings_policy" ON user_reminder_settings
  FOR ALL
  USING (
    (SELECT is_superadmin()) = true
    OR user_id = auth.uid()
  );

-- ============================================
-- VERIFY SETUP
-- ============================================

-- Test the functions
DO $$
DECLARE
  test_superadmin BOOLEAN;
  test_orgs INT;
BEGIN
  SELECT is_superadmin() INTO test_superadmin;
  SELECT COUNT(*) INTO test_orgs FROM get_user_org_ids();

  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS ENABLED - VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Functions created: ✓';
  RAISE NOTICE 'is_superadmin() returns: %', test_superadmin;
  RAISE NOTICE 'User has % organization(s)', test_orgs;
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT: Refresh your app and test';
  RAISE NOTICE '========================================';
END $$;
