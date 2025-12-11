/*
  # Cleanup Duplicate RLS Policies
  
  ## Problem
  Previous migrations left behind old policies that are now duplicates.
  Multiple policies per operation can cause confusion and performance issues.
  
  ## Solution
  Drop all old policy variants, keeping only the new clean policies created
  in the previous migration.
  
  ## Tables Cleaned
  - investisseurs
  - paiements  
  - tranches
  - souscriptions
  - payment_proofs
  - coupons_echeances
  - invitations
  - profiles
  - memberships
  - organizations
*/

-- ============================================================================
-- INVESTISSEURS - Keep only "Users can * accessible org investisseurs"
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete their org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users delete their org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can insert their org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users insert their org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users view org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users view their org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can update their org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users update their org investisseurs" ON investisseurs;

-- ============================================================================
-- PAIEMENTS - Keep only "Users can * accessible org paiements"
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete their org paiements" ON paiements;
DROP POLICY IF EXISTS "Users delete their org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can insert their org paiements" ON paiements;
DROP POLICY IF EXISTS "Users insert their org paiements" ON paiements;
DROP POLICY IF EXISTS "Users view org paiements" ON paiements;
DROP POLICY IF EXISTS "Users view their org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can update their org paiements" ON paiements;
DROP POLICY IF EXISTS "Users update their org paiements" ON paiements;

-- ============================================================================
-- TRANCHES - Keep only "Users can * accessible tranches"
-- ============================================================================

DROP POLICY IF EXISTS "Users can view tranches of their org projets" ON tranches;
DROP POLICY IF EXISTS "Users view tranches" ON tranches;
DROP POLICY IF EXISTS "Users can insert tranches for their org projets" ON tranches;
DROP POLICY IF EXISTS "Users insert tranches" ON tranches;
DROP POLICY IF EXISTS "Users can update tranches of their org projets" ON tranches;
DROP POLICY IF EXISTS "Users update tranches" ON tranches;
DROP POLICY IF EXISTS "Users can delete tranches of their org projets" ON tranches;
DROP POLICY IF EXISTS "Users delete tranches" ON tranches;

-- ============================================================================
-- SOUSCRIPTIONS - Keep only "Users can * accessible souscriptions"
-- ============================================================================

DROP POLICY IF EXISTS "Users can view souscriptions of their org projets" ON souscriptions;
DROP POLICY IF EXISTS "Users view souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can insert souscriptions for their org projets" ON souscriptions;
DROP POLICY IF EXISTS "Users insert souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can update souscriptions of their org projets" ON souscriptions;
DROP POLICY IF EXISTS "Users update souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can delete souscriptions of their org projets" ON souscriptions;
DROP POLICY IF EXISTS "Users delete souscriptions" ON souscriptions;

-- ============================================================================
-- PAYMENT_PROOFS - Keep only "Users can * accessible payment_proofs"
-- ============================================================================

DROP POLICY IF EXISTS "Users can view payment_proofs of their org paiements" ON payment_proofs;
DROP POLICY IF EXISTS "Users view payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can insert payment_proofs for their org paiements" ON payment_proofs;
DROP POLICY IF EXISTS "Users insert payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can update payment_proofs of their org paiements" ON payment_proofs;
DROP POLICY IF EXISTS "Users update payment_proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can delete payment_proofs of their org paiements" ON payment_proofs;
DROP POLICY IF EXISTS "Users delete payment_proofs" ON payment_proofs;

-- ============================================================================
-- COUPONS_ECHEANCES - Keep only "Users can * accessible coupons_echeances"
-- ============================================================================

DROP POLICY IF EXISTS "Users can view coupons_echeances of their org souscriptions" ON coupons_echeances;
DROP POLICY IF EXISTS "Users view coupons_echeances" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can insert coupons_echeances for their org souscriptions" ON coupons_echeances;
DROP POLICY IF EXISTS "Users insert coupons_echeances" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can update coupons_echeances of their org souscriptions" ON coupons_echeances;
DROP POLICY IF EXISTS "Users update coupons_echeances" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can delete coupons_echeances of their org souscriptions" ON coupons_echeances;
DROP POLICY IF EXISTS "Users delete coupons_echeances" ON coupons_echeances;

-- ============================================================================
-- INVITATIONS - Keep only admin-specific policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view invitations for their org" ON invitations;
DROP POLICY IF EXISTS "Users view invitations" ON invitations;
DROP POLICY IF EXISTS "Users can insert invitations for their org" ON invitations;
DROP POLICY IF EXISTS "Users insert invitations" ON invitations;
DROP POLICY IF EXISTS "Users can update invitations for their org" ON invitations;
DROP POLICY IF EXISTS "Users update invitations" ON invitations;
DROP POLICY IF EXISTS "Users can delete invitations for their org" ON invitations;
DROP POLICY IF EXISTS "Users delete invitations" ON invitations;

-- ============================================================================
-- PROFILES - Remove any old policies (should have no RLS)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users view profiles" ON profiles;

-- ============================================================================
-- MEMBERSHIPS - Remove any old policies (should have no RLS)
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view memberships" ON memberships;
DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;
DROP POLICY IF EXISTS "Users can view memberships for their org" ON memberships;
DROP POLICY IF EXISTS "Users view memberships" ON memberships;

-- ============================================================================
-- ORGANIZATIONS - Remove any old policies (should have no RLS)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Users view organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can manage their organization" ON organizations;
DROP POLICY IF EXISTS "Admins can manage their organization" ON organizations;
DROP POLICY IF EXISTS "Users can update their organization" ON organizations;
DROP POLICY IF EXISTS "Users can delete their organization" ON organizations;
DROP POLICY IF EXISTS "Users can insert organizations" ON organizations;
