-- ============================================
-- Enforce MFA (aal2) for sensitive operations via RLS
-- Users who have enrolled MFA must have verified (aal2)
-- to access financial data tables
-- ============================================

-- Helper function (SECURITY DEFINER) to check if user has verified MFA factors.
-- Needed because the authenticated role cannot query auth.mfa_factors directly.
CREATE OR REPLACE FUNCTION public.user_has_verified_mfa_factors()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.mfa_factors
    WHERE user_id = auth.uid() AND status = 'verified'
  );
$$;

-- Paiements: require aal2 if user has MFA factors
CREATE POLICY "require_mfa_for_paiements" ON paiements
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    -- Allow if user has aal2, OR if user has no verified factors yet
    (SELECT auth.jwt()->>'aal') = 'aal2'
    OR NOT public.user_has_verified_mfa_factors()
  );
