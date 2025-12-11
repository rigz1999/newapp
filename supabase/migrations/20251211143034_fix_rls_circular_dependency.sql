/*
  # Fix RLS Circular Dependency

  ## Problem
  The `memberships` SELECT policy was using `user_org_ids()` function, which itself queries `memberships`.
  This creates infinite recursion when other tables (like `projets`) use `user_org_ids()` in their policies.

  ## Changes
  1. Drop and recreate the `memberships` SELECT policy without using `user_org_ids()`
  2. Use direct checks instead: `is_super_admin() OR user_id = auth.uid()`
  3. This breaks the circular dependency chain

  ## Security
  - Super admins can see all memberships
  - Regular users can only see their own memberships
  - This prevents recursion while maintaining security
*/

-- Drop the existing policy that causes recursion
DROP POLICY IF EXISTS "Superadmin or own memberships" ON memberships;

-- Create a new policy without circular dependency
CREATE POLICY "Superadmin or own memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin() OR user_id = auth.uid()
  );
