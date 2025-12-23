-- ============================================
-- VERIFICATION SCRIPT FOR PARIS DATABASE
-- Run this in Paris SQL Editor to check migration status
-- ============================================

-- Check all table row counts
SELECT 'profiles' as table_name, COUNT(*) as row_count FROM profiles
UNION ALL
SELECT 'organizations', COUNT(*) FROM organizations
UNION ALL
SELECT 'memberships', COUNT(*) FROM memberships
UNION ALL
SELECT 'invitations', COUNT(*) FROM invitations
UNION ALL
SELECT 'projets', COUNT(*) FROM projets
UNION ALL
SELECT 'investisseurs', COUNT(*) FROM investisseurs
UNION ALL
SELECT 'tranches', COUNT(*) FROM tranches
UNION ALL
SELECT 'souscriptions', COUNT(*) FROM souscriptions
UNION ALL
SELECT 'coupons_echeances', COUNT(*) FROM coupons_echeances
UNION ALL
SELECT 'paiements', COUNT(*) FROM paiements
UNION ALL
SELECT 'payment_proofs', COUNT(*) FROM payment_proofs
UNION ALL
SELECT 'user_reminder_settings', COUNT(*) FROM user_reminder_settings
UNION ALL
SELECT 'superadmin_users', COUNT(*) FROM superadmin_users
UNION ALL
SELECT 'app_config', COUNT(*) FROM app_config
ORDER BY table_name;

-- Expected row counts:
-- profiles: 4
-- organizations: 2
-- memberships: 9
-- invitations: 11
-- projets: 2
-- investisseurs: 3
-- tranches: 3
-- souscriptions: 5
-- coupons_echeances: ~27
-- paiements: TBD
-- payment_proofs: TBD
-- user_reminder_settings: TBD
-- superadmin_users: TBD
-- app_config: TBD

-- ============================================
-- Check for any orphaned records (should return 0 rows)
-- ============================================

-- Organizations without owner in profiles (expected due to dropped FK)
SELECT o.id, o.name, o.owner_id
FROM organizations o
WHERE o.owner_id NOT IN (SELECT id FROM profiles);

-- Memberships without valid user/org
SELECT m.id, m.user_id, m.org_id, m.role
FROM memberships m
WHERE m.user_id NOT IN (SELECT id FROM profiles)
   OR (m.org_id IS NOT NULL AND m.org_id NOT IN (SELECT id FROM organizations));

-- Invitations without valid org
SELECT i.id, i.email, i.org_id
FROM invitations i
WHERE i.org_id NOT IN (SELECT id FROM organizations);

-- Projets without valid org
SELECT p.id, p.projet, p.org_id
FROM projets p
WHERE p.org_id IS NOT NULL AND p.org_id NOT IN (SELECT id FROM organizations);

-- Investisseurs without valid org
SELECT i.id, i.id_investisseur, i.nom_raison_sociale, i.org_id
FROM investisseurs i
WHERE i.org_id IS NOT NULL AND i.org_id NOT IN (SELECT id FROM organizations);

-- Tranches without valid projet
SELECT t.id, t.tranche_name, t.projet_id
FROM tranches t
WHERE t.projet_id IS NOT NULL AND t.projet_id NOT IN (SELECT id FROM projets);

-- Souscriptions without valid references
SELECT s.id, s.id_souscription, s.projet_id, s.tranche_id, s.investisseur_id
FROM souscriptions s
WHERE (s.projet_id IS NOT NULL AND s.projet_id NOT IN (SELECT id FROM projets))
   OR (s.tranche_id IS NOT NULL AND s.tranche_id NOT IN (SELECT id FROM tranches))
   OR (s.investisseur_id IS NOT NULL AND s.investisseur_id NOT IN (SELECT id FROM investisseurs));

-- Coupons_echeances without valid souscription
SELECT c.id, c.souscription_id, c.date_echeance
FROM coupons_echeances c
WHERE c.souscription_id NOT IN (SELECT id FROM souscriptions);

-- ============================================
-- Check data integrity samples
-- ============================================

-- Sample profiles
SELECT id, email, full_name, is_superadmin
FROM profiles
ORDER BY created_at
LIMIT 5;

-- Sample organizations with member counts
SELECT
  o.id,
  o.name,
  o.owner_id,
  COUNT(m.id) as member_count
FROM organizations o
LEFT JOIN memberships m ON m.org_id = o.id
GROUP BY o.id, o.name, o.owner_id
ORDER BY o.created_at;

-- Sample projets with tranche counts
SELECT
  p.id,
  p.projet,
  p.emetteur,
  p.org_id,
  COUNT(t.id) as tranche_count
FROM projets p
LEFT JOIN tranches t ON t.projet_id = p.id
GROUP BY p.id, p.projet, p.emetteur, p.org_id
ORDER BY p.created_at;

-- Sample investisseurs with souscription counts
SELECT
  i.id,
  i.id_investisseur,
  i.nom_raison_sociale,
  i.org_id,
  COUNT(s.id) as souscription_count
FROM investisseurs i
LEFT JOIN souscriptions s ON s.investisseur_id = i.id
GROUP BY i.id, i.id_investisseur, i.nom_raison_sociale, i.org_id
ORDER BY i.created_at;

-- ============================================
-- Check functions exist
-- ============================================

SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'user_can_access_org',
    'user_is_admin_of_org',
    'user_is_admin',
    'user_is_superadmin',
    'generate_investisseur_id',
    'generate_souscription_id',
    'generate_paiement_id'
  )
ORDER BY routine_name;

-- ============================================
-- Check RLS policies exist
-- ============================================

SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- Check triggers exist
-- ============================================

SELECT
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
