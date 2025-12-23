-- Backfill org_id for existing investisseurs records
-- Get org_id from souscriptions -> tranches -> projets relationship

-- Update investisseurs that have subscriptions but no org_id
UPDATE investisseurs inv
SET org_id = (
  SELECT p.org_id
  FROM souscriptions s
  JOIN tranches t ON s.tranche_id = t.id
  JOIN projets p ON t.projet_id = p.id
  WHERE s.investisseur_id = inv.id
  LIMIT 1
)
WHERE inv.org_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM souscriptions s
    WHERE s.investisseur_id = inv.id
  );

-- Log the results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM investisseurs
  WHERE org_id IS NOT NULL;

  RAISE NOTICE 'Backfilled org_id for investisseurs. Total with org_id: %', updated_count;
END $$;
