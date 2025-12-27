-- One-time cleanup of orphaned écheances that reference non-existent subscriptions
-- This specifically addresses the data integrity issue found in GreenTech 2025 project

-- Step 1: Find all orphaned écheances (those referencing non-existent subscriptions)
DO $$
DECLARE
  orphaned_echeance RECORD;
  orphaned_count INT := 0;
  paiement_count INT := 0;
  proof_count INT := 0;
BEGIN
  RAISE NOTICE 'Starting cleanup of orphaned écheances...';

  -- Find and process all orphaned écheances
  FOR orphaned_echeance IN
    SELECT e.id, e.souscription_id, e.paiement_id, e.date_echeance, e.statut
    FROM coupons_echeances e
    LEFT JOIN souscriptions s ON e.souscription_id = s.id
    WHERE s.id IS NULL
  LOOP
    orphaned_count := orphaned_count + 1;

    RAISE NOTICE 'Found orphaned écheance: id=%, souscription_id=%, paiement_id=%, date=%, statut=%',
      orphaned_echeance.id,
      orphaned_echeance.souscription_id,
      orphaned_echeance.paiement_id,
      orphaned_echeance.date_echeance,
      orphaned_echeance.statut;

    -- If there's an associated paiement, delete it (payment_proofs will cascade)
    IF orphaned_echeance.paiement_id IS NOT NULL THEN
      -- Count payment proofs before deletion for logging
      SELECT COUNT(*) INTO proof_count
      FROM payment_proofs
      WHERE paiement_id = orphaned_echeance.paiement_id;

      -- Delete the paiement (payment_proofs will cascade delete)
      DELETE FROM paiements WHERE id = orphaned_echeance.paiement_id;
      paiement_count := paiement_count + 1;

      RAISE NOTICE '  -> Deleted paiement % with % proof(s)',
        orphaned_echeance.paiement_id, proof_count;
    END IF;

    -- Delete the orphaned écheance
    DELETE FROM coupons_echeances WHERE id = orphaned_echeance.id;
    RAISE NOTICE '  -> Deleted orphaned écheance %', orphaned_echeance.id;
  END LOOP;

  RAISE NOTICE 'Cleanup complete: % orphaned écheance(s) deleted, % paiement(s) deleted',
    orphaned_count, paiement_count;

  -- If we found orphans, verify they're gone
  IF orphaned_count > 0 THEN
    RAISE NOTICE 'Verifying cleanup...';

    SELECT COUNT(*) INTO orphaned_count
    FROM coupons_echeances e
    LEFT JOIN souscriptions s ON e.souscription_id = s.id
    WHERE s.id IS NULL;

    IF orphaned_count = 0 THEN
      RAISE NOTICE '✓ All orphaned écheances successfully cleaned up';
    ELSE
      RAISE WARNING 'Still found % orphaned écheances after cleanup!', orphaned_count;
    END IF;
  ELSE
    RAISE NOTICE 'No orphaned écheances found - database is clean';
  END IF;
END $$;
