/*
  # Diagnose and fix projets INSERT policy for admins

  1. Problem
    - Admins have memberships but still can't insert projets
    - Current subquery approach isn't working

  2. Solution
    - Create a SECURITY DEFINER function to check membership
    - This bypasses any potential RLS issues in the subquery
    - Function explicitly checks if user has access to org
*/

-- Create a helper function to check if user can access an org
-- SECURITY DEFINER means it runs with the privileges of the function owner
-- This bypasses RLS issues that might occur in policy subqueries
CREATE OR REPLACE FUNCTION public.user_can_access_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has a membership in this organization
  RETURN EXISTS (
    SELECT 1
    FROM memberships
    WHERE memberships.org_id = check_org_id
    AND memberships.user_id = auth.uid()
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.user_can_access_org(uuid) TO authenticated;

-- Drop and recreate the INSERT policy using the function
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;

CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Superadmin can insert for any organization
    ((auth.jwt()->>'email') = 'zrig.ayman@gmail.com')
    OR
    -- User has membership in the organization
    user_can_access_org(org_id)
  );
