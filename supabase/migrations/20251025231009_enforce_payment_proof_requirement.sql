/*
  # Enforce Payment Proof Requirement

  1. Function & Trigger
    - Creates a function to validate payment status based on proof existence
    - Creates a trigger that runs before INSERT or UPDATE on paiements table
    - Automatically changes status from 'Payé'/'paid' to 'En attente' if no proof exists

  2. Security
    - Prevents payments from being marked as paid without proof
    - Maintains data integrity automatically
    - Works for both new payments and updates

  3. Notes
    - Only affects status changes to 'Payé' or 'paid'
    - Allows other statuses without proof
    - Trigger runs BEFORE operation to prevent invalid data
*/

-- Create function to validate payment status
CREATE OR REPLACE FUNCTION validate_payment_proof()
RETURNS TRIGGER AS $$
BEGIN
  -- If trying to set status to 'Payé' or 'paid'
  IF (NEW.statut = 'Payé' OR NEW.statut = 'paid') THEN
    -- Check if proof exists
    IF NOT EXISTS (
      SELECT 1 FROM payment_proofs WHERE paiement_id = NEW.id
    ) THEN
      -- No proof exists, set to 'En attente' instead
      NEW.statut = 'En attente';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on paiements table
DROP TRIGGER IF EXISTS enforce_payment_proof ON paiements;
CREATE TRIGGER enforce_payment_proof
  BEFORE INSERT OR UPDATE ON paiements
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_proof();
