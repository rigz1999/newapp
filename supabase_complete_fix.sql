-- ============================================
-- COMPLETE FIX: Super Admin System + All RLS Policies
-- Created: 2025-11-08
-- Purpose: Complete migration to fix all RLS issues
-- ============================================

-- ⚠️ IMPORTANT: Replace ALL occurrences of 'YOUR_SUPER_ADMIN_EMAIL@example.com'
-- with your actual email address before running this script!

-- ============================================
-- STEP 1: Clean up existing data
-- ============================================

-- Remove super_admin role from memberships (convert to admin)
UPDATE memberships
SET role = 'admin'
WHERE role = 'super_admin';

-- Fix organizations without owner_id
-- ⚠️ Replace with your actual super admin email
UPDATE organizations
SET owner_id = (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com')
WHERE owner_id IS NULL;

-- Update role constraint to only allow 'admin' and 'member'
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_role_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_role_check
  CHECK (role IN ('admin', 'member'));

-- ============================================
-- STEP 2: Drop ALL existing policies
-- ============================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Memberships
DROP POLICY IF EXISTS "Users can view their memberships" ON memberships;
DROP POLICY IF EXISTS "Users can view memberships" ON memberships;
DROP POLICY IF EXISTS "Organization owners can create memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can create memberships" ON memberships;
DROP POLICY IF EXISTS "Organization owners can update memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON memberships;
DROP POLICY IF EXISTS "Organization owners can delete memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON memberships;
DROP POLICY IF EXISTS "Admins and owners can delete memberships" ON memberships;

-- Organizations
DROP POLICY IF EXISTS "Users can view organizations they are members of" ON organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Super admin can create organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can delete their organizations" ON organizations;
DROP POLICY IF EXISTS "Super admin can delete organizations" ON organizations;

-- Invitations
DROP POLICY IF EXISTS "Users can view org invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;
DROP POLICY IF EXISTS "Anyone authenticated can delete invitations" ON invitations;

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

-- Coupons Echeances
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
-- STEP 3: Create ALL new policies
-- ============================================

-- ============================================
-- PROFILES
-- ============================================

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- ============================================
-- MEMBERSHIPS
-- ============================================

CREATE POLICY "Users can view memberships"
  ON memberships FOR SELECT TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    org_id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()) AND role = 'admin')
    OR
    user_id = (select auth.uid())
  );

CREATE POLICY "Admins can create memberships"
  ON memberships FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    org_id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Admins can update memberships"
  ON memberships FOR UPDATE TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    (
      org_id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()) AND role = 'admin')
      AND user_id NOT IN (SELECT owner_id FROM organizations WHERE id = memberships.org_id)
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    (
      org_id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()) AND role = 'admin')
      AND user_id NOT IN (SELECT owner_id FROM organizations WHERE id = memberships.org_id)
    )
  );

CREATE POLICY "Admins can delete memberships"
  ON memberships FOR DELETE TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    (
      EXISTS (SELECT 1 FROM memberships m WHERE m.org_id = memberships.org_id AND m.user_id = (select auth.uid()) AND m.role = 'admin')
      AND user_id NOT IN (SELECT owner_id FROM organizations WHERE id = memberships.org_id)
    )
  );

-- ============================================
-- ORGANIZATIONS
-- ============================================

CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()))
  );

CREATE POLICY "Super admin can create organizations"
  ON organizations FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
  );

CREATE POLICY "Admins can update organizations"
  ON organizations FOR UPDATE TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    owner_id = (select auth.uid())
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    owner_id = (select auth.uid())
  );

CREATE POLICY "Super admin can delete organizations"
  ON organizations FOR DELETE TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
  );

-- ============================================
-- INVITATIONS
-- ============================================

CREATE POLICY "Users can view org invitations"
  ON invitations FOR SELECT TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()))
  );

CREATE POLICY "Admins can create invitations"
  ON invitations FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    org_id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

CREATE POLICY "Admins can delete invitations"
  ON invitations FOR DELETE TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    org_id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()) AND role = 'admin')
  );

-- ============================================
-- PROJETS
-- ============================================

CREATE POLICY "Users can view their org projets"
  ON projets FOR SELECT TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()))
  );

CREATE POLICY "Users can manage their org projets"
  ON projets FOR ALL TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()))
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()))
  );

-- ============================================
-- INVESTISSEURS
-- ============================================

CREATE POLICY "Users can view their org investisseurs"
  ON investisseurs FOR SELECT TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()))
  );

CREATE POLICY "Users can manage their org investisseurs"
  ON investisseurs FOR ALL TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()))
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()))
  );

-- ============================================
-- TRANCHES
-- ============================================

CREATE POLICY "Users can view their org tranches"
  ON tranches FOR SELECT TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org tranches"
  ON tranches FOR ALL TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- SOUSCRIPTIONS
-- ============================================

CREATE POLICY "Users can view their org souscriptions"
  ON souscriptions FOR SELECT TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org souscriptions"
  ON souscriptions FOR ALL TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- COUPONS_ECHEANCES
-- ============================================

CREATE POLICY "Users can view their org coupons"
  ON coupons_echeances FOR SELECT TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org coupons"
  ON coupons_echeances FOR ALL TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- PAIEMENTS
-- ============================================

CREATE POLICY "Users can view their org paiements"
  ON paiements FOR SELECT TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org paiements"
  ON paiements FOR ALL TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- PAYMENT_PROOFS
-- ============================================

CREATE POLICY "Users can view payment proofs"
  ON payment_proofs FOR SELECT TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    paiement_id IN (
      SELECT pa.id FROM paiements pa
      JOIN coupons_echeances ce ON ce.id = pa.echeance_id
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage payment proofs"
  ON payment_proofs FOR ALL TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    paiement_id IN (
      SELECT pa.id FROM paiements pa
      JOIN coupons_echeances ce ON ce.id = pa.echeance_id
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    paiement_id IN (
      SELECT pa.id FROM paiements pa
      JOIN coupons_echeances ce ON ce.id = pa.echeance_id
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- USER_REMINDER_SETTINGS
-- ============================================

CREATE POLICY "Users can view their own reminder settings"
  ON user_reminder_settings FOR SELECT TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    user_id = (select auth.uid())
  );

CREATE POLICY "Users can insert their own reminder settings"
  ON user_reminder_settings FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own reminder settings"
  ON user_reminder_settings FOR UPDATE TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    user_id = (select auth.uid())
  )
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own reminder settings"
  ON user_reminder_settings FOR DELETE TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    user_id = (select auth.uid())
  );

-- ============================================
-- Verification queries
-- ============================================

-- Verify super admin exists
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com')
    THEN 'Super admin email found ✓'
    ELSE 'ERROR: Super admin email not found! Please update the email in this script.'
  END as super_admin_check;

-- Verify no super_admin roles remain
SELECT COUNT(*) as super_admin_roles_remaining FROM memberships WHERE role = 'super_admin';

-- Should return 0
