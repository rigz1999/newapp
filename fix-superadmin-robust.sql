-- ROBUST SUPERADMIN FIX
-- This script ensures your superadmin account is set up correctly
-- Run this AFTER running fix-rls-comprehensive.sql

-- ==============================================
-- STEP 1: ENSURE PROFILE EXISTS
-- ==============================================

DO $$
DECLARE
  v_user_id uuid := 'e0825906-07c0-4e9b-8ccb-95f79de1506a';
  v_email text := 'zrig.ayman@gmail.com';
  profile_exists boolean;
BEGIN
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = v_user_id) INTO profile_exists;

  IF NOT profile_exists THEN
    -- Create the profile if it doesn't exist
    INSERT INTO profiles (id, email, full_name, is_superadmin)
    VALUES (v_user_id, v_email, 'Ayman Zrig', true)
    ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'Created profile for %', v_email;
  ELSE
    RAISE NOTICE 'Profile exists for %', v_email;
  END IF;
END $$;

-- ==============================================
-- STEP 2: ADD is_superadmin COLUMN IF MISSING
-- ==============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT false;

RAISE NOTICE 'Ensured is_superadmin column exists';

-- ==============================================
-- STEP 3: SET SUPERADMIN FLAG
-- ==============================================

UPDATE profiles
SET is_superadmin = true
WHERE email = 'zrig.ayman@gmail.com';

-- ==============================================
-- STEP 4: VERIFY SUPERADMIN WAS SET
-- ==============================================

DO $$
DECLARE
  v_superadmin_count integer;
  v_user_superadmin boolean;
  v_user_id uuid := 'e0825906-07c0-4e9b-8ccb-95f79de1506a';
BEGIN
  -- Count total superadmins
  SELECT COUNT(*) INTO v_superadmin_count
  FROM profiles
  WHERE is_superadmin = true;

  -- Check specific user
  SELECT COALESCE(is_superadmin, false) INTO v_user_superadmin
  FROM profiles
  WHERE id = v_user_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUPERADMIN VERIFICATION';
  RAISE NOTICE '========================================';

  IF v_superadmin_count > 0 THEN
    RAISE NOTICE '✓ Total superadmins: %', v_superadmin_count;

    IF v_user_superadmin THEN
      RAISE NOTICE '✓ zrig.ayman@gmail.com is SUPERADMIN';
      RAISE NOTICE '';
      RAISE NOTICE 'SUCCESS! Superadmin configured correctly.';
    ELSE
      RAISE WARNING '✗ zrig.ayman@gmail.com is NOT superadmin';
      RAISE WARNING 'This should not happen - check UPDATE statement';
    END IF;
  ELSE
    RAISE WARNING '✗ NO superadmins found in database';
    RAISE WARNING 'The UPDATE statement did not work';
    RAISE WARNING 'Check if profiles table has data';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- ==============================================
-- STEP 5: TEST HELPER FUNCTIONS
-- ==============================================

DO $$
DECLARE
  v_is_super boolean;
BEGIN
  -- Test if is_superadmin() function works
  SELECT is_superadmin() INTO v_is_super;

  RAISE NOTICE '';
  RAISE NOTICE 'FUNCTION TEST:';
  RAISE NOTICE 'is_superadmin() returned: %', v_is_super;

  IF v_is_super IS NULL THEN
    RAISE WARNING 'Function returned NULL - this means auth.uid() is not set (expected in SQL editor)';
  END IF;
END $$;

-- ==============================================
-- STEP 6: SHOW CURRENT PROFILE DATA
-- ==============================================

SELECT
  '=== YOUR PROFILE DATA ===' as info,
  id,
  email,
  full_name,
  is_superadmin
FROM profiles
WHERE email = 'zrig.ayman@gmail.com';
