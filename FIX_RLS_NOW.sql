-- ============================================
-- FIX IMMEDIAT: Appliquer toutes les politiques RLS
-- À exécuter dans SQL Editor de Supabase Dashboard
-- ============================================

-- IMPORTANT: Ce script corrige les erreurs 403/500
-- En créant toutes les politiques RLS manquantes

-- ============================================
-- STEP 1: Créer les fonctions helper (si elles n'existent pas)
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
-- STEP 2: Supprimer toutes les anciennes politiques
-- ============================================

-- Projets
DROP POLICY IF EXISTS "Users view org projets" ON projets;
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;
DROP POLICY IF EXISTS "Users can update their org projets" ON projets;
DROP POLICY IF EXISTS "Users can delete their org projets" ON projets;

-- Tranches
DROP POLICY IF EXISTS "Users view org tranches" ON tranches;
DROP POLICY IF EXISTS "Users can insert their org tranches" ON tranches;
DROP POLICY IF EXISTS "Users can update their org tranches" ON tranches;
DROP POLICY IF EXISTS "Users can delete their org tranches" ON tranches;

-- Investisseurs
DROP POLICY IF EXISTS "Users view org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can insert their org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can update their org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can delete their org investisseurs" ON investisseurs;

-- Souscriptions
DROP POLICY IF EXISTS "Users view org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can insert their org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can update their org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can delete their org souscriptions" ON souscriptions;

-- Paiements
DROP POLICY IF EXISTS "Users view org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can insert their org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can update their org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can delete their org paiements" ON paiements;

-- Organizations
DROP POLICY IF EXISTS "Members view organizations" ON organizations;
DROP POLICY IF EXISTS "Superadmin insert organizations" ON organizations;
DROP POLICY IF EXISTS "Super admin and org admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Superadmin delete organizations" ON organizations;

-- Memberships
DROP POLICY IF EXISTS "Superadmin or own memberships" ON memberships;
DROP POLICY IF EXISTS "Super admin and org admins can create memberships" ON memberships;
DROP POLICY IF EXISTS "Super admin and org admins can update memberships" ON memberships;
DROP POLICY IF EXISTS "Super admin and org admins can delete memberships" ON memberships;

-- Profiles
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- User Reminder Settings
DROP POLICY IF EXISTS "Users can view their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can insert their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can update their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can delete their own reminder settings" ON user_reminder_settings;

-- ============================================
-- STEP 3: Activer RLS sur toutes les tables
-- ============================================

ALTER TABLE projets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tranches ENABLE ROW LEVEL SECURITY;
ALTER TABLE investisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE souscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reminder_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Créer les nouvelles politiques RLS
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
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can insert their org souscriptions"
  ON souscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can update their org souscriptions"
  ON souscriptions FOR UPDATE
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );

CREATE POLICY "Users can delete their org souscriptions"
  ON souscriptions FOR DELETE
  TO authenticated
  USING (
    (select is_super_admin())
    OR org_id IN (SELECT org_id FROM user_org_ids())
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
-- USER_REMINDER_SETTINGS
-- ============================================

CREATE POLICY "Users can view their own reminder settings"
  ON user_reminder_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminder settings"
  ON user_reminder_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminder settings"
  ON user_reminder_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminder settings"
  ON user_reminder_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FIN DU SCRIPT - Vérification
-- ============================================

-- Afficher toutes les politiques créées
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
