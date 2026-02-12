-- Remove MFA restrictive RLS policy on paiements
-- MFA is now optional per-user (users can enroll if they choose to)
-- No platform-wide MFA enforcement

DROP POLICY IF EXISTS "require_mfa_for_paiements" ON paiements;
