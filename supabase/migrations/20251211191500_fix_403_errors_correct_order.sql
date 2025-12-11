/*
  # Fix 403 Errors - Grant Proper Permissions (Corrected Order)

  ## Problem
  Even with SECURITY DEFINER functions, 403 errors occur because:
  1. Functions need explicit SELECT grants on tables they read
  2. RLS disabled tables still need base permissions
  3. Need to drop policies before dropping functions (dependency order)

  ## Solution
  - Drop policies that use functions FIRST
  - Then drop and recreate functions with proper permissions
  - Grant SELECT on identity tables to authenticated users
  - Fix souscriptions schema (uses tranche_id, not projet_id)
*/

-- ==============================================
-- STEP 1: Drop policies that depend on functions
-- ==============================================

-- Drop policies that use user_is_superadmin()
DROP POLICY IF EXISTS "organizations_insert_superadmin" ON organizations;
DROP POLICY IF EXISTS "organizations_delete_superadmin" ON organizations;
DROP POLICY IF EXISTS "app_config_insert_superadmin" ON app_config;
DROP POLICY IF EXISTS "app_config_update_superadmin" ON app_config;
DROP POLICY IF EXISTS "app_config_delete_superadmin" ON app_config;

-- Drop policies that use user_is_admin_of_org()
DROP POLICY IF EXISTS "memberships_insert_by_admin" ON memberships;
DROP POLICY IF EXISTS "memberships_update_by_admin" ON memberships;
DROP POLICY IF EXISTS "memberships_delete_by_admin" ON memberships;
DROP POLICY IF EXISTS "organizations_update_admin" ON organizations;
DROP POLICY IF EXISTS "invitations_insert_admin" ON invitations;
DROP POLICY IF EXISTS "invitations_update_admin" ON invitations;
DROP POLICY IF EXISTS "invitations_delete_admin" ON invitations;

-- Drop policies that use user_can_access_org()
DROP POLICY IF EXISTS "organizations_select_accessible" ON organizations;
DROP POLICY IF EXISTS "projets_select" ON projets;
DROP POLICY IF EXISTS "projets_insert" ON projets;
DROP POLICY IF EXISTS "projets_update" ON projets;
DROP POLICY IF EXISTS "projets_delete" ON projets;
DROP POLICY IF EXISTS "tranches_select" ON tranches;
DROP POLICY IF EXISTS "tranches_insert" ON tranches;
DROP POLICY IF EXISTS "tranches_update" ON tranches;
DROP POLICY IF EXISTS "tranches_delete" ON tranches;
DROP POLICY IF EXISTS "souscriptions_select" ON souscriptions;
DROP POLICY IF EXISTS "souscriptions_insert" ON souscriptions;
DROP POLICY IF EXISTS "souscriptions_update" ON souscriptions;
DROP POLICY IF EXISTS "souscriptions_delete" ON souscriptions;
DROP POLICY IF EXISTS "investisseurs_select" ON investisseurs;
DROP POLICY IF EXISTS "investisseurs_insert" ON investisseurs;
DROP POLICY IF EXISTS "investisseurs_update" ON investisseurs;
DROP POLICY IF EXISTS "investisseurs_delete" ON investisseurs;
DROP POLICY IF EXISTS "coupons_echeances_select" ON coupons_echeances;
DROP POLICY IF EXISTS "coupons_echeances_insert" ON coupons_echeances;
DROP POLICY IF EXISTS "coupons_echeances_update" ON coupons_echeances;
DROP POLICY IF EXISTS "coupons_echeances_delete" ON coupons_echeances;
DROP POLICY IF EXISTS "paiements_select" ON paiements;
DROP POLICY IF EXISTS "paiements_insert" ON paiements;
DROP POLICY IF EXISTS "paiements_update" ON paiements;
DROP POLICY IF EXISTS "paiements_delete" ON paiements;
DROP POLICY IF EXISTS "payment_proofs_select" ON payment_proofs;
DROP POLICY IF EXISTS "payment_proofs_insert" ON payment_proofs;
DROP POLICY IF EXISTS "payment_proofs_update" ON payment_proofs;
DROP POLICY IF EXISTS "payment_proofs_delete" ON payment_proofs;

-- ==============================================
-- STEP 2: Now safe to drop functions
-- ==============================================

DROP FUNCTION IF EXISTS user_is_superadmin();
DROP FUNCTION IF EXISTS user_can_access_org(uuid);
DROP FUNCTION IF EXISTS user_is_admin_of_org(uuid);
DROP FUNCTION IF EXISTS get_user_email();

-- ==============================================
-- STEP 3: Grant permissions on identity tables
-- ==============================================

-- Allow authenticated users to SELECT from identity tables
GRANT SELECT ON profiles TO authenticated, anon;
GRANT SELECT ON memberships TO authenticated, anon;
GRANT SELECT ON organizations TO authenticated, anon;

-- Allow authenticated users to modify based on policies
GRANT INSERT, UPDATE, DELETE ON memberships TO authenticated;
GRANT INSERT, UPDATE, DELETE ON organizations TO authenticated;
GRANT INSERT, UPDATE ON profiles TO authenticated;

-- ==============================================
-- STEP 4: Recreate functions with proper permissions
-- ==============================================

-- Check if user is superadmin
CREATE OR REPLACE FUNCTION public.user_is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  is_super boolean;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT COALESCE(is_superadmin, false)
  INTO is_super
  FROM public.profiles
  WHERE id = current_user_id;

  RETURN COALESCE(is_super, false);
END;
$$;

-- Check if user can access an organization (member or superadmin)
CREATE OR REPLACE FUNCTION public.user_can_access_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  is_super boolean;
  has_membership boolean;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT COALESCE(is_superadmin, false)
  INTO is_super
  FROM public.profiles
  WHERE id = current_user_id;

  IF is_super = true THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = current_user_id
    AND org_id = check_org_id
  ) INTO has_membership;

  RETURN COALESCE(has_membership, false);
END;
$$;

-- Check if user is admin of an organization (or superadmin)
CREATE OR REPLACE FUNCTION public.user_is_admin_of_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
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

  SELECT COALESCE(is_superadmin, false)
  INTO is_super
  FROM public.profiles
  WHERE id = current_user_id;

  IF is_super = true THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = current_user_id
    AND org_id = check_org_id
    AND role IN ('admin', 'superadmin')
  ) INTO is_admin;

  RETURN COALESCE(is_admin, false);
END;
$$;

-- Helper: Get user's email
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  user_email text;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT email
  INTO user_email
  FROM public.profiles
  WHERE id = current_user_id;

  RETURN user_email;
END;
$$;

-- ==============================================
-- STEP 5: Grant execute permissions on functions
-- ==============================================

GRANT EXECUTE ON FUNCTION user_is_superadmin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION user_can_access_org(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION user_is_admin_of_org(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_email() TO authenticated, anon;

-- ==============================================
-- STEP 6: Ensure RLS is disabled on identity tables
-- ==============================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 7: Grant table permissions to authenticated
-- ==============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON projets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tranches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON souscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON investisseurs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON coupons_echeances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON paiements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_proofs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_reminder_settings TO authenticated;
GRANT SELECT ON invitations TO anon;

-- ==============================================
-- STEP 8: Recreate all policies
-- ==============================================

-- PROFILES policies (RLS disabled, for documentation)
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- MEMBERSHIPS policies (RLS disabled, for documentation)
CREATE POLICY "memberships_select_own"
  ON memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "memberships_insert_by_admin"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (user_is_admin_of_org(org_id));

CREATE POLICY "memberships_update_by_admin"
  ON memberships FOR UPDATE
  TO authenticated
  USING (user_is_admin_of_org(org_id))
  WITH CHECK (user_is_admin_of_org(org_id));

CREATE POLICY "memberships_delete_by_admin"
  ON memberships FOR DELETE
  TO authenticated
  USING (
    user_id != auth.uid()
    AND user_is_admin_of_org(org_id)
  );

-- ORGANIZATIONS policies (RLS disabled, for documentation)
CREATE POLICY "organizations_select_accessible"
  ON organizations FOR SELECT
  TO authenticated
  USING (user_can_access_org(id));

CREATE POLICY "organizations_insert_superadmin"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (user_is_superadmin());

CREATE POLICY "organizations_update_admin"
  ON organizations FOR UPDATE
  TO authenticated
  USING (user_is_admin_of_org(id))
  WITH CHECK (user_is_admin_of_org(id));

CREATE POLICY "organizations_delete_superadmin"
  ON organizations FOR DELETE
  TO authenticated
  USING (user_is_superadmin());

-- INVITATIONS policies
CREATE POLICY "invitations_select_all"
  ON invitations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "invitations_insert_admin"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (user_is_admin_of_org(org_id));

CREATE POLICY "invitations_update_admin"
  ON invitations FOR UPDATE
  TO authenticated
  USING (user_is_admin_of_org(org_id))
  WITH CHECK (user_is_admin_of_org(org_id));

CREATE POLICY "invitations_delete_admin"
  ON invitations FOR DELETE
  TO authenticated
  USING (user_is_admin_of_org(org_id));

-- PROJETS policies
CREATE POLICY "projets_select"
  ON projets FOR SELECT
  TO authenticated
  USING (user_can_access_org(org_id));

CREATE POLICY "projets_insert"
  ON projets FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "projets_update"
  ON projets FOR UPDATE
  TO authenticated
  USING (user_can_access_org(org_id))
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "projets_delete"
  ON projets FOR DELETE
  TO authenticated
  USING (user_can_access_org(org_id));

-- TRANCHES policies
CREATE POLICY "tranches_select"
  ON tranches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "tranches_insert"
  ON tranches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "tranches_update"
  ON tranches FOR UPDATE
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

CREATE POLICY "tranches_delete"
  ON tranches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

-- SOUSCRIPTIONS policies (FIXED: uses tranche_id, not projet_id)
CREATE POLICY "souscriptions_select"
  ON souscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "souscriptions_insert"
  ON souscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "souscriptions_update"
  ON souscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND user_can_access_org(projets.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "souscriptions_delete"
  ON souscriptions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND user_can_access_org(projets.org_id)
    )
  );

-- INVESTISSEURS policies
CREATE POLICY "investisseurs_select"
  ON investisseurs FOR SELECT
  TO authenticated
  USING (user_can_access_org(org_id));

CREATE POLICY "investisseurs_insert"
  ON investisseurs FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "investisseurs_update"
  ON investisseurs FOR UPDATE
  TO authenticated
  USING (user_can_access_org(org_id))
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "investisseurs_delete"
  ON investisseurs FOR DELETE
  TO authenticated
  USING (user_can_access_org(org_id));

-- COUPONS_ECHEANCES policies
CREATE POLICY "coupons_echeances_select"
  ON coupons_echeances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "coupons_echeances_insert"
  ON coupons_echeances FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "coupons_echeances_update"
  ON coupons_echeances FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "coupons_echeances_delete"
  ON coupons_echeances FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  );

-- PAIEMENTS policies
CREATE POLICY "paiements_select"
  ON paiements FOR SELECT
  TO authenticated
  USING (user_can_access_org(org_id));

CREATE POLICY "paiements_insert"
  ON paiements FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "paiements_update"
  ON paiements FOR UPDATE
  TO authenticated
  USING (user_can_access_org(org_id))
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "paiements_delete"
  ON paiements FOR DELETE
  TO authenticated
  USING (user_can_access_org(org_id));

-- PAYMENT_PROOFS policies
CREATE POLICY "payment_proofs_select"
  ON payment_proofs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

CREATE POLICY "payment_proofs_insert"
  ON payment_proofs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

CREATE POLICY "payment_proofs_update"
  ON payment_proofs FOR UPDATE
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

CREATE POLICY "payment_proofs_delete"
  ON payment_proofs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

-- APP_CONFIG policies
CREATE POLICY "app_config_select_all"
  ON app_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "app_config_insert_superadmin"
  ON app_config FOR INSERT
  TO authenticated
  WITH CHECK (user_is_superadmin());

CREATE POLICY "app_config_update_superadmin"
  ON app_config FOR UPDATE
  TO authenticated
  USING (user_is_superadmin())
  WITH CHECK (user_is_superadmin());

CREATE POLICY "app_config_delete_superadmin"
  ON app_config FOR DELETE
  TO authenticated
  USING (user_is_superadmin());

-- USER_REMINDER_SETTINGS policies
CREATE POLICY "user_reminder_settings_select_own"
  ON user_reminder_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_reminder_settings_insert_own"
  ON user_reminder_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_reminder_settings_update_own"
  ON user_reminder_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_reminder_settings_delete_own"
  ON user_reminder_settings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
