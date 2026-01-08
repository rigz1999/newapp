-- ============================================
-- Fix Coupon Calculation on Subscription Insert/Update
-- Created: 2026-01-08
-- Purpose: Automatically calculate coupon_brut and coupon_net when subscriptions are created/updated
-- Issue: Subscriptions created without calling recalculate_tranche_coupons have coupon_net = coupon_brut
--        For personne physique, net should be 70% of brut (30% flat tax)
-- ============================================

-- 1. Create function to calculate coupons for a single subscription
CREATE OR REPLACE FUNCTION calculate_subscription_coupons()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_taux_nominal numeric;
  v_projet_taux_nominal numeric;
  v_base_interet numeric;
  v_periodicite_coupons text;
  v_investor_type text;
  v_coupon_annuel numeric;
  v_period_ratio numeric;
BEGIN
  -- Skip if montant_investi is NULL or 0
  IF NEW.montant_investi IS NULL OR NEW.montant_investi = 0 THEN
    RETURN NEW;
  END IF;

  -- Get tranche and project info
  SELECT t.taux_nominal, p.taux_nominal, p.base_interet, p.periodicite_coupons
  INTO v_taux_nominal, v_projet_taux_nominal, v_base_interet, v_periodicite_coupons
  FROM tranches t
  JOIN projets p ON p.id = t.projet_id
  WHERE t.id = NEW.tranche_id;

  -- Use tranche taux_nominal if set, otherwise use project's
  v_taux_nominal := COALESCE(v_taux_nominal, v_projet_taux_nominal);
  v_base_interet := COALESCE(v_base_interet, 360);

  -- If no taux_nominal available, exit without calculating
  IF v_taux_nominal IS NULL OR v_periodicite_coupons IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get investor type
  SELECT type INTO v_investor_type
  FROM investisseurs
  WHERE id = NEW.investisseur_id;

  -- Calculate coupon annuel (annual coupon based on taux_nominal)
  v_coupon_annuel := (NEW.montant_investi * v_taux_nominal) / 100.0;

  -- Get period ratio
  v_period_ratio := get_period_ratio(v_periodicite_coupons, v_base_interet);

  -- Calculate coupon brut for the period
  NEW.coupon_brut := v_coupon_annuel * v_period_ratio;

  -- Calculate coupon net
  -- Physique: 30% flat tax -> net = brut * 0.7
  -- Morale: no flat tax -> net = brut
  IF LOWER(v_investor_type) = 'physique' THEN
    NEW.coupon_net := NEW.coupon_brut * 0.7;
  ELSE
    NEW.coupon_net := NEW.coupon_brut;
  END IF;

  RAISE NOTICE 'Calculated coupons for subscription - Investor type: %, Brut: %, Net: %',
    v_investor_type, NEW.coupon_brut, NEW.coupon_net;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION calculate_subscription_coupons IS
  'Trigger function that automatically calculates coupon_brut and coupon_net when a subscription is inserted or updated.
   Applies 30% flat tax for physical persons (personne physique).
   Uses project periodicite and taux_nominal (or tranche taux_nominal if set).';

-- 2. Create trigger for INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_calculate_subscription_coupons ON souscriptions;
CREATE TRIGGER trigger_calculate_subscription_coupons
  BEFORE INSERT OR UPDATE OF montant_investi, tranche_id, investisseur_id
  ON souscriptions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_subscription_coupons();

COMMENT ON TRIGGER trigger_calculate_subscription_coupons ON souscriptions IS
  'Automatically calculates coupon_brut and coupon_net when subscriptions are created or their key fields are updated';

-- 3. Recalculate all existing subscriptions to fix any that have incorrect values
DO $$
DECLARE
  v_tranche_id uuid;
  v_count integer := 0;
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'RECALCULATING ALL EXISTING SUBSCRIPTIONS';
  RAISE NOTICE '===========================================';

  -- Loop through all tranches and recalculate their subscriptions
  FOR v_tranche_id IN SELECT id FROM tranches
  LOOP
    PERFORM recalculate_tranche_coupons(v_tranche_id);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Recalculated subscriptions for % tranches', v_count;
  RAISE NOTICE '===========================================';
END $$;

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'FIXED COUPON CALCULATION ON INSERT/UPDATE';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '1. Created trigger to auto-calculate coupons on subscription insert/update';
  RAISE NOTICE '2. Recalculated all existing subscriptions';
  RAISE NOTICE '3. For personne physique: coupon_net = coupon_brut * 0.7 (30%% tax)';
  RAISE NOTICE '4. For personne morale: coupon_net = coupon_brut (no tax)';
  RAISE NOTICE '===========================================';
END $$;
