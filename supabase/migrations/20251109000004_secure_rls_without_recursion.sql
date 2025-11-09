-- ============================================
-- Secure RLS Policies Without Recursion
-- Created: 2025-11-09
-- Purpose: Implement proper RLS security while avoiding infinite recursion
-- ============================================

-- ============================================
-- STEP 1: Drop ALL existing policies
-- ============================================

-- Drop memberships policies
DROP POLICY IF EXISTS "Users can view memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can create memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON memberships;
DROP POLICY IF EXISTS "Allow all authenticated to view memberships" ON memberships;
DROP POLICY IF EXISTS "Allow all authenticated to insert memberships" ON memberships;
DROP POLICY IF EXISTS "Allow all authenticated to update memberships" ON memberships;
DROP POLICY IF EXISTS "Allow all authenticated to delete memberships" ON memberships;

-- Drop organizations policies
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Super admin can create organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Super admin can delete organizations" ON organizations;
DROP POLICY IF EXISTS "Allow all authenticated to view organizations" ON organizations;
DROP POLICY IF EXISTS "Allow all authenticated to insert organizations" ON organizations;
DROP POLICY IF EXISTS "Allow all authenticated to update organizations" ON organizations;
DROP POLICY IF EXISTS "Allow all authenticated to delete organizations" ON organizations;

-- Drop invitations policies
DROP POLICY IF EXISTS "Users can view org invitations" ON invitations;
DROP POLICY IF EXISTS "Authenticated users can view invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;
DROP POLICY IF EXISTS "Allow all authenticated to view invitations" ON invitations;
DROP POLICY IF EXISTS "Allow all authenticated to insert invitations" ON invitations;
DROP POLICY IF EXISTS "Allow all authenticated to update invitations" ON invitations;
DROP POLICY IF EXISTS "Allow all authenticated to delete invitations" ON invitations;

-- Drop any security definer functions
DROP FUNCTION IF EXISTS can_view_org_invitations(UUID);
DROP FUNCTION IF EXISTS can_manage_org_invitations(UUID);

-- ============================================
-- STEP 2: Get super admin email from environment
-- ============================================
-- NOTE: Replace 'your_super_admin_email@example.com' with your actual super admin email

-- ============================================
-- STEP 3: Create helper function to check user's orgs
-- ============================================

-- This function bypasses RLS to prevent recursion
CREATE OR REPLACE FUNCTION user_org_ids(p_user_id UUID)
RETURNS TABLE(org_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT org_id FROM memberships WHERE user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION user_org_ids(UUID) TO authenticated;

-- ============================================
-- STEP 4: MEMBERSHIPS - Simple policies without recursion
-- ============================================

-- Users can view their own memberships + memberships in their orgs
CREATE POLICY "Users view own and org memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    -- User can see their own memberships
    user_id = auth.uid()
    OR
    -- User can see other members in their organizations (using security definer function)
    org_id IN (SELECT user_org_ids.org_id FROM user_org_ids(auth.uid()))
  );

-- Only users with admin role OR org owners can create memberships
CREATE POLICY "Admins create memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check if inserting user has admin role in the target org
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
      AND m.org_id = memberships.org_id
      AND m.role = 'admin'
    )
    OR
    -- Or if user is the org owner
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = memberships.org_id
      AND o.owner_id = auth.uid()
    )
  );

-- Similar for updates
CREATE POLICY "Admins update memberships"
  ON memberships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
      AND m.org_id = memberships.org_id
      AND m.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = memberships.org_id
      AND o.owner_id = auth.uid()
    )
  );

-- Similar for deletes
CREATE POLICY "Admins delete memberships"
  ON memberships FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
      AND m.org_id = memberships.org_id
      AND m.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = memberships.org_id
      AND o.owner_id = auth.uid()
    )
  );

-- ============================================
-- STEP 5: ORGANIZATIONS - Based on memberships
-- ============================================

-- Users can view organizations they're members of
CREATE POLICY "Users view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT user_org_ids.org_id FROM user_org_ids(auth.uid()))
  );

-- Only org owners can update their organization
CREATE POLICY "Owners update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

-- Only org owners can delete (if no members)
CREATE POLICY "Owners delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Anyone authenticated can create an org (they become owner)
CREATE POLICY "Authenticated create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- ============================================
-- STEP 6: INVITATIONS - Simple and secure
-- ============================================

-- Users can view invitations for organizations they're members of
CREATE POLICY "Users view org invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT user_org_ids.org_id FROM user_org_ids(auth.uid()))
  );

-- Admins can create invitations for their orgs
CREATE POLICY "Admins create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
      AND m.org_id = invitations.org_id
      AND m.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = invitations.org_id
      AND o.owner_id = auth.uid()
    )
  );

-- Admins can delete invitations for their orgs
CREATE POLICY "Admins delete invitations"
  ON invitations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
      AND m.org_id = invitations.org_id
      AND m.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = invitations.org_id
      AND o.owner_id = auth.uid()
    )
  );

-- ============================================
-- STEP 7: Create a special superadmin membership
-- ============================================
-- This gives the superadmin access to all organizations without recursion

-- First, get or create the superadmin user
-- Replace with your actual super admin email
DO $$
DECLARE
  v_super_admin_id UUID;
  v_super_admin_email TEXT := 'YOUR_SUPER_ADMIN_EMAIL@example.com'; -- CHANGE THIS
  v_org RECORD;
BEGIN
  -- Get superadmin user ID
  SELECT id INTO v_super_admin_id
  FROM auth.users
  WHERE email = v_super_admin_email;

  IF v_super_admin_id IS NOT NULL THEN
    -- Create admin memberships for superadmin in ALL organizations
    FOR v_org IN SELECT id FROM organizations LOOP
      INSERT INTO memberships (user_id, org_id, role)
      VALUES (v_super_admin_id, v_org.id, 'admin')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- ============================================
-- Comments
-- ============================================

COMMENT ON FUNCTION user_org_ids(UUID) IS
  'Security definer function that returns org IDs for a user. Bypasses RLS to prevent recursion.';

COMMENT ON POLICY "Users view own and org memberships" ON memberships IS
  'Users can view their own memberships and other members in their organizations. Uses security definer function to prevent recursion.';

COMMENT ON POLICY "Users view their organizations" ON organizations IS
  'Users can view organizations where they have a membership. Uses security definer function to prevent recursion.';

COMMENT ON POLICY "Users view org invitations" ON invitations IS
  'Users can view invitations for organizations where they are members. Uses security definer function to prevent recursion.';

-- ============================================
-- IMPORTANT: Update the super admin email!
-- ============================================
-- In the DO block above (STEP 7), replace 'YOUR_SUPER_ADMIN_EMAIL@example.com'
-- with your actual super admin email address from your .env file (VITE_SUPER_ADMIN_EMAIL)
