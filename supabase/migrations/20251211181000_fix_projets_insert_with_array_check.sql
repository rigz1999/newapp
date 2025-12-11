/*
  # Fix projets INSERT using array membership check

  1. Problem
    - EXISTS subquery approach not working for admins
    - Function approach had circular dependency issues

  2. Solution
    - Use IN clause with array subquery
    - This might be evaluated differently by Postgres planner
    - More explicit about checking org_id membership
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;

-- Recreate INSERT policy with IN clause instead of EXISTS
CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Superadmin can insert for any organization
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
    OR
    -- Check if the org_id being inserted is in user's memberships
    (org_id IN (
      SELECT memberships.org_id
      FROM memberships
      WHERE memberships.user_id = auth.uid()
    ))
  );
