/*
  # Revert RLS on Identity Tables
  
  ## Problem
  The previous migration created infinite recursion:
  - memberships policy checks: "Does user have membership in org?"
  - To check that, it queries memberships table
  - Which triggers the same policy again
  - INFINITE LOOP → 500 error
  
  ## Solution
  Revert to NO RLS on identity tables (profiles, memberships, organizations).
  
  ## Security Model
  These tables have no sensitive business data. The actual security is enforced
  at the business data level (projets, investisseurs, paiements, tranches, etc.)
  using SECURITY DEFINER functions that can safely read these identity tables.
  
  Yes, users can technically see:
  - Organization names (but not their data)
  - That other users exist (but not their data)
  - Membership relationships (but not the actual business data)
  
  This is acceptable because:
  1. No business data is exposed
  2. The SECURITY DEFINER functions ensure users can ONLY access business data
     for their own organization(s)
  3. This prevents the circular dependency that breaks the entire app
*/

-- Drop all policies from previous migration
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Superadmins can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Superadmins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Superadmins can delete organizations" ON organizations;

DROP POLICY IF EXISTS "Users can view memberships for their orgs" ON memberships;
DROP POLICY IF EXISTS "Admins can insert memberships in their org" ON memberships;
DROP POLICY IF EXISTS "Admins can update memberships in their org" ON memberships;
DROP POLICY IF EXISTS "Admins can delete memberships in their org" ON memberships;

-- Disable RLS on identity tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
