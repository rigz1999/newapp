-- ============================================
-- Fix Interest Rate and Coupon Calculations
-- Created: 2025-12-22
-- Purpose: Fix all coupon calculation bugs
-- ============================================

-- 1. Fix get_period_ratio function - PostgreSQL CASE syntax error
-- The previous version used invalid comma syntax in WHEN clauses
CREATE OR REPLACE FUNCTION get_period_ratio(p_periodicite text, p_base_interet numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_base numeric;
  v_periodicite_lower text;
BEGIN
  v_base := COALESCE(p_base_interet, 360);
  v_periodicite_lower := LOWER(p_periodicite);

  -- Fixed: Use separate WHEN clauses instead of comma-separated values
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
$$;

COMMENT ON FUNCTION get_period_ratio IS 'Calculates the period ratio based on periodicite and base_interet for coupon calculations. FIXED: Corrected PostgreSQL CASE syntax.';

-- 2. Update recalculate_tranche_coupons to:
--    - ALWAYS use project periodicite (never tranche periodicite)
--    - Fix case sensitivity for investor type
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
  v_projet_id uuid;
  v_subscription RECORD;
  v_investor_type text;
  v_coupon_annuel numeric;
  v_period_ratio numeric;
  v_coupon_brut numeric;
  v_coupon_net numeric;
BEGIN
  -- Get tranche and project info
  SELECT t.taux_nominal, t.projet_id, p.taux_nominal, p.base_interet, p.periodicite_coupons
  INTO v_taux_nominal, v_projet_id, v_projet_taux_nominal, v_base_interet, v_periodicite_coupons
  FROM tranches t
  JOIN projets p ON p.id = t.projet_id
  WHERE t.id = p_tranche_id;

  -- Use tranche taux_nominal if set, otherwise use project's
  v_taux_nominal := COALESCE(v_taux_nominal, v_projet_taux_nominal);
  v_base_interet := COALESCE(v_base_interet, 360);

  -- IMPORTANT: periodicite ALWAYS comes from project, never from tranche

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
    -- FIXED: Case-insensitive comparison to handle both 'physique' and 'Physique'
    IF LOWER(v_investor_type) = 'physique' THEN
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

COMMENT ON FUNCTION recalculate_tranche_coupons IS 'Recalculates coupon_brut and coupon_net for all subscriptions in a tranche. Periodicite ALWAYS comes from project. Case-insensitive investor type check. Applies 30% flat tax ONLY for physical persons.';

-- 3. Clear all tranche periodicite_coupons values (tranches should inherit from project)
UPDATE tranches
SET periodicite_coupons = NULL
WHERE periodicite_coupons IS NOT NULL;

-- 4. Add a comment explaining the inheritance model
COMMENT ON COLUMN tranches.periodicite_coupons IS 'DEPRECATED: Should always be NULL. Tranches inherit periodicite from their project.';

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'FIXED COUPON CALCULATION BUGS';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '1. Fixed PostgreSQL CASE syntax in get_period_ratio';
  RAISE NOTICE '2. Tranches now ALWAYS inherit periodicite from project';
  RAISE NOTICE '3. Fixed case sensitivity for investor type comparison';
  RAISE NOTICE '4. Cleared all tranche periodicite_coupons values';
  RAISE NOTICE '===========================================';
END $$;
