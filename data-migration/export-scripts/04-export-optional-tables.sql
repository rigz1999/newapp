-- ============================================
-- EXPORT: Optional tables (may be empty)
-- Run this in US Supabase SQL Editor
-- ============================================

-- user_reminder_settings
SELECT
  id::text,
  user_id::text,
  enabled::text,
  remind_7_days::text,
  remind_14_days::text,
  remind_30_days::text,
  created_at::text,
  updated_at::text
FROM user_reminder_settings
ORDER BY created_at;

-- superadmin_users
SELECT
  user_id::text,
  email,
  created_at::text
FROM superadmin_users
ORDER BY created_at;

-- app_config
SELECT
  key,
  value,
  description,
  created_at::text,
  updated_at::text
FROM app_config
ORDER BY key;

-- If any of these return rows, copy the data
-- If empty, we can skip those migrations
