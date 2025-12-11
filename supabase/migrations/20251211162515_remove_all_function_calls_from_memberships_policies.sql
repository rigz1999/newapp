/*
  # Remove all function calls from memberships policies
  
  1. Problem
    - Memberships policies call is_super_admin() and is_org_admin()
    - These functions query memberships, causing circular dependencies
    - This causes 500 errors
  
  2. Solution
    - Remove ALL function calls from memberships policies
    - Use direct JWT checks and simple conditions only
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;
DROP POLICY IF EXISTS "Super admin and org admins can create memberships" ON memberships;
DROP POLICY IF EXISTS "Super admin and org admins can update memberships" ON memberships;
DROP POLICY IF EXISTS "Super admin and org admins can delete memberships" ON memberships;

-- SELECT: Users can see their own memberships, super admin sees all
CREATE POLICY "Users can view own memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid())
    OR
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
  );

-- INSERT: Only super admin can create memberships
-- (We'll add org admin check later without circular dependency)
CREATE POLICY "Super admin can create memberships"
  ON memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'email') = 'zrig.ayman@gmail.com'
  );

-- UPDATE: Only super admin can update memberships
CREATE POLICY "Super admin can update memberships"
  ON memberships
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'email') = 'zrig.ayman@gmail.com'
  );

-- DELETE: Only super admin can delete memberships
CREATE POLICY "Super admin can delete memberships"
  ON memberships
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'email') = 'zrig.ayman@gmail.com'
  );
