/*
  # Fix projets RLS using a secure membership check
  
  1. Problem
    - Circular dependencies in RLS policies
    - Memberships policy references itself
  
  2. Solution
    - Create a SECURITY DEFINER function that bypasses RLS to check memberships
    - Use this function in projets policies
*/

-- First, simplify memberships policy back
DROP POLICY IF EXISTS "Users can view memberships in their orgs" ON memberships;

CREATE POLICY "Users can view own memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (
    (auth.email() = 'zrig.ayman@gmail.com')
    OR
    (user_id = auth.uid())
  );

-- Create a secure function to check org membership
CREATE OR REPLACE FUNCTION user_in_org(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE org_id = check_org_id
    AND user_id = auth.uid()
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION user_in_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_in_org(uuid) TO anon;

-- Update projets policies to use this function
DROP POLICY IF EXISTS "Users view org projets" ON projets;
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;
DROP POLICY IF EXISTS "Users can update their org projets" ON projets;
DROP POLICY IF EXISTS "Users can delete their org projets" ON projets;

CREATE POLICY "Users view org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (
    user_in_org(org_id) OR auth.email() = 'zrig.ayman@gmail.com'
  );

CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_in_org(org_id) OR auth.email() = 'zrig.ayman@gmail.com'
  );

CREATE POLICY "Users can update their org projets"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (
    user_in_org(org_id) OR auth.email() = 'zrig.ayman@gmail.com'
  )
  WITH CHECK (
    user_in_org(org_id) OR auth.email() = 'zrig.ayman@gmail.com'
  );

CREATE POLICY "Users can delete their org projets"
  ON projets
  FOR DELETE
  TO authenticated
  USING (
    user_in_org(org_id) OR auth.email() = 'zrig.ayman@gmail.com'
  );
