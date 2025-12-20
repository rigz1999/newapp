-- SUPERADMIN DIAGNOSTIC QUERIES
-- Run these in Supabase SQL Editor to diagnose the issue

-- 1. Check if is_superadmin column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'is_superadmin';

-- 2. Check your current user's profile
SELECT id, email, is_superadmin, created_at
FROM profiles
WHERE email = 'YOUR_EMAIL_HERE';  -- Replace with your superadmin email

-- 3. Check if is_superadmin() function exists and works
SELECT is_superadmin();

-- 4. Check all users with superadmin in memberships
SELECT DISTINCT m.user_id, p.email, p.is_superadmin, m.role
FROM memberships m
LEFT JOIN profiles p ON p.id = m.user_id
WHERE m.role = 'superadmin';

-- 5. Test RLS policy on a table (try projets)
SELECT COUNT(*) FROM projets;

-- 6. Check if RLS is enabled on business tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('projets', 'tranches', 'souscriptions', 'investisseurs', 'paiements');

-- 7. Check current RLS policies on projets table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'projets';

-- ==============================================================
-- QUICK FIX: Manually set your user as superadmin
-- Replace 'your-email@example.com' with your actual email
-- ==============================================================
UPDATE profiles
SET is_superadmin = true
WHERE email = 'YOUR_EMAIL_HERE';  -- Replace with your superadmin email

-- Verify it worked
SELECT email, is_superadmin FROM profiles WHERE email = 'YOUR_EMAIL_HERE';
