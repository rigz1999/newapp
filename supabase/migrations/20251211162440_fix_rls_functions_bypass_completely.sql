/*
  # Fix RLS helper functions to bypass RLS completely
  
  1. Problem
    - is_org_admin and user_in_org functions query memberships table
    - Memberships RLS policies might be creating circular dependencies
    - 500 errors when querying memberships
  
  2. Solution
    - Make functions SECURITY DEFINER with explicit bypass of RLS
    - Simplify to query memberships directly without RLS interference
*/

-- Recreate is_org_admin to bypass RLS properly
CREATE OR REPLACE FUNCTION is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result boolean;
BEGIN
  -- Explicitly bypass RLS by using a direct query
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
    AND org_id = p_org_id
    AND role = 'admin'
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Recreate user_in_org to bypass RLS properly
CREATE OR REPLACE FUNCTION user_in_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result boolean;
BEGIN
  -- Explicitly bypass RLS by using a direct query
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE org_id = check_org_id
    AND user_id = auth.uid()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION user_in_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_in_org(uuid) TO anon;
