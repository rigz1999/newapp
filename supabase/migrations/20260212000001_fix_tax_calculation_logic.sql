-- ============================================
-- Fix Tax Calculation Logic in Subscription Trigger
-- Created: 2026-02-12
-- Purpose: Change tax logic from "is physique? apply tax" to "is NOT morale? apply tax"
-- Issue: Investors with null/empty type values display as "Personne physique" in the UI
--        but the trigger checks LOWER(type) = 'physique' which fails for null/empty values,
--        resulting in 30% tax not being applied for these investors.
-- Fix: Apply 30% tax for all investor types that are NOT explicitly 'morale'
-- ============================================

-- 1. Update the trigger function
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
  -- FIXED: Apply 30% tax for all investors NOT explicitly 'morale'
  -- This handles null/empty types that display as 'physique' in the UI
  IF LOWER(v_investor_type) = 'morale' THEN
    NEW.coupon_net := NEW.coupon_brut;
  ELSE
    NEW.coupon_net := NEW.coupon_brut * 0.7;
  END IF;

  RAISE NOTICE 'Calculated coupons for subscription - Investor type: %, Brut: %, Net: %',
    v_investor_type, NEW.coupon_brut, NEW.coupon_net;

  RETURN NEW;
END;
$$;

-- 2. Recalculate all existing subscriptions to fix any with incorrect tax values
DO $$
DECLARE
  v_tranche_id uuid;
  v_count integer := 0;
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'RECALCULATING ALL SUBSCRIPTIONS (TAX FIX)';
  RAISE NOTICE '===========================================';

  FOR v_tranche_id IN SELECT id FROM tranches
  LOOP
    PERFORM recalculate_tranche_coupons(v_tranche_id);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Recalculated subscriptions for % tranches', v_count;
  RAISE NOTICE '===========================================';
END $$;
