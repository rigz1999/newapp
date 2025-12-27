-- Add CASCADE delete constraints to prevent orphaned records
-- This ensures that when a subscription is deleted, all related écheances are automatically deleted

-- Drop existing foreign key constraint on coupons_echeances.souscription_id
ALTER TABLE coupons_echeances
DROP CONSTRAINT IF EXISTS coupons_echeances_souscription_id_fkey;

-- Re-add the constraint with CASCADE delete
ALTER TABLE coupons_echeances
ADD CONSTRAINT coupons_echeances_souscription_id_fkey
  FOREIGN KEY (souscription_id)
  REFERENCES souscriptions(id)
  ON DELETE CASCADE;

-- Also add CASCADE for paiements to ensure related records are deleted together
ALTER TABLE coupons_echeances
DROP CONSTRAINT IF EXISTS coupons_echeances_paiement_id_fkey;

ALTER TABLE coupons_echeances
ADD CONSTRAINT coupons_echeances_paiement_id_fkey
  FOREIGN KEY (paiement_id)
  REFERENCES paiements(id)
  ON DELETE SET NULL;  -- Set to NULL rather than CASCADE to preserve écheance record

-- Add CASCADE for payment_proofs.paiement_id
ALTER TABLE payment_proofs
DROP CONSTRAINT IF EXISTS payment_proofs_paiement_id_fkey;

ALTER TABLE payment_proofs
ADD CONSTRAINT payment_proofs_paiement_id_fkey
  FOREIGN KEY (paiement_id)
  REFERENCES paiements(id)
  ON DELETE CASCADE;

COMMENT ON CONSTRAINT coupons_echeances_souscription_id_fkey ON coupons_echeances IS
  'Cascade delete: When subscription is deleted, all related écheances are automatically deleted';

COMMENT ON CONSTRAINT coupons_echeances_paiement_id_fkey ON coupons_echeances IS
  'Set NULL on delete: When paiement is deleted, écheance.paiement_id is set to NULL to preserve the écheance record';

COMMENT ON CONSTRAINT payment_proofs_paiement_id_fkey ON payment_proofs IS
  'Cascade delete: When paiement is deleted, all related payment proofs are automatically deleted';
