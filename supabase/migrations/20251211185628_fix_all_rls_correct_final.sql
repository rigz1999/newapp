/*
  # Fix ALL RLS Policies - Correct Final Version
  
  Tables with org_id: projets, investisseurs, paiements
  Tables without org_id: tranches, souscriptions, coupons_echeances, payment_proofs
  Global tables: app_config, user_reminder_settings
*/

-- ==============================================
-- PROJETS
-- ==============================================
DROP POLICY IF EXISTS "Users can view accessible org projets" ON projets;
DROP POLICY IF EXISTS "Users can insert into accessible orgs" ON projets;
DROP POLICY IF EXISTS "Users can update accessible org projets" ON projets;
DROP POLICY IF EXISTS "Users can delete accessible org projets" ON projets;
DROP POLICY IF EXISTS "Users view org projets" ON projets;
DROP POLICY IF EXISTS "Users insert org projets" ON projets;
DROP POLICY IF EXISTS "Users update org projets" ON projets;
DROP POLICY IF EXISTS "Users delete org projets" ON projets;
DROP POLICY IF EXISTS "view_projets" ON projets;
DROP POLICY IF EXISTS "insert_projets" ON projets;
DROP POLICY IF EXISTS "update_projets" ON projets;
DROP POLICY IF EXISTS "delete_projets" ON projets;

CREATE POLICY "view_projets" ON projets FOR SELECT TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "insert_projets" ON projets FOR INSERT TO authenticated
WITH CHECK (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "update_projets" ON projets FOR UPDATE TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()))
WITH CHECK (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "delete_projets" ON projets FOR DELETE TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

-- ==============================================
-- TRANCHES
-- ==============================================
DROP POLICY IF EXISTS "Users can view tranches in accessible orgs" ON tranches;
DROP POLICY IF EXISTS "Users can insert tranches in accessible orgs" ON tranches;
DROP POLICY IF EXISTS "Users can update tranches in accessible orgs" ON tranches;
DROP POLICY IF EXISTS "Users can delete tranches in accessible orgs" ON tranches;
DROP POLICY IF EXISTS "Users view tranches" ON tranches;
DROP POLICY IF EXISTS "Users insert tranches" ON tranches;
DROP POLICY IF EXISTS "Users update tranches" ON tranches;
DROP POLICY IF EXISTS "Users delete tranches" ON tranches;
DROP POLICY IF EXISTS "view_tranches" ON tranches;
DROP POLICY IF EXISTS "insert_tranches" ON tranches;
DROP POLICY IF EXISTS "update_tranches" ON tranches;
DROP POLICY IF EXISTS "delete_tranches" ON tranches;

CREATE POLICY "view_tranches" ON tranches FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM projets WHERE projets.id = tranches.projet_id
  AND projets.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
));

CREATE POLICY "insert_tranches" ON tranches FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM projets WHERE projets.id = tranches.projet_id
  AND projets.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
));

CREATE POLICY "update_tranches" ON tranches FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM projets WHERE projets.id = tranches.projet_id
  AND projets.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM projets WHERE projets.id = tranches.projet_id
  AND projets.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
));

CREATE POLICY "delete_tranches" ON tranches FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM projets WHERE projets.id = tranches.projet_id
  AND projets.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
));

-- ==============================================
-- SOUSCRIPTIONS
-- ==============================================
DROP POLICY IF EXISTS "Users can view souscriptions in accessible orgs" ON souscriptions;
DROP POLICY IF EXISTS "Users can insert souscriptions in accessible orgs" ON souscriptions;
DROP POLICY IF EXISTS "Users can update souscriptions in accessible orgs" ON souscriptions;
DROP POLICY IF EXISTS "Users can delete souscriptions in accessible orgs" ON souscriptions;
DROP POLICY IF EXISTS "Users view souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users insert souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users update souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users delete souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "view_souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "insert_souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "update_souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "delete_souscriptions" ON souscriptions;

CREATE POLICY "view_souscriptions" ON souscriptions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM tranches t JOIN projets p ON p.id = t.projet_id
  WHERE t.id = souscriptions.tranche_id
  AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
));

CREATE POLICY "insert_souscriptions" ON souscriptions FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM tranches t JOIN projets p ON p.id = t.projet_id
  WHERE t.id = souscriptions.tranche_id
  AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
));

CREATE POLICY "update_souscriptions" ON souscriptions FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM tranches t JOIN projets p ON p.id = t.projet_id
  WHERE t.id = souscriptions.tranche_id
  AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM tranches t JOIN projets p ON p.id = t.projet_id
  WHERE t.id = souscriptions.tranche_id
  AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
));

CREATE POLICY "delete_souscriptions" ON souscriptions FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM tranches t JOIN projets p ON p.id = t.projet_id
  WHERE t.id = souscriptions.tranche_id
  AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
));

-- ==============================================
-- INVESTISSEURS
-- ==============================================
DROP POLICY IF EXISTS "Users can view investisseurs in accessible orgs" ON investisseurs;
DROP POLICY IF EXISTS "Users can insert investisseurs in accessible orgs" ON investisseurs;
DROP POLICY IF EXISTS "Users can update investisseurs in accessible orgs" ON investisseurs;
DROP POLICY IF EXISTS "Users can delete investisseurs in accessible orgs" ON investisseurs;
DROP POLICY IF EXISTS "Users view investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users insert investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users update investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users delete investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "view_investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "insert_investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "update_investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "delete_investisseurs" ON investisseurs;

CREATE POLICY "view_investisseurs" ON investisseurs FOR SELECT TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "insert_investisseurs" ON investisseurs FOR INSERT TO authenticated
WITH CHECK (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "update_investisseurs" ON investisseurs FOR UPDATE TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()))
WITH CHECK (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "delete_investisseurs" ON investisseurs FOR DELETE TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

-- ==============================================
-- COUPONS_ECHEANCES
-- ==============================================
DROP POLICY IF EXISTS "Users can view coupons_echeances in accessible orgs" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can insert coupons_echeances in accessible orgs" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can update coupons_echeances in accessible orgs" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can delete coupons_echeances in accessible orgs" ON coupons_echeances;
DROP POLICY IF EXISTS "Users view coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users insert coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users update coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users delete coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "view_coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "insert_coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "update_coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "delete_coupons" ON coupons_echeances;

CREATE POLICY "view_coupons" ON coupons_echeances FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM souscriptions s
  JOIN tranches t ON t.id = s.tranche_id
  JOIN projets p ON p.id = t.projet_id
  WHERE s.id = coupons_echeances.souscription_id
  AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
));

CREATE POLICY "insert_coupons" ON coupons_echeances FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM souscriptions s
  JOIN tranches t ON t.id = s.tranche_id
  JOIN projets p ON p.id = t.projet_id
  WHERE s.id = coupons_echeances.souscription_id
  AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
));

CREATE POLICY "update_coupons" ON coupons_echeances FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM souscriptions s
  JOIN tranches t ON t.id = s.tranche_id
  JOIN projets p ON p.id = t.projet_id
  WHERE s.id = coupons_echeances.souscription_id
  AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM souscriptions s
  JOIN tranches t ON t.id = s.tranche_id
  JOIN projets p ON p.id = t.projet_id
  WHERE s.id = coupons_echeances.souscription_id
  AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
));

CREATE POLICY "delete_coupons" ON coupons_echeances FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM souscriptions s
  JOIN tranches t ON t.id = s.tranche_id
  JOIN projets p ON p.id = t.projet_id
  WHERE s.id = coupons_echeances.souscription_id
  AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
));

-- ==============================================
-- PAIEMENTS
-- ==============================================
DROP POLICY IF EXISTS "Users can view paiements in accessible orgs" ON paiements;
DROP POLICY IF EXISTS "Users can insert paiements in accessible orgs" ON paiements;
DROP POLICY IF EXISTS "Users can update paiements in accessible orgs" ON paiements;
DROP POLICY IF EXISTS "Users can delete paiements in accessible orgs" ON paiements;
DROP POLICY IF EXISTS "Users view paiements" ON paiements;
DROP POLICY IF EXISTS "Users insert paiements" ON paiements;
DROP POLICY IF EXISTS "Users update paiements" ON paiements;
DROP POLICY IF EXISTS "Users delete paiements" ON paiements;
DROP POLICY IF EXISTS "view_paiements" ON paiements;
DROP POLICY IF EXISTS "insert_paiements" ON paiements;
DROP POLICY IF EXISTS "update_paiements" ON paiements;
DROP POLICY IF EXISTS "delete_paiements" ON paiements;

CREATE POLICY "view_paiements" ON paiements FOR SELECT TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "insert_paiements" ON paiements FOR INSERT TO authenticated
WITH CHECK (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "update_paiements" ON paiements FOR UPDATE TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()))
WITH CHECK (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "delete_paiements" ON paiements FOR DELETE TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

-- ==============================================
-- PAYMENT_PROOFS
-- ==============================================
DROP POLICY IF EXISTS "Users can view payment_proofs in accessible orgs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can insert payment_proofs in accessible orgs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can update payment_proofs in accessible orgs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can delete payment_proofs in accessible orgs" ON payment_proofs;
DROP POLICY IF EXISTS "Users view payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users insert payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users update payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users delete payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "view_payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "insert_payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "update_payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "delete_payment_proofs" ON payment_proofs;

CREATE POLICY "view_payment_proofs" ON payment_proofs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM paiements
  WHERE paiements.id = payment_proofs.paiement_id
  AND paiements.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
));

CREATE POLICY "insert_payment_proofs" ON payment_proofs FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM paiements
  WHERE paiements.id = payment_proofs.paiement_id
  AND paiements.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
));

CREATE POLICY "update_payment_proofs" ON payment_proofs FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM paiements
  WHERE paiements.id = payment_proofs.paiement_id
  AND paiements.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM paiements
  WHERE paiements.id = payment_proofs.paiement_id
  AND paiements.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
));

CREATE POLICY "delete_payment_proofs" ON payment_proofs FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM paiements
  WHERE paiements.id = payment_proofs.paiement_id
  AND paiements.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
));

-- ==============================================
-- APP_CONFIG (global, authenticated users can view)
-- ==============================================
DROP POLICY IF EXISTS "Users can view app_config in accessible orgs" ON app_config;
DROP POLICY IF EXISTS "Users can insert app_config in accessible orgs" ON app_config;
DROP POLICY IF EXISTS "Users can update app_config in accessible orgs" ON app_config;
DROP POLICY IF EXISTS "Users can delete app_config in accessible orgs" ON app_config;
DROP POLICY IF EXISTS "Only admins can modify app_config" ON app_config;
DROP POLICY IF EXISTS "Users view app_config" ON app_config;
DROP POLICY IF EXISTS "Admins insert app_config" ON app_config;
DROP POLICY IF EXISTS "Admins update app_config" ON app_config;
DROP POLICY IF EXISTS "Admins delete app_config" ON app_config;
DROP POLICY IF EXISTS "view_app_config" ON app_config;
DROP POLICY IF EXISTS "insert_app_config" ON app_config;
DROP POLICY IF EXISTS "update_app_config" ON app_config;
DROP POLICY IF EXISTS "delete_app_config" ON app_config;

CREATE POLICY "view_app_config" ON app_config FOR SELECT TO authenticated
USING (true);

CREATE POLICY "insert_app_config" ON app_config FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true
));

CREATE POLICY "update_app_config" ON app_config FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true
));

CREATE POLICY "delete_app_config" ON app_config FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true
));

-- ==============================================
-- USER_REMINDER_SETTINGS
-- ==============================================
DROP POLICY IF EXISTS "Users can view own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can insert own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can update own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can delete own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Admins can view org reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users view own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users insert own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users update own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users delete own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "view_reminder_settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "insert_reminder_settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "update_reminder_settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "delete_reminder_settings" ON user_reminder_settings;

CREATE POLICY "view_reminder_settings" ON user_reminder_settings FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "insert_reminder_settings" ON user_reminder_settings FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_reminder_settings" ON user_reminder_settings FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_reminder_settings" ON user_reminder_settings FOR DELETE TO authenticated
USING (user_id = auth.uid());
