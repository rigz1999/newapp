-- ============================================
-- Enforce MFA (aal2) for sensitive operations via RLS
-- Users who have enrolled MFA must have verified (aal2)
-- to access financial data tables
-- ============================================

-- Paiements: require aal2 if user has MFA factors
CREATE POLICY "require_mfa_for_paiements" ON paiements
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    -- Allow if user has aal2, OR if user has no verified factors yet
    (SELECT auth.jwt()->>'aal') = 'aal2'
    OR NOT EXISTS (
      SELECT 1 FROM auth.mfa_factors
      WHERE user_id = auth.uid() AND status = 'verified'
    )
  );
