/*
  # Fix user_has_org_access function permissions
  
  1. Changes
    - Grant execute permission on user_has_org_access to authenticated users
    - Grant execute permission to anon role as well
    - Ensure function can be called from RLS policies
*/

-- Grant execute on the function to authenticated and anon users
GRANT EXECUTE ON FUNCTION user_has_org_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_org_access(uuid) TO anon;
GRANT EXECUTE ON FUNCTION user_has_org_access(uuid) TO service_role;
