-- ============================================
-- FUNCTIONS - Apply to Paris Database
-- ============================================

CREATE OR REPLACE FUNCTION public.check_super_admin_status()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ SELECT COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false); $function$;

CREATE OR REPLACE FUNCTION public.cleanup_temp_files()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'payment-proofs-temp'
  AND created_at < NOW() - INTERVAL '24 hours';
END;
$function$;

CREATE OR REPLACE FUNCTION public.current_user_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.delete_invitation_on_user_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- The invitations table doesn't have an invited_by column
  -- So we skip the deletion of invitations and just allow the user deletion to proceed
  -- Invitations will be cleaned up by the FK constraint if needed
  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_coupon_schedule(p_souscription_id uuid, p_date_emission date, p_date_fin date, p_periodicite text, p_montant_coupon numeric)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_step_months   INTEGER;
  v_next_date     DATE;
  v_periodicite   TEXT;
  v_amount        NUMERIC(14,2);
BEGIN
  IF p_souscription_id IS NULL OR p_date_emission IS NULL OR p_date_fin IS NULL
     OR p_periodicite IS NULL OR p_montant_coupon IS NULL THEN
    RAISE NOTICE 'generate_coupon_schedule: paramètres manquants → rien fait (%, %, %, %, %)',
      p_souscription_id, p_date_emission, p_date_fin, p_periodicite, p_montant_coupon;
    RETURN;
  END IF;

  IF p_date_fin <= p_date_emission THEN
    RAISE NOTICE 'generate_coupon_schedule: date_fin <= date_emission → rien généré (% <= %)',
      p_date_fin, p_date_emission;
    RETURN;
  END IF;

  v_periodicite := LOWER(TRIM(p_periodicite));
  v_amount      := ROUND(p_montant_coupon, 2);

  v_step_months := CASE v_periodicite
    WHEN 'mensuelle'     THEN 1
    WHEN 'trimestrielle' THEN 3
    WHEN 'semestrielle'  THEN 6
    WHEN 'annuelle'      THEN 12
    ELSE 12
  END;

  v_next_date := (p_date_emission + (v_step_months || ' months')::interval)::date;

  WHILE v_next_date <= p_date_fin LOOP
    INSERT INTO public.coupons_echeances (
      souscription_id,
      date_echeance,
      montant_coupon,
      statut
    )
    VALUES (
      p_souscription_id,
      v_next_date,
      v_amount,
      'en_attente'
    )
    ON CONFLICT (souscription_id, date_echeance)
    DO UPDATE
      SET montant_coupon = EXCLUDED.montant_coupon
      WHERE public.coupons_echeances.statut <> 'paye';

    v_next_date := (v_next_date + (v_step_months || ' months')::interval)::date;
  END LOOP;

  RAISE NOTICE 'Échéancier généré pour souscription % (% mois, montant % € par échéance)',
    p_souscription_id, v_step_months, v_amount;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_investisseur_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
  new_id TEXT;
  max_existing_id TEXT;
  id_length INTEGER;
  padding INTEGER;
BEGIN
  IF NEW.id_investisseur IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id_investisseur INTO max_existing_id
  FROM investisseurs
  WHERE id_investisseur ~ '^inv[0-9]+$'
  ORDER BY CAST(REGEXP_REPLACE(id_investisseur, '[^0-9]', '', 'g') AS INTEGER) DESC
  LIMIT 1;

  IF max_existing_id IS NULL THEN
    next_num := 1;
    padding := 5;
  ELSE
    next_num := CAST(REGEXP_REPLACE(max_existing_id, '[^0-9]', '', 'g') AS INTEGER) + 1;
    id_length := LENGTH(REGEXP_REPLACE(max_existing_id, '[^0-9]', '', 'g'));
    padding := id_length;
    IF next_num >= POWER(10, padding) THEN
      padding := padding + 1;
    END IF;
  END IF;

  new_id := 'inv' || LPAD(next_num::TEXT, padding, '0');
  NEW.id_investisseur := new_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_souscription_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
  new_id TEXT;
  max_existing_id TEXT;
  id_length INTEGER;
  padding INTEGER;
BEGIN
  IF NEW.id_souscription IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id_souscription INTO max_existing_id
  FROM souscriptions
  WHERE id_souscription ~ '^sub[0-9]+$'
  ORDER BY CAST(REGEXP_REPLACE(id_souscription, '[^0-9]', '', 'g') AS INTEGER) DESC
  LIMIT 1;

  IF max_existing_id IS NULL THEN
    next_num := 1;
    padding := 6;
  ELSE
    next_num := CAST(REGEXP_REPLACE(max_existing_id, '[^0-9]', '', 'g') AS INTEGER) + 1;
    id_length := LENGTH(REGEXP_REPLACE(max_existing_id, '[^0-9]', '', 'g'));
    padding := GREATEST(id_length, 6);
    IF next_num >= POWER(10, padding) THEN
      padding := padding + 1;
    END IF;
  END IF;

  new_id := 'sub' || LPAD(next_num::TEXT, padding, '0');
  NEW.id_souscription := new_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_period_ratio(p_periodicite text, p_base_interet numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  v_base numeric;
  v_periodicite_lower text;
BEGIN
  v_base := COALESCE(p_base_interet, 360);
  v_periodicite_lower := LOWER(p_periodicite);

  IF v_periodicite_lower IN ('annuel', 'annuelle') THEN
    RETURN 1.0;
  ELSIF v_periodicite_lower IN ('semestriel', 'semestrielle') THEN
    IF v_base = 365 THEN
      RETURN 182.5 / 365.0;
    ELSE
      RETURN 180.0 / 360.0;
    END IF;
  ELSIF v_periodicite_lower IN ('trimestriel', 'trimestrielle') THEN
    IF v_base = 365 THEN
      RETURN 91.25 / 365.0;
    ELSE
      RETURN 90.0 / 360.0;
    END IF;
  ELSIF v_periodicite_lower IN ('mensuel', 'mensuelle') THEN
    IF v_base = 365 THEN
      RETURN 30.42 / 365.0;
    ELSE
      RETURN 30.0 / 360.0;
    END IF;
  ELSE
    RAISE WARNING 'Périodicité inconnue: %, utilisation annuelle par défaut', p_periodicite;
    RETURN 1.0;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_email()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT email FROM profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
result boolean;
BEGIN
SELECT EXISTS (
SELECT 1 FROM memberships
WHERE user_id = auth.uid()
AND org_id = p_org_id
AND role = 'admin'
) INTO result;

RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ SELECT COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false); $function$;

CREATE OR REPLACE FUNCTION public.mark_coupon_paid(p_souscription uuid, p_date date, p_date_paiement date)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.coupons_echeances
  SET statut = 'paye',
      date_paiement = COALESCE(p_date_paiement, CURRENT_DATE)
  WHERE souscription_id = p_souscription
    AND date_echeance   = p_date;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_invitation_accepted(invitation_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE invitations
  SET
    status = 'accepted',
    accepted_at = NOW()
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_admin_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  function_url TEXT;
  request_id UUID;
BEGIN
  function_url := 'https://wmgukeonxszbfdrrmkhy.supabase.co/functions/v1/send-admin-notification';

  SELECT net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'email', NEW.email,
      'full_name', NEW.full_name
    )
  ) INTO request_id;

  RAISE LOG 'Email notification sent with request_id: %', request_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to send notification email: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.propagate_project_to_tranches()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.taux_nominal IS DISTINCT FROM OLD.taux_nominal) OR
     (NEW.periodicite_coupons IS DISTINCT FROM OLD.periodicite_coupons) OR
     (NEW.duree_mois IS DISTINCT FROM OLD.duree_mois) OR
     (NEW.date_emission IS DISTINCT FROM OLD.date_emission) THEN

    RAISE NOTICE 'Project % financial parameters changed - updating tranches', NEW.id;

    UPDATE tranches
    SET
      taux_nominal = NEW.taux_nominal,
      periodicite_coupons = NEW.periodicite_coupons,
      duree_mois = NEW.duree_mois,
      date_emission = NEW.date_emission
    WHERE projet_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_coupons_on_date_emission_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.date_emission IS DISTINCT FROM OLD.date_emission THEN
    DELETE FROM coupons_echeances
    WHERE souscription_id IN (
      SELECT id FROM souscriptions WHERE tranche_id = NEW.id
    );

    PERFORM generate_coupon_schedule(
      s.id,
      NEW.date_emission,
      NEW.date_echeance_finale,
      NEW.periodicite_coupons,
      s.montant_coupon
    )
    FROM souscriptions s
    WHERE s.tranche_id = NEW.id
    AND NEW.date_emission IS NOT NULL
    AND NEW.date_echeance_finale IS NOT NULL
    AND NEW.periodicite_coupons IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_on_project_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.taux_nominal IS DISTINCT FROM OLD.taux_nominal) OR
     (NEW.periodicite_coupons IS DISTINCT FROM OLD.periodicite_coupons) OR
     (NEW.duree_mois IS DISTINCT FROM OLD.duree_mois) THEN

    RAISE NOTICE 'Project % financial parameters changed - recalculating coupons', NEW.id;

    PERFORM recalculate_tranche_coupons(t.id)
    FROM tranches t
    WHERE t.projet_id = NEW.id;

    DELETE FROM coupons_echeances
    WHERE souscription_id IN (
      SELECT s.id
      FROM souscriptions s
      JOIN tranches t ON s.tranche_id = t.id
      WHERE t.projet_id = NEW.id
    )
    AND statut != 'payé';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_on_tranche_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.taux_nominal IS DISTINCT FROM OLD.taux_nominal) OR
     (NEW.periodicite_coupons IS DISTINCT FROM OLD.periodicite_coupons) OR
     (NEW.duree_mois IS DISTINCT FROM OLD.duree_mois) OR
     (NEW.date_emission IS DISTINCT FROM OLD.date_emission) THEN

    RAISE NOTICE 'Tranche % financial parameters changed - recalculating coupons', NEW.id;

    PERFORM recalculate_tranche_coupons(NEW.id);

    DELETE FROM coupons_echeances
    WHERE souscription_id IN (
      SELECT id FROM souscriptions WHERE tranche_id = NEW.id
    )
    AND statut != 'payé';

    RAISE NOTICE 'Deleted pending payment schedules for tranche % (kept paid ones)', NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_project_coupons(p_projet_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_taux_nominal numeric;
  v_base_interet numeric;
  v_periodicite_coupons text;
  v_subscription RECORD;
  v_investor_type text;
  v_coupon_annuel numeric;
  v_period_ratio numeric;
  v_coupon_brut numeric;
  v_coupon_net numeric;
BEGIN
  SELECT taux_nominal, base_interet, periodicite_coupons
  INTO v_taux_nominal, v_base_interet, v_periodicite_coupons
  FROM projets
  WHERE id = p_projet_id;

  IF v_taux_nominal IS NULL THEN
    RETURN;
  END IF;

  v_base_interet := COALESCE(v_base_interet, 360);

  FOR v_subscription IN
    SELECT s.id, s.montant_investi, s.investisseur_id
    FROM souscriptions s
    WHERE s.projet_id = p_projet_id
  LOOP
    SELECT type INTO v_investor_type
    FROM investisseurs
    WHERE id = v_subscription.investisseur_id;

    v_coupon_annuel := (v_subscription.montant_investi * v_taux_nominal) / 100.0;
    v_period_ratio := get_period_ratio(v_periodicite_coupons, v_base_interet);
    v_coupon_brut := v_coupon_annuel * v_period_ratio;

    IF v_investor_type = 'physique' THEN
      v_coupon_net := v_coupon_brut * 0.7;
    ELSE
      v_coupon_net := v_coupon_brut;
    END IF;

    UPDATE souscriptions
    SET
      coupon_brut = v_coupon_brut,
      coupon_net = v_coupon_net
    WHERE id = v_subscription.id;

    RAISE NOTICE 'Updated subscription % - Type: %, Annuel: %, Ratio: %, Brut: %, Net: %',
      v_subscription.id, v_investor_type, v_coupon_annuel, v_period_ratio, v_coupon_brut, v_coupon_net;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalculate_tranche_coupons(p_tranche_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_taux_nominal numeric;
  v_projet_taux_nominal numeric;
  v_base_interet numeric;
  v_periodicite_coupons text;
  v_projet_id uuid;
  v_subscription RECORD;
  v_investor_type text;
  v_coupon_annuel numeric;
  v_period_ratio numeric;
  v_coupon_brut numeric;
  v_coupon_net numeric;
BEGIN
  SELECT t.taux_nominal, t.projet_id, p.taux_nominal, p.base_interet, p.periodicite_coupons
  INTO v_taux_nominal, v_projet_id, v_projet_taux_nominal, v_base_interet, v_periodicite_coupons
  FROM tranches t
  JOIN projets p ON p.id = t.projet_id
  WHERE t.id = p_tranche_id;

  v_taux_nominal := COALESCE(v_taux_nominal, v_projet_taux_nominal);
  v_base_interet := COALESCE(v_base_interet, 360);

  IF v_taux_nominal IS NULL THEN
    RETURN;
  END IF;

  FOR v_subscription IN
    SELECT s.id, s.montant_investi, s.investisseur_id
    FROM souscriptions s
    WHERE s.tranche_id = p_tranche_id
  LOOP
    SELECT type INTO v_investor_type
    FROM investisseurs
    WHERE id = v_subscription.investisseur_id;

    v_coupon_annuel := (v_subscription.montant_investi * v_taux_nominal) / 100.0;
    v_period_ratio := get_period_ratio(v_periodicite_coupons, v_base_interet);
    v_coupon_brut := v_coupon_annuel * v_period_ratio;

    IF LOWER(v_investor_type) = 'physique' THEN
      v_coupon_net := v_coupon_brut * 0.7;
    ELSE
      v_coupon_net := v_coupon_brut;
    END IF;

    UPDATE souscriptions
    SET
      coupon_brut = v_coupon_brut,
      coupon_net = v_coupon_net
    WHERE id = v_subscription.id;

    RAISE NOTICE 'Updated subscription % - Type: %, Periodicite: %, Annuel: %, Ratio: %, Brut: %, Net: %',
      v_subscription.id, v_investor_type, v_periodicite_coupons, v_coupon_annuel, v_period_ratio, v_coupon_brut, v_coupon_net;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.regenerate_all_echeanciers()
 RETURNS TABLE(total_souscriptions integer, echeances_created integer, souscriptions_skipped integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_subscription_id uuid;
  v_total integer := 0;
  v_skipped integer := 0;
  v_initial_count integer;
  v_final_count integer;
BEGIN
  SELECT COUNT(*) INTO v_initial_count FROM coupons_echeances;

  RAISE NOTICE '=== DÉBUT RÉGÉNÉRATION ÉCHÉANCIERS ===';
  RAISE NOTICE 'Échéances existantes: %', v_initial_count;

  DELETE FROM coupons_echeances;
  RAISE NOTICE 'Échéances supprimées';

  FOR v_subscription_id IN
    SELECT id FROM souscriptions ORDER BY created_at
  LOOP
    v_total := v_total + 1;

    BEGIN
      PERFORM regenerate_subscription_echeancier(v_subscription_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERREUR pour souscription %: %', v_subscription_id, SQLERRM;
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  SELECT COUNT(*) INTO v_final_count FROM coupons_echeances;

  RAISE NOTICE '=== RÉSULTAT ===';
  RAISE NOTICE 'Souscriptions traitées: %', v_total;
  RAISE NOTICE 'Souscriptions ignorées: %', v_skipped;
  RAISE NOTICE 'Échéances créées: %', v_final_count;

  RETURN QUERY SELECT v_total, v_final_count, v_skipped;
END;
$function$;

CREATE OR REPLACE FUNCTION public.regenerate_subscription_echeancier(p_souscription_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_montant_investi numeric;
  v_taux_nominal numeric;
  v_periodicite text;
  v_date_emission date;
  v_duree_mois integer;
  v_months_between_payments integer;
  v_payments_per_year numeric;
  v_number_of_payments integer;
  v_annual_coupon numeric;
  v_coupon_per_payment numeric;
  v_payment_date date;
  v_i integer;
BEGIN
  SELECT
    s.montant_investi,
    COALESCE(t.taux_nominal, p.taux_nominal) as taux_nominal,
    COALESCE(t.periodicite_coupons, p.periodicite_coupons) as periodicite,
    t.date_emission,
    COALESCE(t.duree_mois, p.maturite_mois) as duree_mois
  INTO
    v_montant_investi,
    v_taux_nominal,
    v_periodicite,
    v_date_emission,
    v_duree_mois
  FROM souscriptions s
  JOIN tranches t ON t.id = s.tranche_id
  JOIN projets p ON p.id = t.projet_id
  WHERE s.id = p_souscription_id;

  IF v_taux_nominal IS NULL OR v_periodicite IS NULL OR v_date_emission IS NULL OR v_duree_mois IS NULL THEN
    RAISE NOTICE 'Souscription % : Paramètres manquants (taux=%, periodicite=%, date=%, duree=%)',
      p_souscription_id, v_taux_nominal, v_periodicite, v_date_emission, v_duree_mois;
    RETURN;
  END IF;

  CASE LOWER(v_periodicite)
    WHEN 'annuel', 'annuelle' THEN
      v_months_between_payments := 12;
      v_payments_per_year := 1;
    WHEN 'semestriel', 'semestrielle' THEN
      v_months_between_payments := 6;
      v_payments_per_year := 2;
    WHEN 'trimestriel', 'trimestrielle' THEN
      v_months_between_payments := 3;
      v_payments_per_year := 4;
    WHEN 'mensuel', 'mensuelle' THEN
      v_months_between_payments := 1;
      v_payments_per_year := 12;
    ELSE
      RAISE NOTICE 'Périodicité inconnue: %', v_periodicite;
      RETURN;
  END CASE;

  v_number_of_payments := CEIL(v_duree_mois::numeric / v_months_between_payments::numeric);
  v_annual_coupon := (v_montant_investi * v_taux_nominal) / 100;
  v_coupon_per_payment := v_annual_coupon / v_payments_per_year;

  RAISE NOTICE 'Souscription % : Génération de % paiements de %€ chacun',
    p_souscription_id, v_number_of_payments, ROUND(v_coupon_per_payment, 2);

  FOR v_i IN 1..v_number_of_payments LOOP
    v_payment_date := v_date_emission + (v_i * v_months_between_payments || ' months')::interval;

    INSERT INTO coupons_echeances (
      souscription_id,
      date_echeance,
      montant_coupon,
      statut
    ) VALUES (
      p_souscription_id,
      v_payment_date,
      ROUND(v_coupon_per_payment, 2),
      'en_attente'
    );
  END LOOP;

  RAISE NOTICE '✓ Souscription % : % échéances créées', p_souscription_id, v_number_of_payments;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_date_emission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.date_emission IS NULL AND NEW.projet_id IS NOT NULL THEN
    SELECT date_emission INTO NEW.date_emission
    FROM projets
    WHERE id = NEW.projet_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_tranche_periodicite()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.periodicite_coupons IS DISTINCT FROM OLD.periodicite_coupons) THEN
    UPDATE tranches
    SET periodicite_coupons = NEW.periodicite_coupons
    WHERE projet_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_coupon_statut()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.coupons_echeances
  SET statut = 'en_retard'
  WHERE date_echeance < CURRENT_DATE
    AND statut = 'en_attente';
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_coupons_echeances_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_reminder_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_can_access_org(check_org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id uuid;
  v_is_super boolean;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT COALESCE(is_superadmin, false)
  INTO v_is_super
  FROM profiles
  WHERE id = v_user_id;

  IF v_is_super THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = v_user_id
    AND org_id = check_org_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_in_org(check_org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
result boolean;
BEGIN
SELECT EXISTS (
SELECT 1 FROM memberships
WHERE org_id = check_org_id
AND user_id = auth.uid()
) INTO result;

RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_is_admin_of_org(check_org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id uuid;
  v_is_super boolean;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT COALESCE(is_superadmin, false)
  INTO v_is_super
  FROM profiles
  WHERE id = v_user_id;

  IF v_is_super THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = v_user_id
    AND org_id = check_org_id
    AND role IN ('admin', 'superadmin')
  );
END;
$function$;
