-- Fix Foreign Key Relationships for Paris Database
-- This creates the missing foreign key between memberships.user_id and profiles.id
-- which is required for Supabase PostgREST to understand table relationships

-- ==============================================
-- STEP 1: Check existing foreign keys
-- ==============================================
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('memberships', 'invitations', 'projets', 'tranches', 'souscriptions', 'paiements', 'payment_proofs', 'coupons_echeances')
ORDER BY tc.table_name, tc.constraint_name;

-- ==============================================
-- STEP 2: Add missing foreign keys
-- ==============================================

-- memberships.user_id -> profiles.id
-- This is critical for the admin panel query to work
ALTER TABLE memberships
DROP CONSTRAINT IF EXISTS memberships_user_id_fkey CASCADE;

ALTER TABLE memberships
ADD CONSTRAINT memberships_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- memberships.org_id -> organizations.id
ALTER TABLE memberships
DROP CONSTRAINT IF EXISTS memberships_org_id_fkey CASCADE;

ALTER TABLE memberships
ADD CONSTRAINT memberships_org_id_fkey
FOREIGN KEY (org_id)
REFERENCES organizations(id)
ON DELETE CASCADE;

-- invitations.org_id -> organizations.id
ALTER TABLE invitations
DROP CONSTRAINT IF EXISTS invitations_org_id_fkey CASCADE;

ALTER TABLE invitations
ADD CONSTRAINT invitations_org_id_fkey
FOREIGN KEY (org_id)
REFERENCES organizations(id)
ON DELETE CASCADE;

-- projets.org_id -> organizations.id
ALTER TABLE projets
DROP CONSTRAINT IF EXISTS projets_org_id_fkey CASCADE;

ALTER TABLE projets
ADD CONSTRAINT projets_org_id_fkey
FOREIGN KEY (org_id)
REFERENCES organizations(id)
ON DELETE CASCADE;

-- tranches.projet_id -> projets.id
ALTER TABLE tranches
DROP CONSTRAINT IF EXISTS tranches_projet_id_fkey CASCADE;

ALTER TABLE tranches
ADD CONSTRAINT tranches_projet_id_fkey
FOREIGN KEY (projet_id)
REFERENCES projets(id)
ON DELETE CASCADE;

-- souscriptions.tranche_id -> tranches.id
ALTER TABLE souscriptions
DROP CONSTRAINT IF EXISTS souscriptions_tranche_id_fkey CASCADE;

ALTER TABLE souscriptions
ADD CONSTRAINT souscriptions_tranche_id_fkey
FOREIGN KEY (tranche_id)
REFERENCES tranches(id)
ON DELETE CASCADE;

-- souscriptions.investisseur_id -> investisseurs.id
ALTER TABLE souscriptions
DROP CONSTRAINT IF EXISTS souscriptions_investisseur_id_fkey CASCADE;

ALTER TABLE souscriptions
ADD CONSTRAINT souscriptions_investisseur_id_fkey
FOREIGN KEY (investisseur_id)
REFERENCES investisseurs(id)
ON DELETE RESTRICT;

-- paiements.org_id -> organizations.id
ALTER TABLE paiements
DROP CONSTRAINT IF EXISTS paiements_org_id_fkey CASCADE;

ALTER TABLE paiements
ADD CONSTRAINT paiements_org_id_fkey
FOREIGN KEY (org_id)
REFERENCES organizations(id)
ON DELETE CASCADE;

-- payment_proofs.paiement_id -> paiements.id
ALTER TABLE payment_proofs
DROP CONSTRAINT IF EXISTS payment_proofs_paiement_id_fkey CASCADE;

ALTER TABLE payment_proofs
ADD CONSTRAINT payment_proofs_paiement_id_fkey
FOREIGN KEY (paiement_id)
REFERENCES paiements(id)
ON DELETE CASCADE;

-- coupons_echeances.souscription_id -> souscriptions.id
ALTER TABLE coupons_echeances
DROP CONSTRAINT IF EXISTS coupons_echeances_souscription_id_fkey CASCADE;

ALTER TABLE coupons_echeances
ADD CONSTRAINT coupons_echeances_souscription_id_fkey
FOREIGN KEY (souscription_id)
REFERENCES souscriptions(id)
ON DELETE CASCADE;

-- ==============================================
-- STEP 3: Verification
-- ==============================================
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('memberships', 'invitations', 'projets', 'tranches', 'souscriptions', 'paiements', 'payment_proofs', 'coupons_echeances')
ORDER BY tc.table_name, kcu.column_name;
