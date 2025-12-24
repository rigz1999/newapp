-- Fix Invitation Anonymous Access in Paris Database
-- Run this in the Paris database SQL Editor
-- This enables anonymous users to accept invitations by reading organization names

-- ==============================================
-- STEP 1: Fix invitations RLS policies
-- ==============================================

-- Drop ALL existing invitations policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'invitations'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON invitations', r.policyname);
    END LOOP;
END $$;

-- Create policies for invitations
-- Anonymous users: can read all invitations (token verification happens in app logic)
CREATE POLICY "invitations_anon_select"
  ON invitations
  FOR SELECT
  TO anon
  USING (true);

-- Authenticated users: can see their own invitations or invitations they manage
CREATE POLICY "invitations_auth_select"
  ON invitations
  FOR SELECT
  TO authenticated
  USING (
    is_superadmin()
    OR email = (SELECT email FROM profiles WHERE id = auth.uid())
    OR user_is_admin_of_org(org_id)
  );

-- Only admins can insert invitations
CREATE POLICY "invitations_insert"
  ON invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_is_admin_of_org(org_id));

-- Only admins can update invitations
CREATE POLICY "invitations_update"
  ON invitations
  FOR UPDATE
  TO authenticated
  USING (user_is_admin_of_org(org_id))
  WITH CHECK (user_is_admin_of_org(org_id));

-- Only admins can delete invitations
CREATE POLICY "invitations_delete"
  ON invitations
  FOR DELETE
  TO authenticated
  USING (user_is_admin_of_org(org_id));

-- ==============================================
-- STEP 2: Fix organizations RLS policies
-- ==============================================

-- Drop ALL existing organizations policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'organizations'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organizations', r.policyname);
    END LOOP;
END $$;

-- Create policies for organizations
-- Anonymous users: can read all organizations (needed to show org name on invitation page)
CREATE POLICY "organizations_anon_select"
  ON organizations
  FOR SELECT
  TO anon
  USING (true);

-- Authenticated users: can see organizations they belong to
CREATE POLICY "organizations_auth_select"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (user_can_access_org(id));

-- Only superadmins can insert organizations
CREATE POLICY "organizations_insert"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin());

-- Only admins can update their organization
CREATE POLICY "organizations_update"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (user_is_admin_of_org(id))
  WITH CHECK (user_is_admin_of_org(id));

-- Only superadmins can delete organizations
CREATE POLICY "organizations_delete"
  ON organizations
  FOR DELETE
  TO authenticated
  USING (is_superadmin());

-- ==============================================
-- STEP 3: Verification
-- ==============================================

DO $$
DECLARE
  inv_anon_count integer;
  org_anon_count integer;
  inv_auth_count integer;
  org_auth_count integer;
BEGIN
  -- Count anon policies
  SELECT COUNT(*) INTO inv_anon_count
  FROM pg_policies
  WHERE tablename = 'invitations'
    AND 'anon' = ANY(roles);

  SELECT COUNT(*) INTO org_anon_count
  FROM pg_policies
  WHERE tablename = 'organizations'
    AND 'anon' = ANY(roles);

  -- Count authenticated policies
  SELECT COUNT(*) INTO inv_auth_count
  FROM pg_policies
  WHERE tablename = 'invitations'
    AND 'authenticated' = ANY(roles);

  SELECT COUNT(*) INTO org_auth_count
  FROM pg_policies
  WHERE tablename = 'organizations'
    AND 'authenticated' = ANY(roles);

  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'INVITATION ANONYMOUS ACCESS FIXED - PARIS DATABASE';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Invitations policies:';
  RAISE NOTICE '  - Anonymous policies: %', inv_anon_count;
  RAISE NOTICE '  - Authenticated policies: %', inv_auth_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Organizations policies:';
  RAISE NOTICE '  - Anonymous policies: %', org_anon_count;
  RAISE NOTICE '  - Authenticated policies: %', org_auth_count;
  RAISE NOTICE '';

  IF inv_anon_count = 0 OR org_anon_count = 0 THEN
    RAISE EXCEPTION 'Failed to create anon policies!';
  END IF;

  RAISE NOTICE '✓ Anonymous users can now read invitations';
  RAISE NOTICE '✓ Anonymous users can now read organization names';
  RAISE NOTICE '✓ Invitation acceptance flow should work';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
END $$;

-- ==============================================
-- STEP 4: Show current policies
-- ==============================================

SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('invitations', 'organizations')
ORDER BY tablename, policyname;
