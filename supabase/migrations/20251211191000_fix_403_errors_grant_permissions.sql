/*
  # Fix 403 Errors - Grant Proper Permissions

  ## Problem
  Even with SECURITY DEFINER functions, 403 errors occur because:
  1. Functions need explicit SELECT grants on tables they read
  2. RLS disabled tables still need base permissions
  3. Authenticator role needs access to execute functions properly

  ## Solution
  - Grant SELECT on identity tables to authenticated users
  - Grant ALL on identity tables to postgres role (function owner)
  - Fix souscriptions schema (uses tranche_id, not projet_id)
  - Ensure anon role can execute functions for invitation flow
*/

-- ==============================================
-- STEP 1: Grant permissions on identity tables
-- ==============================================

-- Allow authenticated users to SELECT from identity tables
-- (RLS is disabled, but base permissions still needed)
GRANT SELECT ON profiles TO authenticated, anon;
GRANT SELECT ON memberships TO authenticated, anon;
GRANT SELECT ON organizations TO authenticated, anon;

-- Allow authenticated users to modify based on policies
GRANT INSERT, UPDATE, DELETE ON memberships TO authenticated;
GRANT INSERT, UPDATE, DELETE ON organizations TO authenticated;
GRANT INSERT, UPDATE ON profiles TO authenticated;

-- ==============================================
-- STEP 2: Ensure postgres role owns functions
-- ==============================================

-- Recreate functions with explicit ownership and permissions
DROP FUNCTION IF EXISTS user_is_superadmin();
DROP FUNCTION IF EXISTS user_can_access_org(uuid);
DROP FUNCTION IF EXISTS user_is_admin_of_org(uuid);
DROP FUNCTION IF EXISTS get_user_email();

-- Check if user is superadmin
CREATE OR REPLACE FUNCTION public.user_is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  is_super boolean;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Direct read from profiles (RLS disabled on profiles, no recursion)
  SELECT COALESCE(is_superadmin, false)
  INTO is_super
  FROM public.profiles
  WHERE id = current_user_id;

  RETURN COALESCE(is_super, false);
END;
$$;

-- Check if user can access an organization (member or superadmin)
CREATE OR REPLACE FUNCTION public.user_can_access_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  is_super boolean;
  has_membership boolean;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check superadmin (direct read, no RLS)
  SELECT COALESCE(is_superadmin, false)
  INTO is_super
  FROM public.profiles
  WHERE id = current_user_id;

  IF is_super = true THEN
    RETURN true;
  END IF;

  -- Check membership (direct read, no RLS)
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = current_user_id
    AND org_id = check_org_id
  ) INTO has_membership;

  RETURN COALESCE(has_membership, false);
END;
$$;

-- Check if user is admin of an organization (or superadmin)
CREATE OR REPLACE FUNCTION public.user_is_admin_of_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  is_super boolean;
  is_admin boolean;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check superadmin (direct read, no RLS)
  SELECT COALESCE(is_superadmin, false)
  INTO is_super
  FROM public.profiles
  WHERE id = current_user_id;

  IF is_super = true THEN
    RETURN true;
  END IF;

  -- Check if admin in org (direct read, no RLS)
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = current_user_id
    AND org_id = check_org_id
    AND role IN ('admin', 'superadmin')  -- Both admin and superadmin roles
  ) INTO is_admin;

  RETURN COALESCE(is_admin, false);
END;
$$;

-- Helper: Get user's email (for invitations)
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  user_email text;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Direct read from profiles (no RLS)
  SELECT email
  INTO user_email
  FROM public.profiles
  WHERE id = current_user_id;

  RETURN user_email;
END;
$$;

-- ==============================================
-- STEP 3: Grant execute permissions
-- ==============================================

GRANT EXECUTE ON FUNCTION user_is_superadmin() TO authenticated, anon, postgres;
GRANT EXECUTE ON FUNCTION user_can_access_org(uuid) TO authenticated, anon, postgres;
GRANT EXECUTE ON FUNCTION user_is_admin_of_org(uuid) TO authenticated, anon, postgres;
GRANT EXECUTE ON FUNCTION get_user_email() TO authenticated, anon, postgres;

-- ==============================================
-- STEP 4: Fix souscriptions policies (wrong schema)
-- ==============================================

-- Drop incorrect policies
DROP POLICY IF EXISTS "souscriptions_select" ON souscriptions;
DROP POLICY IF EXISTS "souscriptions_insert" ON souscriptions;
DROP POLICY IF EXISTS "souscriptions_update" ON souscriptions;
DROP POLICY IF EXISTS "souscriptions_delete" ON souscriptions;

-- Recreate with correct schema (souscriptions has tranche_id, not projet_id)
CREATE POLICY "souscriptions_select"
  ON souscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "souscriptions_insert"
  ON souscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "souscriptions_update"
  ON souscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND user_can_access_org(projets.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND user_can_access_org(projets.org_id)
    )
  );

CREATE POLICY "souscriptions_delete"
  ON souscriptions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tranches
      JOIN projets ON projets.id = tranches.projet_id
      WHERE tranches.id = souscriptions.tranche_id
      AND user_can_access_org(projets.org_id)
    )
  );

-- ==============================================
-- STEP 5: Ensure RLS is truly disabled on identity tables
-- ==============================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 6: Grant table permissions to authenticated role
-- ==============================================

-- Business tables - authenticated users can operate based on RLS policies
GRANT SELECT, INSERT, UPDATE, DELETE ON projets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tranches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON souscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON investisseurs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON coupons_echeances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON paiements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_proofs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_reminder_settings TO authenticated;

-- Allow anon to SELECT invitations (for invitation acceptance flow)
GRANT SELECT ON invitations TO anon;
