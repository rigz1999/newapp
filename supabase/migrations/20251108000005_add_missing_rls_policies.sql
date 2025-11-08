-- ============================================
-- Add Missing RLS Policies for Data Tables
-- Created: 2025-11-08
-- Purpose: Add RLS policies for projets, tranches, souscriptions, paiements, etc.
--          with super admin support
-- ============================================

-- IMPORTANT: Replace 'YOUR_SUPER_ADMIN_EMAIL@example.com' with your actual email address!

-- ============================================
-- PROFILES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- ============================================
-- PROJETS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org projets" ON projets;
DROP POLICY IF EXISTS "Users can manage their org projets" ON projets;

CREATE POLICY "Users can view their org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (
    -- Super admin can view all
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Users can view their org projets
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org projets"
  ON projets
  FOR ALL
  TO authenticated
  USING (
    -- Super admin can manage all
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    -- Users can manage their org projets
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

-- ============================================
-- INVESTISSEURS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org investisseurs" ON investisseurs;
DROP POLICY IF EXISTS "Users can manage their org investisseurs" ON investisseurs;

CREATE POLICY "Users can view their org investisseurs"
  ON investisseurs
  FOR SELECT
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org investisseurs"
  ON investisseurs
  FOR ALL
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = (select auth.uid())
    )
  );

-- ============================================
-- TRANCHES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org tranches" ON tranches;
DROP POLICY IF EXISTS "Users can manage their org tranches" ON tranches;

CREATE POLICY "Users can view their org tranches"
  ON tranches
  FOR SELECT
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org tranches"
  ON tranches
  FOR ALL
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- SOUSCRIPTIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org souscriptions" ON souscriptions;
DROP POLICY IF EXISTS "Users can manage their org souscriptions" ON souscriptions;

CREATE POLICY "Users can view their org souscriptions"
  ON souscriptions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org souscriptions"
  ON souscriptions
  FOR ALL
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    projet_id IN (
      SELECT p.id FROM projets p
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- COUPONS_ECHEANCES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org coupons" ON coupons_echeances;
DROP POLICY IF EXISTS "Users can manage their org coupons" ON coupons_echeances;

CREATE POLICY "Users can view their org coupons"
  ON coupons_echeances
  FOR SELECT
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org coupons"
  ON coupons_echeances
  FOR ALL
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    souscription_id IN (
      SELECT s.id FROM souscriptions s
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- PAIEMENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their org paiements" ON paiements;
DROP POLICY IF EXISTS "Users can manage their org paiements" ON paiements;

CREATE POLICY "Users can view their org paiements"
  ON paiements
  FOR SELECT
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage their org paiements"
  ON paiements
  FOR ALL
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    echeance_id IN (
      SELECT ce.id FROM coupons_echeances ce
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- PAYMENT_PROOFS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view payment proofs" ON payment_proofs;
DROP POLICY IF EXISTS "Users can manage payment proofs" ON payment_proofs;

CREATE POLICY "Users can view payment proofs"
  ON payment_proofs
  FOR SELECT
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    paiement_id IN (
      SELECT pa.id FROM paiements pa
      JOIN coupons_echeances ce ON ce.id = pa.echeance_id
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can manage payment proofs"
  ON payment_proofs
  FOR ALL
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    paiement_id IN (
      SELECT pa.id FROM paiements pa
      JOIN coupons_echeances ce ON ce.id = pa.echeance_id
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    paiement_id IN (
      SELECT pa.id FROM paiements pa
      JOIN coupons_echeances ce ON ce.id = pa.echeance_id
      JOIN souscriptions s ON s.id = ce.souscription_id
      JOIN projets p ON p.id = s.projet_id
      JOIN memberships m ON m.org_id = p.org_id
      WHERE m.user_id = (select auth.uid())
    )
  );

-- ============================================
-- USER_REMINDER_SETTINGS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can insert their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can update their own reminder settings" ON user_reminder_settings;
DROP POLICY IF EXISTS "Users can delete their own reminder settings" ON user_reminder_settings;

CREATE POLICY "Users can view their own reminder settings"
  ON user_reminder_settings
  FOR SELECT
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    user_id = (select auth.uid())
  );

CREATE POLICY "Users can insert their own reminder settings"
  ON user_reminder_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own reminder settings"
  ON user_reminder_settings
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    user_id = (select auth.uid())
  )
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own reminder settings"
  ON user_reminder_settings
  FOR DELETE
  TO authenticated
  USING (
    (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL@example.com') = (select auth.uid())
    OR
    user_id = (select auth.uid())
  );

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON POLICY "Users can view their org projets" ON projets IS
  'Super admin can view all. Users can view their org projects. Uses (select auth.uid()) for performance.';

COMMENT ON POLICY "Users can view their org tranches" ON tranches IS
  'Super admin can view all. Users can view tranches for their org projects.';

COMMENT ON POLICY "Users can view their org souscriptions" ON souscriptions IS
  'Super admin can view all. Users can view souscriptions for their org projects.';

COMMENT ON POLICY "Users can view their org paiements" ON paiements IS
  'Super admin can view all. Users can view paiements for their org.';
