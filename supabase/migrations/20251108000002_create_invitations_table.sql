-- ============================================
-- Create Invitations Table
-- Created: 2025-11-08
-- Purpose: Create invitations table if it doesn't exist and set up RLS policies
-- ============================================

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view org invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON invitations;

-- Policy for viewing invitations (all org members can see pending invitations)
CREATE POLICY "Users can view org invitations"
  ON invitations
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

-- Policy for creating invitations (admins and org owners)
CREATE POLICY "Admins can create invitations"
  ON invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is admin/super_admin in memberships
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
    OR
    -- Allow if user is the organization owner
    org_id IN (
      SELECT id FROM organizations
      WHERE owner_id = (select auth.uid())
    )
  );

-- Policy for deleting invitations (admins and org owners)
CREATE POLICY "Admins can delete invitations"
  ON invitations
  FOR DELETE
  TO authenticated
  USING (
    -- Allow if user is admin/super_admin in memberships
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    )
    OR
    -- Allow if user is the organization owner
    org_id IN (
      SELECT id FROM organizations
      WHERE owner_id = (select auth.uid())
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_org_id ON invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- Comments
COMMENT ON TABLE invitations IS 'Stores pending invitations for users to join organizations';
COMMENT ON POLICY "Users can view org invitations" ON invitations IS
  'All organization members can view pending invitations for their org';
COMMENT ON POLICY "Admins can create invitations" ON invitations IS
  'Organization owners and admins can create invitations';
COMMENT ON POLICY "Admins can delete invitations" ON invitations IS
  'Organization owners and admins can delete invitations';
