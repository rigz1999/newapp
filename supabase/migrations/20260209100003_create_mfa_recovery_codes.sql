-- ============================================
-- MFA Recovery Codes Table
-- Stores hashed recovery codes for 2FA fallback
-- ============================================

CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash   TEXT NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_user ON mfa_recovery_codes(user_id);

-- Enable RLS
ALTER TABLE mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

-- Users can only read their own recovery codes
CREATE POLICY "recovery_codes_read_own" ON mfa_recovery_codes
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own recovery codes
CREATE POLICY "recovery_codes_insert_own" ON mfa_recovery_codes
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own recovery codes (mark as used)
CREATE POLICY "recovery_codes_update_own" ON mfa_recovery_codes
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- Users can delete their own recovery codes (regeneration)
CREATE POLICY "recovery_codes_delete_own" ON mfa_recovery_codes
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
