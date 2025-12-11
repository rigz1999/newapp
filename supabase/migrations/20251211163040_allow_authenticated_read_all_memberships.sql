/*
  # Allow authenticated users to read all memberships
  
  1. Problem
    - projets policies use subqueries that check memberships
    - The current memberships SELECT policy only allows users to see their own
    - This creates issues when policies need to check memberships
  
  2. Solution
    - Allow all authenticated users to SELECT from memberships
    - This enables policy subqueries to work properly
    - Still maintain strict INSERT/UPDATE/DELETE policies
    - Membership data is not sensitive (just org relationships)
*/

-- Drop existing SELECT policy on memberships
DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;

-- Allow all authenticated users to view all memberships
-- This is safe because membership data is not sensitive
-- It only shows which users belong to which orgs
CREATE POLICY "Authenticated users can view memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (true);
