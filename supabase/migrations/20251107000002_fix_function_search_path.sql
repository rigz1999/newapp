-- ============================================
-- Fix Function Search Path Security
-- Created: 2025-11-07
-- Purpose: Set fixed search_path on all functions to prevent search_path injection attacks
-- ============================================

-- Fix all functions by setting search_path to 'public'
-- This prevents malicious users from hijacking function behavior by changing search_path

ALTER FUNCTION public.notify_admin_new_user() SET search_path = public;
ALTER FUNCTION public.generate_souscription_id() SET search_path = public;
ALTER FUNCTION public.is_super_admin() SET search_path = public;
ALTER FUNCTION public.get_user_org_ids() SET search_path = public;
ALTER FUNCTION public.update_coupons_echeances_updated_at() SET search_path = public;
ALTER FUNCTION public.update_user_reminder_settings_updated_at() SET search_path = public;
ALTER FUNCTION public.recalculate_coupons_on_date_emission_change() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.set_date_emission() SET search_path = public;
ALTER FUNCTION public.generate_coupon_schedule(uuid, numeric, text, date, date, integer) SET search_path = public;
ALTER FUNCTION public.update_coupon_statut() SET search_path = public;
ALTER FUNCTION public.mark_coupon_paid(uuid) SET search_path = public;
ALTER FUNCTION public.generate_investisseur_id() SET search_path = public;
ALTER FUNCTION public.sync_tranche_periodicite() SET search_path = public;

-- Add comments
COMMENT ON FUNCTION public.notify_admin_new_user IS 'Notifies admin of new user - search_path fixed for security';
COMMENT ON FUNCTION public.generate_souscription_id IS 'Generates subscription ID - search_path fixed for security';
COMMENT ON FUNCTION public.is_super_admin IS 'Checks super admin status - search_path fixed for security';
COMMENT ON FUNCTION public.get_user_org_ids IS 'Gets user organization IDs - search_path fixed for security';
COMMENT ON FUNCTION public.handle_new_user IS 'Handles new user creation - search_path fixed for security';
