/*
  # Simplify memberships SELECT policy to remove circular dependencies
  
  1. Problem
    - Memberships SELECT policy uses is_super_admin()
    - is_org_admin() function queries memberships
    - This creates circular dependency causing 500 errors
  
  2. Solution
    - Create simple SELECT policy that only checks:
      - User's own membership
      - Or super admin email directly from JWT
    - No function calls to break circular dependency
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;

-- Create simple policy without function calls
CREATE POLICY "Users can view own memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own membership
    (user_id = auth.uid())
    OR
    -- Super admin can see all (direct JWT check, no function)
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
  );
