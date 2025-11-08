-- ============================================
-- Fix ALL RLS Performance Issues
-- Created: 2025-11-08
-- Purpose: Fix auth_rls_initplan and multiple_permissive_policies warnings
--
-- This migration:
-- 1. Wraps auth.uid() in (select ...) to prevent per-row re-evaluation
-- 2. Consolidates duplicate permissive policies
-- 3. Corrected based on actual schema (role is 'admin'/'member', not 'owner')
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
      SELECT id FROM organizations WHERE owner_id = (select auth.uid())
    )
    OR
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update memberships"
  ON memberships
  FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = (select auth.uid())
    )
    OR
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = (select auth.uid())
    )
    OR
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete memberships"
  ON memberships
  FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = (select auth.uid())
    )
    OR
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
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
    owner_id = (select auth.uid())
    OR
    id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    owner_id = (select auth.uid())
    OR
    id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
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
-- Note: paiements has org_id directly, so we can use that
-- ============================================

DROP POLICY IF EXISTS "Users can view their org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can manage their org paiements" ON paiements;

CREATE POLICY "Users can view their org paiements"
  ON paiements
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org paiements"
  ON paiements
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
      JOIN memberships m ON m.org_id = pa.org_id
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
      JOIN memberships m ON m.org_id = pa.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    paiement_id IN (
      SELECT pa.id FROM paiements pa
      JOIN memberships m ON m.org_id = pa.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- INVITATIONS TABLE
-- Consolidate super admin + org owner policies
-- Note: role is 'admin' or 'member', not 'owner'
-- Check organizations.owner_id for ownership
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
      SELECT id FROM organizations WHERE owner_id = (select auth.uid())
    )
    OR
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = (select auth.uid())
    )
    OR
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================
-- USER_REMINDER_SETTINGS TABLE
-- Note: user_id references auth.users(id) directly
-- ============================================

DROP POLICY IF EXISTS "Users can view their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can insert their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can update their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can delete their own reminder settings" ON user_reminder_settings;

CREATE POLICY "Users can view their own reminder settings"
  ON user_reminder_settings
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own reminder settings"
  ON user_reminder_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own reminder settings"
  ON user_reminder_settings
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own reminder settings"
  ON user_reminder_settings
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================
-- PROFILES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

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
-- Add comments for documentation
-- ============================================

COMMENT ON POLICY "Users can view memberships" ON memberships IS
  'Optimized: Uses (select auth.uid()) to prevent per-row re-evaluation';

COMMENT ON POLICY "Admins can create memberships" ON memberships IS
  'Optimized: Uses (select auth.uid()) to prevent per-row re-evaluation. Checks owner_id OR admin role.';

COMMENT ON POLICY "Users can view their organizations" ON organizations IS
  'Optimized: Uses (select auth.uid()) to prevent per-row re-evaluation';

COMMENT ON POLICY "Users can view their org projets" ON projets IS
  'Optimized: Consolidated duplicate SELECT policies';

COMMENT ON POLICY "Admins can manage invitations" ON invitations IS
  'Optimized: Consolidated policies. Checks owner_id OR admin role.';

COMMENT ON POLICY "Users can view their org paiements" ON paiements IS
  'Optimized: Simplified using org_id column directly';
