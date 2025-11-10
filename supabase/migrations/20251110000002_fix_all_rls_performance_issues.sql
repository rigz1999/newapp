-- ============================================
-- COMPREHENSIVE RLS PERFORMANCE FIX
-- Created: 2025-11-10
-- Purpose: Fix auth_rls_initplan and multiple_permissive_policies warnings
-- ============================================

-- ============================================
-- STEP 1: Drop ALL existing policies on all tables
-- ============================================

-- Drop all policies on projets
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'projets' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON projets';
    END LOOP;
END $$;

-- Drop all policies on tranches
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'tranches' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON tranches';
    END LOOP;
END $$;

-- Drop all policies on investisseurs
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'investisseurs' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON investisseurs';
    END LOOP;
END $$;

-- Drop all policies on souscriptions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'souscriptions' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON souscriptions';
    END LOOP;
END $$;

-- Drop all policies on paiements
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'paiements' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON paiements';
    END LOOP;
END $$;

-- Drop all policies on organizations
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organizations' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON organizations';
    END LOOP;
END $$;

-- Drop all policies on memberships
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'memberships' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON memberships';
    END LOOP;
END $$;

-- Drop all policies on payment_proofs
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'payment_proofs' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON payment_proofs';
    END LOOP;
END $$;

-- Drop all policies on coupons_echeances
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'coupons_echeances' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON coupons_echeances';
    END LOOP;
END $$;

-- Drop all policies on profiles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
END $$;

-- Drop all policies on user_reminder_settings
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_reminder_settings' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_reminder_settings';
    END LOOP;
END $$;

-- Drop all policies on invitations
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'invitations' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON invitations';
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Recreate helper functions (ensure they exist)
-- ============================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'zrig.ayman@gmail.com'
  );
$$;

GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS TABLE(org_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT m.org_id
  FROM memberships m
  WHERE m.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION user_org_ids() TO authenticated;

CREATE OR REPLACE FUNCTION is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
    AND org_id = p_org_id
    AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION is_org_admin(UUID) TO authenticated;

-- ============================================
-- STEP 3: Create optimized RLS policies
-- KEY: Use (select ...) to prevent per-row re-evaluation
-- ============================================

-- ============================================
-- ORGANIZATIONS
-- ============================================

CREATE POLICY "Members view organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Superadmin insert organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK ((select is_super_admin()));

CREATE POLICY "Super admin and org admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR (select is_org_admin(id))
  );

CREATE POLICY "Superadmin delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING ((select is_super_admin()));

-- ============================================
-- MEMBERSHIPS
-- ============================================

CREATE POLICY "Superadmin or own memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR user_id = (select auth.uid())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Super admin and org admins can create memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR (select is_org_admin(org_id))
  );

CREATE POLICY "Super admin and org admins can update memberships"
  ON memberships FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR (select is_org_admin(org_id))
  );

CREATE POLICY "Super admin and org admins can delete memberships"
  ON memberships FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR (select is_org_admin(org_id))
  );

-- ============================================
-- INVITATIONS
-- ============================================

CREATE POLICY "Users can view invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Super admin and org admins can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR (select is_org_admin(org_id))
  );

CREATE POLICY "Super admin and org admins can update invitations"
  ON invitations FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR (select is_org_admin(org_id))
  );

CREATE POLICY "Admins can delete invitations"
  ON invitations FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR (select is_org_admin(org_id))
  );

-- ============================================
-- PROFILES
-- ============================================

CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR id = (select auth.uid())
  )
  WITH CHECK (
    (select is_super_admin())
    OR id = (select auth.uid())
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- ============================================
-- PROJETS
-- ============================================

CREATE POLICY "Users view org projets"
  ON projets FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can insert their org projets"
  ON projets FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can update their org projets"
  ON projets FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can delete their org projets"
  ON projets FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

-- ============================================
-- TRANCHES
-- ============================================

CREATE POLICY "Users view org tranches"
  ON tranches FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can insert their org tranches"
  ON tranches FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can update their org tranches"
  ON tranches FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can delete their org tranches"
  ON tranches FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

-- ============================================
-- INVESTISSEURS
-- ============================================

CREATE POLICY "Users view org investisseurs"
  ON investisseurs FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can insert their org investisseurs"
  ON investisseurs FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can update their org investisseurs"
  ON investisseurs FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can delete their org investisseurs"
  ON investisseurs FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

-- ============================================
-- SOUSCRIPTIONS
-- ============================================

CREATE POLICY "Users view org souscriptions"
  ON souscriptions FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can insert their org souscriptions"
  ON souscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can update their org souscriptions"
  ON souscriptions FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can delete their org souscriptions"
  ON souscriptions FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR projet_id IN (
      SELECT p.id FROM projets p
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

-- ============================================
-- PAIEMENTS
-- ============================================

CREATE POLICY "Users view org paiements"
  ON paiements FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can insert their org paiements"
  ON paiements FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can update their org paiements"
  ON paiements FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can delete their org paiements"
  ON paiements FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

-- ============================================
-- PAYMENT_PROOFS
-- ============================================

CREATE POLICY "Users view payment proofs"
  ON payment_proofs FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR paiement_id IN (
      SELECT pa.id FROM paiements pa
      WHERE pa.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can insert payment proofs"
  ON payment_proofs FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR paiement_id IN (
      SELECT pa.id FROM paiements pa
      WHERE pa.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can update payment proofs"
  ON payment_proofs FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR paiement_id IN (
      SELECT pa.id FROM paiements pa
      WHERE pa.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can delete payment proofs"
  ON payment_proofs FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR paiement_id IN (
      SELECT pa.id FROM paiements pa
      WHERE pa.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

-- ============================================
-- COUPONS_ECHEANCES
-- ============================================

CREATE POLICY "Users view org coupons"
  ON coupons_echeances FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can insert their org coupons"
  ON coupons_echeances FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can update their org coupons"
  ON coupons_echeances FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

CREATE POLICY "Users can delete their org coupons"
  ON coupons_echeances FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      WHERE p.org_id IN (SELECT org_id FROM user_org_ids())
    )
  );

-- ============================================
-- USER_REMINDER_SETTINGS
-- ============================================

CREATE POLICY "Users view own reminder settings"
  ON user_reminder_settings FOR SELECT
  TO authenticated
  USING (
    (select is_super_admin())
    OR user_id = (select auth.uid())
  );

CREATE POLICY "Users insert own reminder settings"
  ON user_reminder_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users update own reminder settings"
  ON user_reminder_settings FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR user_id = (select auth.uid())
  )
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users delete own reminder settings"
  ON user_reminder_settings FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR user_id = (select auth.uid())
  );

-- ============================================
-- SUMMARY
-- ============================================

COMMENT ON POLICY "Members view organizations" ON organizations IS
  'Optimized: Uses (select is_super_admin()) to prevent per-row re-evaluation';

COMMENT ON POLICY "Users view org projets" ON projets IS
  'Optimized: Single policy per action, uses (select ...) pattern for performance';

-- ============================================
-- Performance Notes:
-- ============================================
-- ✅ All auth.uid() calls wrapped in (select auth.uid())
-- ✅ All function calls wrapped in (select function())
-- ✅ Only ONE policy per table/role/action combination
-- ✅ Eliminates all auth_rls_initplan warnings
-- ✅ Eliminates all multiple_permissive_policies warnings
