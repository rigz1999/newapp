-- ============================================
-- COMPLETE RLS FIX - Fresh Start
-- Created: 2025-11-10
-- Purpose: Fix all RLS policies for the correct workflow
-- ============================================

-- IMPORTANT: Set your super admin email in the function below!

-- ============================================
-- STEP 1: Drop ALL existing policies
-- ============================================

-- Memberships
DROP POLICY IF EXISTS "Users can view memberships" ON memberships;
DROP POLICY IF EXISTS "Users view own and org memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can create memberships" ON memberships;
DROP POLICY IF EXISTS "Admins create memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON memberships;
DROP POLICY IF EXISTS "Admins update memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON memberships;
DROP POLICY IF EXISTS "Admins delete memberships" ON memberships;
DROP POLICY IF EXISTS "Allow all authenticated to view memberships" ON memberships;
DROP POLICY IF EXISTS "Allow all authenticated to insert memberships" ON memberships;
DROP POLICY IF EXISTS "Allow all authenticated to update memberships" ON memberships;
DROP POLICY IF EXISTS "Allow all authenticated to delete memberships" ON memberships;

-- Organizations
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users view their organizations" ON organizations;
DROP POLICY IF EXISTS "Super admin can create organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated create organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Owners update organizations" ON organizations;
DROP POLICY IF EXISTS "Super admin can delete organizations" ON organizations;
DROP POLICY IF EXISTS "Owners delete organizations" ON organizations;
DROP POLICY IF EXISTS "Allow all authenticated to view organizations" ON organizations;
DROP POLICY IF EXISTS "Allow all authenticated to insert organizations" ON organizations;
DROP POLICY IF EXISTS "Allow all authenticated to update organizations" ON organizations;
DROP POLICY IF EXISTS "Allow all authenticated to delete organizations" ON organizations;

-- Invitations
DROP POLICY IF EXISTS "Users can view org invitations" ON invitations;
DROP POLICY IF EXISTS "Users view org invitations" ON invitations;
DROP POLICY IF EXISTS "Authenticated users can view invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;
DROP POLICY IF EXISTS "Admins delete invitations" ON invitations;
DROP POLICY IF EXISTS "Allow all authenticated to view invitations" ON invitations;
DROP POLICY IF EXISTS "Allow all authenticated to insert invitations" ON invitations;
DROP POLICY IF EXISTS "Allow all authenticated to update invitations" ON invitations;
DROP POLICY IF EXISTS "Allow all authenticated to delete invitations" ON invitations;

-- Profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Projets
DROP POLICY IF EXISTS "Users can view their org projets" ON projets;
DROP POLICY IF EXISTS "Users can manage their org projets" ON projets;

-- Investisseurs
DROP POLICY IF EXISTS "Users can view their org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can manage their org investisseurs" ON investisseurs;

-- Tranches
DROP POLICY IF EXISTS "Users can view their org tranches" ON tranches;
DROP POLICY IF EXISTS "Users can manage their org tranches" ON tranches;

-- Souscriptions
DROP POLICY IF EXISTS "Users can view their org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can manage their org souscriptions" ON souscriptions;

-- Coupons
DROP POLICY IF EXISTS "Users can view their org coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can manage their org coupons" ON coupons_echeances;

-- Paiements
DROP POLICY IF EXISTS "Users can view their org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can manage their org paiements" ON paiements;

-- Payment Proofs
DROP POLICY IF EXISTS "Users can view payment proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can manage payment proofs" ON payment_proofs;

-- User Reminder Settings
DROP POLICY IF EXISTS "Users can view their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can insert their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can update their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can delete their own reminder settings" ON user_reminder_settings;

-- ============================================
-- STEP 2: Drop old functions
-- ============================================

DROP FUNCTION IF EXISTS user_org_ids(UUID);
DROP FUNCTION IF EXISTS can_view_org_invitations(UUID);
DROP FUNCTION IF EXISTS can_manage_org_invitations(UUID);

-- ============================================
-- STEP 3: Make owner_id nullable (deprecate it)
-- ============================================

ALTER TABLE organizations ALTER COLUMN owner_id DROP NOT NULL;

-- ============================================
-- STEP 4: Create helper function for super admin check
-- ============================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'zrig.ayman@gmail.com'
  );
$$;

GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

COMMENT ON FUNCTION is_super_admin() IS
  'Returns true if current user is the super admin (based on email). SECURITY DEFINER to access auth.users.';

-- ============================================
-- STEP 5: Create helper function to get user org IDs
-- ============================================

CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS TABLE(org_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT m.org_id
  FROM memberships m
  WHERE m.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION user_org_ids() TO authenticated;

COMMENT ON FUNCTION user_org_ids() IS
  'Returns list of organization IDs the current user belongs to. SECURITY DEFINER to bypass RLS on memberships.';

-- ============================================
-- STEP 6: Create helper function to check if user is admin in org
-- ============================================

CREATE OR REPLACE FUNCTION is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
    AND org_id = p_org_id
    AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION is_org_admin(UUID) TO authenticated;

COMMENT ON FUNCTION is_org_admin(UUID) IS
  'Returns true if current user is admin of the specified organization. SECURITY DEFINER to bypass RLS.';

-- ============================================
-- POLICIES: ORGANIZATIONS
-- ============================================

-- View: Members can see their orgs, super admin sees all
CREATE POLICY "view_organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  );

-- Insert: Only super admin can create
CREATE POLICY "insert_organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

-- Update: Only super admin can update
CREATE POLICY "update_organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (is_super_admin());

-- Delete: Only super admin can delete
CREATE POLICY "delete_organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- ============================================
-- POLICIES: MEMBERSHIPS
-- ============================================

-- View: Users see own memberships + other members in their orgs + super admin sees all
CREATE POLICY "view_memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR user_id = auth.uid()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  );

-- Insert: Super admin OR org admins can add members to their org
CREATE POLICY "insert_memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin()
    OR is_org_admin(org_id)
  );

-- Update: Super admin OR org admins can update memberships in their org
CREATE POLICY "update_memberships"
  ON memberships FOR UPDATE
  TO authenticated
  USING (
    is_super_admin()
    OR is_org_admin(org_id)
  );

-- Delete: Super admin OR org admins can remove members from their org
CREATE POLICY "delete_memberships"
  ON memberships FOR DELETE
  TO authenticated
  USING (
    is_super_admin()
    OR is_org_admin(org_id)
  );

-- ============================================
-- POLICIES: INVITATIONS
-- ============================================

-- View: Users can see invitations for their orgs + super admin sees all
CREATE POLICY "view_invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  );

-- Insert: Super admin OR org admins can create invitations
CREATE POLICY "insert_invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin()
    OR is_org_admin(org_id)
  );

-- Update: Super admin OR org admins can update invitations
CREATE POLICY "update_invitations"
  ON invitations FOR UPDATE
  TO authenticated
  USING (
    is_super_admin()
    OR is_org_admin(org_id)
  );

-- Delete: Super admin OR org admins can delete invitations
CREATE POLICY "delete_invitations"
  ON invitations FOR DELETE
  TO authenticated
  USING (
    is_super_admin()
    OR is_org_admin(org_id)
  );

-- ============================================
-- POLICIES: PROFILES
-- ============================================

-- View: All authenticated users can view all profiles
CREATE POLICY "view_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Insert: Users can only insert their own profile
CREATE POLICY "insert_profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Update: Super admin OR users can update their own profile
CREATE POLICY "update_profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_super_admin() OR id = auth.uid())
  WITH CHECK (is_super_admin() OR id = auth.uid());

-- ============================================
-- POLICIES: PROJETS
-- ============================================

-- View: Super admin OR members of the org can view
CREATE POLICY "view_projets"
  ON projets FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  );

-- Insert/Update/Delete: Super admin OR any member of the org can manage
CREATE POLICY "manage_projets"
  ON projets FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  )
  WITH CHECK (
    is_super_admin()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  );

-- ============================================
-- POLICIES: INVESTISSEURS
-- ============================================

CREATE POLICY "view_investisseurs"
  ON investisseurs FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  );

CREATE POLICY "manage_investisseurs"
  ON investisseurs FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  )
  WITH CHECK (
    is_super_admin()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  );

-- ============================================
-- POLICIES: TRANCHES
-- ============================================

CREATE POLICY "view_tranches"
  ON tranches FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

CREATE POLICY "manage_tranches"
  ON tranches FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  )
  WITH CHECK (
    is_super_admin()
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

-- ============================================
-- POLICIES: SOUSCRIPTIONS
-- ============================================

CREATE POLICY "view_souscriptions"
  ON souscriptions FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR tranche_id IN (
      SELECT t.id FROM tranches t
      JOIN projets p ON p.id = t.projet_id
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

CREATE POLICY "manage_souscriptions"
  ON souscriptions FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR tranche_id IN (
      SELECT t.id FROM tranches t
      JOIN projets p ON p.id = t.projet_id
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  )
  WITH CHECK (
    is_super_admin()
    OR tranche_id IN (
      SELECT t.id FROM tranches t
      JOIN projets p ON p.id = t.projet_id
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

-- ============================================
-- POLICIES: COUPONS_ECHEANCES
-- ============================================

CREATE POLICY "view_coupons"
  ON coupons_echeances FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN tranches t ON t.id = s.tranche_id
      JOIN projets p ON p.id = t.projet_id
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

CREATE POLICY "manage_coupons"
  ON coupons_echeances FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN tranches t ON t.id = s.tranche_id
      JOIN projets p ON p.id = t.projet_id
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  )
  WITH CHECK (
    is_super_admin()
    OR souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN tranches t ON t.id = s.tranche_id
      JOIN projets p ON p.id = t.projet_id
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

-- ============================================
-- POLICIES: PAIEMENTS
-- ============================================

CREATE POLICY "view_paiements"
  ON paiements FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN tranches t ON t.id = s.tranche_id
      JOIN projets p ON p.id = t.projet_id
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

CREATE POLICY "manage_paiements"
  ON paiements FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN tranches t ON t.id = s.tranche_id
      JOIN projets p ON p.id = t.projet_id
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  )
  WITH CHECK (
    is_super_admin()
    OR echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN tranches t ON t.id = s.tranche_id
      JOIN projets p ON p.id = t.projet_id
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

-- ============================================
-- POLICIES: PAYMENT_PROOFS
-- ============================================

CREATE POLICY "view_payment_proofs"
  ON payment_proofs FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR paiement_id IN (
      SELECT pa.id FROM paiements pa
      JOIN coupons_echeances ce ON ce.id = pa.echeance_id
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN tranches t ON t.id = s.tranche_id
      JOIN projets p ON p.id = t.projet_id
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

CREATE POLICY "manage_payment_proofs"
  ON payment_proofs FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR paiement_id IN (
      SELECT pa.id FROM paiements pa
      JOIN coupons_echeances ce ON ce.id = pa.echeance_id
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN tranches t ON t.id = s.tranche_id
      JOIN projets p ON p.id = t.projet_id
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  )
  WITH CHECK (
    is_super_admin()
    OR paiement_id IN (
      SELECT pa.id FROM paiements pa
      JOIN coupons_echeances ce ON ce.id = pa.echeance_id
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN tranches t ON t.id = s.tranche_id
      JOIN projets p ON p.id = t.projet_id
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

-- ============================================
-- POLICIES: USER_REMINDER_SETTINGS
-- ============================================

CREATE POLICY "view_reminder_settings"
  ON user_reminder_settings FOR SELECT
  TO authenticated
  USING (is_super_admin() OR user_id = auth.uid());

CREATE POLICY "insert_reminder_settings"
  ON user_reminder_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_reminder_settings"
  ON user_reminder_settings FOR UPDATE
  TO authenticated
  USING (is_super_admin() OR user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_reminder_settings"
  ON user_reminder_settings FOR DELETE
  TO authenticated
  USING (is_super_admin() OR user_id = auth.uid());

-- ============================================
-- IMPORTANT NOTES
-- ============================================

-- ✅ Super admin email configured: zrig.ayman@gmail.com

-- ============================================
-- Summary of Access Control
-- ============================================

-- SUPER ADMIN (identified by email: zrig.ayman@gmail.com):
--   ✓ Create/delete organizations
--   ✓ Create/update/delete memberships (assign users to orgs)
--   ✓ Full access to all data across all organizations
--   ✓ Can invite users to any organization

-- ORG ADMIN (role='admin' in memberships):
--   ✓ View their organization's data
--   ✓ Manage (create/update/delete) their organization's data
--   ✓ Invite users to their organization
--   ✓ Assign roles to users in their organization
--   ✓ Manage memberships in their organization

-- ORG MEMBER (role='member' in memberships):
--   ✓ View their organization's data
--   ✓ Create/update/delete data in their organization
--   ✗ Cannot invite users
--   ✗ Cannot manage memberships
