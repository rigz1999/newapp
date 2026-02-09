-- ============================================
-- RGPD Consent Management Tables
-- Tracks granular per-purpose consent with full audit history
-- CNIL-compliant: append-only for audit trail
-- ============================================

-- Consent purposes / categories
CREATE TABLE IF NOT EXISTS consent_purposes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(50) UNIQUE NOT NULL,
    name_fr         VARCHAR(255) NOT NULL,
    description_fr  TEXT NOT NULL,
    is_essential    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Append-only consent records (never update/delete for CNIL audit trail)
CREATE TABLE IF NOT EXISTS consent_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    anonymous_id    VARCHAR(255),
    purpose_slug    VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL CHECK (status IN ('granted', 'denied', 'withdrawn')),
    source          VARCHAR(50) NOT NULL,
    ip_address      INET,
    recorded_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_consent_records_user ON consent_records(user_id, purpose_slug);
CREATE INDEX IF NOT EXISTS idx_consent_records_anon ON consent_records(anonymous_id, purpose_slug);
CREATE INDEX IF NOT EXISTS idx_consent_records_recorded ON consent_records(recorded_at);

-- Enable RLS
ALTER TABLE consent_purposes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- Consent purposes: readable by all authenticated users
CREATE POLICY "consent_purposes_read" ON consent_purposes
    FOR SELECT TO authenticated
    USING (true);

-- Consent records: users can only read their own records
CREATE POLICY "consent_records_read_own" ON consent_records
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Consent records: users can insert their own records
CREATE POLICY "consent_records_insert_own" ON consent_records
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Consent records: anonymous inserts allowed (for cookie banner before login)
CREATE POLICY "consent_records_insert_anon" ON consent_records
    FOR INSERT TO anon
    WITH CHECK (user_id IS NULL AND anonymous_id IS NOT NULL);

-- No UPDATE or DELETE policies — append-only by design (CNIL requirement)

-- Seed default consent purposes
INSERT INTO consent_purposes (slug, name_fr, description_fr, is_essential) VALUES
    ('essential', 'Strictement nécessaires', 'Authentification, sécurité de session, stockage du consentement. Indispensables au fonctionnement du site.', true),
    ('error_tracking', 'Suivi d''erreurs', 'Permet de détecter et corriger les erreurs techniques pour améliorer la stabilité de l''application (Sentry).', false)
ON CONFLICT (slug) DO NOTHING;
