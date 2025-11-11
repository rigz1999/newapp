-- Add CGP (Conseiller en Gestion de Patrimoine) fields to investisseurs table
-- CGP information should be stored with the investor, not the subscription

ALTER TABLE investisseurs
ADD COLUMN IF NOT EXISTS cgp TEXT,
ADD COLUMN IF NOT EXISTS email_cgp TEXT;

-- Add index for faster CGP lookups
CREATE INDEX IF NOT EXISTS idx_investisseurs_email_cgp ON investisseurs(email_cgp);

COMMENT ON COLUMN investisseurs.cgp IS 'Nom du Conseiller en Gestion de Patrimoine';
COMMENT ON COLUMN investisseurs.email_cgp IS 'Email du Conseiller en Gestion de Patrimoine';
