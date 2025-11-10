-- ============================================
-- Phase 2: Enable RLS Policies (RUN AFTER PHASE 1)
-- ============================================
-- This script enables Row Level Security on all tables
-- and creates comprehensive policies.
--
-- PREREQUISITES:
-- - Phase 1 must be completed successfully
-- - Superadmin must be set (zrig.ayman@gmail.com)
-- - Helper functions must exist
--
-- WARNING: Only run this after confirming Phase 1 success!
-- ============================================

-- Verify prerequisites before proceeding
DO $$
DECLARE
  superadmin_exists BOOLEAN;
  function_exists BOOLEAN;
BEGIN
  -- Check if superadmin is set
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE is_superadmin = true
  ) INTO superadmin_exists;

  -- Check if helper functions exist
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_superadmin'
  ) INTO function_exists;

  IF NOT superadmin_exists THEN
    RAISE EXCEPTION 'ABORT: No superadmin found! Run Phase 1 first.';
  END IF;

  IF NOT function_exists THEN
    RAISE EXCEPTION 'ABORT: Helper functions not found! Run Phase 1 first.';
  END IF;

  RAISE NOTICE 'Prerequisites verified. Proceeding with RLS enablement...';
END $$;

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

CREATE POLICY "organizations_select_policy"
  ON organizations FOR SELECT
  USING (
    is_superadmin() OR
    id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "organizations_insert_policy"
  ON organizations FOR INSERT
  WITH CHECK (is_superadmin());

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

CREATE POLICY "memberships_select_policy"
  ON memberships FOR SELECT
  USING (
    is_superadmin() OR
    user_id = auth.uid() OR
    org_id IN (SELECT get_user_org_ids())
  );

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

CREATE POLICY "invitations_select_policy"
  ON invitations FOR SELECT
  USING (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids()) OR
    email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

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

CREATE POLICY "invitations_update_policy"
  ON invitations FOR UPDATE
  USING (
    is_superadmin() OR
    org_id IN (SELECT get_user_org_ids())
  );

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

CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  USING (
    is_superadmin() OR
    id = auth.uid()
  );

CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  USING (
    is_superadmin() OR
    id = auth.uid()
  );

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

CREATE POLICY "user_reminder_settings_select_policy"
  ON user_reminder_settings FOR SELECT
  USING (
    is_superadmin() OR
    user_id = auth.uid()
  );

CREATE POLICY "user_reminder_settings_insert_policy"
  ON user_reminder_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_reminder_settings_update_policy"
  ON user_reminder_settings FOR UPDATE
  USING (
    is_superadmin() OR
    user_id = auth.uid()
  );

CREATE POLICY "user_reminder_settings_delete_policy"
  ON user_reminder_settings FOR DELETE
  USING (
    is_superadmin() OR
    user_id = auth.uid()
  );

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS POLICIES ENABLED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All tables now have Row Level Security enabled.';
  RAISE NOTICE 'Superadmin has full access to all data.';
  RAISE NOTICE 'Regular users can only access their organization''s data.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test your application to ensure access works correctly';
  RAISE NOTICE '2. Verify that superadmin can see all data';
  RAISE NOTICE '3. Verify that regular users only see their org data';
END $$;
