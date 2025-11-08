-- ============================================
-- Workflow Simplification: Single Super Admin System
-- Created: 2025-11-08
-- Purpose:
--   - Super admin = single user identified by email (not in memberships)
--   - Organizations have owner_id (main admin)
--   - Memberships: only 'admin' or 'member' roles
--   - Invitations workflow for account creation
-- ============================================

-- IMPORTANT: Replace 'YOUR_SUPER_ADMIN_EMAIL@example.com' with your actual email address!

-- ============================================
-- Step 1: Clean up existing data
-- ============================================

-- Remove super_admin role from memberships (convert to admin)
UPDATE memberships
SET role = 'admin'
WHERE role = 'super_admin';

-- Fix organizations without owner_id
-- Replace with your actual super admin email
UPDATE organizations
SET owner_id = (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com')
WHERE owner_id IS NULL;

-- Update role constraint to only allow 'admin' and 'member'
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_role_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_role_check
  CHECK (role IN ('admin', 'member'));

-- ============================================
-- Step 2: Drop ALL existing policies
-- ============================================

-- Memberships policies
DROP POLICY IF EXISTS "Users can view their memberships" ON memberships;
DROP POLICY IF EXISTS "Users can view memberships" ON memberships;
DROP POLICY IF EXISTS "Organization owners can create memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can create memberships" ON memberships;
DROP POLICY IF EXISTS "Organization owners can update memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can update memberships" ON memberships;
DROP POLICY IF EXISTS "Organization owners can delete memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON memberships;
DROP POLICY IF EXISTS "Admins and owners can delete memberships" ON memberships;

-- Organizations policies
DROP POLICY IF EXISTS "Users can view organizations they are members of" ON organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Super admin can create organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can delete their organizations" ON organizations;
DROP POLICY IF EXISTS "Super admin can delete organizations" ON organizations;

-- Invitations policies
DROP POLICY IF EXISTS "Users can view org invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;
DROP POLICY IF EXISTS "Anyone authenticated can delete invitations" ON invitations;

-- ============================================
-- Step 3: Create new optimized policies
-- ============================================

-- ============================================
-- MEMBERSHIPS POLICIES
-- ============================================

CREATE POLICY "Users can view memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    -- Super admin can view all
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Organization owners can view their org members
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    -- Admins can view their org members
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
    OR
    -- Users can view their own memberships
    user_id = (select auth.uid())
  );

CREATE POLICY "Admins can create memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admin can create anywhere
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Organization owners can create in their org
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    -- Admins can create in their org
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update memberships"
  ON memberships FOR UPDATE
  TO authenticated
  USING (
    -- Super admin can update anywhere
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Organization owners can update in their org
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    -- Admins can update in their org (except owner)
    (
      org_id IN (
        SELECT org_id FROM memberships
        WHERE user_id = (select auth.uid()) AND role = 'admin'
      )
      AND user_id NOT IN (
        SELECT owner_id FROM organizations WHERE id = memberships.org_id
      )
    )
  )
  WITH CHECK (
    -- Same as USING
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    (
      org_id IN (
        SELECT org_id FROM memberships
        WHERE user_id = (select auth.uid()) AND role = 'admin'
      )
      AND user_id NOT IN (
        SELECT owner_id FROM organizations WHERE id = memberships.org_id
      )
    )
  );

CREATE POLICY "Admins can delete memberships"
  ON memberships FOR DELETE
  TO authenticated
  USING (
    -- Super admin can delete anywhere
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Organization owners can delete in their org
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    -- Admins can delete in their org (except owner)
    (
      EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.org_id = memberships.org_id
        AND m.user_id = (select auth.uid())
        AND m.role = 'admin'
      )
      AND user_id NOT IN (
        SELECT owner_id FROM organizations WHERE id = memberships.org_id
      )
    )
  );

-- ============================================
-- ORGANIZATIONS POLICIES
-- ============================================

CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    -- Super admin can view all
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Users can view orgs they are members of
    id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()))
  );

CREATE POLICY "Super admin can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
  );

CREATE POLICY "Admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    -- Super admin can update all
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Organization owners can update their org
    owner_id = (select auth.uid())
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    owner_id = (select auth.uid())
  );

CREATE POLICY "Super admin can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
  );

-- ============================================
-- INVITATIONS POLICIES
-- ============================================

CREATE POLICY "Users can view org invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    -- Super admin can view all
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Organization members can view their org invitations
    org_id IN (SELECT org_id FROM memberships WHERE user_id = (select auth.uid()))
  );

CREATE POLICY "Admins can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admin can create anywhere
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Organization owners can create
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    -- Admins can create in their org
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete invitations"
  ON invitations FOR DELETE
  TO authenticated
  USING (
    -- Super admin can delete all
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Organization owners can delete
    org_id IN (SELECT id FROM organizations WHERE owner_id = (select auth.uid()))
    OR
    -- Admins can delete in their org
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON POLICY "Users can view memberships" ON memberships IS
  'Super admin sees all. Org owners and admins see their org. Users see their own.';

COMMENT ON POLICY "Admins can create memberships" ON memberships IS
  'Super admin can create anywhere. Org owners and admins can create in their org.';

COMMENT ON POLICY "Admins can delete memberships" ON memberships IS
  'Super admin can delete anywhere. Org owners can delete in their org. Admins can delete in their org except the owner.';

COMMENT ON POLICY "Users can view their organizations" ON organizations IS
  'Super admin sees all organizations. Users see orgs they are members of.';

COMMENT ON POLICY "Super admin can create organizations" ON organizations IS
  'Only the super admin can create new organizations.';

COMMENT ON POLICY "Super admin can delete organizations" ON organizations IS
  'Only the super admin can delete organizations.';

COMMENT ON POLICY "Admins can create invitations" ON invitations IS
  'Super admin can invite to any org. Org owners and admins can invite to their org.';

COMMENT ON POLICY "Admins can delete invitations" ON invitations IS
  'Super admin can delete any invitation. Org owners and admins can delete invitations from their org.';

-- ============================================
-- Verification queries (run these to check)
-- ============================================

-- Check your setup
SELECT
    'Super Admin Check' as check_type,
    id,
    email,
    (email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') as is_super_admin
FROM auth.users
WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com';

-- Check organizations
SELECT
    'Organizations' as check_type,
    id,
    name,
    owner_id,
    (SELECT email FROM auth.users WHERE id = owner_id) as owner_email
FROM organizations;

-- Check memberships (should only have 'admin' or 'member')
SELECT
    'Memberships' as check_type,
    m.id,
    m.role,
    m.org_id,
    o.name as org_name,
    (SELECT email FROM auth.users WHERE id = m.user_id) as user_email
FROM memberships m
JOIN organizations o ON o.id = m.org_id;

-- Check for any remaining super_admin roles (should be empty)
SELECT * FROM memberships WHERE role = 'super_admin';
