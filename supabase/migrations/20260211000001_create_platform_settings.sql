-- ============================================
-- Platform Settings table
-- Key-value store for global platform configuration
-- Readable by all authenticated users, writable only by super admins
-- ============================================

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT 'false'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read settings
CREATE POLICY "platform_settings_select" ON platform_settings
  FOR SELECT TO authenticated
  USING (true);

-- Only super admins can modify settings
CREATE POLICY "platform_settings_insert" ON platform_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true)
  );

CREATE POLICY "platform_settings_update" ON platform_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true)
  );

CREATE POLICY "platform_settings_delete" ON platform_settings
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true)
  );

-- Seed default: MFA disabled
INSERT INTO platform_settings (key, value) VALUES ('mfa_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
