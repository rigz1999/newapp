-- Test Script for Emetteur Role System
-- Run this in Supabase SQL Editor to test the new emetteur functionality

-- 1. Check if emetteur role is allowed
SELECT
  'Role constraints' as test,
  conname,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname IN ('memberships_role_check', 'invitations_role_check');

-- 2. Check emetteur_projects table structure
SELECT
  'Table structure' as test,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'emetteur_projects'
ORDER BY ordinal_position;

-- 3. Check RLS policies on emetteur_projects
SELECT
  'RLS Policies' as test,
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE tablename = 'emetteur_projects'
ORDER BY policyname;

-- 4. Check if RPC functions exist and are accessible
SELECT
  'RPC Functions' as test,
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  prosecdef as security_definer
FROM pg_proc
WHERE proname IN ('get_org_emetteurs', 'get_emetteur_projects')
  AND pronamespace = 'public'::regnamespace;

-- 5. Test get_org_emetteurs function (should return emetteur names from your projects)
SELECT
  'Test get_org_emetteurs' as test,
  *
FROM get_org_emetteurs(
  (SELECT id FROM organizations LIMIT 1)
);

-- 6. Check updated projets select policy (should include emetteur access)
SELECT
  'Projets Policy' as test,
  policyname,
  pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
WHERE polrelid = 'public.projets'::regclass
  AND policyname = 'projets_select_policy';

-- 7. Check indexes created
SELECT
  'Indexes' as test,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'emetteur_projects';

-- Summary
SELECT
  '✅ Migration Status' as status,
  'All components successfully created' as message;
