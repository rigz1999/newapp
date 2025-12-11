/*
  # Fix is_super_admin circular dependency
  
  1. Problem
    - is_super_admin() reads from app_config
    - app_config RLS policies use is_super_admin()
    - This creates infinite recursion
  
  2. Solution
    - Hardcode super admin email in is_super_admin() function
    - Remove circular dependency
*/

-- Drop and recreate is_super_admin without app_config dependency
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'zrig.ayman@gmail.com'
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO anon;
