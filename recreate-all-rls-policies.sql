-- Recreate ALL RLS Policies for Paris Database
-- This adds the missing policies that allow users to access data

-- ==============================================
-- PROJETS POLICIES
-- ==============================================
CREATE POLICY "projets_select" ON projets FOR SELECT
  TO authenticated
  USING (user_can_access_org(org_id));

CREATE POLICY "projets_insert" ON projets FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "projets_update" ON projets FOR UPDATE
  TO authenticated
  USING (user_can_access_org(org_id))
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "projets_delete" ON projets FOR DELETE
  TO authenticated
  USING (user_can_access_org(org_id));

-- ==============================================
-- TRANCHES POLICIES
-- ==============================================
CREATE POLICY "tranches_select" ON tranches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "tranches_insert" ON tranches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "tranches_update" ON tranches FOR UPDATE
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

CREATE POLICY "tranches_delete" ON tranches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

-- ==============================================
-- SOUSCRIPTIONS POLICIES
-- ==============================================
CREATE POLICY "souscriptions_select" ON souscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM tranches t
      JOIN projets p ON p.id = t.projet_id
      WHERE t.id = souscriptions.tranche_id
      AND user_can_access_org(p.org_id)
    )
  );

CREATE POLICY "souscriptions_insert" ON souscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tranches t
      JOIN projets p ON p.id = t.projet_id
      WHERE t.id = souscriptions.tranche_id
      AND user_can_access_org(p.org_id)
    )
  );

CREATE POLICY "souscriptions_update" ON souscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM tranches t
      JOIN projets p ON p.id = t.projet_id
      WHERE t.id = souscriptions.tranche_id
      AND user_can_access_org(p.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tranches t
      JOIN projets p ON p.id = t.projet_id
      WHERE t.id = souscriptions.tranche_id
      AND user_can_access_org(p.org_id)
    )
  );

CREATE POLICY "souscriptions_delete" ON souscriptions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM tranches t
      JOIN projets p ON p.id = t.projet_id
      WHERE t.id = souscriptions.tranche_id
      AND user_can_access_org(p.org_id)
    )
  );

-- ==============================================
-- INVESTISSEURS POLICIES
-- ==============================================
CREATE POLICY "investisseurs_select" ON investisseurs FOR SELECT
  TO authenticated
  USING (user_can_access_org(org_id));

CREATE POLICY "investisseurs_insert" ON investisseurs FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "investisseurs_update" ON investisseurs FOR UPDATE
  TO authenticated
  USING (user_can_access_org(org_id))
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "investisseurs_delete" ON investisseurs FOR DELETE
  TO authenticated
  USING (user_can_access_org(org_id));

-- ==============================================
-- PAIEMENTS POLICIES
-- ==============================================
CREATE POLICY "paiements_select" ON paiements FOR SELECT
  TO authenticated
  USING (user_can_access_org(org_id));

CREATE POLICY "paiements_insert" ON paiements FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "paiements_update" ON paiements FOR UPDATE
  TO authenticated
  USING (user_can_access_org(org_id))
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "paiements_delete" ON paiements FOR DELETE
  TO authenticated
  USING (user_can_access_org(org_id));

-- ==============================================
-- PAYMENT_PROOFS POLICIES
-- ==============================================
CREATE POLICY "payment_proofs_select" ON payment_proofs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

CREATE POLICY "payment_proofs_insert" ON payment_proofs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

CREATE POLICY "payment_proofs_update" ON payment_proofs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

CREATE POLICY "payment_proofs_delete" ON payment_proofs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

-- ==============================================
-- COUPONS_ECHEANCES POLICIES
-- ==============================================
CREATE POLICY "coupons_select" ON coupons_echeances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM souscriptions s
      JOIN tranches t ON t.id = s.tranche_id
      JOIN projets p ON p.id = t.projet_id
      WHERE s.id = coupons_echeances.souscription_id
      AND user_can_access_org(p.org_id)
    )
  );

CREATE POLICY "coupons_insert" ON coupons_echeances FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM souscriptions s
      JOIN tranches t ON t.id = s.tranche_id
      JOIN projets p ON p.id = t.projet_id
      WHERE s.id = coupons_echeances.souscription_id
      AND user_can_access_org(p.org_id)
    )
  );

CREATE POLICY "coupons_update" ON coupons_echeances FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM souscriptions s
      JOIN tranches t ON t.id = s.tranche_id
      JOIN projets p ON p.id = t.projet_id
      WHERE s.id = coupons_echeances.souscription_id
      AND user_can_access_org(p.org_id)
    )
  );

CREATE POLICY "coupons_delete" ON coupons_echeances FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM souscriptions s
      JOIN tranches t ON t.id = s.tranche_id
      JOIN projets p ON p.id = t.projet_id
      WHERE s.id = coupons_echeances.souscription_id
      AND user_can_access_org(p.org_id)
    )
  );

-- ==============================================
-- USER_REMINDER_SETTINGS POLICIES
-- ==============================================
CREATE POLICY "reminder_settings_select" ON user_reminder_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "reminder_settings_insert" ON user_reminder_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reminder_settings_update" ON user_reminder_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reminder_settings_delete" ON user_reminder_settings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ==============================================
-- VERIFICATION
-- ==============================================
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('projets', 'tranches', 'souscriptions', 'investisseurs', 'paiements', 'payment_proofs', 'coupons_echeances')
GROUP BY tablename
ORDER BY tablename;
