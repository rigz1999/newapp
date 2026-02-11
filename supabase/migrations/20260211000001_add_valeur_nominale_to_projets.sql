-- Add valeur_nominale (face value per bond) to projets table
-- This enforces the relationship: montant_investi = nombre_obligations × valeur_nominale
ALTER TABLE projets ADD COLUMN IF NOT EXISTS valeur_nominale NUMERIC NOT NULL DEFAULT 100;

COMMENT ON COLUMN projets.valeur_nominale IS 'Face value per bond/obligation in EUR. montant_investi = nombre_obligations × valeur_nominale';
