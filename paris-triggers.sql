-- ============================================
-- TRIGGERS - Apply to Paris Database
-- ============================================

CREATE TRIGGER set_coupons_echeances_updated_at
  BEFORE UPDATE ON public.coupons_echeances
  FOR EACH ROW
  EXECUTE FUNCTION update_coupons_echeances_updated_at();

CREATE TRIGGER set_investisseur_id
  BEFORE INSERT ON public.investisseurs
  FOR EACH ROW
  EXECUTE FUNCTION generate_investisseur_id();

CREATE TRIGGER trigger_delete_invitation_on_user_delete
  AFTER DELETE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION delete_invitation_on_user_delete();

CREATE TRIGGER on_new_user_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_user();

CREATE TRIGGER trigger_propagate_project_to_tranches
  AFTER UPDATE ON public.projets
  FOR EACH ROW
  EXECUTE FUNCTION propagate_project_to_tranches();

CREATE TRIGGER trigger_recalculate_on_project_update
  AFTER UPDATE ON public.projets
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_on_project_update();

CREATE TRIGGER trigger_sync_tranche_periodicite
  AFTER UPDATE ON public.projets
  FOR EACH ROW
  EXECUTE FUNCTION sync_tranche_periodicite();

CREATE TRIGGER set_souscription_id
  BEFORE INSERT ON public.souscriptions
  FOR EACH ROW
  EXECUTE FUNCTION generate_souscription_id();

CREATE TRIGGER trigger_recalculate_coupons_on_date_emission
  AFTER UPDATE OF date_emission ON public.tranches
  FOR EACH ROW
  WHEN ((new.date_emission IS DISTINCT FROM old.date_emission))
  EXECUTE FUNCTION recalculate_coupons_on_date_emission_change();

CREATE TRIGGER trigger_set_date_emission
  BEFORE INSERT OR UPDATE OF date_transfert_fonds ON public.tranches
  FOR EACH ROW
  EXECUTE FUNCTION set_date_emission();

CREATE TRIGGER update_user_reminder_settings_timestamp
  BEFORE UPDATE ON public.user_reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reminder_settings_updated_at();
