-- Add CGP (Conseiller en Gestion de Patrimoine) fields to investisseurs table
-- CGP information should be stored with the investor, not the subscription

ALTER TABLE investisseurs
ADD COLUMN IF NOT EXISTS cgp_nom TEXT,
ADD COLUMN IF NOT EXISTS cgp_email TEXT;

-- Add index for faster CGP lookups
CREATE INDEX IF NOT EXISTS idx_investisseurs_cgp_email ON investisseurs(cgp_email);

COMMENT ON COLUMN investisseurs.cgp_nom IS 'Nom du Conseiller en Gestion de Patrimoine';
COMMENT ON COLUMN investisseurs.cgp_email IS 'Email du Conseiller en Gestion de Patrimoine';
