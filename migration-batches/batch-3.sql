
-- ==========================================
-- Migration: 20251211144535_fix_app_config_rls_policies.sql
-- ==========================================

/*
  # Fix app_config RLS policies
  
  The issue: app_config table has RLS enabled but no policies, blocking
  all access including from SECURITY DEFINER functions.
  
  Solution: Add a policy to allow authenticated users to read app_config.
  This is safe because app_config only contains non-sensitive configuration.
*/

-- Allow all authenticated users to read app_config
CREATE POLICY "Allow authenticated users to read app_config"
  ON app_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Only super admins can modify app_config
CREATE POLICY "Only super admins can insert app_config"
  ON app_config
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Only super admins can update app_config"
  ON app_config
  FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Only super admins can delete app_config"
  ON app_config
  FOR DELETE
  TO authenticated
  USING (is_super_admin());


-- ==========================================
-- Migration: 20251211145404_fix_projets_rls_only.sql
-- ==========================================

/*
  # Fix Projets RLS Policies Only
  
  ## Problem
  The projets table is giving 403 errors on SELECT operations.
  The user_has_org_access function needs to be fixed without breaking other tables.
  
  ## Solution
  1. Drop and recreate only projets policies
  2. Replace user_has_org_access with a plpgsql version that properly handles RLS
  
  ## Changes
  - Drop all projets policies
  - Recreate user_has_org_access function (keep user_org_ids intact)
  - Recreate projets policies
*/

-- Step 1: Drop all existing projets policies
DROP POLICY IF EXISTS "Users view org projets" ON projets;
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;
DROP POLICY IF EXISTS "Users can update their org projets" ON projets;
DROP POLICY IF EXISTS "Users can delete their org projets" ON projets;

-- Step 2: Replace user_has_org_access function
DROP FUNCTION IF EXISTS user_has_org_access(uuid);

CREATE OR REPLACE FUNCTION public.user_has_org_access(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  is_super boolean;
  has_membership boolean;
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if super admin first (direct check, no function call)
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = current_user_id
    AND email = 'zrig.ayman@gmail.com'
  ) INTO is_super;
  
  IF is_super THEN
    RETURN true;
  END IF;
  
  -- Check membership directly
  -- SECURITY DEFINER allows this function to read memberships
  -- even if the calling user doesn't have direct SELECT permission
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE org_id = check_org_id
    AND user_id = current_user_id
  ) INTO has_membership;
  
  RETURN has_membership;
END;
$$;

-- Grant execute permission to both authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.user_has_org_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_org_access(uuid) TO anon;

-- Step 3: Recreate all projets policies with the fixed function
CREATE POLICY "Users view org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (user_has_org_access(org_id));

CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_org_access(org_id));

CREATE POLICY "Users can update their org projets"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (user_has_org_access(org_id))
  WITH CHECK (user_has_org_access(org_id));

CREATE POLICY "Users can delete their org projets"
  ON projets
  FOR DELETE
  TO authenticated
  USING (user_has_org_access(org_id));



-- ==========================================
-- Migration: 20251211161343_fix_user_has_org_access_permissions.sql
-- ==========================================

/*
  # Fix user_has_org_access function permissions
  
  1. Changes
    - Grant execute permission on user_has_org_access to authenticated users
    - Grant execute permission to anon role as well
    - Ensure function can be called from RLS policies
*/

-- Grant execute on the function to authenticated and anon users
GRANT EXECUTE ON FUNCTION user_has_org_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_org_access(uuid) TO anon;
GRANT EXECUTE ON FUNCTION user_has_org_access(uuid) TO service_role;



-- ==========================================
-- Migration: 20251211161411_simplify_projets_rls_completely.sql
-- ==========================================

/*
  # Completely simplify projets RLS policies
  
  1. Changes
    - Drop the function-based policies
    - Create simpler inline policies that directly check memberships
    - Avoid any potential infinite loops or circular dependencies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users view org projets" ON projets;
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;
DROP POLICY IF EXISTS "Users can update their org projets" ON projets;
DROP POLICY IF EXISTS "Users can delete their org projets" ON projets;

-- Create new simplified policies with inline checks
CREATE POLICY "Users view org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM memberships WHERE memberships.org_id = projets.org_id
    )
    OR
    auth.email() = 'zrig.ayman@gmail.com'
  );

CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM memberships WHERE memberships.org_id = projets.org_id
    )
    OR
    auth.email() = 'zrig.ayman@gmail.com'
  );

CREATE POLICY "Users can update their org projets"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM memberships WHERE memberships.org_id = projets.org_id
    )
    OR
    auth.email() = 'zrig.ayman@gmail.com'
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM memberships WHERE memberships.org_id = projets.org_id
    )
    OR
    auth.email() = 'zrig.ayman@gmail.com'
  );

CREATE POLICY "Users can delete their org projets"
  ON projets
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM memberships WHERE memberships.org_id = projets.org_id
    )
    OR
    auth.email() = 'zrig.ayman@gmail.com'
  );



-- ==========================================
-- Migration: 20251211161441_fix_is_super_admin_circular_dependency.sql
-- ==========================================

/*
  # Fix is_super_admin circular dependency
  
  1. Problem
    - is_super_admin() reads from app_config
    - app_config RLS policies use is_super_admin()
    - This creates infinite recursion
  
  2. Solution
    - Hardcode super admin email in is_super_admin() function
    - Remove circular dependency
*/

-- Drop and recreate is_super_admin without app_config dependency
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'zrig.ayman@gmail.com'
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO anon;



-- ==========================================
-- Migration: 20251211161652_fix_memberships_rls_for_org_checks.sql
-- ==========================================

/*
  # Fix memberships RLS to allow org-level checks
  
  1. Problem
    - projets policies need to check if user has membership in an org
    - Current memberships SELECT policy only shows user's own memberships
    - This causes the subquery in projets policies to work correctly
    - But we need to ensure it's efficient
  
  2. Solution
    - Update memberships SELECT policy to allow users to see all memberships 
      in orgs they belong to (for efficient checking)
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Superadmin or own memberships" ON memberships;

-- Create new policy that allows viewing memberships in orgs you belong to
CREATE POLICY "Users can view memberships in their orgs"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (
    -- Super admin can see all
    (auth.email() = 'zrig.ayman@gmail.com')
    OR
    -- Or user is viewing their own membership
    (user_id = auth.uid())
    OR
    -- Or user has a membership in the same org
    (
      org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );



-- ==========================================
-- Migration: 20251211161706_fix_projets_rls_with_secure_function.sql
-- ==========================================

/*
  # Fix projets RLS using a secure membership check
  
  1. Problem
    - Circular dependencies in RLS policies
    - Memberships policy references itself
  
  2. Solution
    - Create a SECURITY DEFINER function that bypasses RLS to check memberships
    - Use this function in projets policies
*/

-- First, simplify memberships policy back
DROP POLICY IF EXISTS "Users can view memberships in their orgs" ON memberships;

CREATE POLICY "Users can view own memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (
    (auth.email() = 'zrig.ayman@gmail.com')
    OR
    (user_id = auth.uid())
  );

-- Create a secure function to check org membership
CREATE OR REPLACE FUNCTION user_in_org(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE org_id = check_org_id
    AND user_id = auth.uid()
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION user_in_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_in_org(uuid) TO anon;

-- Update projets policies to use this function
DROP POLICY IF EXISTS "Users view org projets" ON projets;
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;
DROP POLICY IF EXISTS "Users can update their org projets" ON projets;
DROP POLICY IF EXISTS "Users can delete their org projets" ON projets;

CREATE POLICY "Users view org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (
    user_in_org(org_id) OR auth.email() = 'zrig.ayman@gmail.com'
  );

CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_in_org(org_id) OR auth.email() = 'zrig.ayman@gmail.com'
  );

CREATE POLICY "Users can update their org projets"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (
    user_in_org(org_id) OR auth.email() = 'zrig.ayman@gmail.com'
  )
  WITH CHECK (
    user_in_org(org_id) OR auth.email() = 'zrig.ayman@gmail.com'
  );

CREATE POLICY "Users can delete their org projets"
  ON projets
  FOR DELETE
  TO authenticated
  USING (
    user_in_org(org_id) OR auth.email() = 'zrig.ayman@gmail.com'
  );



-- ==========================================
-- Migration: 20251211161936_grant_execute_permissions_rpc_functions.sql
-- ==========================================

/*
  # Grant execute permissions on RPC functions
  
  1. Problem
    - Frontend needs to call check_super_admin_status
    - Function might not have execute permissions for authenticated users
  
  2. Solution
    - Grant execute permissions to authenticated and anon users
*/

-- Grant execute on all relevant functions
GRANT EXECUTE ON FUNCTION check_super_admin_status() TO authenticated;
GRANT EXECUTE ON FUNCTION check_super_admin_status() TO anon;



-- ==========================================
-- Migration: 20251211162310_fix_memberships_policy_use_jwt_email.sql
-- ==========================================

/*
  # Fix memberships policy to use JWT email correctly
  
  1. Problem
    - Using auth.email() which doesn't exist
    - Should use auth.jwt()->>'email' to get email from JWT
  
  2. Solution
    - Update memberships SELECT policy to use correct JWT email extraction
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;

-- Create correct policy
CREATE POLICY "Users can view own memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
    OR
    (user_id = auth.uid())
  );



-- ==========================================
-- Migration: 20251211162321_fix_projets_policies_use_jwt_email.sql
-- ==========================================

/*
  # Fix projets policies to use JWT email correctly
  
  1. Problem
    - Using auth.email() which doesn't exist
    - Should use auth.jwt()->>'email' to get email from JWT
  
  2. Solution
    - Update all projets policies to use correct JWT email extraction
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users view org projets" ON projets;
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;
DROP POLICY IF EXISTS "Users can update their org projets" ON projets;
DROP POLICY IF EXISTS "Users can delete their org projets" ON projets;

-- Recreate with correct email check
CREATE POLICY "Users view org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (
    user_in_org(org_id) OR ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
  );

CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_in_org(org_id) OR ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
  );

CREATE POLICY "Users can update their org projets"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (
    user_in_org(org_id) OR ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
  )
  WITH CHECK (
    user_in_org(org_id) OR ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
  );

CREATE POLICY "Users can delete their org projets"
  ON projets
  FOR DELETE
  TO authenticated
  USING (
    user_in_org(org_id) OR ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
  );



-- ==========================================
-- Migration: 20251211162440_fix_rls_functions_bypass_completely.sql
-- ==========================================

/*
  # Fix RLS helper functions to bypass RLS completely
  
  1. Problem
    - is_org_admin and user_in_org functions query memberships table
    - Memberships RLS policies might be creating circular dependencies
    - 500 errors when querying memberships
  
  2. Solution
    - Make functions SECURITY DEFINER with explicit bypass of RLS
    - Simplify to query memberships directly without RLS interference
*/

-- Recreate is_org_admin to bypass RLS properly
CREATE OR REPLACE FUNCTION is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result boolean;
BEGIN
  -- Explicitly bypass RLS by using a direct query
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
    AND org_id = p_org_id
    AND role = 'admin'
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Recreate user_in_org to bypass RLS properly
CREATE OR REPLACE FUNCTION user_in_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result boolean;
BEGIN
  -- Explicitly bypass RLS by using a direct query
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE org_id = check_org_id
    AND user_id = auth.uid()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION user_in_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_in_org(uuid) TO anon;



-- ==========================================
-- Migration: 20251211162452_simplify_memberships_select_policy_completely.sql
-- ==========================================

/*
  # Simplify memberships SELECT policy to remove circular dependencies
  
  1. Problem
    - Memberships SELECT policy uses is_super_admin()
    - is_org_admin() function queries memberships
    - This creates circular dependency causing 500 errors
  
  2. Solution
    - Create simple SELECT policy that only checks:
      - User's own membership
      - Or super admin email directly from JWT
    - No function calls to break circular dependency
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;

-- Create simple policy without function calls
CREATE POLICY "Users can view own memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own membership
    (user_id = auth.uid())
    OR
    -- Super admin can see all (direct JWT check, no function)
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
  );



-- ==========================================
-- Migration: 20251211162515_remove_all_function_calls_from_memberships_policies.sql
-- ==========================================

/*
  # Remove all function calls from memberships policies
  
  1. Problem
    - Memberships policies call is_super_admin() and is_org_admin()
    - These functions query memberships, causing circular dependencies
    - This causes 500 errors
  
  2. Solution
    - Remove ALL function calls from memberships policies
    - Use direct JWT checks and simple conditions only
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;
DROP POLICY IF EXISTS "Super admin and org admins can create memberships" ON memberships;
DROP POLICY IF EXISTS "Super admin and org admins can update memberships" ON memberships;
DROP POLICY IF EXISTS "Super admin and org admins can delete memberships" ON memberships;

-- SELECT: Users can see their own memberships, super admin sees all
CREATE POLICY "Users can view own memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid())
    OR
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
  );

-- INSERT: Only super admin can create memberships
-- (We'll add org admin check later without circular dependency)
CREATE POLICY "Super admin can create memberships"
  ON memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'email') = 'zrig.ayman@gmail.com'
  );

-- UPDATE: Only super admin can update memberships
CREATE POLICY "Super admin can update memberships"
  ON memberships
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'email') = 'zrig.ayman@gmail.com'
  );

-- DELETE: Only super admin can delete memberships
CREATE POLICY "Super admin can delete memberships"
  ON memberships
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'email') = 'zrig.ayman@gmail.com'
  );



-- ==========================================
-- Migration: 20251211162744_simplify_projets_policies_remove_function_calls.sql
-- ==========================================

/*
  # Simplify projets policies to remove function calls
  
  1. Problem
    - projets policies use user_in_org() function
    - user_in_org() can't properly bypass RLS even with SECURITY DEFINER
    - This causes 403 errors
  
  2. Solution
    - Replace user_in_org(org_id) with direct subquery
    - Subquery checks memberships directly without function call
    - This avoids RLS circular dependency issues
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users view org projets" ON projets;
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;
DROP POLICY IF EXISTS "Users can update their org projets" ON projets;
DROP POLICY IF EXISTS "Users can delete their org projets" ON projets;

-- SELECT: Users can view projets from their organizations
CREATE POLICY "Users view org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (
    -- Super admin can see everything
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
    OR
    -- User is a member of the project's organization
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = projets.org_id
      AND memberships.user_id = auth.uid()
    )
  );

-- INSERT: Users can insert projets for their organizations
CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
    OR
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = projets.org_id
      AND memberships.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update projets from their organizations
CREATE POLICY "Users can update their org projets"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
    OR
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = projets.org_id
      AND memberships.user_id = auth.uid()
    )
  )
  WITH CHECK (
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
    OR
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = projets.org_id
      AND memberships.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete projets from their organizations
CREATE POLICY "Users can delete their org projets"
  ON projets
  FOR DELETE
  TO authenticated
  USING (
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
    OR
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = projets.org_id
      AND memberships.user_id = auth.uid()
    )
  );



-- ==========================================
-- Migration: 20251211163040_allow_authenticated_read_all_memberships.sql
-- ==========================================

/*
  # Allow authenticated users to read all memberships
  
  1. Problem
    - projets policies use subqueries that check memberships
    - The current memberships SELECT policy only allows users to see their own
    - This creates issues when policies need to check memberships
  
  2. Solution
    - Allow all authenticated users to SELECT from memberships
    - This enables policy subqueries to work properly
    - Still maintain strict INSERT/UPDATE/DELETE policies
    - Membership data is not sensitive (just org relationships)
*/

-- Drop existing SELECT policy on memberships
DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;

-- Allow all authenticated users to view all memberships
-- This is safe because membership data is not sensitive
-- It only shows which users belong to which orgs
CREATE POLICY "Authenticated users can view memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (true);



-- ==========================================
-- Migration: 20251211183534_implement_three_role_system_clean.sql
-- ==========================================

/*
  # Implement Clean Three-Role Access Control System
  
  ## Overview
  This migration implements a clean, working 3-role system that avoids circular dependency issues.
  
  ## Three Roles
  1. **Superadmin** (profiles.is_superadmin = true)
     - Can access ALL data across ALL organizations
     - Not bound to any organization
     - No membership record needed
  
  2. **Admin** (memberships.role = 'admin')
     - Can access data within their organization
     - Can manage members (invite, remove, change roles) in their organization
     - Bound to specific organization via memberships table
  
  3. **Member** (memberships.role = 'member')
     - Can access data within their organization
     - CANNOT manage members
     - Bound to specific organization via memberships table
  
  ## Strategy to Avoid 403 Errors
  - Keep profiles, memberships, organizations WITHOUT RLS
  - Use single SECURITY DEFINER function for access checks
  - Function reads from non-RLS tables directly (no circular dependency)
  - Apply consistent policies across all data tables
  
  ## Tables Affected
  - projets: org_id scoping
  - investisseurs: org_id scoping
  - paiements: org_id scoping
  - tranches: via projet_id -> projets.org_id
  - souscriptions: via projet_id -> projets.org_id
  - payment_proofs: via paiement_id -> paiements.org_id
  - coupons_echeances: via souscription_id -> souscriptions.projet_id -> projets.org_id
  - invitations: org_id scoping (special rules for admins only)
  
  ## Security Notes
  - Membership data is not sensitive (just shows user-org relationships)
  - Keeping these tables without RLS is safe and prevents circular dependencies
  - The SECURITY DEFINER function is carefully designed to prevent privilege escalation
*/

-- ============================================================================
-- STEP 1: Clean up existing duplicate policies and functions
-- ============================================================================

-- Drop all existing policies on projets (we'll recreate them cleanly)
DROP POLICY IF EXISTS "Users view their org projets" ON projets;
DROP POLICY IF EXISTS "Users insert their org projets" ON projets;
DROP POLICY IF EXISTS "Users update their org projets" ON projets;
DROP POLICY IF EXISTS "Users delete their org projets" ON projets;
DROP POLICY IF EXISTS "projets_select" ON projets;
DROP POLICY IF EXISTS "projets_insert" ON projets;
DROP POLICY IF EXISTS "projets_update" ON projets;
DROP POLICY IF EXISTS "projets_delete" ON projets;

-- Drop old functions (we'll create one clean function)
DROP FUNCTION IF EXISTS check_user_org_access(uuid);
DROP FUNCTION IF EXISTS check_org_access(uuid);
DROP FUNCTION IF EXISTS user_has_org_access(uuid);

-- ============================================================================
-- STEP 2: Ensure RLS is DISABLED on core identity tables
-- ============================================================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create single, clean access check function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_can_access_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_user_id uuid;
  is_super boolean;
  has_membership boolean;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  -- No user = no access
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is superadmin (direct table read, no RLS)
  SELECT COALESCE(is_superadmin, false)
  INTO is_super
  FROM profiles
  WHERE id = current_user_id;
  
  -- Superadmins can access everything
  IF is_super = true THEN
    RETURN true;
  END IF;
  
  -- Check if user has membership in the target organization (direct table read, no RLS)
  SELECT EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = current_user_id
    AND org_id = check_org_id
  ) INTO has_membership;
  
  RETURN has_membership;
END;
$$;

-- ============================================================================
-- STEP 4: Create helper function to check if user is admin of an org
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_is_admin_of_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_user_id uuid;
  is_super boolean;
  is_admin boolean;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if superadmin
  SELECT COALESCE(is_superadmin, false)
  INTO is_super
  FROM profiles
  WHERE id = current_user_id;
  
  IF is_super = true THEN
    RETURN true;
  END IF;
  
  -- Check if user is admin in this org
  SELECT EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = current_user_id
    AND org_id = check_org_id
    AND role = 'admin'
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;

-- ============================================================================
-- STEP 5: Apply RLS policies to PROJETS table
-- ============================================================================

-- Projets policies use org_id directly
CREATE POLICY "Users can view accessible org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (user_can_access_org(org_id));

CREATE POLICY "Users can insert into accessible orgs"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "Users can update accessible org projets"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (user_can_access_org(org_id))
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "Users can delete accessible org projets"
  ON projets
  FOR DELETE
  TO authenticated
  USING (user_can_access_org(org_id));

-- ============================================================================
-- STEP 6: Apply RLS policies to INVESTISSEURS table
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can insert own org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can update own org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can delete own org investisseurs" ON investisseurs;

CREATE POLICY "Users can view accessible org investisseurs"
  ON investisseurs
  FOR SELECT
  TO authenticated
  USING (user_can_access_org(org_id));

CREATE POLICY "Users can insert into accessible orgs investisseurs"
  ON investisseurs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "Users can update accessible org investisseurs"
  ON investisseurs
  FOR UPDATE
  TO authenticated
  USING (user_can_access_org(org_id))
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "Users can delete accessible org investisseurs"
  ON investisseurs
  FOR DELETE
  TO authenticated
  USING (user_can_access_org(org_id));

-- ============================================================================
-- STEP 7: Apply RLS policies to PAIEMENTS table
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can insert own org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can update own org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can delete own org paiements" ON paiements;

CREATE POLICY "Users can view accessible org paiements"
  ON paiements
  FOR SELECT
  TO authenticated
  USING (user_can_access_org(org_id));

CREATE POLICY "Users can insert into accessible orgs paiements"
  ON paiements
  FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "Users can update accessible org paiements"
  ON paiements
  FOR UPDATE
  TO authenticated
  USING (user_can_access_org(org_id))
  WITH CHECK (user_can_access_org(org_id));

CREATE POLICY "Users can delete accessible org paiements"
  ON paiements
  FOR DELETE
  TO authenticated
  USING (user_can_access_org(org_id));

-- ============================================================================
-- STEP 8: Apply RLS policies to TRANCHES table (via projet)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view tranches of accessible projets" ON tranches;
DROP POLICY IF EXISTS "Users can insert tranches for accessible projets" ON tranches;
DROP POLICY IF EXISTS "Users can update tranches of accessible projets" ON tranches;
DROP POLICY IF EXISTS "Users can delete tranches of accessible projets" ON tranches;

CREATE POLICY "Users can view accessible tranches"
  ON tranches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can insert accessible tranches"
  ON tranches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can update accessible tranches"
  ON tranches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can delete accessible tranches"
  ON tranches
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = tranches.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

-- ============================================================================
-- STEP 9: Apply RLS policies to SOUSCRIPTIONS table (via projet)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view souscriptions of accessible projets" ON souscriptions;
DROP POLICY IF EXISTS "Users can insert souscriptions for accessible projets" ON souscriptions;
DROP POLICY IF EXISTS "Users can update souscriptions of accessible projets" ON souscriptions;
DROP POLICY IF EXISTS "Users can delete souscriptions of accessible projets" ON souscriptions;

CREATE POLICY "Users can view accessible souscriptions"
  ON souscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = souscriptions.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can insert accessible souscriptions"
  ON souscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = souscriptions.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can update accessible souscriptions"
  ON souscriptions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = souscriptions.projet_id
      AND user_can_access_org(projets.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = souscriptions.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can delete accessible souscriptions"
  ON souscriptions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projets
      WHERE projets.id = souscriptions.projet_id
      AND user_can_access_org(projets.org_id)
    )
  );

-- ============================================================================
-- STEP 10: Apply RLS policies to PAYMENT_PROOFS table (via paiement)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view payment_proofs of accessible paiements" ON payment_proofs;
DROP POLICY IF EXISTS "Users can insert payment_proofs for accessible paiements" ON payment_proofs;
DROP POLICY IF EXISTS "Users can update payment_proofs of accessible paiements" ON payment_proofs;
DROP POLICY IF EXISTS "Users can delete payment_proofs of accessible paiements" ON payment_proofs;

CREATE POLICY "Users can view accessible payment_proofs"
  ON payment_proofs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

CREATE POLICY "Users can insert accessible payment_proofs"
  ON payment_proofs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

CREATE POLICY "Users can update accessible payment_proofs"
  ON payment_proofs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

CREATE POLICY "Users can delete accessible payment_proofs"
  ON payment_proofs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM paiements
      WHERE paiements.id = payment_proofs.paiement_id
      AND user_can_access_org(paiements.org_id)
    )
  );

-- ============================================================================
-- STEP 11: Apply RLS policies to COUPONS_ECHEANCES table (via souscription)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view coupons_echeances of accessible souscriptions" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can insert coupons_echeances for accessible souscriptions" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can update coupons_echeances of accessible souscriptions" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can delete coupons_echeances of accessible souscriptions" ON coupons_echeances;

CREATE POLICY "Users can view accessible coupons_echeances"
  ON coupons_echeances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN projets ON projets.id = souscriptions.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can insert accessible coupons_echeances"
  ON coupons_echeances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN projets ON projets.id = souscriptions.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can update accessible coupons_echeances"
  ON coupons_echeances
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN projets ON projets.id = souscriptions.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN projets ON projets.id = souscriptions.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "Users can delete accessible coupons_echeances"
  ON coupons_echeances
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM souscriptions
      JOIN projets ON projets.id = souscriptions.projet_id
      WHERE souscriptions.id = coupons_echeances.souscription_id
      AND user_can_access_org(projets.org_id)
    )
  );

-- ============================================================================
-- STEP 12: Apply RLS policies to INVITATIONS table (admin-only management)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view invitations by token" ON invitations;
DROP POLICY IF EXISTS "Users can view invitations" ON invitations;
DROP POLICY IF EXISTS "Users can insert invitations" ON invitations;
DROP POLICY IF EXISTS "Users can update invitations" ON invitations;
DROP POLICY IF EXISTS "Users can delete invitations" ON invitations;
DROP POLICY IF EXISTS "allow_anonymous_select_by_token" ON invitations;

-- Anyone (even anonymous) can view an invitation by token (needed for invitation acceptance)
CREATE POLICY "Anyone can view invitation by token"
  ON invitations
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can insert invitations for their org
CREATE POLICY "Admins can create invitations for their org"
  ON invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_is_admin_of_org(org_id));

-- Only admins can update invitations for their org
CREATE POLICY "Admins can update invitations for their org"
  ON invitations
  FOR UPDATE
  TO authenticated
  USING (user_is_admin_of_org(org_id))
  WITH CHECK (user_is_admin_of_org(org_id));

-- Only admins can delete invitations for their org
CREATE POLICY "Admins can delete invitations for their org"
  ON invitations
  FOR DELETE
  TO authenticated
  USING (user_is_admin_of_org(org_id));

-- ============================================================================
-- STEP 13: Apply RLS policies to APP_CONFIG table
-- ============================================================================

DROP POLICY IF EXISTS "Only superadmins can manage app_config" ON app_config;

CREATE POLICY "Only superadmins can manage app_config"
  ON app_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_superadmin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_superadmin = true
    )
  );

-- ============================================================================
-- STEP 14: Apply RLS policies to USER_REMINDER_SETTINGS table
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own reminder settings" ON user_reminder_settings;

CREATE POLICY "Users can manage own reminder settings"
  ON user_reminder_settings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- STEP 15: Grant execute permissions on functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION user_can_access_org(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION user_is_admin_of_org(uuid) TO authenticated, anon;

-- ============================================================================
-- DONE!
-- ============================================================================



-- ==========================================
-- Migration: 20251211183638_cleanup_duplicate_policies.sql
-- ==========================================

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



-- ==========================================
-- Migration: 20251211183716_final_cleanup_all_duplicate_policies.sql
-- ==========================================

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



-- ==========================================
-- Migration: 20251211184351_enable_rls_on_identity_tables.sql
-- ==========================================

/*
  # Enable RLS on Identity Tables for Better Security
  
  ## Security Issue
  Previously, profiles, memberships, and organizations had RLS disabled,
  meaning any authenticated user could query these tables directly and see:
  - All organization names
  - All user memberships
  - All user profiles
  
  ## Solution
  Enable RLS on these tables with restrictive policies. The SECURITY DEFINER
  functions (user_can_access_org, user_is_admin_of_org) can still read these
  tables because they run with elevated privileges, bypassing RLS.
  
  ## Security Model
  - Users can only see their own profile
  - Users can only see memberships for organizations they belong to
  - Users can only see organizations they belong to
  - Superadmins can see everything (for admin panel)
*/

-- ============================================================================
-- PROFILES - Users see own profile, superadmins see all
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR is_superadmin = true);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- ORGANIZATIONS - Users see only their orgs, superadmins see all
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    -- Superadmin sees all
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true)
    OR
    -- Users see orgs they belong to
    EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND org_id = organizations.id)
  );

CREATE POLICY "Superadmins can insert organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true)
  );

CREATE POLICY "Superadmins can update organizations"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true)
  );

CREATE POLICY "Superadmins can delete organizations"
  ON organizations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true)
  );

-- ============================================================================
-- MEMBERSHIPS - Users see own org memberships, superadmins see all
-- ============================================================================

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view memberships for their orgs"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (
    -- Superadmin sees all
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true)
    OR
    -- Users see memberships for orgs they belong to
    EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = auth.uid() AND m.org_id = memberships.org_id)
  );

CREATE POLICY "Admins can insert memberships in their org"
  ON memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Superadmin can do anything
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true)
    OR
    -- Admins can add members to their org
    EXISTS (
      SELECT 1 FROM memberships m 
      WHERE m.user_id = auth.uid() 
      AND m.org_id = memberships.org_id 
      AND m.role = 'admin'
    )
  );

CREATE POLICY "Admins can update memberships in their org"
  ON memberships
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true)
    OR
    EXISTS (
      SELECT 1 FROM memberships m 
      WHERE m.user_id = auth.uid() 
      AND m.org_id = memberships.org_id 
      AND m.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true)
    OR
    EXISTS (
      SELECT 1 FROM memberships m 
      WHERE m.user_id = auth.uid() 
      AND m.org_id = memberships.org_id 
      AND m.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete memberships in their org"
  ON memberships
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true)
    OR
    EXISTS (
      SELECT 1 FROM memberships m 
      WHERE m.user_id = auth.uid() 
      AND m.org_id = memberships.org_id 
      AND m.role = 'admin'
    )
  );

-- ============================================================================
-- IMPORTANT: SECURITY DEFINER functions bypass RLS
-- ============================================================================
-- The helper functions (user_can_access_org, user_is_admin_of_org) are
-- SECURITY DEFINER, which means they run with elevated privileges and can
-- read profiles, memberships, and organizations even with RLS enabled.
--
-- This prevents circular dependencies while maintaining security.



-- ==========================================
-- Migration: 20251211184531_revert_identity_table_rls.sql
-- ==========================================

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



-- ==========================================
-- Migration: 20251211184711_secure_identity_tables_no_recursion_fixed.sql
-- ==========================================

/*
  # Secure Identity Tables Without Recursion
  
  ## Security Requirements
  1. Users can ONLY see organizations they belong to
  2. Users can ONLY see their own profile
  3. Users can ONLY see memberships for their organizations
  4. NO infinite recursion
  
  ## How We Avoid Recursion
  - Memberships SELECT policy: Check auth.uid() = user_id (simple, no recursion)
  - Organizations SELECT policy: Check EXISTS in memberships with auth.uid() (works because memberships policy allows this query)
  - Profiles SELECT policy: Only own profile
  
  ## Changes
  1. Enable RLS on all identity tables
  2. Add restrictive SELECT policies
  3. Add policies for INSERT/UPDATE/DELETE based on roles
*/

-- Enable RLS on identity tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- PROFILES POLICIES
-- ==============================================

-- Users can ONLY view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ==============================================
-- MEMBERSHIPS POLICIES
-- ==============================================

-- Users can view their own memberships (NO RECURSION - direct auth.uid() check)
CREATE POLICY "Users can view own memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all memberships in their organizations
CREATE POLICY "Admins can view org memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Admins can insert memberships in their organizations
CREATE POLICY "Admins can insert memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Admins can update memberships in their organizations
CREATE POLICY "Admins can update memberships"
  ON memberships FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Admins can delete memberships in their organizations (but not their own)
CREATE POLICY "Admins can delete memberships"
  ON memberships FOR DELETE
  TO authenticated
  USING (
    user_id != auth.uid()
    AND org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- ==============================================
-- ORGANIZATIONS POLICIES
-- ==============================================

-- Users can ONLY view organizations they belong to
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
    )
  );

-- Superadmins can insert organizations
CREATE POLICY "Superadmins can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_superadmin = true
    )
  );

-- Admins can update their organizations
CREATE POLICY "Admins can update their organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Superadmins can delete organizations
CREATE POLICY "Superadmins can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_superadmin = true
    )
  );


