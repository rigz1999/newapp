-- ============================================
-- Fix Project to Tranche Inheritance
-- Created: 2025-11-15
-- Purpose: Remove date_emission from project propagation since projects don't have this field
-- ============================================

-- Function to propagate project changes to all tranches (FIXED)
CREATE OR REPLACE FUNCTION propagate_project_to_tranches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only propagate if financial parameters changed
  IF (NEW.taux_nominal IS DISTINCT FROM OLD.taux_nominal) OR
     (NEW.periodicite_coupons IS DISTINCT FROM OLD.periodicite_coupons) OR
     (NEW.duree_mois IS DISTINCT FROM OLD.duree_mois) THEN

    RAISE NOTICE 'Project % financial parameters changed - updating all tranches', NEW.id;

    -- Update all tranches in this project to inherit new values
    -- NOTE: date_emission is NOT copied because it's tranche-specific, not a project field
    UPDATE tranches
    SET
      taux_nominal = NEW.taux_nominal,
      periodicite_coupons = NEW.periodicite_coupons,
      duree_mois = NEW.duree_mois,
      updated_at = now()
    WHERE projet_id = NEW.id;

    RAISE NOTICE 'Updated all tranches for project %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Add comment
COMMENT ON FUNCTION propagate_project_to_tranches IS 'Propagates project financial parameter changes (taux_nominal, periodicite_coupons, duree_mois) to all tranches. date_emission is NOT propagated as it is tranche-specific.';
