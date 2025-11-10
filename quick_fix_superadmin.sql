-- ============================================
-- QUICK FIX: Set Current User as Superadmin
-- ============================================
-- Run this script while logged in as the user who should be superadmin
-- This sets YOUR current user as superadmin
-- ============================================

-- Step 1: Ensure column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_superadmin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_superadmin BOOLEAN DEFAULT false NOT NULL;
    RAISE NOTICE '✓ Added is_superadmin column';
  ELSE
    RAISE NOTICE '✓ is_superadmin column already exists';
  END IF;
END $$;

-- Step 2: Set YOUR current logged-in user as superadmin
UPDATE profiles
SET is_superadmin = true
WHERE id = auth.uid();

-- Step 3: Verify it worked
SELECT
  (SELECT email FROM auth.users WHERE id = auth.uid()) as your_email,
  CASE
    WHEN is_superadmin = true THEN '✓ YOU ARE NOW SUPERADMIN'
    ELSE '✗ FAILED - is_superadmin is still false'
  END as status,
  is_superadmin
FROM profiles
WHERE id = auth.uid();

-- Step 4: Test the function
SELECT
  'Testing is_superadmin() function...' as test,
  is_superadmin() as result,
  CASE
    WHEN is_superadmin() = true THEN '✓ Function returns TRUE - you should have access'
    ELSE '✗ Function returns FALSE - there is a problem'
  END as interpretation;

-- Step 5: Show all superadmins
SELECT
  '=== ALL SUPERADMINS ===' as info,
  u.email,
  p.is_superadmin
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.is_superadmin = true;

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUPERADMIN SETUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Your current user has been set as superadmin.';
  RAISE NOTICE 'You should now have full access to all data.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Refresh your application and test access.';
  RAISE NOTICE '========================================';
END $$;
