-- Fix MFA RLS policy to respect platform_settings.mfa_enabled toggle
-- When MFA is disabled via admin panel, the policy should not block operations

DROP POLICY IF EXISTS "require_mfa_for_paiements" ON paiements;

CREATE POLICY "require_mfa_for_paiements" ON paiements
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    -- If MFA is disabled platform-wide, allow all authenticated users
    NOT EXISTS (
      SELECT 1 FROM platform_settings
      WHERE key = 'mfa_enabled' AND value = 'true'::jsonb
    )
    -- Or user has aal2 (MFA verified this session)
    OR (SELECT auth.jwt()->>'aal') = 'aal2'
    -- Or user has no verified MFA factors
    OR NOT EXISTS (
      SELECT 1 FROM auth.mfa_factors
      WHERE user_id = auth.uid() AND status = 'verified'
    )
  )
  WITH CHECK (
    -- Same check for INSERT/UPDATE operations
    NOT EXISTS (
      SELECT 1 FROM platform_settings
      WHERE key = 'mfa_enabled' AND value = 'true'::jsonb
    )
    OR (SELECT auth.jwt()->>'aal') = 'aal2'
    OR NOT EXISTS (
      SELECT 1 FROM auth.mfa_factors
      WHERE user_id = auth.uid() AND status = 'verified'
    )
  );
