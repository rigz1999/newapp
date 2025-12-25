-- Clean up old members and duplicates from Paris database
-- This keeps only your two accounts and removes old test users

-- ==============================================
-- WHAT WILL BE KEPT:
-- ==============================================
-- ✓ zrig.ayman@gmail.com (superadmin) - e0825906-07c0-4e9b-8ccb-95f79de1506a
-- ✓ ayman.zrig@gmail.com (newest, Dec 25) - b905b43b-7d82-4f5f-ae47-535122006696

-- ==============================================
-- WHAT WILL BE DELETED:
-- ==============================================
-- ✗ ayman.zrig@gmail.com (duplicate, Nov 23) - adb8d627-f5a9-4eb8-93bc-cdc72c24eba7
-- ✗ maxime.roger91@gmail.com - 00f94247-662a-475b-813d-a6dc5bad60f7
-- ✗ makhasalma@gmail.com - d6fd18f8-a98b-4e01-be16-81f44c972034

-- ==============================================
-- STEP 1: Delete old memberships first
-- ==============================================

-- Delete Salma Makha's membership
DELETE FROM memberships
WHERE user_id = 'd6fd18f8-a98b-4e01-be16-81f44c972034';

-- Delete Maxime Roger's membership
DELETE FROM memberships
WHERE user_id = '00f94247-662a-475b-813d-a6dc5bad60f7';

-- Delete old duplicate ayman.zrig@gmail.com membership (Nov 23)
DELETE FROM memberships
WHERE user_id = 'adb8d627-f5a9-4eb8-93bc-cdc72c24eba7';

-- ==============================================
-- STEP 2: Delete old profiles (CASCADE will handle auth.users)
-- ==============================================

-- Delete old duplicate ayman.zrig@gmail.com (Nov 23)
DELETE FROM profiles
WHERE id = 'adb8d627-f5a9-4eb8-93bc-cdc72c24eba7';

-- Delete Maxime Roger
DELETE FROM profiles
WHERE id = '00f94247-662a-475b-813d-a6dc5bad60f7';

-- Delete Salma Makha
DELETE FROM profiles
WHERE id = 'd6fd18f8-a98b-4e01-be16-81f44c972034';

-- ==============================================
-- STEP 3: Verification - Should show only 2 profiles and 1 membership
-- ==============================================

-- Check remaining profiles
SELECT
  'REMAINING PROFILES' as info,
  id,
  email,
  full_name,
  is_superadmin
FROM profiles
ORDER BY created_at;

-- Check remaining memberships
SELECT
  'REMAINING MEMBERSHIPS' as info,
  m.id as membership_id,
  p.email,
  p.full_name,
  o.name as org_name,
  m.role
FROM memberships m
LEFT JOIN profiles p ON p.id = m.user_id
LEFT JOIN organizations o ON o.id = m.org_id;

-- Summary
SELECT
  'SUMMARY' as info,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM memberships) as total_memberships,
  (SELECT COUNT(*) FROM organizations) as total_organizations;
