/*
  # Update All Projets Policies to Use Helper Function

  ## Changes
  Update SELECT, UPDATE, and DELETE policies to use the new user_has_org_access function
  for consistency and to avoid nested RLS issues.
*/

-- Update SELECT policy
DROP POLICY IF EXISTS "Users view org projets" ON projets;
CREATE POLICY "Users view org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (
    user_has_org_access(org_id)
  );

-- Update UPDATE policy
DROP POLICY IF EXISTS "Users can update their org projets" ON projets;
CREATE POLICY "Users can update their org projets"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (
    user_has_org_access(org_id)
  )
  WITH CHECK (
    user_has_org_access(org_id)
  );

-- Update DELETE policy
DROP POLICY IF EXISTS "Users can delete their org projets" ON projets;
CREATE POLICY "Users can delete their org projets"
  ON projets
  FOR DELETE
  TO authenticated
  USING (
    user_has_org_access(org_id)
  );
