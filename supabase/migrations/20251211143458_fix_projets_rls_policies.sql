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
