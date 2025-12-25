-- Create Missing RPC Functions for Paris Database

-- Check if check_super_admin_status exists
SELECT
  p.proname as function_name
FROM pg_proc p
WHERE p.proname = 'check_super_admin_status';

-- Create the missing function
CREATE OR REPLACE FUNCTION check_super_admin_status()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT is_superadmin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION check_super_admin_status() TO authenticated, anon;

-- Verify it works
SELECT check_super_admin_status() as result;
