-- ============================================
-- Dynamic PFU Tax Rate
-- Created: 2026-02-12
-- Purpose: Make the PFU tax rate configurable via platform_settings
--          Update rate from 30% to 31.4% per regulation change
--          Only recalculate unpaid echeances
-- ============================================

-- 1. Seed the default PFU rate in platform_settings
INSERT INTO platform_settings (key, value, updated_at)
VALUES ('default_tax_rate_physical', '0.314'::jsonb, now())
ON CONFLICT (key) DO UPDATE SET value = '0.314'::jsonb, updated_at = now();

-- 2. Helper function to read the PFU rate from platform_settings
CREATE OR REPLACE FUNCTION get_pfu_rate()
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
BEGIN
  SELECT (value)::numeric INTO v_rate
  FROM platform_settings
  WHERE key = 'default_tax_rate_physical';

  RETURN COALESCE(v_rate, 0.314);
END;
$$;

COMMENT ON FUNCTION get_pfu_rate IS
  'Returns the current PFU (Prelevement Forfaitaire Unique) tax rate from platform_settings. Defaults to 0.314 (31.4%).';

-- 3. Update calculate_subscription_coupons() to use dynamic rate
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
  v_custom_tax_rate numeric;
  v_tax_rate numeric;
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

  -- Get investor type and custom tax rate
  SELECT type, custom_tax_rate INTO v_investor_type, v_custom_tax_rate
  FROM investisseurs
  WHERE id = NEW.investisseur_id;

  -- Calculate coupon annuel (annual coupon based on taux_nominal)
  v_coupon_annuel := (NEW.montant_investi * v_taux_nominal) / 100.0;

  -- Get period ratio
  v_period_ratio := get_period_ratio(v_periodicite_coupons, v_base_interet);

  -- Calculate coupon brut for the period
  NEW.coupon_brut := v_coupon_annuel * v_period_ratio;

  -- Calculate coupon net using dynamic rate
  -- Morale: no tax. Others: apply PFU rate (custom or platform default)
  IF LOWER(v_investor_type) = 'morale' THEN
    NEW.coupon_net := NEW.coupon_brut;
  ELSE
    v_tax_rate := COALESCE(v_custom_tax_rate, get_pfu_rate());
    NEW.coupon_net := NEW.coupon_brut * (1 - v_tax_rate);
  END IF;

  RAISE NOTICE 'Calculated coupons for subscription - Investor type: %, Tax rate: %, Brut: %, Net: %',
    v_investor_type, v_tax_rate, NEW.coupon_brut, NEW.coupon_net;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION calculate_subscription_coupons IS
  'Trigger function that calculates coupon_brut and coupon_net on subscription insert/update. Uses dynamic PFU rate from platform_settings. Respects custom_tax_rate per investor.';

-- 4. Update recalculate_project_coupons() to use dynamic rate
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
  v_pfu_rate numeric;
  v_subscription RECORD;
  v_investor_type text;
  v_custom_tax_rate numeric;
  v_tax_rate numeric;
  v_coupon_annuel numeric;
  v_period_ratio numeric;
  v_coupon_brut numeric;
  v_coupon_net numeric;
BEGIN
  -- Read PFU rate once for the batch
  v_pfu_rate := get_pfu_rate();

  -- Get project parameters
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
    SELECT type, custom_tax_rate INTO v_investor_type, v_custom_tax_rate
    FROM investisseurs
    WHERE id = v_subscription.investisseur_id;

    v_coupon_annuel := (v_subscription.montant_investi * v_taux_nominal) / 100.0;
    v_period_ratio := get_period_ratio(v_periodicite_coupons, v_base_interet);
    v_coupon_brut := v_coupon_annuel * v_period_ratio;

    IF LOWER(v_investor_type) = 'morale' THEN
      v_coupon_net := v_coupon_brut;
    ELSE
      v_tax_rate := COALESCE(v_custom_tax_rate, v_pfu_rate);
      v_coupon_net := v_coupon_brut * (1 - v_tax_rate);
    END IF;

    UPDATE souscriptions
    SET coupon_brut = v_coupon_brut, coupon_net = v_coupon_net
    WHERE id = v_subscription.id;

    RAISE NOTICE 'Updated subscription % - Type: %, Brut: %, Net: %',
      v_subscription.id, v_investor_type, v_coupon_brut, v_coupon_net;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION recalculate_project_coupons IS
  'Recalculates coupon_brut and coupon_net for all subscriptions in a project. Uses dynamic PFU rate from platform_settings.';

-- 5. Update recalculate_tranche_coupons() to use dynamic rate
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
  v_pfu_rate numeric;
  v_subscription RECORD;
  v_investor_type text;
  v_custom_tax_rate numeric;
  v_tax_rate numeric;
  v_coupon_annuel numeric;
  v_period_ratio numeric;
  v_coupon_brut numeric;
  v_coupon_net numeric;
BEGIN
  -- Read PFU rate once for the batch
  v_pfu_rate := get_pfu_rate();

  SELECT t.taux_nominal, t.periodicite_coupons, t.projet_id, p.taux_nominal, p.base_interet, p.periodicite_coupons
  INTO v_taux_nominal, v_periodicite_coupons, v_projet_id, v_projet_taux_nominal, v_base_interet, v_projet_periodicite
  FROM tranches t
  JOIN projets p ON p.id = t.projet_id
  WHERE t.id = p_tranche_id;

  v_taux_nominal := COALESCE(v_taux_nominal, v_projet_taux_nominal);
  v_periodicite_coupons := COALESCE(v_periodicite_coupons, v_projet_periodicite);
  v_base_interet := COALESCE(v_base_interet, 360);

  IF v_taux_nominal IS NULL THEN
    RETURN;
  END IF;

  FOR v_subscription IN
    SELECT s.id, s.montant_investi, s.investisseur_id
    FROM souscriptions s
    WHERE s.tranche_id = p_tranche_id
  LOOP
    SELECT type, custom_tax_rate INTO v_investor_type, v_custom_tax_rate
    FROM investisseurs
    WHERE id = v_subscription.investisseur_id;

    v_coupon_annuel := (v_subscription.montant_investi * v_taux_nominal) / 100.0;
    v_period_ratio := get_period_ratio(v_periodicite_coupons, v_base_interet);
    v_coupon_brut := v_coupon_annuel * v_period_ratio;

    IF LOWER(v_investor_type) = 'morale' THEN
      v_coupon_net := v_coupon_brut;
    ELSE
      v_tax_rate := COALESCE(v_custom_tax_rate, v_pfu_rate);
      v_coupon_net := v_coupon_brut * (1 - v_tax_rate);
    END IF;

    UPDATE souscriptions
    SET coupon_brut = v_coupon_brut, coupon_net = v_coupon_net
    WHERE id = v_subscription.id;

    RAISE NOTICE 'Updated subscription % - Type: %, Brut: %, Net: %',
      v_subscription.id, v_investor_type, v_coupon_brut, v_coupon_net;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION recalculate_tranche_coupons IS
  'Recalculates coupon_brut and coupon_net for all subscriptions in a tranche. Uses dynamic PFU rate from platform_settings.';

-- 6. Recalculate souscriptions.coupon_net for all non-morale investors
-- This updates the "template" value used for new echeances
DO $$
DECLARE
  v_pfu_rate numeric;
  v_updated integer;
BEGIN
  v_pfu_rate := get_pfu_rate();

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'UPDATING SOUSCRIPTIONS TO NEW PFU RATE: %', v_pfu_rate;
  RAISE NOTICE '===========================================';

  UPDATE souscriptions s
  SET coupon_net = s.coupon_brut * (1 - v_pfu_rate)
  FROM investisseurs i
  WHERE s.investisseur_id = i.id
    AND LOWER(i.type) != 'morale'
    AND i.custom_tax_rate IS NULL
    AND s.coupon_brut IS NOT NULL
    AND s.coupon_brut > 0;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % souscriptions with new PFU rate', v_updated;
END $$;

-- 7. Recalculate ONLY UNPAID coupons_echeances
-- montant_coupon in coupons_echeances IS the net amount
-- Only update where statut != 'paye' (paid echeances keep their historical values)
DO $$
DECLARE
  v_pfu_rate numeric;
  v_updated integer;
BEGIN
  v_pfu_rate := get_pfu_rate();

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'UPDATING UNPAID ECHEANCES TO NEW PFU RATE: %', v_pfu_rate;
  RAISE NOTICE '===========================================';

  UPDATE coupons_echeances ce
  SET montant_coupon = s.coupon_brut * (1 - v_pfu_rate)
  FROM souscriptions s
  JOIN investisseurs i ON s.investisseur_id = i.id
  WHERE ce.souscription_id = s.id
    AND ce.statut != 'paye'
    AND LOWER(i.type) != 'morale'
    AND i.custom_tax_rate IS NULL
    AND s.coupon_brut IS NOT NULL
    AND s.coupon_brut > 0;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'Updated % unpaid echeances with new PFU rate', v_updated;
  RAISE NOTICE '===========================================';
END $$;
