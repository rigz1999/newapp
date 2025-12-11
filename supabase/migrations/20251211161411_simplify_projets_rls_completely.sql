/*
  # Completely simplify projets RLS policies
  
  1. Changes
    - Drop the function-based policies
    - Create simpler inline policies that directly check memberships
    - Avoid any potential infinite loops or circular dependencies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users view org projets" ON projets;
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;
DROP POLICY IF EXISTS "Users can update their org projets" ON projets;
DROP POLICY IF EXISTS "Users can delete their org projets" ON projets;

-- Create new simplified policies with inline checks
CREATE POLICY "Users view org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM memberships WHERE memberships.org_id = projets.org_id
    )
    OR
    auth.email() = 'zrig.ayman@gmail.com'
  );

CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM memberships WHERE memberships.org_id = projets.org_id
    )
    OR
    auth.email() = 'zrig.ayman@gmail.com'
  );

CREATE POLICY "Users can update their org projets"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM memberships WHERE memberships.org_id = projets.org_id
    )
    OR
    auth.email() = 'zrig.ayman@gmail.com'
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM memberships WHERE memberships.org_id = projets.org_id
    )
    OR
    auth.email() = 'zrig.ayman@gmail.com'
  );

CREATE POLICY "Users can delete their org projets"
  ON projets
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM memberships WHERE memberships.org_id = projets.org_id
    )
    OR
    auth.email() = 'zrig.ayman@gmail.com'
  );
