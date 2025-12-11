/*
  # Fix projets RLS policies to use profiles.is_superadmin

  1. Problem
    - Current policies hardcode superadmin email check
    - Should check profiles.is_superadmin column instead
    - Admins with role='admin' can only create for their org
    - Members can only create for their org

  2. Solution
    - Replace hardcoded email with profiles.is_superadmin check
    - Superadmins can create/manage projects for ANY organization
    - Admins and members can only create/manage for their organizations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users view org projets" ON projets;
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;
DROP POLICY IF EXISTS "Users can update their org projets" ON projets;
DROP POLICY IF EXISTS "Users can delete their org projets" ON projets;

-- SELECT: Superadmins see everything, others see only their org's projets
CREATE POLICY "Users view org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (
    -- Superadmin can see everything
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_superadmin = true
    )
    OR
    -- User is a member of the project's organization
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = projets.org_id
      AND memberships.user_id = auth.uid()
    )
  );

-- INSERT: Superadmins can insert for any org, others only for their org
CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Superadmin can insert for any organization
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_superadmin = true
    )
    OR
    -- User has membership in the organization (admin or member)
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = projets.org_id
      AND memberships.user_id = auth.uid()
    )
  );

-- UPDATE: Superadmins can update any projet, others only their org's projets
CREATE POLICY "Users can update their org projets"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_superadmin = true
    )
    OR
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = projets.org_id
      AND memberships.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_superadmin = true
    )
    OR
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = projets.org_id
      AND memberships.user_id = auth.uid()
    )
  );

-- DELETE: Superadmins can delete any projet, others only their org's projets
CREATE POLICY "Users can delete their org projets"
  ON projets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_superadmin = true
    )
    OR
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = projets.org_id
      AND memberships.user_id = auth.uid()
    )
  );
