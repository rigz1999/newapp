/*
  # Fix 403 Errors - Complete Clean Solution

  ## Strategy
  1. Drop ALL policies from ALL tables (complete clean slate)
  2. Drop all functions
  3. Grant table permissions
  4. Recreate functions with proper permissions
  5. Recreate policies
*/

-- ==============================================
-- STEP 1: Drop ALL policies from ALL tables
-- ==============================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ==============================================
-- STEP 2: Drop all functions
-- ==============================================

DROP FUNCTION IF EXISTS user_is_superadmin();
DROP FUNCTION IF EXISTS user_can_access_org(uuid);
DROP FUNCTION IF EXISTS user_is_admin_of_org(uuid);
DROP FUNCTION IF EXISTS get_user_email();

-- ==============================================
-- STEP 3: Ensure RLS state is set correctly
-- ==============================================

-- Identity tables: RLS OFF
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Business tables: RLS ON
ALTER TABLE projets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tranches ENABLE ROW LEVEL SECURITY;
ALTER TABLE souscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons_echeances ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;

-- Global tables: RLS ON
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reminder_settings ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 4: Grant permissions on ALL tables
-- ==============================================

-- Identity tables (RLS disabled but still need grants)
GRANT SELECT ON profiles TO authenticated, anon;
GRANT SELECT ON memberships TO authenticated, anon;
GRANT SELECT ON organizations TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON memberships TO authenticated;
GRANT INSERT, UPDATE, DELETE ON organizations TO authenticated;
GRANT INSERT, UPDATE ON profiles TO authenticated;

-- Business tables
GRANT SELECT, INSERT, UPDATE, DELETE ON projets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tranches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON souscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON investisseurs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON coupons_echeances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON paiements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_proofs TO authenticated;

-- Global tables
GRANT SELECT, INSERT, UPDATE, DELETE ON invitations TO authenticated;
GRANT SELECT ON invitations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_reminder_settings TO authenticated;

-- ==============================================
-- STEP 5: Create SECURITY DEFINER functions
-- ==============================================

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

-- ==============================================
-- STEP 6: Grant execute permissions
-- ==============================================

GRANT EXECUTE ON FUNCTION user_is_superadmin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION user_can_access_org(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION user_is_admin_of_org(uuid) TO authenticated, anon;

-- ==============================================
-- STEP 7: Create policies for business tables
-- ==============================================

-- PROJETS
CREATE POLICY "projets_select" ON projets FOR SELECT TO authenticated
  USING (user_can_access_org(org_id));

CREATE POLICY "projets_insert" ON projets FOR INSERT TO authenticated
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "projets_update" ON projets FOR UPDATE TO authenticated
  USING (user_can_access_org(org_id))
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "projets_delete" ON projets FOR DELETE TO authenticated
  USING (user_can_access_org(org_id));

-- TRANCHES
CREATE POLICY "tranches_select" ON tranches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "tranches_insert" ON tranches FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "tranches_update" ON tranches FOR UPDATE TO authenticated
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

CREATE POLICY "tranches_delete" ON tranches FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

-- SOUSCRIPTIONS (uses tranche_id, not projet_id)
CREATE POLICY "souscriptions_select" ON souscriptions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "souscriptions_insert" ON souscriptions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "souscriptions_update" ON souscriptions FOR UPDATE TO authenticated
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

CREATE POLICY "souscriptions_delete" ON souscriptions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND user_can_access_org(projets.org_id)
    )
  );

-- INVESTISSEURS
CREATE POLICY "investisseurs_select" ON investisseurs FOR SELECT TO authenticated
  USING (user_can_access_org(org_id));

CREATE POLICY "investisseurs_insert" ON investisseurs FOR INSERT TO authenticated
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "investisseurs_update" ON investisseurs FOR UPDATE TO authenticated
  USING (user_can_access_org(org_id))
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "investisseurs_delete" ON investisseurs FOR DELETE TO authenticated
  USING (user_can_access_org(org_id));

-- COUPONS_ECHEANCES
CREATE POLICY "coupons_echeances_select" ON coupons_echeances FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "coupons_echeances_insert" ON coupons_echeances FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "coupons_echeances_update" ON coupons_echeances FOR UPDATE TO authenticated
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

CREATE POLICY "coupons_echeances_delete" ON coupons_echeances FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  );

-- PAIEMENTS
CREATE POLICY "paiements_select" ON paiements FOR SELECT TO authenticated
  USING (user_can_access_org(org_id));

CREATE POLICY "paiements_insert" ON paiements FOR INSERT TO authenticated
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "paiements_update" ON paiements FOR UPDATE TO authenticated
  USING (user_can_access_org(org_id))
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "paiements_delete" ON paiements FOR DELETE TO authenticated
  USING (user_can_access_org(org_id));

-- PAYMENT_PROOFS
CREATE POLICY "payment_proofs_select" ON payment_proofs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

CREATE POLICY "payment_proofs_insert" ON payment_proofs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

CREATE POLICY "payment_proofs_update" ON payment_proofs FOR UPDATE TO authenticated
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

CREATE POLICY "payment_proofs_delete" ON payment_proofs FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

-- INVITATIONS
CREATE POLICY "invitations_select_all" ON invitations FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "invitations_insert_admin" ON invitations FOR INSERT TO authenticated
  WITH CHECK (user_is_admin_of_org(org_id));

CREATE POLICY "invitations_update_admin" ON invitations FOR UPDATE TO authenticated
  USING (user_is_admin_of_org(org_id))
  WITH CHECK (user_is_admin_of_org(org_id));

CREATE POLICY "invitations_delete_admin" ON invitations FOR DELETE TO authenticated
  USING (user_is_admin_of_org(org_id));

-- APP_CONFIG
CREATE POLICY "app_config_select_all" ON app_config FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "app_config_insert_superadmin" ON app_config FOR INSERT TO authenticated
  WITH CHECK (user_is_superadmin());

CREATE POLICY "app_config_update_superadmin" ON app_config FOR UPDATE TO authenticated
  USING (user_is_superadmin())
  WITH CHECK (user_is_superadmin());

CREATE POLICY "app_config_delete_superadmin" ON app_config FOR DELETE TO authenticated
  USING (user_is_superadmin());

-- USER_REMINDER_SETTINGS
CREATE POLICY "user_reminder_settings_select_own" ON user_reminder_settings FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_reminder_settings_insert_own" ON user_reminder_settings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_reminder_settings_update_own" ON user_reminder_settings FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_reminder_settings_delete_own" ON user_reminder_settings FOR DELETE TO authenticated
  USING (user_id = auth.uid());
