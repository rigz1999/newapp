/*
  # Simplify Projets INSERT Policy

  ## Problem
  The subquery in WITH CHECK might be causing evaluation issues.

  ## Solution
  Simplify the INSERT policy to avoid subquery complexity.
  Use EXISTS instead of IN for better performance and reliability.
*/

-- Drop and recreate the INSERT policy with EXISTS
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;

CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin() 
    OR EXISTS (
      SELECT 1 
      FROM memberships m 
      WHERE m.org_id = projets.org_id 
        AND m.user_id = auth.uid()
    )
  );
