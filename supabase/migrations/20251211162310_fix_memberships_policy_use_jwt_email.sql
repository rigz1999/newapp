/*
  # Fix memberships policy to use JWT email correctly
  
  1. Problem
    - Using auth.email() which doesn't exist
    - Should use auth.jwt()->>'email' to get email from JWT
  
  2. Solution
    - Update memberships SELECT policy to use correct JWT email extraction
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;

-- Create correct policy
CREATE POLICY "Users can view own memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
    OR
    (user_id = auth.uid())
  );
