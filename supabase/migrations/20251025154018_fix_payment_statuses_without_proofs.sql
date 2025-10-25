/*
  # Fix Payment Statuses Without Proofs

  1. Updates
    - Set correct status for payments marked as 'Payé' or 'paid' but have no proof uploaded
    - Status based on date:
      - If date_paiement is > 7 days in the past: 'En retard'
      - Otherwise: 'En attente'

  2. Notes
    - Only affects payments currently marked as paid without proofs
    - Preserves payments that actually have proof files
*/

-- Update payments marked as paid but have no proofs
UPDATE paiements
SET statut = CASE
  WHEN date_paiement < (CURRENT_DATE - INTERVAL '7 days') THEN 'En retard'
  ELSE 'En attente'
END
WHERE (statut = 'Payé' OR statut = 'paid')
  AND id NOT IN (
    SELECT paiement_id FROM payment_proofs
  );
