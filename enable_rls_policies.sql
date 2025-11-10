-- ============================================
-- COMPREHENSIVE RLS POLICIES
-- Based on actual database schema
-- ============================================
-- Authentication Model:
-- - Superadmin: Has access to everything
-- - Admin/Member: Can only see data from their organization
-- ============================================

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get user's organization IDs from memberships
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS TABLE (org_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT m.org_id
  FROM memberships m
  WHERE m.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is superadmin
-- NOTE: Add a boolean column 'is_superadmin' to profiles table to use this
-- Or modify this function to check superadmin status however you prefer
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean AS $$
BEGIN
  -- Option 1: Check if profiles table has is_superadmin column
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_superadmin = true
  );

  -- Option 2: If you don't have is_superadmin column, you can check by email:
  -- RETURN EXISTS (
  --   SELECT 1 FROM profiles
  --   WHERE id = auth.uid()
  --   AND email = 'superadmin@yourcompany.com'
  -- );

  -- Option 3: For now, return false and add superadmin logic later
  -- RETURN false;
EXCEPTION
  WHEN undefined_column THEN
    -- If is_superadmin column doesn't exist yet, return false
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROJETS TABLE
-- ============================================

ALTER TABLE projets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projets_select_policy" ON projets;
DROP POLICY IF EXISTS "projets_insert_policy" ON projets;
DROP POLICY IF EXISTS "projets_update_policy" ON projets;
DROP POLICY IF EXISTS "projets_delete_policy" ON projets;

CREATE POLICY "projets_select_policy"
  ON projets FOR SELECT
  USING (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "projets_insert_policy"
  ON projets FOR INSERT
  WITH CHECK (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "projets_update_policy"
  ON projets FOR UPDATE
  USING (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  )
  WITH CHECK (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "projets_delete_policy"
  ON projets FOR DELETE
  USING (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  );

-- ============================================
-- INVESTISSEURS TABLE
-- ============================================

ALTER TABLE investisseurs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investisseurs_select_policy" ON investisseurs;
DROP POLICY IF EXISTS "investisseurs_insert_policy" ON investisseurs;
DROP POLICY IF EXISTS "investisseurs_update_policy" ON investisseurs;
DROP POLICY IF EXISTS "investisseurs_delete_policy" ON investisseurs;

CREATE POLICY "investisseurs_select_policy"
  ON investisseurs FOR SELECT
  USING (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "investisseurs_insert_policy"
  ON investisseurs FOR INSERT
  WITH CHECK (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "investisseurs_update_policy"
  ON investisseurs FOR UPDATE
  USING (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  )
  WITH CHECK (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "investisseurs_delete_policy"
  ON investisseurs FOR DELETE
  USING (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  );

-- ============================================
-- PAIEMENTS TABLE
-- ============================================

ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paiements_select_policy" ON paiements;
DROP POLICY IF EXISTS "paiements_insert_policy" ON paiements;
DROP POLICY IF EXISTS "paiements_update_policy" ON paiements;
DROP POLICY IF EXISTS "paiements_delete_policy" ON paiements;

CREATE POLICY "paiements_select_policy"
  ON paiements FOR SELECT
  USING (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "paiements_insert_policy"
  ON paiements FOR INSERT
  WITH CHECK (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "paiements_update_policy"
  ON paiements FOR UPDATE
  USING (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  )
  WITH CHECK (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "paiements_delete_policy"
  ON paiements FOR DELETE
  USING (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  );

-- ============================================
-- TRANCHES TABLE (check through projet_id)
-- ============================================

ALTER TABLE tranches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tranches_select_policy" ON tranches;
DROP POLICY IF EXISTS "tranches_insert_policy" ON tranches;
DROP POLICY IF EXISTS "tranches_update_policy" ON tranches;
DROP POLICY IF EXISTS "tranches_delete_policy" ON tranches;

CREATE POLICY "tranches_select_policy"
  ON tranches FOR SELECT
  USING (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "tranches_insert_policy"
  ON tranches FOR INSERT
  WITH CHECK (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "tranches_update_policy"
  ON tranches FOR UPDATE
  USING (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  )
  WITH CHECK (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "tranches_delete_policy"
  ON tranches FOR DELETE
  USING (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

-- ============================================
-- SOUSCRIPTIONS TABLE (check through projet_id)
-- ============================================

ALTER TABLE souscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "souscriptions_select_policy" ON souscriptions;
DROP POLICY IF EXISTS "souscriptions_insert_policy" ON souscriptions;
DROP POLICY IF EXISTS "souscriptions_update_policy" ON souscriptions;
DROP POLICY IF EXISTS "souscriptions_delete_policy" ON souscriptions;

CREATE POLICY "souscriptions_select_policy"
  ON souscriptions FOR SELECT
  USING (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = souscriptions.projet_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "souscriptions_insert_policy"
  ON souscriptions FOR INSERT
  WITH CHECK (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = souscriptions.projet_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "souscriptions_update_policy"
  ON souscriptions FOR UPDATE
  USING (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = souscriptions.projet_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  )
  WITH CHECK (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = souscriptions.projet_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "souscriptions_delete_policy"
  ON souscriptions FOR DELETE
  USING (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = souscriptions.projet_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

-- ============================================
-- COUPONS_ECHEANCES TABLE (check through souscription)
-- ============================================

ALTER TABLE coupons_echeances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_echeances_select_policy" ON coupons_echeances;
DROP POLICY IF EXISTS "coupons_echeances_insert_policy" ON coupons_echeances;
DROP POLICY IF EXISTS "coupons_echeances_update_policy" ON coupons_echeances;
DROP POLICY IF EXISTS "coupons_echeances_delete_policy" ON coupons_echeances;

CREATE POLICY "coupons_echeances_select_policy"
  ON coupons_echeances FOR SELECT
  USING (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN projets ON projets.id = souscriptions.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "coupons_echeances_insert_policy"
  ON coupons_echeances FOR INSERT
  WITH CHECK (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN projets ON projets.id = souscriptions.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "coupons_echeances_update_policy"
  ON coupons_echeances FOR UPDATE
  USING (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN projets ON projets.id = souscriptions.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  )
  WITH CHECK (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN projets ON projets.id = souscriptions.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "coupons_echeances_delete_policy"
  ON coupons_echeances FOR DELETE
  USING (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN projets ON projets.id = souscriptions.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

-- ============================================
-- PAYMENT_PROOFS TABLE (check through paiement)
-- ============================================

ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_proofs_select_policy" ON payment_proofs;
DROP POLICY IF EXISTS "payment_proofs_insert_policy" ON payment_proofs;
DROP POLICY IF EXISTS "payment_proofs_update_policy" ON payment_proofs;
DROP POLICY IF EXISTS "payment_proofs_delete_policy" ON payment_proofs;

CREATE POLICY "payment_proofs_select_policy"
  ON payment_proofs FOR SELECT
  USING (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND paiements.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "payment_proofs_insert_policy"
  ON payment_proofs FOR INSERT
  WITH CHECK (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND paiements.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "payment_proofs_update_policy"
  ON payment_proofs FOR UPDATE
  USING (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND paiements.org_id IN (SELECT get_user_org_ids())
    )
  )
  WITH CHECK (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND paiements.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "payment_proofs_delete_policy"
  ON payment_proofs FOR DELETE
  USING (
    is_superadmin() OR
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND paiements.org_id IN (SELECT get_user_org_ids())
    )
  );

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_select_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_insert_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_update_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_delete_policy" ON organizations;

-- Users can see organizations they are members of
CREATE POLICY "organizations_select_policy"
  ON organizations FOR SELECT
  USING (
    is_superadmin() OR
    id IN (SELECT get_user_org_ids())
  );

-- Only superadmin can create organizations (or adjust as needed)
CREATE POLICY "organizations_insert_policy"
  ON organizations FOR INSERT
  WITH CHECK (is_superadmin());

-- Organization owners and superadmin can update
CREATE POLICY "organizations_update_policy"
  ON organizations FOR UPDATE
  USING (
    is_superadmin() OR
    owner_id = auth.uid() OR
    (id IN (SELECT get_user_org_ids()) AND EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = organizations.id
      AND memberships.user_id = auth.uid()
      AND memberships.role = 'admin'
    ))
  );

-- Only superadmin can delete organizations
CREATE POLICY "organizations_delete_policy"
  ON organizations FOR DELETE
  USING (is_superadmin());

-- ============================================
-- MEMBERSHIPS TABLE
-- ============================================

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memberships_select_policy" ON memberships;
DROP POLICY IF EXISTS "memberships_insert_policy" ON memberships;
DROP POLICY IF EXISTS "memberships_update_policy" ON memberships;
DROP POLICY IF EXISTS "memberships_delete_policy" ON memberships;

-- Users can see memberships of their organizations
CREATE POLICY "memberships_select_policy"
  ON memberships FOR SELECT
  USING (
    is_superadmin() OR
    user_id = auth.uid() OR
    org_id IN (SELECT get_user_org_ids())
  );

-- Admins and superadmin can create memberships
CREATE POLICY "memberships_insert_policy"
  ON memberships FOR INSERT
  WITH CHECK (
    is_superadmin() OR
    (org_id IN (SELECT get_user_org_ids()) AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.org_id = memberships.org_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
    ))
  );

-- Admins and superadmin can update memberships
CREATE POLICY "memberships_update_policy"
  ON memberships FOR UPDATE
  USING (
    is_superadmin() OR
    (org_id IN (SELECT get_user_org_ids()) AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.org_id = memberships.org_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
    ))
  );

-- Admins and superadmin can delete memberships
CREATE POLICY "memberships_delete_policy"
  ON memberships FOR DELETE
  USING (
    is_superadmin() OR
    (org_id IN (SELECT get_user_org_ids()) AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.org_id = memberships.org_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
    ))
  );

-- ============================================
-- INVITATIONS TABLE
-- ============================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invitations_select_policy" ON invitations;
DROP POLICY IF EXISTS "invitations_insert_policy" ON invitations;
DROP POLICY IF EXISTS "invitations_update_policy" ON invitations;
DROP POLICY IF EXISTS "invitations_delete_policy" ON invitations;

-- Users can see invitations for their organizations
CREATE POLICY "invitations_select_policy"
  ON invitations FOR SELECT
  USING (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids()) OR
    email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- Admins can create invitations
CREATE POLICY "invitations_insert_policy"
  ON invitations FOR INSERT
  WITH CHECK (
    is_superadmin() OR
    (org_id IN (SELECT get_user_org_ids()) AND EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = invitations.org_id
      AND memberships.user_id = auth.uid()
      AND memberships.role = 'admin'
    ))
  );

-- Admins can update invitations
CREATE POLICY "invitations_update_policy"
  ON invitations FOR UPDATE
  USING (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  );

-- Admins can delete invitations
CREATE POLICY "invitations_delete_policy"
  ON invitations FOR DELETE
  USING (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  );

-- ============================================
-- PROFILES TABLE
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Users can see their own profile, and superadmin can see all
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  USING (
    is_superadmin() OR
    id = auth.uid()
  );

-- Users can create their own profile
CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  USING (
    is_superadmin() OR
    id = auth.uid()
  );

-- Only superadmin can delete profiles
CREATE POLICY "profiles_delete_policy"
  ON profiles FOR DELETE
  USING (is_superadmin());

-- ============================================
-- USER_REMINDER_SETTINGS TABLE
-- ============================================

ALTER TABLE user_reminder_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_reminder_settings_select_policy" ON user_reminder_settings;
DROP POLICY IF EXISTS "user_reminder_settings_insert_policy" ON user_reminder_settings;
DROP POLICY IF EXISTS "user_reminder_settings_update_policy" ON user_reminder_settings;
DROP POLICY IF EXISTS "user_reminder_settings_delete_policy" ON user_reminder_settings;

-- Users can only see their own reminder settings
CREATE POLICY "user_reminder_settings_select_policy"
  ON user_reminder_settings FOR SELECT
  USING (
    is_superadmin() OR
    user_id = auth.uid()
  );

-- Users can create their own reminder settings
CREATE POLICY "user_reminder_settings_insert_policy"
  ON user_reminder_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own reminder settings
CREATE POLICY "user_reminder_settings_update_policy"
  ON user_reminder_settings FOR UPDATE
  USING (
    is_superadmin() OR
    user_id = auth.uid()
  );

-- Users can delete their own reminder settings
CREATE POLICY "user_reminder_settings_delete_policy"
  ON user_reminder_settings FOR DELETE
  USING (
    is_superadmin() OR
    user_id = auth.uid()
  );

-- ============================================
-- OPTIONAL: Add is_superadmin column to profiles
-- ============================================
-- Uncomment the following lines to add the is_superadmin column:

-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_superadmin boolean DEFAULT false;

-- Then manually set superadmin flag for specific users:
-- UPDATE profiles SET is_superadmin = true WHERE email = 'zrig.ayman@gmail.com';
