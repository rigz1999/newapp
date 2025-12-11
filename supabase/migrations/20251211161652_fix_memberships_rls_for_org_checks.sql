/*
  # Fix memberships RLS to allow org-level checks
  
  1. Problem
    - projets policies need to check if user has membership in an org
    - Current memberships SELECT policy only shows user's own memberships
    - This causes the subquery in projets policies to work correctly
    - But we need to ensure it's efficient
  
  2. Solution
    - Update memberships SELECT policy to allow users to see all memberships 
      in orgs they belong to (for efficient checking)
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Superadmin or own memberships" ON memberships;

-- Create new policy that allows viewing memberships in orgs you belong to
CREATE POLICY "Users can view memberships in their orgs"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (
    -- Super admin can see all
    (auth.email() = 'zrig.ayman@gmail.com')
    OR
    -- Or user is viewing their own membership
    (user_id = auth.uid())
    OR
    -- Or user has a membership in the same org
    (
      org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );
