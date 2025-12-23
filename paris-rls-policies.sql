-- ============================================
-- RLS POLICIES - Apply to Paris Database
-- ============================================

CREATE POLICY app_config_select ON public.app_config FOR SELECT TO authenticated
  USING (true);

CREATE POLICY app_config_update ON public.app_config FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_superadmin = true)))));

CREATE POLICY coupons_delete ON public.coupons_echeances FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM ((souscriptions s
     JOIN tranches t ON ((t.id = s.tranche_id)))
     JOIN projets p ON ((p.id = t.projet_id)))
  WHERE ((s.id = coupons_echeances.souscription_id) AND user_is_admin_of_org(p.org_id)))));

CREATE POLICY coupons_insert ON public.coupons_echeances FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((souscriptions s
     JOIN tranches t ON ((t.id = s.tranche_id)))
     JOIN projets p ON ((p.id = t.projet_id)))
  WHERE ((s.id = coupons_echeances.souscription_id) AND user_can_access_org(p.org_id)))));

CREATE POLICY coupons_select ON public.coupons_echeances FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM ((souscriptions s
     JOIN tranches t ON ((t.id = s.tranche_id)))
     JOIN projets p ON ((p.id = t.projet_id)))
  WHERE ((s.id = coupons_echeances.souscription_id) AND user_can_access_org(p.org_id)))));

CREATE POLICY coupons_update ON public.coupons_echeances FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM ((souscriptions s
     JOIN tranches t ON ((t.id = s.tranche_id)))
     JOIN projets p ON ((p.id = t.projet_id)))
  WHERE ((s.id = coupons_echeances.souscription_id) AND user_is_admin_of_org(p.org_id)))));

CREATE POLICY investisseurs_delete ON public.investisseurs FOR DELETE TO public
  USING (user_is_admin_of_org(org_id));

CREATE POLICY investisseurs_insert ON public.investisseurs FOR INSERT TO public
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY investisseurs_select ON public.investisseurs FOR SELECT TO public
  USING (user_can_access_org(org_id));

CREATE POLICY investisseurs_update ON public.investisseurs FOR UPDATE TO public
  USING (user_is_admin_of_org(org_id));

CREATE POLICY invitations_anon_select ON public.invitations FOR SELECT TO anon
  USING (true);

CREATE POLICY paiements_delete ON public.paiements FOR DELETE TO public
  USING (user_is_admin_of_org(org_id));

CREATE POLICY paiements_insert ON public.paiements FOR INSERT TO public
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY paiements_select ON public.paiements FOR SELECT TO public
  USING (user_can_access_org(org_id));

CREATE POLICY paiements_update ON public.paiements FOR UPDATE TO public
  USING (user_is_admin_of_org(org_id));

CREATE POLICY payment_proofs_delete ON public.payment_proofs FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM paiements
  WHERE ((paiements.id = payment_proofs.paiement_id) AND user_is_admin_of_org(paiements.org_id)))));

CREATE POLICY payment_proofs_insert ON public.payment_proofs FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM paiements
  WHERE ((paiements.id = payment_proofs.paiement_id) AND user_can_access_org(paiements.org_id)))));

CREATE POLICY payment_proofs_select ON public.payment_proofs FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM paiements
  WHERE ((paiements.id = payment_proofs.paiement_id) AND user_can_access_org(paiements.org_id)))));

CREATE POLICY payment_proofs_update ON public.payment_proofs FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM paiements
  WHERE ((paiements.id = payment_proofs.paiement_id) AND user_is_admin_of_org(paiements.org_id)))));

CREATE POLICY projets_delete ON public.projets FOR DELETE TO public
  USING (user_is_admin_of_org(org_id));

CREATE POLICY projets_insert ON public.projets FOR INSERT TO public
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY projets_select ON public.projets FOR SELECT TO public
  USING (user_can_access_org(org_id));

CREATE POLICY projets_update ON public.projets FOR UPDATE TO public
  USING (user_is_admin_of_org(org_id))
  WITH CHECK (user_is_admin_of_org(org_id));

CREATE POLICY souscriptions_delete ON public.souscriptions FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM (tranches t
     JOIN projets p ON ((p.id = t.projet_id)))
  WHERE ((t.id = souscriptions.tranche_id) AND user_is_admin_of_org(p.org_id)))));

CREATE POLICY souscriptions_insert ON public.souscriptions FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (tranches t
     JOIN projets p ON ((p.id = t.projet_id)))
  WHERE ((t.id = souscriptions.tranche_id) AND user_can_access_org(p.org_id)))));

CREATE POLICY souscriptions_select ON public.souscriptions FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM (tranches t
     JOIN projets p ON ((p.id = t.projet_id)))
  WHERE ((t.id = souscriptions.tranche_id) AND user_can_access_org(p.org_id)))));

CREATE POLICY souscriptions_update ON public.souscriptions FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM (tranches t
     JOIN projets p ON ((p.id = t.projet_id)))
  WHERE ((t.id = souscriptions.tranche_id) AND user_is_admin_of_org(p.org_id)))));

CREATE POLICY tranches_delete ON public.tranches FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM projets
  WHERE ((projets.id = tranches.projet_id) AND user_is_admin_of_org(projets.org_id)))));

CREATE POLICY tranches_insert ON public.tranches FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM projets
  WHERE ((projets.id = tranches.projet_id) AND user_can_access_org(projets.org_id)))));

CREATE POLICY tranches_select ON public.tranches FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM projets
  WHERE ((projets.id = tranches.projet_id) AND user_can_access_org(projets.org_id)))));

CREATE POLICY tranches_update ON public.tranches FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM projets
  WHERE ((projets.id = tranches.projet_id) AND user_is_admin_of_org(projets.org_id)))));

CREATE POLICY reminder_settings_delete ON public.user_reminder_settings FOR DELETE TO public
  USING ((user_id = auth.uid()));

CREATE POLICY reminder_settings_insert ON public.user_reminder_settings FOR INSERT TO public
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY reminder_settings_select ON public.user_reminder_settings FOR SELECT TO public
  USING ((user_id = auth.uid()));

CREATE POLICY reminder_settings_update ON public.user_reminder_settings FOR UPDATE TO public
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));
