/*
  # Grant execute permissions on RPC functions
  
  1. Problem
    - Frontend needs to call check_super_admin_status
    - Function might not have execute permissions for authenticated users
  
  2. Solution
    - Grant execute permissions to authenticated and anon users
*/

-- Grant execute on all relevant functions
GRANT EXECUTE ON FUNCTION check_super_admin_status() TO authenticated;
GRANT EXECUTE ON FUNCTION check_super_admin_status() TO anon;
