-- ============================================
-- Fix ALL RLS Performance Issues
-- Created: 2025-11-08
-- Purpose: Fix auth_rls_initplan and multiple_permissive_policies warnings
--
-- This migration:
-- 1. Wraps auth.uid() in (select ...) to prevent per-row re-evaluation
-- 2. Consolidates duplicate permissive policies
-- ============================================

-- ============================================
-- MEMBERSHIPS TABLE
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Admins can create memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON memberships;
DROP POLICY IF EXISTS "Users can view memberships" ON memberships;
DROP POLICY IF EXISTS "Users can view their memberships" ON memberships;
DROP POLICY IF EXISTS "Organization owners can create memberships" ON memberships;
DROP POLICY IF EXISTS "Organization owners can update memberships" ON memberships;
DROP POLICY IF EXISTS "Organization owners can delete memberships" ON memberships;

-- Recreate with optimized policies
CREATE POLICY "Users can view memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can create memberships"
  ON memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can update memberships"
  ON memberships
  FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can delete memberships"
  ON memberships
  FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they are members of" ON organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can delete their organizations" ON organizations;

CREATE POLICY "Users can view their organizations"
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

CREATE POLICY "Admins can update organizations"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Organization owners can delete their organizations"
  ON organizations
  FOR DELETE
  TO authenticated
  USING (owner_id = (select auth.uid()));

-- ============================================
-- PROJETS TABLE
-- Consolidate view + manage into single SELECT policy
-- ============================================

DROP POLICY IF EXISTS "Users can view their org projets" ON projets;
DROP POLICY IF EXISTS "Users can manage their org projets" ON projets;

-- Single SELECT policy (consolidates duplicate permissive policies)
CREATE POLICY "Users can view their org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

-- Separate policy for modifications
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

-- ============================================
-- INVITATIONS TABLE
-- Consolidate super admin + org owner policies
-- ============================================

DROP POLICY IF EXISTS "Org owners can manage their invitations" ON invitations;
DROP POLICY IF EXISTS "Super admin can manage all invitations" ON invitations;

-- Single consolidated policy for all operations
CREATE POLICY "Admins can manage invitations"
  ON invitations
  FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- Add comments for documentation
-- ============================================

COMMENT ON POLICY "Users can view memberships" ON memberships IS
  'Optimized: Uses (select auth.uid()) to prevent per-row re-evaluation';

COMMENT ON POLICY "Admins can create memberships" ON memberships IS
  'Optimized: Uses (select auth.uid()) to prevent per-row re-evaluation';

COMMENT ON POLICY "Users can view their organizations" ON organizations IS
  'Optimized: Uses (select auth.uid()) to prevent per-row re-evaluation';

COMMENT ON POLICY "Users can view their org projets" ON projets IS
  'Optimized: Consolidated duplicate SELECT policies';

COMMENT ON POLICY "Admins can manage invitations" ON invitations IS
  'Optimized: Consolidated super admin + org owner policies into single policy';
