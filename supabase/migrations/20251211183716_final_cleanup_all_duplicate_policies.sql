/*
  # Final Cleanup of All Duplicate RLS Policies
  
  ## Problem
  Multiple old policies exist from previous migrations, creating duplicates
  and potential conflicts. This migration removes ALL old policies, keeping
  only the new clean policies from the three-role system.
  
  ## Tables Cleaned
  - tranches: Remove 8 old policies, keep 4 new "accessible" ones
  - souscriptions: Remove 8 old policies, keep 4 new "accessible" ones
  - coupons_echeances: Remove 8 old policies, keep 4 new "accessible" ones
  - payment_proofs: Remove 4 old policies, keep 4 new "accessible" ones
  - invitations: Remove 4 old policies, keep 4 new admin-specific ones
  - memberships: Remove ALL 4 policies (RLS disabled)
  - organizations: Remove ALL 8 policies (RLS disabled)
  - profiles: Remove ALL 3 policies (RLS disabled)
*/

-- ============================================================================
-- TRANCHES - Keep only "Users can * accessible tranches"
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete their org tranches" ON tranches;
DROP POLICY IF EXISTS "Users delete their org tranches" ON tranches;
DROP POLICY IF EXISTS "Users can insert their org tranches" ON tranches;
DROP POLICY IF EXISTS "Users insert their org tranches" ON tranches;
DROP POLICY IF EXISTS "Users view org tranches" ON tranches;
DROP POLICY IF EXISTS "Users view their org tranches" ON tranches;
DROP POLICY IF EXISTS "Users can update their org tranches" ON tranches;
DROP POLICY IF EXISTS "Users update their org tranches" ON tranches;

-- ============================================================================
-- SOUSCRIPTIONS - Keep only "Users can * accessible souscriptions"
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete their org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users delete their org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can insert their org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users insert their org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users view org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users view their org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can update their org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users update their org souscriptions" ON souscriptions;

-- ============================================================================
-- COUPONS_ECHEANCES - Keep only "Users can * accessible coupons_echeances"
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete their org coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users delete their org coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can insert their org coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users insert their org coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users view org coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users view their org coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can update their org coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users update their org coupons" ON coupons_echeances;

-- ============================================================================
-- PAYMENT_PROOFS - Keep only "Users can * accessible payment_proofs"
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete payment proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can insert payment proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users view payment proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can update payment proofs" ON payment_proofs;

-- ============================================================================
-- INVITATIONS - Keep only new admin-specific policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;
DROP POLICY IF EXISTS "Super admin and org admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Anonymous users can view invitation by token" ON invitations;
DROP POLICY IF EXISTS "Super admin and org admins can update invitations" ON invitations;

-- ============================================================================
-- MEMBERSHIPS - Remove ALL policies (RLS is disabled)
-- ============================================================================

DROP POLICY IF EXISTS "Superadmins can delete memberships" ON memberships;
DROP POLICY IF EXISTS "Superadmins can insert memberships" ON memberships;
DROP POLICY IF EXISTS "All authenticated users can view memberships" ON memberships;
DROP POLICY IF EXISTS "Superadmins can update memberships" ON memberships;

-- ============================================================================
-- ORGANIZATIONS - Remove ALL policies (RLS is disabled)
-- ============================================================================

DROP POLICY IF EXISTS "Superadmin delete organizations" ON organizations;
DROP POLICY IF EXISTS "Superadmins can delete organizations" ON organizations;
DROP POLICY IF EXISTS "Superadmin insert organizations" ON organizations;
DROP POLICY IF EXISTS "Superadmins can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Members view organizations" ON organizations;
DROP POLICY IF EXISTS "Users view their organizations" ON organizations;
DROP POLICY IF EXISTS "Super admin and org admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Superadmins can update organizations" ON organizations;

-- ============================================================================
-- PROFILES - Remove ALL policies (RLS is disabled)
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
