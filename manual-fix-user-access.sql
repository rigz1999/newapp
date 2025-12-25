-- Manual Fix for User Access - Paris Database
-- Run this in Supabase SQL Editor (no auth context needed)

-- ==============================================
-- STEP 1: Find Your User Info
-- ==============================================

-- Show all users with their profiles
SELECT
  u.id as user_id,
  u.email,
  p.full_name,
  p.is_superadmin
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC;

-- ==============================================
-- STEP 2: Show Current Memberships
-- ==============================================

SELECT
  u.email,
  m.role,
  o.name as org_name
FROM memberships m
JOIN auth.users u ON u.id = m.user_id
JOIN organizations o ON o.id = m.org_id
ORDER BY u.email;

-- ==============================================
-- STEP 3: Show All Organizations
-- ==============================================

SELECT
  id,
  name,
  created_at
FROM organizations
ORDER BY created_at;

-- ==============================================
-- STEP 4: ADD YOURSELF (Replace the UUIDs)
-- ==============================================

-- IMPORTANT: Replace these values with YOUR user_id and org_id from above queries
--
-- INSERT INTO memberships (user_id, org_id, role)
-- VALUES (
--   'YOUR-USER-ID-HERE',  -- Copy from STEP 1
--   'YOUR-ORG-ID-HERE',   -- Copy from STEP 3
--   'admin'
-- )
-- ON CONFLICT (user_id, org_id) DO NOTHING;

-- ==============================================
-- Alternative: Add ALL users to the first organization
-- ==============================================

-- Uncomment this to add ALL users who have no memberships to the first org:
/*
INSERT INTO memberships (user_id, org_id, role)
SELECT
  u.id,
  (SELECT id FROM organizations ORDER BY created_at LIMIT 1),
  'admin'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM memberships WHERE user_id = u.id
);
*/

-- ==============================================
-- STEP 5: Verify
-- ==============================================

SELECT
  u.email,
  m.role,
  o.name as org_name
FROM memberships m
JOIN auth.users u ON u.id = m.user_id
JOIN organizations o ON o.id = m.org_id
ORDER BY u.email;
