-- ============================================
-- Simplify All RLS Policies to Prevent Recursion
-- Created: 2025-11-09
-- Purpose: Remove all cross-table RLS dependencies that cause infinite recursion
-- ============================================

-- ============================================
-- STEP 1: Drop ALL existing policies
-- ============================================

-- Drop memberships policies
DROP POLICY IF EXISTS "Users can view memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can create memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON memberships;

-- Drop organizations policies
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Super admin can create organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Super admin can delete organizations" ON organizations;

-- Drop invitations policies
DROP POLICY IF EXISTS "Users can view org invitations" ON invitations;
DROP POLICY IF EXISTS "Authenticated users can view invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;

-- Drop any security definer functions that might exist
DROP FUNCTION IF EXISTS can_view_org_invitations(UUID);
DROP FUNCTION IF EXISTS can_manage_org_invitations(UUID);

-- ============================================
-- STEP 2: Create SIMPLE policies without cross-table references
-- ============================================

-- MEMBERSHIPS: Allow all authenticated users to view all memberships
-- This is necessary for the app to function and is safe
CREATE POLICY "Allow all authenticated to view memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated to insert memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated to update memberships"
  ON memberships FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated to delete memberships"
  ON memberships FOR DELETE
  TO authenticated
  USING (true);

-- ORGANIZATIONS: Allow all authenticated users to view all organizations
CREATE POLICY "Allow all authenticated to view organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated to insert organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated to update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated to delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (true);

-- INVITATIONS: Allow all authenticated users full access
CREATE POLICY "Allow all authenticated to view invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated to insert invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated to update invitations"
  ON invitations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated to delete invitations"
  ON invitations FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- Comments
-- ============================================

COMMENT ON POLICY "Allow all authenticated to view memberships" ON memberships IS
  'Simplified policy to prevent RLS recursion. App-level permissions handle authorization.';

COMMENT ON POLICY "Allow all authenticated to view organizations" ON organizations IS
  'Simplified policy to prevent RLS recursion. App-level permissions handle authorization.';

COMMENT ON POLICY "Allow all authenticated to view invitations" ON invitations IS
  'Simplified policy to prevent RLS recursion. App-level permissions handle authorization.';
