-- ============================================
-- Database Migration Status Checker
-- Run this in your Supabase SQL Editor to see what's missing
-- ============================================

-- 1. Check for Performance Indexes
SELECT
    'INDEXES' as check_type,
    CASE
        WHEN COUNT(*) >= 20 THEN '✅ Performance indexes appear to be installed'
        ELSE '❌ Missing performance indexes (found ' || COUNT(*) || ', expected ~24)'
    END as status
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

-- 2. List existing indexes
SELECT
    'EXISTING INDEXES' as info,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename;

-- 3. Check for RLS Policies
SELECT
    'RLS POLICIES' as check_type,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 4. Check if tables have RLS enabled
SELECT
    'RLS ENABLED' as check_type,
    tablename,
    CASE
        WHEN rowsecurity THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('organizations', 'memberships', 'profiles', 'paiements', 'projets', 'investisseurs', 'tranches', 'souscriptions', 'invitations')
ORDER BY tablename;

-- 5. Check for pg_cron extension
SELECT
    'EXTENSIONS' as check_type,
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
        THEN '✅ pg_cron extension installed'
        ELSE '❌ pg_cron extension missing (needed for automated reminders)'
    END as status;

-- 6. Check for scheduled cron jobs
SELECT
    'CRON JOBS' as check_type,
    CASE
        WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-daily-coupon-reminders')
        THEN '✅ Reminder cron job configured'
        ELSE '⚠️ Reminder cron job not configured'
    END as status;

-- 7. Check specific columns added by migrations
SELECT
    'COLUMN CHECKS' as check_type,
    'paiements.statut' as column_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'paiements' AND column_name = 'statut'
        ) THEN '✅ Exists'
        ELSE '❌ Missing'
    END as status
UNION ALL
SELECT
    'COLUMN CHECKS',
    'paiements.org_id',
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'paiements' AND column_name = 'org_id'
        ) THEN '✅ Exists'
        ELSE '❌ Missing'
    END
UNION ALL
SELECT
    'COLUMN CHECKS',
    'organizations.owner_id',
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'organizations' AND column_name = 'owner_id'
        ) THEN '✅ Exists'
        ELSE '❌ Missing'
    END;

-- 8. Summary
SELECT
    '========== SUMMARY ==========' as summary,
    '' as details
UNION ALL
SELECT
    'Total Tables',
    COUNT(*)::text
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
UNION ALL
SELECT
    'Total Indexes',
    COUNT(*)::text
FROM pg_indexes
WHERE schemaname = 'public'
UNION ALL
SELECT
    'Total RLS Policies',
    COUNT(*)::text
FROM pg_policies
WHERE schemaname = 'public';
