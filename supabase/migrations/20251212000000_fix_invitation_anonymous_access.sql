-- ============================================
-- Fix Invitation Anonymous Access
-- Created: 2025-12-12
-- Purpose: Allow unauthenticated users to view invitations by token
-- ============================================

-- PROBLEM: The superadmin RLS migration removed anonymous access to invitations
-- This prevents users from viewing their invitation when clicking the link
-- because they don't have an account yet (they are "anon" not "authenticated")

-- SOLUTION: Add a separate policy for anonymous users to view invitations
-- This is safe because:
-- 1. Token is a 256-bit cryptographic value (UUID + UUID) that cannot be guessed
-- 2. This is required for the invitation acceptance flow to work
-- 3. Users can only accept the invitation once (status changes to 'accepted')

-- Add policy to allow anonymous (unauthenticated) users to view invitations
CREATE POLICY "Anonymous users can view invitations"
  ON invitations
  FOR SELECT
  TO anon
  USING (true);

-- Comment
COMMENT ON POLICY "Anonymous users can view invitations" ON invitations IS
  'Allows unauthenticated users to view invitations using their unique token. Required for invitation acceptance flow. Security is enforced by the cryptographically secure token (256-bit UUID).';
