/*
  # Clean ALL policies and recreate from scratch
  
  Drop every single policy and recreate only the correct ones.
*/

-- Drop all policies on all tables
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
-- IDENTITY TABLES
-- ==============================================

-- PROFILES
CREATE POLICY "view_profiles" ON profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "insert_profiles" ON profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "update_profiles" ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- MEMBERSHIPS
CREATE POLICY "view_memberships" ON memberships FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- ORGANIZATIONS
CREATE POLICY "view_organizations" ON organizations FOR SELECT TO authenticated
USING (id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

-- INVITATIONS
CREATE POLICY "view_invitations" ON invitations FOR SELECT TO authenticated
USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));

CREATE POLICY "insert_invitations" ON invitations FOR INSERT TO authenticated
WITH CHECK (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')));

CREATE POLICY "update_invitations" ON invitations FOR UPDATE TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')))
WITH CHECK (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')));

CREATE POLICY "delete_invitations" ON invitations FOR DELETE TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')));

-- ==============================================
-- APPLICATION TABLES
-- ==============================================

-- PROJETS
CREATE POLICY "view_projets" ON projets FOR SELECT TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "insert_projets" ON projets FOR INSERT TO authenticated
WITH CHECK (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "update_projets" ON projets FOR UPDATE TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()))
WITH CHECK (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "delete_projets" ON projets FOR DELETE TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

-- TRANCHES
CREATE POLICY "view_tranches" ON tranches FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM projets WHERE projets.id = tranches.projet_id AND projets.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

CREATE POLICY "insert_tranches" ON tranches FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM projets WHERE projets.id = tranches.projet_id AND projets.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

CREATE POLICY "update_tranches" ON tranches FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM projets WHERE projets.id = tranches.projet_id AND projets.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM projets WHERE projets.id = tranches.projet_id AND projets.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

CREATE POLICY "delete_tranches" ON tranches FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM projets WHERE projets.id = tranches.projet_id AND projets.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

-- SOUSCRIPTIONS
CREATE POLICY "view_souscriptions" ON souscriptions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM tranches t JOIN projets p ON p.id = t.projet_id WHERE t.id = souscriptions.tranche_id AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

CREATE POLICY "insert_souscriptions" ON souscriptions FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM tranches t JOIN projets p ON p.id = t.projet_id WHERE t.id = souscriptions.tranche_id AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

CREATE POLICY "update_souscriptions" ON souscriptions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM tranches t JOIN projets p ON p.id = t.projet_id WHERE t.id = souscriptions.tranche_id AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM tranches t JOIN projets p ON p.id = t.projet_id WHERE t.id = souscriptions.tranche_id AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

CREATE POLICY "delete_souscriptions" ON souscriptions FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM tranches t JOIN projets p ON p.id = t.projet_id WHERE t.id = souscriptions.tranche_id AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

-- INVESTISSEURS
CREATE POLICY "view_investisseurs" ON investisseurs FOR SELECT TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "insert_investisseurs" ON investisseurs FOR INSERT TO authenticated
WITH CHECK (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "update_investisseurs" ON investisseurs FOR UPDATE TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()))
WITH CHECK (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "delete_investisseurs" ON investisseurs FOR DELETE TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

-- COUPONS_ECHEANCES
CREATE POLICY "view_coupons" ON coupons_echeances FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM souscriptions s JOIN tranches t ON t.id = s.tranche_id JOIN projets p ON p.id = t.projet_id WHERE s.id = coupons_echeances.souscription_id AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

CREATE POLICY "insert_coupons" ON coupons_echeances FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM souscriptions s JOIN tranches t ON t.id = s.tranche_id JOIN projets p ON p.id = t.projet_id WHERE s.id = coupons_echeances.souscription_id AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

CREATE POLICY "update_coupons" ON coupons_echeances FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM souscriptions s JOIN tranches t ON t.id = s.tranche_id JOIN projets p ON p.id = t.projet_id WHERE s.id = coupons_echeances.souscription_id AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM souscriptions s JOIN tranches t ON t.id = s.tranche_id JOIN projets p ON p.id = t.projet_id WHERE s.id = coupons_echeances.souscription_id AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

CREATE POLICY "delete_coupons" ON coupons_echeances FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM souscriptions s JOIN tranches t ON t.id = s.tranche_id JOIN projets p ON p.id = t.projet_id WHERE s.id = coupons_echeances.souscription_id AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

-- PAIEMENTS
CREATE POLICY "view_paiements" ON paiements FOR SELECT TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "insert_paiements" ON paiements FOR INSERT TO authenticated
WITH CHECK (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "update_paiements" ON paiements FOR UPDATE TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()))
WITH CHECK (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "delete_paiements" ON paiements FOR DELETE TO authenticated
USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

-- PAYMENT_PROOFS
CREATE POLICY "view_payment_proofs" ON payment_proofs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM paiements WHERE paiements.id = payment_proofs.paiement_id AND paiements.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

CREATE POLICY "insert_payment_proofs" ON payment_proofs FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM paiements WHERE paiements.id = payment_proofs.paiement_id AND paiements.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

CREATE POLICY "update_payment_proofs" ON payment_proofs FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM paiements WHERE paiements.id = payment_proofs.paiement_id AND paiements.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM paiements WHERE paiements.id = payment_proofs.paiement_id AND paiements.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

CREATE POLICY "delete_payment_proofs" ON payment_proofs FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM paiements WHERE paiements.id = payment_proofs.paiement_id AND paiements.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())));

-- APP_CONFIG
CREATE POLICY "view_app_config" ON app_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "modify_app_config" ON app_config FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

-- USER_REMINDER_SETTINGS
CREATE POLICY "view_reminder_settings" ON user_reminder_settings FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "insert_reminder_settings" ON user_reminder_settings FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_reminder_settings" ON user_reminder_settings FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_reminder_settings" ON user_reminder_settings FOR DELETE TO authenticated
USING (user_id = auth.uid());
