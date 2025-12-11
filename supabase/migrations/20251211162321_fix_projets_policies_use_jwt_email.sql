/*
  # Fix projets policies to use JWT email correctly
  
  1. Problem
    - Using auth.email() which doesn't exist
    - Should use auth.jwt()->>'email' to get email from JWT
  
  2. Solution
    - Update all projets policies to use correct JWT email extraction
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users view org projets" ON projets;
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;
DROP POLICY IF EXISTS "Users can update their org projets" ON projets;
DROP POLICY IF EXISTS "Users can delete their org projets" ON projets;

-- Recreate with correct email check
CREATE POLICY "Users view org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (
    user_in_org(org_id) OR ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
  );

CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_in_org(org_id) OR ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
  );

CREATE POLICY "Users can update their org projets"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (
    user_in_org(org_id) OR ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
  )
  WITH CHECK (
    user_in_org(org_id) OR ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
  );

CREATE POLICY "Users can delete their org projets"
  ON projets
  FOR DELETE
  TO authenticated
  USING (
    user_in_org(org_id) OR ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
  );
