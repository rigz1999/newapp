/*
  # Simplify projets policies to remove function calls
  
  1. Problem
    - projets policies use user_in_org() function
    - user_in_org() can't properly bypass RLS even with SECURITY DEFINER
    - This causes 403 errors
  
  2. Solution
    - Replace user_in_org(org_id) with direct subquery
    - Subquery checks memberships directly without function call
    - This avoids RLS circular dependency issues
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users view org projets" ON projets;
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;
DROP POLICY IF EXISTS "Users can update their org projets" ON projets;
DROP POLICY IF EXISTS "Users can delete their org projets" ON projets;

-- SELECT: Users can view projets from their organizations
CREATE POLICY "Users view org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (
    -- Super admin can see everything
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
    OR
    -- User is a member of the project's organization
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = projets.org_id
      AND memberships.user_id = auth.uid()
    )
  );

-- INSERT: Users can insert projets for their organizations
CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
    OR
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = projets.org_id
      AND memberships.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update projets from their organizations
CREATE POLICY "Users can update their org projets"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
    OR
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = projets.org_id
      AND memberships.user_id = auth.uid()
    )
  )
  WITH CHECK (
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
    OR
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = projets.org_id
      AND memberships.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete projets from their organizations
CREATE POLICY "Users can delete their org projets"
  ON projets
  FOR DELETE
  TO authenticated
  USING (
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
    OR
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = projets.org_id
      AND memberships.user_id = auth.uid()
    )
  );
