-- Quick Fix for User Access - Paris Database
-- This will add you to the first organization as admin

-- Show current situation
SELECT 'Current User ID: ' || auth.uid()::text;

SELECT 'Current Memberships: ' || COUNT(*)::text as count
FROM memberships
WHERE user_id = auth.uid();

-- Add user to first organization as admin if they have no memberships
INSERT INTO memberships (user_id, org_id, role)
SELECT
  auth.uid(),
  (SELECT id FROM organizations ORDER BY created_at LIMIT 1),
  'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM memberships WHERE user_id = auth.uid()
);

-- Verify the fix
SELECT 'After Fix - Your Memberships:' as info;
SELECT
  m.role,
  o.name as org_name
FROM memberships m
JOIN organizations o ON o.id = m.org_id
WHERE m.user_id = auth.uid();

SELECT 'Projets you can now see: ' || COUNT(*)::text as count
FROM projets;
