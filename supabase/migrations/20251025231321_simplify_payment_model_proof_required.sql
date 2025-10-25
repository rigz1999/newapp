/*
  # Simplify Payment Model - Proof Required

  1. Changes
    - Remove `statut` column from paiements table
    - Payment records ONLY exist when they have been made (with proof)
    - No "pending" or "overdue" statuses - if payment exists, it's been paid
    - Status tracking moves to coupons table based on payment existence

  2. Philosophy
    - Payment record = Proof of payment made
    - No payment record = Not yet paid
    - Coupons table shows status by checking if linked payment exists

  3. Notes
    - Existing data: payments without proofs will be deleted
    - This enforces data integrity at schema level
    - Status is derived, not stored
*/

-- First, delete any payments without proofs
DELETE FROM paiements
WHERE id NOT IN (
  SELECT paiement_id FROM payment_proofs
);

-- Drop the trigger and function that validated status
DROP TRIGGER IF EXISTS enforce_payment_proof ON paiements;
DROP FUNCTION IF EXISTS validate_payment_proof();

-- Remove statut column from paiements
ALTER TABLE paiements DROP COLUMN IF EXISTS statut;

-- Add comment explaining the model
COMMENT ON TABLE paiements IS 'Payment records represent completed payments with proof. A record existing means payment has been made.';
COMMENT ON TABLE payment_proofs IS 'Every payment MUST have at least one proof. Payment cannot exist without proof.';
