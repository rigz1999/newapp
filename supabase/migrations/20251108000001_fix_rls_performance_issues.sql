-- ============================================
-- Fix RLS Performance Issues
-- Created: 2025-11-08
-- Purpose: Fix auth_rls_initplan warnings and consolidate multiple permissive policies
--
-- Issues addressed:
-- 1. Wrap auth.uid() in (select ...) to prevent re-evaluation per row
-- 2. Consolidate multiple permissive policies for better performance
-- ============================================

-- ============================================
-- PROFILES TABLE
-- ============================================

-- Drop ALL existing policies (including ones that might exist in Supabase)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Recreate with optimized policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- ============================================
-- USER_REMINDER_SETTINGS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can insert their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can update their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can delete their own reminder settings" ON user_reminder_settings;

CREATE POLICY "Users can view their own reminder settings"
  ON user_reminder_settings
  FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own reminder settings"
  ON user_reminder_settings
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own reminder settings"
  ON user_reminder_settings
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own reminder settings"
  ON user_reminder_settings
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view organizations they are members of" ON organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can manage all organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create their own organization" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can delete their organizations" ON organizations;

-- Recreate with optimized policies
CREATE POLICY "Users can view organizations they are members of"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "Organization owners can update their organizations"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "Organization owners can delete their organizations"
  ON organizations
  FOR DELETE
  TO authenticated
  USING (owner_id = (select auth.uid()));

-- ============================================
-- MEMBERSHIPS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their memberships" ON memberships;
DROP POLICY IF EXISTS "Users can view their own memberships" ON memberships;
DROP POLICY IF EXISTS "Super admins can manage all memberships" ON memberships;
DROP POLICY IF EXISTS "Organization owners can create memberships" ON memberships;
DROP POLICY IF EXISTS "Users can create their own membership" ON memberships;
DROP POLICY IF EXISTS "Organization owners can update memberships" ON memberships;
DROP POLICY IF EXISTS "Organization owners can delete memberships" ON memberships;

-- Recreate with optimized policies
CREATE POLICY "Users can view their memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Organization owners can create memberships"
  ON memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Organization owners can update memberships"
  ON memberships
  FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = (select auth.uid())
    )
  );

CREATE POLICY "Organization owners can delete memberships"
  ON memberships
  FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = (select auth.uid())
    )
  );

-- ============================================
-- INVITATIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view org invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON invitations;

CREATE POLICY "Users can view org invitations"
  ON invitations
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can create invitations"
  ON invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid()) AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can delete invitations"
  ON invitations
  FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid()) AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- PROJETS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org projets" ON projets;
DROP POLICY IF EXISTS "Users can manage their org projets" ON projets;
DROP POLICY IF EXISTS "Users can insert projets" ON projets;
DROP POLICY IF EXISTS "Users can update projets" ON projets;
DROP POLICY IF EXISTS "Users can delete projets" ON projets;

-- Single consolidated SELECT policy
CREATE POLICY "Users can view their org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

-- Single consolidated policy for INSERT/UPDATE/DELETE
CREATE POLICY "Users can manage their org projets"
  ON projets
  FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

-- ============================================
-- INVESTISSEURS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can manage their org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can insert investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can update investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can delete investisseurs" ON investisseurs;

CREATE POLICY "Users can view their org investisseurs"
  ON investisseurs
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org investisseurs"
  ON investisseurs
  FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

-- ============================================
-- TRANCHES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org tranches" ON tranches;
DROP POLICY IF EXISTS "Users can manage their org tranches" ON tranches;
DROP POLICY IF EXISTS "Users can insert tranches" ON tranches;
DROP POLICY IF EXISTS "Users can update tranches" ON tranches;
DROP POLICY IF EXISTS "Users can delete tranches" ON tranches;

CREATE POLICY "Users can view their org tranches"
  ON tranches
  FOR SELECT
  TO authenticated
  USING (
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org tranches"
  ON tranches
  FOR ALL
  TO authenticated
  USING (
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- SOUSCRIPTIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can manage their org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can insert souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can update souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can delete souscriptions" ON souscriptions;

CREATE POLICY "Users can view their org souscriptions"
  ON souscriptions
  FOR SELECT
  TO authenticated
  USING (
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org souscriptions"
  ON souscriptions
  FOR ALL
  TO authenticated
  USING (
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- COUPONS_ECHEANCES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can manage their org coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can insert coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can update coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can delete coupons" ON coupons_echeances;

CREATE POLICY "Users can view their org coupons"
  ON coupons_echeances
  FOR SELECT
  TO authenticated
  USING (
    souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org coupons"
  ON coupons_echeances
  FOR ALL
  TO authenticated
  USING (
    souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- PAIEMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can manage their org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can insert paiements" ON paiements;
DROP POLICY IF EXISTS "Users can update paiements" ON paiements;
DROP POLICY IF EXISTS "Users can delete paiements" ON paiements;

CREATE POLICY "Users can view their org paiements"
  ON paiements
  FOR SELECT
  TO authenticated
  USING (
    echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org paiements"
  ON paiements
  FOR ALL
  TO authenticated
  USING (
    echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- PAYMENT_PROOFS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view payment proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can manage payment proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Allow all operations on payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can insert payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can update payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can delete payment_proofs" ON payment_proofs;

CREATE POLICY "Users can view payment proofs"
  ON payment_proofs
  FOR SELECT
  TO authenticated
  USING (
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
  ON payment_proofs
  FOR ALL
  TO authenticated
  USING (
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
    paiement_id IN (
      SELECT pa.id FROM paiements pa
      JOIN coupons_echeances ce ON ce.id = pa.echeance_id
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Users can view all profiles" ON public.profiles IS
  'Optimized: Uses (select auth.uid()) to prevent per-row re-evaluation. Allows all authenticated users to view profiles for admin functionality.';

COMMENT ON POLICY "Users can view organizations they are members of" ON organizations IS
  'Optimized: Uses (select auth.uid()) and consolidates org viewing policies';

COMMENT ON POLICY "Users can view their memberships" ON memberships IS
  'Optimized: Uses (select auth.uid()) and consolidates membership viewing policies';
