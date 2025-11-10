-- ============================================
-- RLS WITHOUT FUNCTION CALLS
-- ============================================
-- This version embeds all logic directly in policies
-- No function calls = no JWT context issues
-- ============================================

-- Enable RLS
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
-- POLICIES - Direct inline logic
-- ============================================

-- PROJETS
DROP POLICY IF EXISTS "projets_policy" ON projets;
CREATE POLICY "projets_policy" ON projets FOR ALL USING (
  COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false) = true
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

-- INVESTISSEURS
DROP POLICY IF EXISTS "investisseurs_policy" ON investisseurs;
CREATE POLICY "investisseurs_policy" ON investisseurs FOR ALL USING (
  COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false) = true
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

-- PAIEMENTS
DROP POLICY IF EXISTS "paiements_policy" ON paiements;
CREATE POLICY "paiements_policy" ON paiements FOR ALL USING (
  COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false) = true
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

-- TRANCHES
DROP POLICY IF EXISTS "tranches_policy" ON tranches;
CREATE POLICY "tranches_policy" ON tranches FOR ALL USING (
  COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false) = true
  OR EXISTS (
    SELECT 1 FROM projets p
    INNER JOIN memberships m ON m.org_id = p.org_id
    WHERE p.id = tranches.projet_id AND m.user_id = auth.uid()
  )
);

-- SOUSCRIPTIONS
DROP POLICY IF EXISTS "souscriptions_policy" ON souscriptions;
CREATE POLICY "souscriptions_policy" ON souscriptions FOR ALL USING (
  COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false) = true
  OR EXISTS (
    SELECT 1 FROM projets p
    INNER JOIN memberships m ON m.org_id = p.org_id
    WHERE p.id = souscriptions.projet_id AND m.user_id = auth.uid()
  )
);

-- COUPONS_ECHEANCES
DROP POLICY IF EXISTS "coupons_echeances_policy" ON coupons_echeances;
CREATE POLICY "coupons_echeances_policy" ON coupons_echeances FOR ALL USING (
  COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false) = true
  OR EXISTS (
    SELECT 1 FROM souscriptions s
    INNER JOIN projets p ON p.id = s.projet_id
    INNER JOIN memberships m ON m.org_id = p.org_id
    WHERE s.id = coupons_echeances.souscription_id AND m.user_id = auth.uid()
  )
);

-- PAYMENT_PROOFS
DROP POLICY IF EXISTS "payment_proofs_policy" ON payment_proofs;
CREATE POLICY "payment_proofs_policy" ON payment_proofs FOR ALL USING (
  COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false) = true
  OR EXISTS (
    SELECT 1 FROM paiements p
    INNER JOIN memberships m ON m.org_id = p.org_id
    WHERE p.id = payment_proofs.paiement_id AND m.user_id = auth.uid()
  )
);

-- ORGANIZATIONS
DROP POLICY IF EXISTS "organizations_policy" ON organizations;
CREATE POLICY "organizations_policy" ON organizations FOR ALL USING (
  COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false) = true
  OR id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

-- MEMBERSHIPS
DROP POLICY IF EXISTS "memberships_policy" ON memberships;
CREATE POLICY "memberships_policy" ON memberships FOR ALL USING (
  COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false) = true
  OR user_id = auth.uid()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

-- INVITATIONS
DROP POLICY IF EXISTS "invitations_policy" ON invitations;
CREATE POLICY "invitations_policy" ON invitations FOR ALL USING (
  COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false) = true
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

-- PROFILES
DROP POLICY IF EXISTS "profiles_policy" ON profiles;
CREATE POLICY "profiles_policy" ON profiles FOR ALL USING (
  COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false) = true
  OR id = auth.uid()
);

-- USER_REMINDER_SETTINGS
DROP POLICY IF EXISTS "user_reminder_settings_policy" ON user_reminder_settings;
CREATE POLICY "user_reminder_settings_policy" ON user_reminder_settings FOR ALL USING (
  COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false) = true
  OR user_id = auth.uid()
);

SELECT 'RLS ENABLED with inline policies - NO FUNCTION CALLS' as status;
