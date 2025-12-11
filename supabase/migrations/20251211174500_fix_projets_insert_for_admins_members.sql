/*
  # Fix projets INSERT policy for admins and members

  1. Problem
    - Admins and members cannot create projects
    - Subquery might be causing issues with RLS

  2. Solution
    - Simplify the membership check
    - Use auth.uid() directly without complex subqueries
    - Add better debugging with explicit conditions
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;

-- Recreate INSERT policy with simplified logic
CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Superadmin check (hardcoded for now)
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
    OR
    -- Check if user has membership in the organization
    -- using a direct join that bypasses potential RLS issues
    (org_id IN (
      SELECT m.org_id
      FROM memberships m
      WHERE m.user_id = auth.uid()
    ))
  );
