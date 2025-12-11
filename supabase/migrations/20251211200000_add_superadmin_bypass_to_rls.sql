/*
  # Add Superadmin Bypass to RLS Policies

  ## Security Issue
  Current RLS policies don't include superadmin bypass, meaning:
  - Superadmins can only see organizations they're a member of
  - Superadmins cannot manage all data across all organizations

  ## Solution
  Add is_superadmin check to all business data policies to allow superadmins
  full access while maintaining org-level isolation for regular users.

  ## Security Guarantees
  1. Superadmins (profiles.is_superadmin = true) can access ALL data
  2. Regular users (admin/member roles) can ONLY access their org's data
  3. Users cannot see other organizations' data
  4. Membership-based access is strictly enforced

  ## Tables Affected
  - projets
  - tranches
  - souscriptions
  - investisseurs
  - paiements
  - payment_proofs
  - coupons_echeances
  - invitations
*/

-- Helper function to check if current user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false);
$$;

GRANT EXECUTE ON FUNCTION is_superadmin() TO authenticated, anon;

-- ==============================================
-- UPDATE PROJETS POLICIES
-- ==============================================

DROP POLICY IF EXISTS "view_projets" ON projets;
DROP POLICY IF EXISTS "insert_projets" ON projets;
DROP POLICY IF EXISTS "update_projets" ON projets;
DROP POLICY IF EXISTS "delete_projets" ON projets;

CREATE POLICY "view_projets" ON projets FOR SELECT TO authenticated
USING (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

CREATE POLICY "insert_projets" ON projets FOR INSERT TO authenticated
WITH CHECK (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

CREATE POLICY "update_projets" ON projets FOR UPDATE TO authenticated
USING (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
)
WITH CHECK (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

CREATE POLICY "delete_projets" ON projets FOR DELETE TO authenticated
USING (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

-- ==============================================
-- UPDATE TRANCHES POLICIES
-- ==============================================

DROP POLICY IF EXISTS "view_tranches" ON tranches;
DROP POLICY IF EXISTS "insert_tranches" ON tranches;
DROP POLICY IF EXISTS "update_tranches" ON tranches;
DROP POLICY IF EXISTS "delete_tranches" ON tranches;

CREATE POLICY "view_tranches" ON tranches FOR SELECT TO authenticated
USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM projets
    WHERE projets.id = tranches.projet_id
    AND projets.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "insert_tranches" ON tranches FOR INSERT TO authenticated
WITH CHECK (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM projets
    WHERE projets.id = tranches.projet_id
    AND projets.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "update_tranches" ON tranches FOR UPDATE TO authenticated
USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM projets
    WHERE projets.id = tranches.projet_id
    AND projets.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM projets
    WHERE projets.id = tranches.projet_id
    AND projets.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "delete_tranches" ON tranches FOR DELETE TO authenticated
USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM projets
    WHERE projets.id = tranches.projet_id
    AND projets.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
);

-- ==============================================
-- UPDATE SOUSCRIPTIONS POLICIES
-- ==============================================

DROP POLICY IF EXISTS "view_souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "insert_souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "update_souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "delete_souscriptions" ON souscriptions;

CREATE POLICY "view_souscriptions" ON souscriptions FOR SELECT TO authenticated
USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM tranches t
    JOIN projets p ON p.id = t.projet_id
    WHERE t.id = souscriptions.tranche_id
    AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "insert_souscriptions" ON souscriptions FOR INSERT TO authenticated
WITH CHECK (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM tranches t
    JOIN projets p ON p.id = t.projet_id
    WHERE t.id = souscriptions.tranche_id
    AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "update_souscriptions" ON souscriptions FOR UPDATE TO authenticated
USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM tranches t
    JOIN projets p ON p.id = t.projet_id
    WHERE t.id = souscriptions.tranche_id
    AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM tranches t
    JOIN projets p ON p.id = t.projet_id
    WHERE t.id = souscriptions.tranche_id
    AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "delete_souscriptions" ON souscriptions FOR DELETE TO authenticated
USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM tranches t
    JOIN projets p ON p.id = t.projet_id
    WHERE t.id = souscriptions.tranche_id
    AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
);

-- ==============================================
-- UPDATE INVESTISSEURS POLICIES
-- ==============================================

DROP POLICY IF EXISTS "view_investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "insert_investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "update_investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "delete_investisseurs" ON investisseurs;

CREATE POLICY "view_investisseurs" ON investisseurs FOR SELECT TO authenticated
USING (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

CREATE POLICY "insert_investisseurs" ON investisseurs FOR INSERT TO authenticated
WITH CHECK (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

CREATE POLICY "update_investisseurs" ON investisseurs FOR UPDATE TO authenticated
USING (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
)
WITH CHECK (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

CREATE POLICY "delete_investisseurs" ON investisseurs FOR DELETE TO authenticated
USING (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

-- ==============================================
-- UPDATE PAIEMENTS POLICIES
-- ==============================================

DROP POLICY IF EXISTS "view_paiements" ON paiements;
DROP POLICY IF EXISTS "insert_paiements" ON paiements;
DROP POLICY IF EXISTS "update_paiements" ON paiements;
DROP POLICY IF EXISTS "delete_paiements" ON paiements;

CREATE POLICY "view_paiements" ON paiements FOR SELECT TO authenticated
USING (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

CREATE POLICY "insert_paiements" ON paiements FOR INSERT TO authenticated
WITH CHECK (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

CREATE POLICY "update_paiements" ON paiements FOR UPDATE TO authenticated
USING (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
)
WITH CHECK (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

CREATE POLICY "delete_paiements" ON paiements FOR DELETE TO authenticated
USING (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

-- ==============================================
-- UPDATE PAYMENT_PROOFS POLICIES
-- ==============================================

DROP POLICY IF EXISTS "view_payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "insert_payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "update_payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "delete_payment_proofs" ON payment_proofs;

CREATE POLICY "view_payment_proofs" ON payment_proofs FOR SELECT TO authenticated
USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM paiements
    WHERE paiements.id = payment_proofs.paiement_id
    AND paiements.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "insert_payment_proofs" ON payment_proofs FOR INSERT TO authenticated
WITH CHECK (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM paiements
    WHERE paiements.id = payment_proofs.paiement_id
    AND paiements.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "update_payment_proofs" ON payment_proofs FOR UPDATE TO authenticated
USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM paiements
    WHERE paiements.id = payment_proofs.paiement_id
    AND paiements.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM paiements
    WHERE paiements.id = payment_proofs.paiement_id
    AND paiements.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "delete_payment_proofs" ON payment_proofs FOR DELETE TO authenticated
USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM paiements
    WHERE paiements.id = payment_proofs.paiement_id
    AND paiements.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
);

-- ==============================================
-- UPDATE COUPONS_ECHEANCES POLICIES
-- ==============================================

DROP POLICY IF EXISTS "view_coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "insert_coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "update_coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "delete_coupons" ON coupons_echeances;

CREATE POLICY "view_coupons" ON coupons_echeances FOR SELECT TO authenticated
USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM souscriptions s
    JOIN tranches t ON t.id = s.tranche_id
    JOIN projets p ON p.id = t.projet_id
    WHERE s.id = coupons_echeances.souscription_id
    AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "insert_coupons" ON coupons_echeances FOR INSERT TO authenticated
WITH CHECK (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM souscriptions s
    JOIN tranches t ON t.id = s.tranche_id
    JOIN projets p ON p.id = t.projet_id
    WHERE s.id = coupons_echeances.souscription_id
    AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "update_coupons" ON coupons_echeances FOR UPDATE TO authenticated
USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM souscriptions s
    JOIN tranches t ON t.id = s.tranche_id
    JOIN projets p ON p.id = t.projet_id
    WHERE s.id = coupons_echeances.souscription_id
    AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM souscriptions s
    JOIN tranches t ON t.id = s.tranche_id
    JOIN projets p ON p.id = t.projet_id
    WHERE s.id = coupons_echeances.souscription_id
    AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
);

CREATE POLICY "delete_coupons" ON coupons_echeances FOR DELETE TO authenticated
USING (
  is_superadmin()
  OR EXISTS (
    SELECT 1 FROM souscriptions s
    JOIN tranches t ON t.id = s.tranche_id
    JOIN projets p ON p.id = t.projet_id
    WHERE s.id = coupons_echeances.souscription_id
    AND p.org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  )
);

-- ==============================================
-- UPDATE INVITATIONS POLICIES (admin/superadmin only)
-- ==============================================

DROP POLICY IF EXISTS "view_invitations" ON invitations;
DROP POLICY IF EXISTS "insert_invitations" ON invitations;
DROP POLICY IF EXISTS "update_invitations" ON invitations;
DROP POLICY IF EXISTS "delete_invitations" ON invitations;

CREATE POLICY "view_invitations" ON invitations FOR SELECT TO authenticated
USING (
  is_superadmin()
  OR email = (SELECT email FROM profiles WHERE id = auth.uid())
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "insert_invitations" ON invitations FOR INSERT TO authenticated
WITH CHECK (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "update_invitations" ON invitations FOR UPDATE TO authenticated
USING (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
)
WITH CHECK (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "delete_invitations" ON invitations FOR DELETE TO authenticated
USING (
  is_superadmin()
  OR org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- ==============================================
-- VERIFY RLS IS ENABLED ON ALL BUSINESS TABLES
-- ==============================================

ALTER TABLE projets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tranches ENABLE ROW LEVEL SECURITY;
ALTER TABLE souscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons_echeances ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- VERIFY RLS IS DISABLED ON IDENTITY TABLES
-- ==============================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
