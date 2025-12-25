-- Check user profiles and memberships

-- Show all users and their profiles
SELECT
  u.id,
  u.email,
  p.full_name,
  p.is_superadmin,
  CASE WHEN p.id IS NULL THEN 'MISSING PROFILE!' ELSE 'Profile exists' END as profile_status
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC;

-- Show memberships with roles
SELECT
  u.email,
  m.role,
  o.name as org_name
FROM memberships m
JOIN auth.users u ON u.id = m.user_id
JOIN organizations o ON o.id = m.org_id
ORDER BY u.email;

-- If profiles are missing, create them:
INSERT INTO profiles (id, email, full_name, is_superadmin)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as full_name,
  false
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = u.id);

-- Verify profiles now exist
SELECT
  u.email,
  p.full_name,
  p.is_superadmin
FROM auth.users u
JOIN profiles p ON p.id = u.id;
