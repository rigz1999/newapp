/*
  # Fix Projets INSERT Policy Syntax

  ## Problem
  The EXISTS clause might have incorrect table reference syntax.
  
  ## Solution
  Use correct syntax for referencing the row being inserted.
*/

-- Drop and recreate with correct syntax
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
      WHERE m.org_id = org_id 
        AND m.user_id = auth.uid()
    )
  );
