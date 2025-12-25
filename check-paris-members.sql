-- Diagnostic: Check all members in Paris database
-- Run this in Paris SQL Editor to see what data exists

-- ==============================================
-- STEP 1: Check all profiles
-- ==============================================
SELECT
  'PROFILES' as table_name,
  id,
  email,
  full_name,
  is_superadmin,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- ==============================================
-- STEP 2: Check all memberships
-- ==============================================
SELECT
  'MEMBERSHIPS' as table_name,
  m.id as membership_id,
  m.user_id,
  p.email,
  p.full_name,
  o.name as org_name,
  m.role,
  m.created_at
FROM memberships m
LEFT JOIN profiles p ON p.id = m.user_id
LEFT JOIN organizations o ON o.id = m.org_id
ORDER BY m.created_at DESC;

-- ==============================================
-- STEP 3: Check all organizations
-- ==============================================
SELECT
  'ORGANIZATIONS' as table_name,
  id,
  name,
  created_at
FROM organizations
ORDER BY created_at DESC;

-- ==============================================
-- STEP 4: Count summary
-- ==============================================
SELECT
  'SUMMARY' as info,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM memberships) as total_memberships,
  (SELECT COUNT(*) FROM organizations) as total_organizations,
  (SELECT COUNT(*) FROM invitations WHERE status = 'pending') as pending_invitations;
