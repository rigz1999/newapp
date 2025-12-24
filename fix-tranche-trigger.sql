-- Fix the recalculate_coupons_on_date_emission_change function
-- This fixes the "record new has no field date_fin" and "column s.montant_coupon does not exist" errors

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
      s.coupon_net
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
