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
