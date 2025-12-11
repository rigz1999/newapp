/*
  # Create Helper Function for Organization Access

  ## Problem
  RLS policies with subqueries can cause evaluation issues when nested RLS is involved.
  
  ## Solution
  Create a SECURITY DEFINER function that checks if a user has access to an organization.
  This bypasses nested RLS checks.
*/

-- Create function to check if user has access to an org
CREATE OR REPLACE FUNCTION user_has_org_access(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Super admins have access to everything
  IF is_super_admin() THEN
    RETURN true;
  END IF;
  
  -- Check if user has membership in the org
  RETURN EXISTS (
    SELECT 1 
    FROM memberships m 
    WHERE m.org_id = check_org_id 
      AND m.user_id = auth.uid()
  );
END;
$$;

-- Drop and recreate the INSERT policy using this function
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;

CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_org_access(org_id)
  );
