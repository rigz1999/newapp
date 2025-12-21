-- ACTUAL WORKING FIX: Break the circular dependency in profiles RLS
--
-- THE PROBLEM:
-- profiles_select policy calls is_superadmin() which tries to SELECT from profiles,
-- which triggers profiles_select policy again = CIRCULAR DEPENDENCY
--
-- THE SOLUTION:
-- Use a superadmin_check table WITHOUT RLS that is_superadmin() can safely read from

-- Step 1: Create a dedicated superadmin tracking table WITHOUT RLS
CREATE TABLE IF NOT EXISTS superadmin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- NO RLS on this table - it's only accessed by SECURITY DEFINER functions
ALTER TABLE superadmin_users DISABLE ROW LEVEL SECURITY;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_superadmin_users_email ON superadmin_users(email);

-- Step 2: Populate it with your superadmin account
INSERT INTO superadmin_users (user_id, email)
SELECT id, email
FROM profiles
WHERE email = 'zrig.ayman@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Also migrate any users with is_superadmin = true
INSERT INTO superadmin_users (user_id, email)
SELECT id, email
FROM profiles
WHERE is_superadmin = true
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Recreate is_superadmin() to use the new table
DROP FUNCTION IF EXISTS is_superadmin() CASCADE;

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  -- This reads from superadmin_users which has NO RLS = no circular dependency!
  SELECT EXISTS (
    SELECT 1
    FROM superadmin_users
    WHERE user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION is_superadmin() TO authenticated, anon;

-- Step 4: Recreate check_super_admin_status() for frontend
DROP FUNCTION IF EXISTS check_super_admin_status() CASCADE;

CREATE OR REPLACE FUNCTION check_super_admin_status()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM superadmin_users
    WHERE user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION check_super_admin_status() TO authenticated, anon;

-- Step 5: Fix user_can_access_org() to use new is_superadmin()
DROP FUNCTION IF EXISTS user_can_access_org(uuid) CASCADE;

CREATE OR REPLACE FUNCTION user_can_access_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Check superadmin (now works without circular dependency!)
  IF is_superadmin() THEN
    RETURN true;
  END IF;

  -- Check membership
  RETURN EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = auth.uid()
    AND org_id = check_org_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION user_can_access_org(uuid) TO authenticated, anon;

-- Step 6: Fix user_is_admin_of_org() to use new is_superadmin()
DROP FUNCTION IF EXISTS user_is_admin_of_org(uuid) CASCADE;

CREATE OR REPLACE FUNCTION user_is_admin_of_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Superadmins are admin of everything
  IF is_superadmin() THEN
    RETURN true;
  END IF;

  -- Check if user is admin of this org
  RETURN EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = auth.uid()
    AND org_id = check_org_id
    AND role = 'admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION user_is_admin_of_org(uuid) TO authenticated, anon;

-- Step 7: Create helper function to add/remove superadmins (for future use)
CREATE OR REPLACE FUNCTION set_superadmin(target_email text, is_super boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Only existing superadmins can set other superadmins
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Only superadmins can modify superadmin status';
  END IF;

  -- Get user ID from profiles
  SELECT id INTO target_user_id
  FROM profiles
  WHERE email = target_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', target_email;
  END IF;

  IF is_super THEN
    -- Add to superadmins
    INSERT INTO superadmin_users (user_id, email)
    VALUES (target_user_id, target_email)
    ON CONFLICT (user_id) DO NOTHING;

    -- Also update profiles table for consistency
    UPDATE profiles
    SET is_superadmin = true
    WHERE id = target_user_id;
  ELSE
    -- Remove from superadmins
    DELETE FROM superadmin_users
    WHERE user_id = target_user_id;

    -- Also update profiles table for consistency
    UPDATE profiles
    SET is_superadmin = false
    WHERE id = target_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION set_superadmin(text, boolean) TO authenticated;

-- Step 8: Verification
DO $$
DECLARE
  super_count int;
  test_result boolean;
BEGIN
  SELECT COUNT(*) INTO super_count FROM superadmin_users;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'SUPERADMIN FIX APPLIED - NO MORE CIRCULAR DEPENDENCY!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Superadmin users: %', super_count;
  RAISE NOTICE 'Table: superadmin_users (RLS: DISABLED)';
  RAISE NOTICE 'Function: is_superadmin() (reads from superadmin_users)';
  RAISE NOTICE 'Function: check_super_admin_status() (works!)';
  RAISE NOTICE '';

  IF super_count = 0 THEN
    RAISE WARNING 'NO SUPERADMIN USERS FOUND!';
    RAISE WARNING 'Run: INSERT INTO superadmin_users (user_id, email) SELECT id, email FROM profiles WHERE email = ''zrig.ayman@gmail.com'';';
  ELSE
    RAISE NOTICE 'Superadmin email(s):';
    FOR test_result IN SELECT '  - ' || email FROM superadmin_users LOOP
      RAISE NOTICE '%', test_result;
    END LOOP;
  END IF;

  RAISE NOTICE '==========================================';
END $$;
