-- ============================================
-- Complete RLS Setup for User Management
-- Created: 2025-11-08
-- Purpose: Fix all user/invitation deletion policies
-- ============================================

-- ============================================
-- 1. INVITATIONS - Delete invitations (for admins/owners)
-- ============================================

DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;

CREATE POLICY "Admins can delete invitations"
  ON invitations
  FOR DELETE
  TO authenticated
  USING (
    -- Organization owners can delete
    org_id IN (
      SELECT id FROM organizations
      WHERE owner_id = (select auth.uid())
    )
    OR
    -- Admins can delete
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- 2. MEMBERSHIPS - Remove users from organizations
-- ============================================

DROP POLICY IF EXISTS "Organization owners can delete memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON memberships;

CREATE POLICY "Admins and owners can delete memberships"
  ON memberships
  FOR DELETE
  TO authenticated
  USING (
    -- Organization owners can delete any membership in their org
    org_id IN (
      SELECT id FROM organizations
      WHERE owner_id = (select auth.uid())
    )
    OR
    -- Admins can delete memberships in their org (except owner's membership)
    (
      org_id IN (
        SELECT org_id FROM memberships
        WHERE user_id = (select auth.uid())
        AND role IN ('admin', 'super_admin')
      )
      AND
      -- Cannot delete the organization owner's membership
      user_id NOT IN (
        SELECT owner_id FROM organizations WHERE id = memberships.org_id
      )
    )
  );

-- Comments
COMMENT ON POLICY "Admins can delete invitations" ON invitations IS
  'Organization owners and admins can delete invitations - optimized with (select auth.uid())';

COMMENT ON POLICY "Admins and owners can delete memberships" ON memberships IS
  'Organization owners and admins can remove members, but admins cannot remove the owner';
