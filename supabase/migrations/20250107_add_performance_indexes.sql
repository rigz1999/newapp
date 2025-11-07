-- ============================================
-- Performance Indexes Migration
-- Created: 2025-01-07
-- Purpose: Add indexes to improve query performance on large datasets
-- ============================================

-- Index on memberships.user_id for faster user lookup
CREATE INDEX IF NOT EXISTS idx_memberships_user_id
ON memberships(user_id);

-- Index on memberships.org_id for faster organization queries
CREATE INDEX IF NOT EXISTS idx_memberships_org_id
ON memberships(org_id);

-- Composite index for org membership queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_memberships_org_user
ON memberships(org_id, user_id);

-- Index on paiements.date_paiement for date-based ordering and filtering
CREATE INDEX IF NOT EXISTS idx_paiements_date
ON paiements(date_paiement DESC);

-- Index on paiements.tranche_id for joining with tranches
CREATE INDEX IF NOT EXISTS idx_paiements_tranche_id
ON paiements(tranche_id);

-- Index on souscriptions.tranche_id for faster tranche queries
CREATE INDEX IF NOT EXISTS idx_souscriptions_tranche_id
ON souscriptions(tranche_id);

-- Index on souscriptions.investisseur_id for faster investor queries
CREATE INDEX IF NOT EXISTS idx_souscriptions_investisseur_id
ON souscriptions(investisseur_id);

-- Index on tranches.projet_id for faster project queries
CREATE INDEX IF NOT EXISTS idx_tranches_projet_id
ON tranches(projet_id);

-- Index on projets.org_id for faster organization queries
CREATE INDEX IF NOT EXISTS idx_projets_org_id
ON projets(org_id);

-- Index on investisseurs.org_id for faster organization queries
CREATE INDEX IF NOT EXISTS idx_investisseurs_org_id
ON investisseurs(org_id);

-- Index on invitations.org_id for faster organization queries
CREATE INDEX IF NOT EXISTS idx_invitations_org_id
ON invitations(org_id);

-- Index on invitations.email for faster email lookup
CREATE INDEX IF NOT EXISTS idx_invitations_email
ON invitations(email);

-- Index on invitations.status for filtering pending invitations
CREATE INDEX IF NOT EXISTS idx_invitations_status
ON invitations(status);

-- Composite index for active invitations by org (common query pattern)
CREATE INDEX IF NOT EXISTS idx_invitations_org_status
ON invitations(org_id, status)
WHERE status = 'pending';

-- Index on payment_proofs.paiement_id for faster proof lookup
CREATE INDEX IF NOT EXISTS idx_payment_proofs_paiement_id
ON payment_proofs(paiement_id);

-- Index on echeancier.tranche_id for faster schedule queries
CREATE INDEX IF NOT EXISTS idx_echeancier_tranche_id
ON echeancier(tranche_id);

-- Index on echeancier.date_echeance for date-based queries
CREATE INDEX IF NOT EXISTS idx_echeancier_date
ON echeancier(date_echeance);

-- Composite index for upcoming payment schedules (common query)
CREATE INDEX IF NOT EXISTS idx_echeancier_tranche_date
ON echeancier(tranche_id, date_echeance)
WHERE statut = 'à venir';

-- Index on profiles.id for faster profile lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_profiles_id
ON profiles(id);

-- Add created_at indexes for tables with temporal ordering
CREATE INDEX IF NOT EXISTS idx_memberships_created_at
ON memberships(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_paiements_created_at
ON paiements(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_souscriptions_created_at
ON souscriptions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tranches_created_at
ON tranches(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projets_created_at
ON projets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_investisseurs_created_at
ON investisseurs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invitations_created_at
ON invitations(created_at DESC);

-- Analyze tables to update statistics for query planner
ANALYZE memberships;
ANALYZE paiements;
ANALYZE souscriptions;
ANALYZE tranches;
ANALYZE projets;
ANALYZE investisseurs;
ANALYZE invitations;
ANALYZE payment_proofs;
ANALYZE echeancier;
ANALYZE profiles;

-- Add comments for documentation
COMMENT ON INDEX idx_memberships_org_user IS 'Composite index for organization membership lookups';
COMMENT ON INDEX idx_paiements_date IS 'Index for date-based payment queries and sorting';
COMMENT ON INDEX idx_invitations_org_status IS 'Partial index for active invitations by organization';
COMMENT ON INDEX idx_echeancier_tranche_date IS 'Partial index for upcoming payment schedules';
