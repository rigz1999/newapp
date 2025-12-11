/*
  # Fix Memberships Recursion - Final
  
  ## Problem
  The "Admins can view org memberships" policy creates infinite recursion:
  - Policy checks: org_id IN (SELECT org_id FROM memberships WHERE...)
  - That SELECT triggers the policy again
  - INFINITE LOOP
  
  ## Solution
  Keep ONLY the simple policies that don't query the same table:
  
  For memberships:
  - Users can view their OWN memberships: user_id = auth.uid() (NO recursion)
  
  For organizations:
  - Service role / edge functions will handle complex queries
  - Frontend will query memberships first, then use those org_ids
  
  ## Security Trade-off
  - Users can only see their own memberships (secure)
  - To see other members of their org, we'll use a SECURITY DEFINER function
  - Organizations can be viewed if user has a membership (uses subquery but it's safe)
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their orgs" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can view org memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can insert memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON memberships;

DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Superadmins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Superadmins can delete organizations" ON organizations;

-- ==============================================
-- PROFILES POLICIES (Simple, no recursion)
-- ==============================================

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ==============================================
-- MEMBERSHIPS POLICIES (Simple, no recursion)
-- ==============================================

-- Users can ONLY view their own memberships (NO RECURSION)
CREATE POLICY "Users view own memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- For admin operations, we'll use SECURITY DEFINER functions
-- that bypass RLS. This prevents recursion.

-- ==============================================
-- ORGANIZATIONS POLICIES
-- ==============================================

-- Users can view organizations they belong to
-- This subquery is safe because it uses the simple membership policy above
CREATE POLICY "Users view their orgs"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
    )
  );
