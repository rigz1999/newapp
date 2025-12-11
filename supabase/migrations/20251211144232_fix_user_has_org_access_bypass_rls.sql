/*
  # Fix user_has_org_access to properly bypass RLS
  
  The issue: SECURITY DEFINER alone doesn't bypass RLS. We need to query
  the memberships table directly without RLS interference.
  
  Solution: Use a direct query that bypasses RLS by using SECURITY DEFINER
  with proper configuration to read from the table as the definer.
*/

-- Recreate the function with explicit RLS bypass
CREATE OR REPLACE FUNCTION public.user_has_org_access(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Super admins have access to everything
  SELECT CASE
    WHEN is_super_admin() THEN true
    ELSE EXISTS (
      SELECT 1 
      FROM memberships m 
      WHERE m.org_id = check_org_id 
      AND m.user_id = auth.uid()
    )
  END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.user_has_org_access(uuid) TO authenticated;