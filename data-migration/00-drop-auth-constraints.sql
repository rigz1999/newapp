-- ============================================
-- Drop ALL FK constraints that reference auth.users
-- Run this FIRST before any data migration
-- ============================================

-- Drop FK on profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Drop FK on organizations (owner_id)
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_owner_id_fkey;

-- Drop FK on memberships (user_id)
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_user_id_fkey;

-- Drop FK on invitations (invited_by)
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_invited_by_fkey;

-- Drop FK on user_reminder_settings
ALTER TABLE user_reminder_settings DROP CONSTRAINT IF EXISTS user_reminder_settings_user_id_fkey;

-- Drop FK on superadmin_users
ALTER TABLE superadmin_users DROP CONSTRAINT IF EXISTS superadmin_users_user_id_fkey;

-- Verify - should show no FK constraints to auth.users
SELECT
  tc.table_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE ccu.table_name = 'users'
  AND tc.constraint_type = 'FOREIGN KEY';
