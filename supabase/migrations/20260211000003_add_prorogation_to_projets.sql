-- Add prorogation (maturity extension with step-up rate) fields to projets
-- Market practice: defined upfront in bond documentation, issuer may exercise at maturity

ALTER TABLE projets
  ADD COLUMN IF NOT EXISTS prorogation_possible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duree_prorogation_mois integer,
  ADD COLUMN IF NOT EXISTS step_up_taux numeric,
  ADD COLUMN IF NOT EXISTS prorogation_activee boolean NOT NULL DEFAULT false;

-- Constraints
-- step_up must be positive when set
ALTER TABLE projets ADD CONSTRAINT chk_step_up_positive
  CHECK (step_up_taux IS NULL OR step_up_taux > 0);

-- prorogation duration must be positive when set
ALTER TABLE projets ADD CONSTRAINT chk_prorogation_duree_positive
  CHECK (duree_prorogation_mois IS NULL OR duree_prorogation_mois > 0);

-- cannot activate prorogation if not possible
ALTER TABLE projets ADD CONSTRAINT chk_prorogation_activee_requires_possible
  CHECK (prorogation_activee = false OR prorogation_possible = true);

-- if prorogation is possible, both duration and step_up must be set
ALTER TABLE projets ADD CONSTRAINT chk_prorogation_fields_complete
  CHECK (
    prorogation_possible = false
    OR (duree_prorogation_mois IS NOT NULL AND step_up_taux IS NOT NULL)
  );

COMMENT ON COLUMN projets.prorogation_possible IS 'Whether the bond terms allow maturity extension';
COMMENT ON COLUMN projets.duree_prorogation_mois IS 'Extension duration in months (e.g. 6)';
COMMENT ON COLUMN projets.step_up_taux IS 'Interest rate increase in percentage points during extension (e.g. 1.0 for +1%)';
COMMENT ON COLUMN projets.prorogation_activee IS 'Whether the issuer has exercised the extension option';
