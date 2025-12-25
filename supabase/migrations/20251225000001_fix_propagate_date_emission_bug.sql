-- ============================================
-- Fix Critical Bug: propagate_project_to_tranches overwrites tranche date_emission
-- Created: 2025-12-25
-- Bug: When changing project periodicité, the trigger was setting tranche.date_emission = project.date_emission (NULL)
-- This caused tranches to lose their date_emission values
-- ============================================

-- Function to propagate project changes to all tranches (FIXED - DOES NOT TOUCH date_emission)
CREATE OR REPLACE FUNCTION propagate_project_to_tranches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only propagate if financial parameters changed
  -- NOTE: date_emission is NOT included because it's tranche-specific, not a project field
  IF (NEW.taux_nominal IS DISTINCT FROM OLD.taux_nominal) OR
     (NEW.periodicite_coupons IS DISTINCT FROM OLD.periodicite_coupons) OR
     (NEW.duree_mois IS DISTINCT FROM OLD.duree_mois) THEN

    RAISE NOTICE 'Project % financial parameters changed - updating tranches', NEW.id;

    -- Update tranches with project parameters
    -- IMPORTANT: date_emission is NOT copied because it's tranche-specific
    UPDATE tranches
    SET
      taux_nominal = NEW.taux_nominal,
      periodicite_coupons = NEW.periodicite_coupons,
      duree_mois = NEW.duree_mois
    WHERE projet_id = NEW.id;

    RAISE NOTICE 'Updated all tranches for project %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Add comment
COMMENT ON FUNCTION propagate_project_to_tranches IS 'Propagates project financial parameter changes (taux_nominal, periodicite_coupons, duree_mois) to all tranches. date_emission is NOT propagated as it is tranche-specific.';
