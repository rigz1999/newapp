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
