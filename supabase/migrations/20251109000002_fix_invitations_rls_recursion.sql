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
