-- ============================================
-- Project to Tranche Inheritance
-- Created: 2025-11-14
-- Purpose: Automatically update all tranches when project financial parameters change
-- ============================================

-- Function to propagate project changes to all tranches
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
     (NEW.duree_mois IS DISTINCT FROM OLD.duree_mois) OR
     (NEW.date_emission IS DISTINCT FROM OLD.date_emission) THEN

    RAISE NOTICE 'Project % financial parameters changed - updating all tranches', NEW.id;

    -- Update all tranches in this project to inherit new values
    UPDATE tranches
    SET
      taux_nominal = NEW.taux_nominal,
      periodicite_coupons = NEW.periodicite_coupons,
      duree_mois = NEW.duree_mois,
      date_emission = NEW.date_emission,
      updated_at = now()
    WHERE projet_id = NEW.id;

    RAISE NOTICE 'Updated all tranches for project %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_propagate_project_to_tranches ON projets;

-- Create trigger on projets table
CREATE TRIGGER trigger_propagate_project_to_tranches
  AFTER UPDATE ON projets
  FOR EACH ROW
  EXECUTE FUNCTION propagate_project_to_tranches();

-- Update the existing tranche trigger to NOT delete paid coupons
-- This is handled by the regenerate-echeancier Edge Function now
CREATE OR REPLACE FUNCTION recalculate_on_tranche_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only recalculate if financial parameters changed
  IF (NEW.taux_nominal IS DISTINCT FROM OLD.taux_nominal) OR
     (NEW.periodicite_coupons IS DISTINCT FROM OLD.periodicite_coupons) OR
     (NEW.duree_mois IS DISTINCT FROM OLD.duree_mois) OR
     (NEW.date_emission IS DISTINCT FROM OLD.date_emission) THEN

    RAISE NOTICE 'Tranche % financial parameters changed - recalculating coupons', NEW.id;

    -- Recalculate all coupons for this tranche
    PERFORM recalculate_tranche_coupons(NEW.id);

    -- Delete only PENDING payment schedules (keep paid ones)
    -- This preserves payment history
    DELETE FROM coupons_echeances
    WHERE souscription_id IN (
      SELECT id FROM souscriptions WHERE tranche_id = NEW.id
    )
    AND statut != 'payé';

    RAISE NOTICE 'Deleted pending payment schedules for tranche % (kept paid ones)', NEW.id;

    -- Note: The application should call regenerate-echeancier Edge Function
    -- to regenerate the payment schedule after this trigger completes
  END IF;

  RETURN NEW;
END;
$$;

-- Add updated_at column to tranches if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tranches' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE tranches ADD COLUMN updated_at timestamp with time zone DEFAULT now();
  END IF;
END
$$;

-- Add comments
COMMENT ON FUNCTION propagate_project_to_tranches IS 'Propagates project financial parameter changes to all tranches in the project';
COMMENT ON TRIGGER trigger_propagate_project_to_tranches ON projets IS 'Updates all tranches when project financial parameters change';
