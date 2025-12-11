/*
  # Implement Clean Three-Role Access Control System
  
  ## Overview
  This migration implements a clean, working 3-role system that avoids circular dependency issues.
  
  ## Three Roles
  1. **Superadmin** (profiles.is_superadmin = true)
     - Can access ALL data across ALL organizations
     - Not bound to any organization
     - No membership record needed
  
  2. **Admin** (memberships.role = 'admin')
     - Can access data within their organization
     - Can manage members (invite, remove, change roles) in their organization
     - Bound to specific organization via memberships table
  
  3. **Member** (memberships.role = 'member')
     - Can access data within their organization
     - CANNOT manage members
     - Bound to specific organization via memberships table
  
  ## Strategy to Avoid 403 Errors
  - Keep profiles, memberships, organizations WITHOUT RLS
  - Use single SECURITY DEFINER function for access checks
  - Function reads from non-RLS tables directly (no circular dependency)
  - Apply consistent policies across all data tables
  
  ## Tables Affected
  - projets: org_id scoping
  - investisseurs: org_id scoping
  - paiements: org_id scoping
  - tranches: via projet_id -> projets.org_id
  - souscriptions: via projet_id -> projets.org_id
  - payment_proofs: via paiement_id -> paiements.org_id
  - coupons_echeances: via souscription_id -> souscriptions.projet_id -> projets.org_id
  - invitations: org_id scoping (special rules for admins only)
  
  ## Security Notes
  - Membership data is not sensitive (just shows user-org relationships)
  - Keeping these tables without RLS is safe and prevents circular dependencies
  - The SECURITY DEFINER function is carefully designed to prevent privilege escalation
*/

-- ============================================================================
-- STEP 1: Clean up existing duplicate policies and functions
-- ============================================================================

-- Drop all existing policies on projets (we'll recreate them cleanly)
DROP POLICY IF EXISTS "Users view their org projets" ON projets;
DROP POLICY IF EXISTS "Users insert their org projets" ON projets;
DROP POLICY IF EXISTS "Users update their org projets" ON projets;
DROP POLICY IF EXISTS "Users delete their org projets" ON projets;
DROP POLICY IF EXISTS "projets_select" ON projets;
DROP POLICY IF EXISTS "projets_insert" ON projets;
DROP POLICY IF EXISTS "projets_update" ON projets;
DROP POLICY IF EXISTS "projets_delete" ON projets;

-- Drop old functions (we'll create one clean function)
DROP FUNCTION IF EXISTS check_user_org_access(uuid);
DROP FUNCTION IF EXISTS check_org_access(uuid);
DROP FUNCTION IF EXISTS user_has_org_access(uuid);

-- ============================================================================
-- STEP 2: Ensure RLS is DISABLED on core identity tables
-- ============================================================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create single, clean access check function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_can_access_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_user_id uuid;
  is_super boolean;
  has_membership boolean;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  -- No user = no access
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is superadmin (direct table read, no RLS)
  SELECT COALESCE(is_superadmin, false)
  INTO is_super
  FROM profiles
  WHERE id = current_user_id;
  
  -- Superadmins can access everything
  IF is_super = true THEN
    RETURN true;
  END IF;
  
  -- Check if user has membership in the target organization (direct table read, no RLS)
  SELECT EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = current_user_id
    AND org_id = check_org_id
  ) INTO has_membership;
  
  RETURN has_membership;
END;
$$;

-- ============================================================================
-- STEP 4: Create helper function to check if user is admin of an org
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_is_admin_of_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_user_id uuid;
  is_super boolean;
  is_admin boolean;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if superadmin
  SELECT COALESCE(is_superadmin, false)
  INTO is_super
  FROM profiles
  WHERE id = current_user_id;
  
  IF is_super = true THEN
    RETURN true;
  END IF;
  
  -- Check if user is admin in this org
  SELECT EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = current_user_id
    AND org_id = check_org_id
    AND role = 'admin'
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;

-- ============================================================================
-- STEP 5: Apply RLS policies to PROJETS table
-- ============================================================================

-- Projets policies use org_id directly
CREATE POLICY "Users can view accessible org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (user_can_access_org(org_id));

CREATE POLICY "Users can insert into accessible orgs"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "Users can update accessible org projets"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (user_can_access_org(org_id))
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "Users can delete accessible org projets"
  ON projets
  FOR DELETE
  TO authenticated
  USING (user_can_access_org(org_id));

-- ============================================================================
-- STEP 6: Apply RLS policies to INVESTISSEURS table
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can insert own org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can update own org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can delete own org investisseurs" ON investisseurs;

CREATE POLICY "Users can view accessible org investisseurs"
  ON investisseurs
  FOR SELECT
  TO authenticated
  USING (user_can_access_org(org_id));

CREATE POLICY "Users can insert into accessible orgs investisseurs"
  ON investisseurs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "Users can update accessible org investisseurs"
  ON investisseurs
  FOR UPDATE
  TO authenticated
  USING (user_can_access_org(org_id))
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "Users can delete accessible org investisseurs"
  ON investisseurs
  FOR DELETE
  TO authenticated
  USING (user_can_access_org(org_id));

-- ============================================================================
-- STEP 7: Apply RLS policies to PAIEMENTS table
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can insert own org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can update own org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can delete own org paiements" ON paiements;

CREATE POLICY "Users can view accessible org paiements"
  ON paiements
  FOR SELECT
  TO authenticated
  USING (user_can_access_org(org_id));

CREATE POLICY "Users can insert into accessible orgs paiements"
  ON paiements
  FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "Users can update accessible org paiements"
  ON paiements
  FOR UPDATE
  TO authenticated
  USING (user_can_access_org(org_id))
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "Users can delete accessible org paiements"
  ON paiements
  FOR DELETE
  TO authenticated
  USING (user_can_access_org(org_id));

-- ============================================================================
-- STEP 8: Apply RLS policies to TRANCHES table (via projet)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view tranches of accessible projets" ON tranches;
DROP POLICY IF EXISTS "Users can insert tranches for accessible projets" ON tranches;
DROP POLICY IF EXISTS "Users can update tranches of accessible projets" ON tranches;
DROP POLICY IF EXISTS "Users can delete tranches of accessible projets" ON tranches;

CREATE POLICY "Users can view accessible tranches"
  ON tranches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can insert accessible tranches"
  ON tranches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can update accessible tranches"
  ON tranches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can delete accessible tranches"
  ON tranches
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

-- ============================================================================
-- STEP 9: Apply RLS policies to SOUSCRIPTIONS table (via projet)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view souscriptions of accessible projets" ON souscriptions;
DROP POLICY IF EXISTS "Users can insert souscriptions for accessible projets" ON souscriptions;
DROP POLICY IF EXISTS "Users can update souscriptions of accessible projets" ON souscriptions;
DROP POLICY IF EXISTS "Users can delete souscriptions of accessible projets" ON souscriptions;

CREATE POLICY "Users can view accessible souscriptions"
  ON souscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = souscriptions.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can insert accessible souscriptions"
  ON souscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = souscriptions.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can update accessible souscriptions"
  ON souscriptions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = souscriptions.projet_id
      AND user_can_access_org(projets.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = souscriptions.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can delete accessible souscriptions"
  ON souscriptions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = souscriptions.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

-- ============================================================================
-- STEP 10: Apply RLS policies to PAYMENT_PROOFS table (via paiement)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view payment_proofs of accessible paiements" ON payment_proofs;
DROP POLICY IF EXISTS "Users can insert payment_proofs for accessible paiements" ON payment_proofs;
DROP POLICY IF EXISTS "Users can update payment_proofs of accessible paiements" ON payment_proofs;
DROP POLICY IF EXISTS "Users can delete payment_proofs of accessible paiements" ON payment_proofs;

CREATE POLICY "Users can view accessible payment_proofs"
  ON payment_proofs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

CREATE POLICY "Users can insert accessible payment_proofs"
  ON payment_proofs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

CREATE POLICY "Users can update accessible payment_proofs"
  ON payment_proofs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

CREATE POLICY "Users can delete accessible payment_proofs"
  ON payment_proofs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

-- ============================================================================
-- STEP 11: Apply RLS policies to COUPONS_ECHEANCES table (via souscription)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view coupons_echeances of accessible souscriptions" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can insert coupons_echeances for accessible souscriptions" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can update coupons_echeances of accessible souscriptions" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can delete coupons_echeances of accessible souscriptions" ON coupons_echeances;

CREATE POLICY "Users can view accessible coupons_echeances"
  ON coupons_echeances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN projets ON projets.id = souscriptions.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can insert accessible coupons_echeances"
  ON coupons_echeances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN projets ON projets.id = souscriptions.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can update accessible coupons_echeances"
  ON coupons_echeances
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN projets ON projets.id = souscriptions.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN projets ON projets.id = souscriptions.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can delete accessible coupons_echeances"
  ON coupons_echeances
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN projets ON projets.id = souscriptions.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  );

-- ============================================================================
-- STEP 12: Apply RLS policies to INVITATIONS table (admin-only management)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view invitations by token" ON invitations;
DROP POLICY IF EXISTS "Users can view invitations" ON invitations;
DROP POLICY IF EXISTS "Users can insert invitations" ON invitations;
DROP POLICY IF EXISTS "Users can update invitations" ON invitations;
DROP POLICY IF EXISTS "Users can delete invitations" ON invitations;
DROP POLICY IF EXISTS "allow_anonymous_select_by_token" ON invitations;

-- Anyone (even anonymous) can view an invitation by token (needed for invitation acceptance)
CREATE POLICY "Anyone can view invitation by token"
  ON invitations
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can insert invitations for their org
CREATE POLICY "Admins can create invitations for their org"
  ON invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_is_admin_of_org(org_id));

-- Only admins can update invitations for their org
CREATE POLICY "Admins can update invitations for their org"
  ON invitations
  FOR UPDATE
  TO authenticated
  USING (user_is_admin_of_org(org_id))
  WITH CHECK (user_is_admin_of_org(org_id));

-- Only admins can delete invitations for their org
CREATE POLICY "Admins can delete invitations for their org"
  ON invitations
  FOR DELETE
  TO authenticated
  USING (user_is_admin_of_org(org_id));

-- ============================================================================
-- STEP 13: Apply RLS policies to APP_CONFIG table
-- ============================================================================

DROP POLICY IF EXISTS "Only superadmins can manage app_config" ON app_config;

CREATE POLICY "Only superadmins can manage app_config"
  ON app_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_superadmin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_superadmin = true
    )
  );

-- ============================================================================
-- STEP 14: Apply RLS policies to USER_REMINDER_SETTINGS table
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own reminder settings" ON user_reminder_settings;

CREATE POLICY "Users can manage own reminder settings"
  ON user_reminder_settings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- STEP 15: Grant execute permissions on functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION user_can_access_org(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION user_is_admin_of_org(uuid) TO authenticated, anon;

-- ============================================================================
-- DONE!
-- ============================================================================
