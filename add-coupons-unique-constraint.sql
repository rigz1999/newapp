-- Add unique constraint for ON CONFLICT in generate_coupon_schedule function
-- This prevents duplicate coupons for the same subscription and date

-- First, check if there are any duplicate entries (shouldn't be any in Paris since it's new)
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT souscription_id, date_echeance, COUNT(*)
    FROM coupons_echeances
    GROUP BY souscription_id, date_echeance
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Warning: Found % duplicate entries that need to be cleaned first', duplicate_count;
  ELSE
    RAISE NOTICE 'No duplicates found - safe to add constraint';
  END IF;
END $$;

-- Add the unique constraint
ALTER TABLE public.coupons_echeances
  ADD CONSTRAINT coupons_echeances_souscription_date_unique
  UNIQUE (souscription_id, date_echeance);

-- Verify the constraint was created
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'public.coupons_echeances'::regclass
  AND conname = 'coupons_echeances_souscription_date_unique';
