-- ============================================
-- Enable RLS and Create Security Policies
-- ============================================

-- First, create a helper function to get user's organization IDs
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS TABLE (org_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT m.org_id
  FROM memberships m
  WHERE m.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROJETS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE projets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view projects from their organizations" ON projets;
DROP POLICY IF EXISTS "Users can insert projects in their organizations" ON projets;
DROP POLICY IF EXISTS "Users can update projects in their organizations" ON projets;
DROP POLICY IF EXISTS "Users can delete projects in their organizations" ON projets;

-- Create policies
CREATE POLICY "Users can view projects from their organizations"
  ON projets FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can insert projects in their organizations"
  ON projets FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can update projects in their organizations"
  ON projets FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()))
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can delete projects in their organizations"
  ON projets FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids()));

-- ============================================
-- INVESTISSEURS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE investisseurs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view investors from their organizations" ON investisseurs;
DROP POLICY IF EXISTS "Users can insert investors in their organizations" ON investisseurs;
DROP POLICY IF EXISTS "Users can update investors in their organizations" ON investisseurs;
DROP POLICY IF EXISTS "Users can delete investors in their organizations" ON investisseurs;

-- Create policies
CREATE POLICY "Users can view investors from their organizations"
  ON investisseurs FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can insert investors in their organizations"
  ON investisseurs FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can update investors in their organizations"
  ON investisseurs FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()))
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can delete investors in their organizations"
  ON investisseurs FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids()));

-- ============================================
-- TRANCHES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE tranches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view tranches from their organizations" ON tranches;
DROP POLICY IF EXISTS "Users can insert tranches in their organizations" ON tranches;
DROP POLICY IF EXISTS "Users can update tranches in their organizations" ON tranches;
DROP POLICY IF EXISTS "Users can delete tranches in their organizations" ON tranches;

-- Create policies (tranches belong to projects, so check through projet_id)
CREATE POLICY "Users can view tranches from their organizations"
  ON tranches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can insert tranches in their organizations"
  ON tranches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can update tranches in their organizations"
  ON tranches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can delete tranches in their organizations"
  ON tranches FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

-- ============================================
-- SOUSCRIPTIONS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE souscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view subscriptions from their organizations" ON souscriptions;
DROP POLICY IF EXISTS "Users can insert subscriptions in their organizations" ON souscriptions;
DROP POLICY IF EXISTS "Users can update subscriptions in their organizations" ON souscriptions;
DROP POLICY IF EXISTS "Users can delete subscriptions in their organizations" ON souscriptions;

-- Create policies (check through tranche -> projet)
CREATE POLICY "Users can view subscriptions from their organizations"
  ON souscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can insert subscriptions in their organizations"
  ON souscriptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can update subscriptions in their organizations"
  ON souscriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can delete subscriptions in their organizations"
  ON souscriptions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

-- ============================================
-- PAIEMENTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view payments from their organizations" ON paiements;
DROP POLICY IF EXISTS "Users can insert payments in their organizations" ON paiements;
DROP POLICY IF EXISTS "Users can update payments in their organizations" ON paiements;
DROP POLICY IF EXISTS "Users can delete payments in their organizations" ON paiements;

-- Create policies (check through souscription -> tranche -> projet)
CREATE POLICY "Users can view payments from their organizations"
  ON paiements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE souscriptions.id = paiements.souscription_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can insert payments in their organizations"
  ON paiements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE souscriptions.id = paiements.souscription_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can update payments in their organizations"
  ON paiements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE souscriptions.id = paiements.souscription_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE souscriptions.id = paiements.souscription_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can delete payments in their organizations"
  ON paiements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE souscriptions.id = paiements.souscription_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

-- ============================================
-- COUPONS TABLE (if it exists separately)
-- ============================================
-- Note: Based on the schema, coupons might be in the paiements table with type='coupon'
-- If there's a separate coupons table, uncomment and adjust this section:

-- ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "Users can view coupons from their organizations" ON coupons;
-- DROP POLICY IF EXISTS "Users can insert coupons in their organizations" ON coupons;
-- DROP POLICY IF EXISTS "Users can update coupons in their organizations" ON coupons;
-- DROP POLICY IF EXISTS "Users can delete coupons in their organizations" ON coupons;
--
-- CREATE POLICY "Users can view coupons from their organizations"
--   ON coupons FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM souscriptions
--       JOIN tranches ON tranches.id = souscriptions.tranche_id
--       JOIN projets ON projets.id = tranches.projet_id
--       WHERE souscriptions.id = coupons.souscription_id
--       AND projets.org_id IN (SELECT get_user_org_ids())
--     )
--   );

-- ============================================
-- PAYMENT_PROOFS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view payment proofs from their organizations" ON payment_proofs;
DROP POLICY IF EXISTS "Users can insert payment proofs in their organizations" ON payment_proofs;
DROP POLICY IF EXISTS "Users can update payment proofs in their organizations" ON payment_proofs;
DROP POLICY IF EXISTS "Users can delete payment proofs in their organizations" ON payment_proofs;

-- Create policies (check through paiement -> souscription -> tranche -> projet)
CREATE POLICY "Users can view payment proofs from their organizations"
  ON payment_proofs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM paiements
      JOIN souscriptions ON souscriptions.id = paiements.souscription_id
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE paiements.id = payment_proofs.paiement_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can insert payment proofs in their organizations"
  ON payment_proofs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM paiements
      JOIN souscriptions ON souscriptions.id = paiements.souscription_id
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE paiements.id = payment_proofs.paiement_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can update payment proofs in their organizations"
  ON payment_proofs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM paiements
      JOIN souscriptions ON souscriptions.id = paiements.souscription_id
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE paiements.id = payment_proofs.paiement_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM paiements
      JOIN souscriptions ON souscriptions.id = paiements.souscription_id
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE paiements.id = payment_proofs.paiement_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can delete payment proofs in their organizations"
  ON payment_proofs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM paiements
      JOIN souscriptions ON souscriptions.id = paiements.souscription_id
      JOIN tranches ON tranches.id = souscriptions.tranche_id
      JOIN projets ON projets.id = tranches.projet_id
      WHERE paiements.id = payment_proofs.paiement_id
      AND projets.org_id IN (SELECT get_user_org_ids())
    )
  );
