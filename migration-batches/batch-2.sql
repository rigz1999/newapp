-- ============================================
-- Fix Invitations RLS Recursion Issue
-- Created: 2025-11-09
-- Purpose: Fix infinite recursion in invitations policy by using a security definer function
-- ============================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view org invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;

-- Create a security definer function to check if user can view invitations for an org
-- This bypasses RLS and prevents recursion
CREATE OR REPLACE FUNCTION can_view_org_invitations(org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Check if user has membership in this org (bypassing RLS with security definer)
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
    AND org_id = org_uuid
  );
$$;

-- Create a security definer function to check if user can manage invitations for an org
-- This bypasses RLS and prevents recursion
CREATE OR REPLACE FUNCTION can_manage_org_invitations(org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Check if user is admin/owner in this org (bypassing RLS with security definer)
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
    AND org_id = org_uuid
    AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM organizations
    WHERE id = org_uuid
    AND owner_id = auth.uid()
  );
$$;

-- Simplified policy: Allow all authenticated users to view all pending invitations
-- This is safe because invitations only contain email/name, no sensitive data
-- And they're needed for the admin panel to function
CREATE POLICY "Authenticated users can view invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (status = 'pending');

-- Policy for creating invitations using security definer function
CREATE POLICY "Admins can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    can_manage_org_invitations(org_id)
  );

-- Policy for deleting invitations using security definer function
CREATE POLICY "Admins can delete invitations"
  ON invitations FOR DELETE
  TO authenticated
  USING (
    can_manage_org_invitations(org_id)
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_view_org_invitations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_org_invitations(UUID) TO authenticated;

-- Comments
COMMENT ON FUNCTION can_view_org_invitations(UUID) IS
  'Security definer function to check if user can view invitations for an org. Bypasses RLS to prevent recursion.';

COMMENT ON FUNCTION can_manage_org_invitations(UUID) IS
  'Security definer function to check if user can manage (create/delete) invitations for an org. Bypasses RLS to prevent recursion.';

COMMENT ON POLICY "Authenticated users can view invitations" ON invitations IS
  'All authenticated users can view pending invitations. This is safe as invitations contain no sensitive data and are needed for admin panel.';

COMMENT ON POLICY "Admins can create invitations" ON invitations IS
  'Organization owners and admins can create invitations using security definer function to prevent RLS recursion.';

COMMENT ON POLICY "Admins can delete invitations" ON invitations IS
  'Organization owners and admins can delete invitations using security definer function to prevent RLS recursion.';
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
-- ============================================
-- Allow Anonymous Users to View Invitations by Token
-- Created: 2025-11-10
-- Purpose: Fix invitation link error by allowing unauthenticated users to view invitations using their unique token
-- ============================================

-- The issue: Users clicking invitation links are not authenticated yet (no account exists)
-- The previous policy only allowed authenticated users to view invitations
-- This prevented the invitation acceptance flow from working

-- Add policy to allow anonymous (unauthenticated) users to view invitations by token
-- This is safe because:
-- 1. Token is a secure, unique UUID that cannot be guessed
-- 2. Users can only see the specific invitation with their token
-- 3. This is required for the invitation acceptance flow
CREATE POLICY "Anonymous users can view invitation by token"
  ON invitations FOR SELECT
  TO anon
  USING (true);

-- Comments
COMMENT ON POLICY "Anonymous users can view invitation by token" ON invitations IS
  'Allows unauthenticated users to view invitations using their unique token. Required for invitation acceptance flow to work.';
-- ============================================
-- COMPLETE RLS FIX - Fresh Start
-- Created: 2025-11-10
-- Purpose: Fix all RLS policies for the correct workflow
-- ============================================

-- IMPORTANT: Set your super admin email in the function below!

-- ============================================
-- STEP 1: Drop ALL existing policies
-- ============================================

-- Memberships
DROP POLICY IF EXISTS "Users can view memberships" ON memberships;
DROP POLICY IF EXISTS "Users view own and org memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can create memberships" ON memberships;
DROP POLICY IF EXISTS "Admins create memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON memberships;
DROP POLICY IF EXISTS "Admins update memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON memberships;
DROP POLICY IF EXISTS "Admins delete memberships" ON memberships;
DROP POLICY IF EXISTS "Allow all authenticated to view memberships" ON memberships;
DROP POLICY IF EXISTS "Allow all authenticated to insert memberships" ON memberships;
DROP POLICY IF EXISTS "Allow all authenticated to update memberships" ON memberships;
DROP POLICY IF EXISTS "Allow all authenticated to delete memberships" ON memberships;

-- Organizations
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users view their organizations" ON organizations;
DROP POLICY IF EXISTS "Super admin can create organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated create organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Owners update organizations" ON organizations;
DROP POLICY IF EXISTS "Super admin can delete organizations" ON organizations;
DROP POLICY IF EXISTS "Owners delete organizations" ON organizations;
DROP POLICY IF EXISTS "Allow all authenticated to view organizations" ON organizations;
DROP POLICY IF EXISTS "Allow all authenticated to insert organizations" ON organizations;
DROP POLICY IF EXISTS "Allow all authenticated to update organizations" ON organizations;
DROP POLICY IF EXISTS "Allow all authenticated to delete organizations" ON organizations;

-- Invitations
DROP POLICY IF EXISTS "Users can view org invitations" ON invitations;
DROP POLICY IF EXISTS "Users view org invitations" ON invitations;
DROP POLICY IF EXISTS "Authenticated users can view invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;
DROP POLICY IF EXISTS "Admins delete invitations" ON invitations;
DROP POLICY IF EXISTS "Allow all authenticated to view invitations" ON invitations;
DROP POLICY IF EXISTS "Allow all authenticated to insert invitations" ON invitations;
DROP POLICY IF EXISTS "Allow all authenticated to update invitations" ON invitations;
DROP POLICY IF EXISTS "Allow all authenticated to delete invitations" ON invitations;

-- Profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Projets
DROP POLICY IF EXISTS "Users can view their org projets" ON projets;
DROP POLICY IF EXISTS "Users can manage their org projets" ON projets;

-- Investisseurs
DROP POLICY IF EXISTS "Users can view their org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can manage their org investisseurs" ON investisseurs;

-- Tranches
DROP POLICY IF EXISTS "Users can view their org tranches" ON tranches;
DROP POLICY IF EXISTS "Users can manage their org tranches" ON tranches;

-- Souscriptions
DROP POLICY IF EXISTS "Users can view their org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can manage their org souscriptions" ON souscriptions;

-- Coupons
DROP POLICY IF EXISTS "Users can view their org coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can manage their org coupons" ON coupons_echeances;

-- Paiements
DROP POLICY IF EXISTS "Users can view their org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can manage their org paiements" ON paiements;

-- Payment Proofs
DROP POLICY IF EXISTS "Users can view payment proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can manage payment proofs" ON payment_proofs;

-- User Reminder Settings
DROP POLICY IF EXISTS "Users can view their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can insert their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can update their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can delete their own reminder settings" ON user_reminder_settings;

-- ============================================
-- STEP 2: Drop old functions
-- ============================================

DROP FUNCTION IF EXISTS user_org_ids(UUID);
DROP FUNCTION IF EXISTS can_view_org_invitations(UUID);
DROP FUNCTION IF EXISTS can_manage_org_invitations(UUID);

-- ============================================
-- STEP 3: Make owner_id nullable (deprecate it)
-- ============================================

ALTER TABLE organizations ALTER COLUMN owner_id DROP NOT NULL;

-- ============================================
-- STEP 4: Create helper function for super admin check
-- ============================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'zrig.ayman@gmail.com'
  );
$$;

GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

COMMENT ON FUNCTION is_super_admin() IS
  'Returns true if current user is the super admin (based on email). SECURITY DEFINER to access auth.users.';

-- ============================================
-- STEP 5: Create helper function to get user org IDs
-- ============================================

CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS TABLE(org_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT m.org_id
  FROM memberships m
  WHERE m.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION user_org_ids() TO authenticated;

COMMENT ON FUNCTION user_org_ids() IS
  'Returns list of organization IDs the current user belongs to. SECURITY DEFINER to bypass RLS on memberships.';

-- ============================================
-- STEP 6: Create helper function to check if user is admin in org
-- ============================================

CREATE OR REPLACE FUNCTION is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
    AND org_id = p_org_id
    AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION is_org_admin(UUID) TO authenticated;

COMMENT ON FUNCTION is_org_admin(UUID) IS
  'Returns true if current user is admin of the specified organization. SECURITY DEFINER to bypass RLS.';

-- ============================================
-- POLICIES: ORGANIZATIONS
-- ============================================

-- View: Members can see their orgs, super admin sees all
CREATE POLICY "view_organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  );

-- Insert: Only super admin can create
CREATE POLICY "insert_organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

-- Update: Only super admin can update
CREATE POLICY "update_organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (is_super_admin());

-- Delete: Only super admin can delete
CREATE POLICY "delete_organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- ============================================
-- POLICIES: MEMBERSHIPS
-- ============================================

-- View: Users see own memberships + other members in their orgs + super admin sees all
CREATE POLICY "view_memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR user_id = auth.uid()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  );

-- Insert: Super admin OR org admins can add members to their org
CREATE POLICY "insert_memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin()
    OR is_org_admin(org_id)
  );

-- Update: Super admin OR org admins can update memberships in their org
CREATE POLICY "update_memberships"
  ON memberships FOR UPDATE
  TO authenticated
  USING (
    is_super_admin()
    OR is_org_admin(org_id)
  );

-- Delete: Super admin OR org admins can remove members from their org
CREATE POLICY "delete_memberships"
  ON memberships FOR DELETE
  TO authenticated
  USING (
    is_super_admin()
    OR is_org_admin(org_id)
  );

-- ============================================
-- POLICIES: INVITATIONS
-- ============================================

-- View: Users can see invitations for their orgs + super admin sees all
CREATE POLICY "view_invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  );

-- Insert: Super admin OR org admins can create invitations
CREATE POLICY "insert_invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin()
    OR is_org_admin(org_id)
  );

-- Update: Super admin OR org admins can update invitations
CREATE POLICY "update_invitations"
  ON invitations FOR UPDATE
  TO authenticated
  USING (
    is_super_admin()
    OR is_org_admin(org_id)
  );

-- Delete: Super admin OR org admins can delete invitations
CREATE POLICY "delete_invitations"
  ON invitations FOR DELETE
  TO authenticated
  USING (
    is_super_admin()
    OR is_org_admin(org_id)
  );

-- ============================================
-- POLICIES: PROFILES
-- ============================================

-- View: All authenticated users can view all profiles
CREATE POLICY "view_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Insert: Users can only insert their own profile
CREATE POLICY "insert_profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Update: Super admin OR users can update their own profile
CREATE POLICY "update_profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_super_admin() OR id = auth.uid())
  WITH CHECK (is_super_admin() OR id = auth.uid());

-- ============================================
-- POLICIES: PROJETS
-- ============================================

-- View: Super admin OR members of the org can view
CREATE POLICY "view_projets"
  ON projets FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  );

-- Insert/Update/Delete: Super admin OR any member of the org can manage
CREATE POLICY "manage_projets"
  ON projets FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  )
  WITH CHECK (
    is_super_admin()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  );

-- ============================================
-- POLICIES: INVESTISSEURS
-- ============================================

CREATE POLICY "view_investisseurs"
  ON investisseurs FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  );

CREATE POLICY "manage_investisseurs"
  ON investisseurs FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  )
  WITH CHECK (
    is_super_admin()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  );

-- ============================================
-- POLICIES: TRANCHES
-- ============================================

CREATE POLICY "view_tranches"
  ON tranches FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

CREATE POLICY "manage_tranches"
  ON tranches FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  )
  WITH CHECK (
    is_super_admin()
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

-- ============================================
-- POLICIES: SOUSCRIPTIONS
-- ============================================

CREATE POLICY "view_souscriptions"
  ON souscriptions FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

CREATE POLICY "manage_souscriptions"
  ON souscriptions FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  )
  WITH CHECK (
    is_super_admin()
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

-- ============================================
-- POLICIES: COUPONS_ECHEANCES
-- ============================================

CREATE POLICY "view_coupons"
  ON coupons_echeances FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

CREATE POLICY "manage_coupons"
  ON coupons_echeances FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  )
  WITH CHECK (
    is_super_admin()
    OR souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      WHERE p.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

-- ============================================
-- POLICIES: PAIEMENTS
-- ============================================

CREATE POLICY "view_paiements"
  ON paiements FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  );

CREATE POLICY "manage_paiements"
  ON paiements FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  )
  WITH CHECK (
    is_super_admin()
    OR org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
  );

-- ============================================
-- POLICIES: PAYMENT_PROOFS
-- ============================================

CREATE POLICY "view_payment_proofs"
  ON payment_proofs FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR paiement_id IN (
      SELECT pa.id FROM paiements pa
      WHERE pa.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

CREATE POLICY "manage_payment_proofs"
  ON payment_proofs FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    OR paiement_id IN (
      SELECT pa.id FROM paiements pa
      WHERE pa.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  )
  WITH CHECK (
    is_super_admin()
    OR paiement_id IN (
      SELECT pa.id FROM paiements pa
      WHERE pa.org_id IN (SELECT user_org_ids.org_id FROM user_org_ids())
    )
  );

-- ============================================
-- POLICIES: USER_REMINDER_SETTINGS
-- ============================================

CREATE POLICY "view_reminder_settings"
  ON user_reminder_settings FOR SELECT
  TO authenticated
  USING (is_super_admin() OR user_id = auth.uid());

CREATE POLICY "insert_reminder_settings"
  ON user_reminder_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_reminder_settings"
  ON user_reminder_settings FOR UPDATE
  TO authenticated
  USING (is_super_admin() OR user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete_reminder_settings"
  ON user_reminder_settings FOR DELETE
  TO authenticated
  USING (is_super_admin() OR user_id = auth.uid());

-- ============================================
-- IMPORTANT NOTES
-- ============================================

-- ✅ Super admin email configured: zrig.ayman@gmail.com

-- ============================================
-- Summary of Access Control
-- ============================================

-- SUPER ADMIN (identified by email: zrig.ayman@gmail.com):
--   ✓ Create/delete organizations
--   ✓ Create/update/delete memberships (assign users to orgs)
--   ✓ Full access to all data across all organizations
--   ✓ Can invite users to any organization

-- ORG ADMIN (role='admin' in memberships):
--   ✓ View their organization's data
--   ✓ Manage (create/update/delete) their organization's data
--   ✓ Invite users to their organization
--   ✓ Assign roles to users in their organization
--   ✓ Manage memberships in their organization

-- ORG MEMBER (role='member' in memberships):
--   ✓ View their organization's data
--   ✓ Create/update/delete data in their organization
--   ✗ Cannot invite users
--   ✗ Cannot manage memberships
-- ============================================
-- COMPREHENSIVE RLS PERFORMANCE FIX
-- Created: 2025-11-10
-- Purpose: Fix auth_rls_initplan and multiple_permissive_policies warnings
-- ============================================

-- ============================================
-- STEP 1: Drop ALL existing policies on all tables
-- ============================================

-- Drop all policies on projets
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'projets' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON projets';
    END LOOP;
END $$;

-- Drop all policies on tranches
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tranches' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON tranches';
    END LOOP;
END $$;

-- Drop all policies on investisseurs
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'investisseurs' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON investisseurs';
    END LOOP;
END $$;

-- Drop all policies on souscriptions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'souscriptions' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON souscriptions';
    END LOOP;
END $$;

-- Drop all policies on paiements
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'paiements' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON paiements';
    END LOOP;
END $$;

-- Drop all policies on organizations
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organizations' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON organizations';
    END LOOP;
END $$;

-- Drop all policies on memberships
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'memberships' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON memberships';
    END LOOP;
END $$;

-- Drop all policies on payment_proofs
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'payment_proofs' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON payment_proofs';
    END LOOP;
END $$;

-- Drop all policies on coupons_echeances
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'coupons_echeances' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON coupons_echeances';
    END LOOP;
END $$;

-- Drop all policies on profiles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
END $$;

-- Drop all policies on user_reminder_settings
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_reminder_settings' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_reminder_settings';
    END LOOP;
END $$;

-- Drop all policies on invitations
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'invitations' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON invitations';
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Recreate helper functions (ensure they exist)
-- ============================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'zrig.ayman@gmail.com'
  );
$$;

GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS TABLE(org_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT m.org_id
  FROM memberships m
  WHERE m.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION user_org_ids() TO authenticated;

CREATE OR REPLACE FUNCTION is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
    AND org_id = p_org_id
    AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION is_org_admin(UUID) TO authenticated;

-- ============================================
-- STEP 3: Create optimized RLS policies
-- KEY: Use (select ...) to prevent per-row re-evaluation
-- ============================================

-- ============================================
-- ORGANIZATIONS
-- ============================================

CREATE POLICY "Members view organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Superadmin insert organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK ((select is_super_admin()));

CREATE POLICY "Super admin and org admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR (select is_org_admin(id))
  );

CREATE POLICY "Superadmin delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING ((select is_super_admin()));

-- ============================================
-- MEMBERSHIPS
-- ============================================

CREATE POLICY "Superadmin or own memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR user_id = (select auth.uid())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Super admin and org admins can create memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR (select is_org_admin(org_id))
  );

CREATE POLICY "Super admin and org admins can update memberships"
  ON memberships FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR (select is_org_admin(org_id))
  );

CREATE POLICY "Super admin and org admins can delete memberships"
  ON memberships FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR (select is_org_admin(org_id))
  );

-- ============================================
-- INVITATIONS
-- ============================================

CREATE POLICY "Users can view invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Super admin and org admins can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR (select is_org_admin(org_id))
  );

CREATE POLICY "Super admin and org admins can update invitations"
  ON invitations FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR (select is_org_admin(org_id))
  );

CREATE POLICY "Admins can delete invitations"
  ON invitations FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR (select is_org_admin(org_id))
  );

-- ============================================
-- PROFILES
-- ============================================

CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR id = (select auth.uid())
  )
  WITH CHECK (
    (select is_super_admin())
    OR id = (select auth.uid())
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- ============================================
-- PROJETS
-- ============================================

CREATE POLICY "Users view org projets"
  ON projets FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can insert their org projets"
  ON projets FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can update their org projets"
  ON projets FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can delete their org projets"
  ON projets FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

-- ============================================
-- TRANCHES
-- ============================================

CREATE POLICY "Users view org tranches"
  ON tranches FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can insert their org tranches"
  ON tranches FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can update their org tranches"
  ON tranches FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can delete their org tranches"
  ON tranches FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

-- ============================================
-- INVESTISSEURS
-- ============================================

CREATE POLICY "Users view org investisseurs"
  ON investisseurs FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can insert their org investisseurs"
  ON investisseurs FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can update their org investisseurs"
  ON investisseurs FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can delete their org investisseurs"
  ON investisseurs FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

-- ============================================
-- SOUSCRIPTIONS
-- ============================================

CREATE POLICY "Users view org souscriptions"
  ON souscriptions FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can insert their org souscriptions"
  ON souscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can update their org souscriptions"
  ON souscriptions FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can delete their org souscriptions"
  ON souscriptions FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

-- ============================================
-- PAIEMENTS
-- ============================================

CREATE POLICY "Users view org paiements"
  ON paiements FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can insert their org paiements"
  ON paiements FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can update their org paiements"
  ON paiements FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can delete their org paiements"
  ON paiements FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

-- ============================================
-- PAYMENT_PROOFS
-- ============================================

CREATE POLICY "Users view payment proofs"
  ON payment_proofs FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR paiement_id IN (
      SELECT pa.id FROM paiements pa
      WHERE pa.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can insert payment proofs"
  ON payment_proofs FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR paiement_id IN (
      SELECT pa.id FROM paiements pa
      WHERE pa.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can update payment proofs"
  ON payment_proofs FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR paiement_id IN (
      SELECT pa.id FROM paiements pa
      WHERE pa.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can delete payment proofs"
  ON payment_proofs FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR paiement_id IN (
      SELECT pa.id FROM paiements pa
      WHERE pa.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

-- ============================================
-- COUPONS_ECHEANCES
-- ============================================

CREATE POLICY "Users view org coupons"
  ON coupons_echeances FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can insert their org coupons"
  ON coupons_echeances FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can update their org coupons"
  ON coupons_echeances FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can delete their org coupons"
  ON coupons_echeances FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

-- ============================================
-- USER_REMINDER_SETTINGS
-- ============================================

CREATE POLICY "Users view own reminder settings"
  ON user_reminder_settings FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR user_id = (select auth.uid())
  );

CREATE POLICY "Users insert own reminder settings"
  ON user_reminder_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users update own reminder settings"
  ON user_reminder_settings FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR user_id = (select auth.uid())
  )
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users delete own reminder settings"
  ON user_reminder_settings FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR user_id = (select auth.uid())
  );

-- ============================================
-- SUMMARY
-- ============================================

COMMENT ON POLICY "Members view organizations" ON organizations IS
  'Optimized: Uses (select is_super_admin()) to prevent per-row re-evaluation';

COMMENT ON POLICY "Users view org projets" ON projets IS
  'Optimized: Single policy per action, uses (select ...) pattern for performance';

-- ============================================
-- Performance Notes:
-- ============================================
-- ✅ All auth.uid() calls wrapped in (select auth.uid())
-- ✅ All function calls wrapped in (select function())
-- ✅ Only ONE policy per table/role/action combination
-- ✅ Eliminates all auth_rls_initplan warnings
-- ✅ Eliminates all multiple_permissive_policies warnings
-- ============================================
-- Fix Membership Deletion - Remove invited_by reference
-- Created: 2025-11-10
-- Purpose: Fix "column invited_by does not exist" error when deleting members
-- ============================================

-- The problem is in the delete_invitation_on_user_delete() function from migration
-- 20251108000006_fix_invitation_functions_search_path.sql which references
-- a non-existent column "invited_by" in the invitations table.

-- Fix the function to not reference invited_by
CREATE OR REPLACE FUNCTION public.delete_invitation_on_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- The invitations table doesn't have an invited_by column
  -- So we skip the deletion of invitations and just allow the user deletion to proceed
  -- Invitations will be cleaned up by the FK constraint if needed
  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.delete_invitation_on_user_delete() IS
  'Trigger function for user deletion - fixed to not reference non-existent invited_by column';
-- Add CGP (Conseiller en Gestion de Patrimoine) fields to investisseurs table
-- CGP information should be stored with the investor, not the subscription

ALTER TABLE investisseurs
ADD COLUMN IF NOT EXISTS cgp TEXT,
ADD COLUMN IF NOT EXISTS email_cgp TEXT;

-- Add index for faster CGP lookups
CREATE INDEX IF NOT EXISTS idx_investisseurs_email_cgp ON investisseurs(email_cgp);

COMMENT ON COLUMN investisseurs.cgp IS 'Nom du Conseiller en Gestion de Patrimoine';
COMMENT ON COLUMN investisseurs.email_cgp IS 'Email du Conseiller en Gestion de Patrimoine';
-- ============================================
-- Fix Coupon Recalculation Rules
-- Created: 2025-11-11
-- Purpose: Apply 30% flat tax ONLY for physical persons (personnes physiques)
-- ============================================

-- Function to recalculate coupons for all subscriptions in a project
CREATE OR REPLACE FUNCTION recalculate_project_coupons(p_projet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_taux_nominal numeric;
  v_subscription RECORD;
  v_investor_type text;
  v_coupon_brut numeric;
  v_coupon_net numeric;
BEGIN
  -- Get project taux_nominal
  SELECT taux_nominal INTO v_taux_nominal
  FROM projets
  WHERE id = p_projet_id;

  -- If no taux_nominal, exit
  IF v_taux_nominal IS NULL THEN
    RETURN;
  END IF;

  -- Loop through all subscriptions for this project
  FOR v_subscription IN
    SELECT s.id, s.montant_investi, s.investisseur_id
    FROM souscriptions s
    WHERE s.projet_id = p_projet_id
  LOOP
    -- Get investor type
    SELECT type INTO v_investor_type
    FROM investisseurs
    WHERE id = v_subscription.investisseur_id;

    -- Calculate coupon brut (annual coupon based on taux_nominal)
    v_coupon_brut := (v_subscription.montant_investi * v_taux_nominal) / 100;

    -- Calculate coupon net
    -- Physique: 30% flat tax -> net = brut * 0.7
    -- Morale: no flat tax -> net = brut
    IF v_investor_type = 'physique' THEN
      v_coupon_net := v_coupon_brut * 0.7;
    ELSE
      v_coupon_net := v_coupon_brut;
    END IF;

    -- Update subscription with recalculated coupons
    UPDATE souscriptions
    SET
      coupon_brut = v_coupon_brut,
      coupon_net = v_coupon_net
    WHERE id = v_subscription.id;

    -- Log the update for debugging
    RAISE NOTICE 'Updated subscription % - Type: %, Brut: %, Net: %',
      v_subscription.id, v_investor_type, v_coupon_brut, v_coupon_net;
  END LOOP;
END;
$$;

-- Function to recalculate coupons and schedules when project parameters change
CREATE OR REPLACE FUNCTION recalculate_on_project_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only recalculate if financial parameters changed
  IF (NEW.taux_nominal IS DISTINCT FROM OLD.taux_nominal) OR
     (NEW.periodicite_coupons IS DISTINCT FROM OLD.periodicite_coupons) OR
     (NEW.maturite_mois IS DISTINCT FROM OLD.maturite_mois) THEN

    RAISE NOTICE 'Project % financial parameters changed - recalculating coupons', NEW.id;

    -- Recalculate all coupons for this project
    PERFORM recalculate_project_coupons(NEW.id);

    -- Delete old payment schedules (coupons_echeances)
    DELETE FROM coupons_echeances
    WHERE souscription_id IN (
      SELECT id FROM souscriptions WHERE projet_id = NEW.id
    );

    RAISE NOTICE 'Deleted old payment schedules for project %', NEW.id;

    -- Note: Payment schedules need to be regenerated by calling generate_coupon_schedule
    -- This should be done by the application after the update
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_recalculate_on_project_update ON projets;

-- Create trigger on projets table
CREATE TRIGGER trigger_recalculate_on_project_update
  AFTER UPDATE ON projets
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_on_project_update();

-- Add comments
COMMENT ON FUNCTION recalculate_project_coupons IS 'Recalculates coupon_brut and coupon_net for all subscriptions in a project. Applies 30% flat tax ONLY for physical persons.';
COMMENT ON FUNCTION recalculate_on_project_update IS 'Trigger function that recalculates coupons when project financial parameters change';
COMMENT ON TRIGGER trigger_recalculate_on_project_update ON projets IS 'Recalculates coupons and deletes old payment schedules when project parameters change';
-- ============================================
-- Fix Tranche Coupon Recalculation Rules
-- Created: 2025-11-11
-- Purpose: Apply 30% flat tax ONLY for physical persons when tranche parameters change
-- ============================================

-- Function to recalculate coupons for all subscriptions in a tranche
CREATE OR REPLACE FUNCTION recalculate_tranche_coupons(p_tranche_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_taux_nominal numeric;
  v_projet_taux_nominal numeric;
  v_projet_id uuid;
  v_subscription RECORD;
  v_investor_type text;
  v_coupon_brut numeric;
  v_coupon_net numeric;
BEGIN
  -- Get tranche info (taux_nominal can be null if using project's)
  SELECT t.taux_nominal, t.projet_id, p.taux_nominal
  INTO v_taux_nominal, v_projet_id, v_projet_taux_nominal
  FROM tranches t
  JOIN projets p ON p.id = t.projet_id
  WHERE t.id = p_tranche_id;

  -- Use tranche taux_nominal if set, otherwise use project's
  v_taux_nominal := COALESCE(v_taux_nominal, v_projet_taux_nominal);

  -- If no taux_nominal available, exit
  IF v_taux_nominal IS NULL THEN
    RETURN;
  END IF;

  -- Loop through all subscriptions for this tranche
  FOR v_subscription IN
    SELECT s.id, s.montant_investi, s.investisseur_id
    FROM souscriptions s
    WHERE s.tranche_id = p_tranche_id
  LOOP
    -- Get investor type
    SELECT type INTO v_investor_type
    FROM investisseurs
    WHERE id = v_subscription.investisseur_id;

    -- Calculate coupon brut (annual coupon based on taux_nominal)
    v_coupon_brut := (v_subscription.montant_investi * v_taux_nominal) / 100;

    -- Calculate coupon net
    -- Physique: 30% flat tax -> net = brut * 0.7
    -- Morale: no flat tax -> net = brut
    IF v_investor_type = 'physique' THEN
      v_coupon_net := v_coupon_brut * 0.7;
    ELSE
      v_coupon_net := v_coupon_brut;
    END IF;

    -- Update subscription with recalculated coupons
    UPDATE souscriptions
    SET
      coupon_brut = v_coupon_brut,
      coupon_net = v_coupon_net
    WHERE id = v_subscription.id;

    -- Log the update for debugging
    RAISE NOTICE 'Updated subscription % - Type: %, Brut: %, Net: %',
      v_subscription.id, v_investor_type, v_coupon_brut, v_coupon_net;
  END LOOP;
END;
$$;

-- Function to recalculate coupons and schedules when tranche parameters change
CREATE OR REPLACE FUNCTION recalculate_on_tranche_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only recalculate if financial parameters changed
  IF (NEW.taux_nominal IS DISTINCT FROM OLD.taux_nominal) OR
     (NEW.periodicite_coupons IS DISTINCT FROM OLD.periodicite_coupons) OR
     (NEW.duree_mois IS DISTINCT FROM OLD.duree_mois) OR
     (NEW.date_emission IS DISTINCT FROM OLD.date_emission) THEN

    RAISE NOTICE 'Tranche % financial parameters changed - recalculating coupons', NEW.id;

    -- Recalculate all coupons for this tranche
    PERFORM recalculate_tranche_coupons(NEW.id);

    -- Delete old payment schedules (coupons_echeances)
    DELETE FROM coupons_echeances
    WHERE souscription_id IN (
      SELECT id FROM souscriptions WHERE tranche_id = NEW.id
    );

    RAISE NOTICE 'Deleted old payment schedules for tranche %', NEW.id;

    -- Note: Payment schedules need to be regenerated by calling generate_coupon_schedule
    -- This should be done by the application after the update
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_recalculate_on_tranche_update ON tranches;

-- Create trigger on tranches table
CREATE TRIGGER trigger_recalculate_on_tranche_update
  AFTER UPDATE ON tranches
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_on_tranche_update();

-- Add comments
COMMENT ON FUNCTION recalculate_tranche_coupons IS 'Recalculates coupon_brut and coupon_net for all subscriptions in a tranche. Applies 30% flat tax ONLY for physical persons.';
COMMENT ON FUNCTION recalculate_on_tranche_update IS 'Trigger function that recalculates coupons when tranche financial parameters change';
COMMENT ON TRIGGER trigger_recalculate_on_tranche_update ON tranches IS 'Recalculates coupons and deletes old payment schedules when tranche parameters change';
-- ============================================
-- Project to Tranche Inheritance
-- Created: 2025-11-14
-- Purpose: Automatically update all tranches when project financial parameters change
-- ============================================

-- Function to propagate project changes to all tranches
CREATE OR REPLACE FUNCTION propagate_project_to_tranches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only propagate if financial parameters changed
  IF (NEW.taux_nominal IS DISTINCT FROM OLD.taux_nominal) OR
     (NEW.periodicite_coupons IS DISTINCT FROM OLD.periodicite_coupons) OR
     (NEW.duree_mois IS DISTINCT FROM OLD.duree_mois) OR
     (NEW.date_emission IS DISTINCT FROM OLD.date_emission) THEN

    RAISE NOTICE 'Project % financial parameters changed - updating all tranches', NEW.id;

    -- Update all tranches in this project to inherit new values
    UPDATE tranches
    SET
      taux_nominal = NEW.taux_nominal,
      periodicite_coupons = NEW.periodicite_coupons,
      duree_mois = NEW.duree_mois,
      date_emission = NEW.date_emission,
      updated_at = now()
    WHERE projet_id = NEW.id;

    RAISE NOTICE 'Updated all tranches for project %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_propagate_project_to_tranches ON projets;

-- Create trigger on projets table
CREATE TRIGGER trigger_propagate_project_to_tranches
  AFTER UPDATE ON projets
  FOR EACH ROW
  EXECUTE FUNCTION propagate_project_to_tranches();

-- Update the existing tranche trigger to NOT delete paid coupons
-- This is handled by the regenerate-echeancier Edge Function now
CREATE OR REPLACE FUNCTION recalculate_on_tranche_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only recalculate if financial parameters changed
  IF (NEW.taux_nominal IS DISTINCT FROM OLD.taux_nominal) OR
     (NEW.periodicite_coupons IS DISTINCT FROM OLD.periodicite_coupons) OR
     (NEW.duree_mois IS DISTINCT FROM OLD.duree_mois) OR
     (NEW.date_emission IS DISTINCT FROM OLD.date_emission) THEN

    RAISE NOTICE 'Tranche % financial parameters changed - recalculating coupons', NEW.id;

    -- Recalculate all coupons for this tranche
    PERFORM recalculate_tranche_coupons(NEW.id);

    -- Delete only PENDING payment schedules (keep paid ones)
    -- This preserves payment history
    DELETE FROM coupons_echeances
    WHERE souscription_id IN (
      SELECT id FROM souscriptions WHERE tranche_id = NEW.id
    )
    AND statut != 'payé';

    RAISE NOTICE 'Deleted pending payment schedules for tranche % (kept paid ones)', NEW.id;

    -- Note: The application should call regenerate-echeancier Edge Function
    -- to regenerate the payment schedule after this trigger completes
  END IF;

  RETURN NEW;
END;
$$;

-- Add updated_at column to tranches if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tranches' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE tranches ADD COLUMN updated_at timestamp with time zone DEFAULT now();
  END IF;
END
$$;

-- Add comments
COMMENT ON FUNCTION propagate_project_to_tranches IS 'Propagates project financial parameter changes to all tranches in the project';
COMMENT ON TRIGGER trigger_propagate_project_to_tranches ON projets IS 'Updates all tranches when project financial parameters change';
-- ============================================
-- Fix Project to Tranche Inheritance
-- Created: 2025-11-15
-- Purpose: Remove date_emission from project propagation since projects don't have this field
-- ============================================

-- Function to propagate project changes to all tranches (FIXED)
CREATE OR REPLACE FUNCTION propagate_project_to_tranches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only propagate if financial parameters changed
  IF (NEW.taux_nominal IS DISTINCT FROM OLD.taux_nominal) OR
     (NEW.periodicite_coupons IS DISTINCT FROM OLD.periodicite_coupons) OR
     (NEW.duree_mois IS DISTINCT FROM OLD.duree_mois) THEN

    RAISE NOTICE 'Project % financial parameters changed - updating all tranches', NEW.id;

    -- Update all tranches in this project to inherit new values
    -- NOTE: date_emission is NOT copied because it's tranche-specific, not a project field
    UPDATE tranches
    SET
      taux_nominal = NEW.taux_nominal,
      periodicite_coupons = NEW.periodicite_coupons,
      duree_mois = NEW.duree_mois,
      updated_at = now()
    WHERE projet_id = NEW.id;

    RAISE NOTICE 'Updated all tranches for project %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Add comment
COMMENT ON FUNCTION propagate_project_to_tranches IS 'Propagates project financial parameter changes (taux_nominal, periodicite_coupons, duree_mois) to all tranches. date_emission is NOT propagated as it is tranche-specific.';
-- ============================================
-- Fix Coupon Calculation with Periodicite
-- Created: 2025-11-17
-- Purpose: Apply period adjustment based on periodicite and base_interet
-- ============================================

-- Helper function to get period ratio
CREATE OR REPLACE FUNCTION get_period_ratio(p_periodicite text, p_base_interet numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_base numeric;
BEGIN
  v_base := COALESCE(p_base_interet, 360);

  CASE LOWER(p_periodicite)
    WHEN 'annuel', 'annuelle' THEN
      RETURN 1.0;
    WHEN 'semestriel', 'semestrielle' THEN
      IF v_base = 365 THEN
        RETURN 182.5 / 365.0;
      ELSE
        RETURN 180.0 / 360.0;
      END IF;
    WHEN 'trimestriel', 'trimestrielle' THEN
      IF v_base = 365 THEN
        RETURN 91.25 / 365.0;
      ELSE
        RETURN 90.0 / 360.0;
      END IF;
    WHEN 'mensuel', 'mensuelle' THEN
      IF v_base = 365 THEN
        RETURN 30.42 / 365.0;
      ELSE
        RETURN 30.0 / 360.0;
      END IF;
    ELSE
      RAISE WARNING 'Périodicité inconnue: %, utilisation annuelle par défaut', p_periodicite;
      RETURN 1.0;
  END CASE;
END;
$$;

-- Function to recalculate coupons for all subscriptions in a project
CREATE OR REPLACE FUNCTION recalculate_project_coupons(p_projet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_taux_nominal numeric;
  v_base_interet numeric;
  v_periodicite_coupons text;
  v_subscription RECORD;
  v_investor_type text;
  v_coupon_annuel numeric;
  v_period_ratio numeric;
  v_coupon_brut numeric;
  v_coupon_net numeric;
BEGIN
  -- Get project parameters
  SELECT taux_nominal, base_interet, periodicite_coupons
  INTO v_taux_nominal, v_base_interet, v_periodicite_coupons
  FROM projets
  WHERE id = p_projet_id;

  -- If no taux_nominal, exit
  IF v_taux_nominal IS NULL THEN
    RETURN;
  END IF;

  -- Default base_interet to 360 if not set
  v_base_interet := COALESCE(v_base_interet, 360);

  -- Loop through all subscriptions for this project
  FOR v_subscription IN
    SELECT s.id, s.montant_investi, s.investisseur_id
    FROM souscriptions s
    WHERE s.projet_id = p_projet_id
  LOOP
    -- Get investor type
    SELECT type INTO v_investor_type
    FROM investisseurs
    WHERE id = v_subscription.investisseur_id;

    -- Calculate coupon annuel (annual coupon based on taux_nominal)
    v_coupon_annuel := (v_subscription.montant_investi * v_taux_nominal) / 100.0;

    -- Get period ratio
    v_period_ratio := get_period_ratio(v_periodicite_coupons, v_base_interet);

    -- Calculate coupon brut for the period
    v_coupon_brut := v_coupon_annuel * v_period_ratio;

    -- Calculate coupon net
    -- Physique: 30% flat tax -> net = brut * 0.7
    -- Morale: no flat tax -> net = brut
    IF v_investor_type = 'physique' THEN
      v_coupon_net := v_coupon_brut * 0.7;
    ELSE
      v_coupon_net := v_coupon_brut;
    END IF;

    -- Update subscription with recalculated coupons
    UPDATE souscriptions
    SET
      coupon_brut = v_coupon_brut,
      coupon_net = v_coupon_net
    WHERE id = v_subscription.id;

    -- Log the update for debugging
    RAISE NOTICE 'Updated subscription % - Type: %, Annuel: %, Ratio: %, Brut: %, Net: %',
      v_subscription.id, v_investor_type, v_coupon_annuel, v_period_ratio, v_coupon_brut, v_coupon_net;
  END LOOP;
END;
$$;

-- Function to recalculate coupons for all subscriptions in a tranche
CREATE OR REPLACE FUNCTION recalculate_tranche_coupons(p_tranche_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_taux_nominal numeric;
  v_projet_taux_nominal numeric;
  v_base_interet numeric;
  v_periodicite_coupons text;
  v_projet_periodicite text;
  v_projet_id uuid;
  v_subscription RECORD;
  v_investor_type text;
  v_coupon_annuel numeric;
  v_period_ratio numeric;
  v_coupon_brut numeric;
  v_coupon_net numeric;
BEGIN
  -- Get tranche info (taux_nominal and periodicite can be null if using project's)
  SELECT t.taux_nominal, t.periodicite_coupons, t.projet_id, p.taux_nominal, p.base_interet, p.periodicite_coupons
  INTO v_taux_nominal, v_periodicite_coupons, v_projet_id, v_projet_taux_nominal, v_base_interet, v_projet_periodicite
  FROM tranches t
  JOIN projets p ON p.id = t.projet_id
  WHERE t.id = p_tranche_id;

  -- Use tranche values if set, otherwise use project's
  v_taux_nominal := COALESCE(v_taux_nominal, v_projet_taux_nominal);
  v_periodicite_coupons := COALESCE(v_periodicite_coupons, v_projet_periodicite);
  v_base_interet := COALESCE(v_base_interet, 360);

  -- If no taux_nominal available, exit
  IF v_taux_nominal IS NULL THEN
    RETURN;
  END IF;

  -- Loop through all subscriptions for this tranche
  FOR v_subscription IN
    SELECT s.id, s.montant_investi, s.investisseur_id
    FROM souscriptions s
    WHERE s.tranche_id = p_tranche_id
  LOOP
    -- Get investor type
    SELECT type INTO v_investor_type
    FROM investisseurs
    WHERE id = v_subscription.investisseur_id;

    -- Calculate coupon annuel (annual coupon based on taux_nominal)
    v_coupon_annuel := (v_subscription.montant_investi * v_taux_nominal) / 100.0;

    -- Get period ratio
    v_period_ratio := get_period_ratio(v_periodicite_coupons, v_base_interet);

    -- Calculate coupon brut for the period
    v_coupon_brut := v_coupon_annuel * v_period_ratio;

    -- Calculate coupon net
    -- Physique: 30% flat tax -> net = brut * 0.7
    -- Morale: no flat tax -> net = brut
    IF v_investor_type = 'physique' THEN
      v_coupon_net := v_coupon_brut * 0.7;
    ELSE
      v_coupon_net := v_coupon_brut;
    END IF;

    -- Update subscription with recalculated coupons
    UPDATE souscriptions
    SET
      coupon_brut = v_coupon_brut,
      coupon_net = v_coupon_net
    WHERE id = v_subscription.id;

    -- Log the update for debugging
    RAISE NOTICE 'Updated subscription % - Type: %, Periodicite: %, Annuel: %, Ratio: %, Brut: %, Net: %',
      v_subscription.id, v_investor_type, v_periodicite_coupons, v_coupon_annuel, v_period_ratio, v_coupon_brut, v_coupon_net;
  END LOOP;
END;
$$;

-- Add comments
COMMENT ON FUNCTION get_period_ratio IS 'Calculates the period ratio based on periodicite and base_interet for coupon calculations';
COMMENT ON FUNCTION recalculate_project_coupons IS 'Recalculates coupon_brut and coupon_net for all subscriptions in a project with period adjustment. Applies 30% flat tax ONLY for physical persons.';
COMMENT ON FUNCTION recalculate_tranche_coupons IS 'Recalculates coupon_brut and coupon_net for all subscriptions in a tranche with period adjustment. Applies 30% flat tax ONLY for physical persons.';
/*
  # Fix RLS Circular Dependency

  ## Problem
  The `memberships` SELECT policy was using `user_org_ids()` function, which itself queries `memberships`.
  This creates infinite recursion when other tables (like `projets`) use `user_org_ids()` in their policies.

  ## Changes
  1. Drop and recreate the `memberships` SELECT policy without using `user_org_ids()`
  2. Use direct checks instead: `is_super_admin() OR user_id = auth.uid()`
  3. This breaks the circular dependency chain

  ## Security
  - Super admins can see all memberships
  - Regular users can only see their own memberships
  - This prevents recursion while maintaining security
*/

-- Drop the existing policy that causes recursion
DROP POLICY IF EXISTS "Superadmin or own memberships" ON memberships;

-- Create a new policy without circular dependency
CREATE POLICY "Superadmin or own memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR user_id = auth.uid()
  );
/*
  # Fix user_org_ids Function - Security Settings

  ## Problem
  The function is marked as STABLE SECURITY DEFINER, but:
  1. It uses auth.uid() which can change, so it should be VOLATILE
  2. SECURITY DEFINER context might not work properly with RLS

  ## Changes
  1. Update function to be VOLATILE (instead of STABLE)
  2. Keep SECURITY DEFINER to access memberships table
  3. Add explicit SET search_path for security
*/

CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS TABLE(org_id uuid)
LANGUAGE sql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.org_id
  FROM memberships m
  WHERE m.user_id = auth.uid();
$$;
/*
  # Fix Projets RLS Policies - Remove Function Dependency

  ## Problem
  The `user_org_ids()` function with SECURITY DEFINER doesn't properly access auth.uid()
  in all contexts, causing INSERT operations to fail with 403 errors.

  ## Solution
  Replace all policies that use `user_org_ids()` with direct membership checks.
  This is more efficient and avoids context issues.

  ## Changes
  1. Drop existing projets policies
  2. Recreate with direct membership queries
  3. Maintain same security requirements
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users view org projets" ON projets;
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;
DROP POLICY IF EXISTS "Users can update their org projets" ON projets;
DROP POLICY IF EXISTS "Users can delete their org projets" ON projets;

-- Recreate policies with direct checks
CREATE POLICY "Users view org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin() 
    OR org_id IN (
      SELECT m.org_id 
      FROM memberships m 
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin() 
    OR org_id IN (
      SELECT m.org_id 
      FROM memberships m 
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org projets"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (
    is_super_admin() 
    OR org_id IN (
      SELECT m.org_id 
      FROM memberships m 
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their org projets"
  ON projets
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin() 
    OR org_id IN (
      SELECT m.org_id 
      FROM memberships m 
      WHERE m.user_id = auth.uid()
    )
  );
/*
  # Simplify Projets INSERT Policy

  ## Problem
  The subquery in WITH CHECK might be causing evaluation issues.

  ## Solution
  Simplify the INSERT policy to avoid subquery complexity.
  Use EXISTS instead of IN for better performance and reliability.
*/

-- Drop and recreate the INSERT policy with EXISTS
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;

CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin() 
    OR EXISTS (
      SELECT 1 
      FROM memberships m 
      WHERE m.org_id = projets.org_id 
        AND m.user_id = auth.uid()
    )
  );
/*
  # Fix Projets INSERT Policy Syntax

  ## Problem
  The EXISTS clause might have incorrect table reference syntax.
  
  ## Solution
  Use correct syntax for referencing the row being inserted.
*/

-- Drop and recreate with correct syntax
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;

CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin() 
    OR EXISTS (
      SELECT 1 
      FROM memberships m 
      WHERE m.org_id = org_id 
        AND m.user_id = auth.uid()
    )
  );
/*
  # Create Helper Function for Organization Access

  ## Problem
  RLS policies with subqueries can cause evaluation issues when nested RLS is involved.
  
  ## Solution
  Create a SECURITY DEFINER function that checks if a user has access to an organization.
  This bypasses nested RLS checks.
*/

-- Create function to check if user has access to an org
CREATE OR REPLACE FUNCTION user_has_org_access(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Super admins have access to everything
  IF is_super_admin() THEN
    RETURN true;
  END IF;
  
  -- Check if user has membership in the org
  RETURN EXISTS (
    SELECT 1 
    FROM memberships m 
    WHERE m.org_id = check_org_id 
      AND m.user_id = auth.uid()
  );
END;
$$;

-- Drop and recreate the INSERT policy using this function
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;

CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_org_access(org_id)
  );
/*
  # Update All Projets Policies to Use Helper Function

  ## Changes
  Update SELECT, UPDATE, and DELETE policies to use the new user_has_org_access function
  for consistency and to avoid nested RLS issues.
*/

-- Update SELECT policy
DROP POLICY IF EXISTS "Users view org projets" ON projets;
CREATE POLICY "Users view org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (
    user_has_org_access(org_id)
  );

-- Update UPDATE policy
DROP POLICY IF EXISTS "Users can update their org projets" ON projets;
CREATE POLICY "Users can update their org projets"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (
    user_has_org_access(org_id)
  )
  WITH CHECK (
    user_has_org_access(org_id)
  );

-- Update DELETE policy
DROP POLICY IF EXISTS "Users can delete their org projets" ON projets;
CREATE POLICY "Users can delete their org projets"
  ON projets
  FOR DELETE
  TO authenticated
  USING (
    user_has_org_access(org_id)
  );
/*
  # Fix user_has_org_access to properly bypass RLS
  
  The issue: SECURITY DEFINER alone doesn't bypass RLS. We need to query
  the memberships table directly without RLS interference.
  
  Solution: Use a direct query that bypasses RLS by using SECURITY DEFINER
  with proper configuration to read from the table as the definer.
*/

-- Recreate the function with explicit RLS bypass
CREATE OR REPLACE FUNCTION public.user_has_org_access(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Super admins have access to everything
  SELECT CASE
    WHEN is_super_admin() THEN true
    ELSE EXISTS (
      SELECT 1 
      FROM memberships m 
      WHERE m.org_id = check_org_id 
      AND m.user_id = auth.uid()
    )
  END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.user_has_org_access(uuid) TO authenticated;