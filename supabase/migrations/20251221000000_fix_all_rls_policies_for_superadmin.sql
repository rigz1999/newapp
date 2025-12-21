-- Fix ALL business table RLS policies to properly check for superadmin access
-- This ensures superadmins (with is_superadmin=true in profiles) can see ALL data

-- PROJETS
DROP POLICY IF EXISTS projets_select ON projets;
CREATE POLICY projets_select ON projets FOR SELECT USING (user_can_access_org(org_id));
DROP POLICY IF EXISTS projets_insert ON projets;
CREATE POLICY projets_insert ON projets FOR INSERT WITH CHECK (user_can_access_org(org_id));
DROP POLICY IF EXISTS projets_update ON projets;
CREATE POLICY projets_update ON projets FOR UPDATE USING (user_is_admin_of_org(org_id)) WITH CHECK (user_is_admin_of_org(org_id));
DROP POLICY IF EXISTS projets_delete ON projets;
CREATE POLICY projets_delete ON projets FOR DELETE USING (user_is_admin_of_org(org_id));

-- TRANCHES
DROP POLICY IF EXISTS tranches_select ON tranches;
CREATE POLICY tranches_select ON tranches FOR SELECT USING (EXISTS (SELECT 1 FROM projets WHERE projets.id = tranches.projet_id AND user_can_access_org(projets.org_id)));
DROP POLICY IF EXISTS tranches_insert ON tranches;
CREATE POLICY tranches_insert ON tranches FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM projets WHERE projets.id = tranches.projet_id AND user_can_access_org(projets.org_id)));
DROP POLICY IF EXISTS tranches_update ON tranches;
CREATE POLICY tranches_update ON tranches FOR UPDATE USING (EXISTS (SELECT 1 FROM projets WHERE projets.id = tranches.projet_id AND user_is_admin_of_org(projets.org_id)));
DROP POLICY IF EXISTS tranches_delete ON tranches;
CREATE POLICY tranches_delete ON tranches FOR DELETE USING (EXISTS (SELECT 1 FROM projets WHERE projets.id = tranches.projet_id AND user_is_admin_of_org(projets.org_id)));

-- SOUSCRIPTIONS
DROP POLICY IF EXISTS souscriptions_select ON souscriptions;
CREATE POLICY souscriptions_select ON souscriptions FOR SELECT USING (EXISTS (SELECT 1 FROM tranches t JOIN projets p ON p.id = t.projet_id WHERE t.id = souscriptions.tranche_id AND user_can_access_org(p.org_id)));
DROP POLICY IF EXISTS souscriptions_insert ON souscriptions;
CREATE POLICY souscriptions_insert ON souscriptions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM tranches t JOIN projets p ON p.id = t.projet_id WHERE t.id = souscriptions.tranche_id AND user_can_access_org(p.org_id)));
DROP POLICY IF EXISTS souscriptions_update ON souscriptions;
CREATE POLICY souscriptions_update ON souscriptions FOR UPDATE USING (EXISTS (SELECT 1 FROM tranches t JOIN projets p ON p.id = t.projet_id WHERE t.id = souscriptions.tranche_id AND user_is_admin_of_org(p.org_id)));
DROP POLICY IF EXISTS souscriptions_delete ON souscriptions;
CREATE POLICY souscriptions_delete ON souscriptions FOR DELETE USING (EXISTS (SELECT 1 FROM tranches t JOIN projets p ON p.id = t.projet_id WHERE t.id = souscriptions.tranche_id AND user_is_admin_of_org(p.org_id)));

-- INVESTISSEURS
DROP POLICY IF EXISTS investisseurs_select ON investisseurs;
CREATE POLICY investisseurs_select ON investisseurs FOR SELECT USING (user_can_access_org(org_id));
DROP POLICY IF EXISTS investisseurs_insert ON investisseurs;
CREATE POLICY investisseurs_insert ON investisseurs FOR INSERT WITH CHECK (user_can_access_org(org_id));
DROP POLICY IF EXISTS investisseurs_update ON investisseurs;
CREATE POLICY investisseurs_update ON investisseurs FOR UPDATE USING (user_is_admin_of_org(org_id));
DROP POLICY IF EXISTS investisseurs_delete ON investisseurs;
CREATE POLICY investisseurs_delete ON investisseurs FOR DELETE USING (user_is_admin_of_org(org_id));

-- PAIEMENTS (has org_id directly)
DROP POLICY IF EXISTS paiements_select ON paiements;
CREATE POLICY paiements_select ON paiements FOR SELECT USING (user_can_access_org(org_id));
DROP POLICY IF EXISTS paiements_insert ON paiements;
CREATE POLICY paiements_insert ON paiements FOR INSERT WITH CHECK (user_can_access_org(org_id));
DROP POLICY IF EXISTS paiements_update ON paiements;
CREATE POLICY paiements_update ON paiements FOR UPDATE USING (user_is_admin_of_org(org_id));
DROP POLICY IF EXISTS paiements_delete ON paiements;
CREATE POLICY paiements_delete ON paiements FOR DELETE USING (user_is_admin_of_org(org_id));

-- PAYMENT_PROOFS (joins through paiements)
DROP POLICY IF EXISTS payment_proofs_select ON payment_proofs;
CREATE POLICY payment_proofs_select ON payment_proofs FOR SELECT USING (EXISTS (SELECT 1 FROM paiements WHERE paiements.id = payment_proofs.paiement_id AND user_can_access_org(paiements.org_id)));
DROP POLICY IF EXISTS payment_proofs_insert ON payment_proofs;
CREATE POLICY payment_proofs_insert ON payment_proofs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM paiements WHERE paiements.id = payment_proofs.paiement_id AND user_can_access_org(paiements.org_id)));
DROP POLICY IF EXISTS payment_proofs_update ON payment_proofs;
CREATE POLICY payment_proofs_update ON payment_proofs FOR UPDATE USING (EXISTS (SELECT 1 FROM paiements WHERE paiements.id = payment_proofs.paiement_id AND user_is_admin_of_org(paiements.org_id)));
DROP POLICY IF EXISTS payment_proofs_delete ON payment_proofs;
CREATE POLICY payment_proofs_delete ON payment_proofs FOR DELETE USING (EXISTS (SELECT 1 FROM paiements WHERE paiements.id = payment_proofs.paiement_id AND user_is_admin_of_org(paiements.org_id)));

-- COUPONS_ECHEANCES
DROP POLICY IF EXISTS coupons_select ON coupons_echeances;
CREATE POLICY coupons_select ON coupons_echeances FOR SELECT USING (EXISTS (SELECT 1 FROM souscriptions s JOIN tranches t ON t.id = s.tranche_id JOIN projets p ON p.id = t.projet_id WHERE s.id = coupons_echeances.souscription_id AND user_can_access_org(p.org_id)));
DROP POLICY IF EXISTS coupons_insert ON coupons_echeances;
CREATE POLICY coupons_insert ON coupons_echeances FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM souscriptions s JOIN tranches t ON t.id = s.tranche_id JOIN projets p ON p.id = t.projet_id WHERE s.id = coupons_echeances.souscription_id AND user_can_access_org(p.org_id)));
DROP POLICY IF EXISTS coupons_update ON coupons_echeances;
CREATE POLICY coupons_update ON coupons_echeances FOR UPDATE USING (EXISTS (SELECT 1 FROM souscriptions s JOIN tranches t ON t.id = s.tranche_id JOIN projets p ON p.id = t.projet_id WHERE s.id = coupons_echeances.souscription_id AND user_is_admin_of_org(p.org_id)));
DROP POLICY IF EXISTS coupons_delete ON coupons_echeances;
CREATE POLICY coupons_delete ON coupons_echeances FOR DELETE USING (EXISTS (SELECT 1 FROM souscriptions s JOIN tranches t ON t.id = s.tranche_id JOIN projets p ON p.id = t.projet_id WHERE s.id = coupons_echeances.souscription_id AND user_is_admin_of_org(p.org_id)));
