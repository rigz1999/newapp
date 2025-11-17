-- ============================================
-- Fix Coupon Calculation with Periodicite
-- Created: 2025-11-17
-- Purpose: Apply period adjustment based on periodicite and base_interet
-- ============================================

-- Helper function to get period ratio
CREATE OR REPLACE FUNCTION get_period_ratio(p_periodicite text, p_base_interet numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_base numeric;
BEGIN
  v_base := COALESCE(p_base_interet, 360);

  CASE LOWER(p_periodicite)
    WHEN 'annuel', 'annuelle' THEN
      RETURN 1.0;
    WHEN 'semestriel', 'semestrielle' THEN
      IF v_base = 365 THEN
        RETURN 182.5 / 365.0;
      ELSE
        RETURN 180.0 / 360.0;
      END IF;
    WHEN 'trimestriel', 'trimestrielle' THEN
      IF v_base = 365 THEN
        RETURN 91.25 / 365.0;
      ELSE
        RETURN 90.0 / 360.0;
      END IF;
    WHEN 'mensuel', 'mensuelle' THEN
      IF v_base = 365 THEN
        RETURN 30.42 / 365.0;
      ELSE
        RETURN 30.0 / 360.0;
      END IF;
    ELSE
      RAISE WARNING 'Périodicité inconnue: %, utilisation annuelle par défaut', p_periodicite;
      RETURN 1.0;
  END CASE;
END;
$$;

-- Function to recalculate coupons for all subscriptions in a project
CREATE OR REPLACE FUNCTION recalculate_project_coupons(p_projet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Get project parameters
  SELECT taux_nominal, base_interet, periodicite_coupons
  INTO v_taux_nominal, v_base_interet, v_periodicite_coupons
  FROM projets
  WHERE id = p_projet_id;

  -- If no taux_nominal, exit
  IF v_taux_nominal IS NULL THEN
    RETURN;
  END IF;

  -- Default base_interet to 360 if not set
  v_base_interet := COALESCE(v_base_interet, 360);

  -- Loop through all subscriptions for this project
  FOR v_subscription IN
    SELECT s.id, s.montant_investi, s.investisseur_id
    FROM souscriptions s
    WHERE s.projet_id = p_projet_id
  LOOP
    -- Get investor type
    SELECT type INTO v_investor_type
    FROM investisseurs
    WHERE id = v_subscription.investisseur_id;

    -- Calculate coupon annuel (annual coupon based on taux_nominal)
    v_coupon_annuel := (v_subscription.montant_investi * v_taux_nominal) / 100.0;

    -- Get period ratio
    v_period_ratio := get_period_ratio(v_periodicite_coupons, v_base_interet);

    -- Calculate coupon brut for the period
    v_coupon_brut := v_coupon_annuel * v_period_ratio;

    -- Calculate coupon net
    -- Physique: 30% flat tax -> net = brut * 0.7
    -- Morale: no flat tax -> net = brut
    IF v_investor_type = 'physique' THEN
      v_coupon_net := v_coupon_brut * 0.7;
    ELSE
      v_coupon_net := v_coupon_brut;
    END IF;

    -- Update subscription with recalculated coupons
    UPDATE souscriptions
    SET
      coupon_brut = v_coupon_brut,
      coupon_net = v_coupon_net
    WHERE id = v_subscription.id;

    -- Log the update for debugging
    RAISE NOTICE 'Updated subscription % - Type: %, Annuel: %, Ratio: %, Brut: %, Net: %',
      v_subscription.id, v_investor_type, v_coupon_annuel, v_period_ratio, v_coupon_brut, v_coupon_net;
  END LOOP;
END;
$$;

-- Function to recalculate coupons for all subscriptions in a tranche
CREATE OR REPLACE FUNCTION recalculate_tranche_coupons(p_tranche_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_taux_nominal numeric;
  v_projet_taux_nominal numeric;
  v_base_interet numeric;
  v_periodicite_coupons text;
  v_projet_periodicite text;
  v_projet_id uuid;
  v_subscription RECORD;
  v_investor_type text;
  v_coupon_annuel numeric;
  v_period_ratio numeric;
  v_coupon_brut numeric;
  v_coupon_net numeric;
BEGIN
  -- Get tranche info (taux_nominal and periodicite can be null if using project's)
  SELECT t.taux_nominal, t.periodicite_coupons, t.projet_id, p.taux_nominal, p.base_interet, p.periodicite_coupons
  INTO v_taux_nominal, v_periodicite_coupons, v_projet_id, v_projet_taux_nominal, v_base_interet, v_projet_periodicite
  FROM tranches t
  JOIN projets p ON p.id = t.projet_id
  WHERE t.id = p_tranche_id;

  -- Use tranche values if set, otherwise use project's
  v_taux_nominal := COALESCE(v_taux_nominal, v_projet_taux_nominal);
  v_periodicite_coupons := COALESCE(v_periodicite_coupons, v_projet_periodicite);
  v_base_interet := COALESCE(v_base_interet, 360);

  -- If no taux_nominal available, exit
  IF v_taux_nominal IS NULL THEN
    RETURN;
  END IF;

  -- Loop through all subscriptions for this tranche
  FOR v_subscription IN
    SELECT s.id, s.montant_investi, s.investisseur_id
    FROM souscriptions s
    WHERE s.tranche_id = p_tranche_id
  LOOP
    -- Get investor type
    SELECT type INTO v_investor_type
    FROM investisseurs
    WHERE id = v_subscription.investisseur_id;

    -- Calculate coupon annuel (annual coupon based on taux_nominal)
    v_coupon_annuel := (v_subscription.montant_investi * v_taux_nominal) / 100.0;

    -- Get period ratio
    v_period_ratio := get_period_ratio(v_periodicite_coupons, v_base_interet);

    -- Calculate coupon brut for the period
    v_coupon_brut := v_coupon_annuel * v_period_ratio;

    -- Calculate coupon net
    -- Physique: 30% flat tax -> net = brut * 0.7
    -- Morale: no flat tax -> net = brut
    IF v_investor_type = 'physique' THEN
      v_coupon_net := v_coupon_brut * 0.7;
    ELSE
      v_coupon_net := v_coupon_brut;
    END IF;

    -- Update subscription with recalculated coupons
    UPDATE souscriptions
    SET
      coupon_brut = v_coupon_brut,
      coupon_net = v_coupon_net
    WHERE id = v_subscription.id;

    -- Log the update for debugging
    RAISE NOTICE 'Updated subscription % - Type: %, Periodicite: %, Annuel: %, Ratio: %, Brut: %, Net: %',
      v_subscription.id, v_investor_type, v_periodicite_coupons, v_coupon_annuel, v_period_ratio, v_coupon_brut, v_coupon_net;
  END LOOP;
END;
$$;

-- Add comments
COMMENT ON FUNCTION get_period_ratio IS 'Calculates the period ratio based on periodicite and base_interet for coupon calculations';
COMMENT ON FUNCTION recalculate_project_coupons IS 'Recalculates coupon_brut and coupon_net for all subscriptions in a project with period adjustment. Applies 30% flat tax ONLY for physical persons.';
COMMENT ON FUNCTION recalculate_tranche_coupons IS 'Recalculates coupon_brut and coupon_net for all subscriptions in a tranche with period adjustment. Applies 30% flat tax ONLY for physical persons.';
