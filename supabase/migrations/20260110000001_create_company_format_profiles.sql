-- Table pour les profils de format de registre des titres
-- Permet de supporter le format standard + formats personnalisés par société

CREATE TABLE IF NOT EXISTS company_format_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiant de la société (null = format standard)
  company_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Nom du profil (ex: "Format Standard", "Société Générale")
  profile_name TEXT NOT NULL,

  -- Indique si c'est le format standard
  is_standard BOOLEAN NOT NULL DEFAULT false,

  -- Configuration du format (JSON)
  format_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Actif ou non
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Version du profil (pour gérer les évolutions)
  version INTEGER NOT NULL DEFAULT 1,

  -- Description du profil
  description TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Un seul profil standard possible
  CONSTRAINT unique_standard_profile CHECK (
    NOT is_standard OR (
      SELECT COUNT(*) FROM company_format_profiles WHERE is_standard = true
    ) <= 1
  )
);

-- Index pour recherche rapide
CREATE INDEX idx_company_format_profiles_company_id ON company_format_profiles(company_id);
CREATE INDEX idx_company_format_profiles_is_standard ON company_format_profiles(is_standard) WHERE is_standard = true;
CREATE INDEX idx_company_format_profiles_is_active ON company_format_profiles(is_active) WHERE is_active = true;

-- Un seul profil actif par société (index unique partiel)
CREATE UNIQUE INDEX idx_unique_active_company_profile
  ON company_format_profiles(company_id)
  WHERE is_active = true AND company_id IS NOT NULL;

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_company_format_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_company_format_profiles_updated_at
  BEFORE UPDATE ON company_format_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_company_format_profiles_updated_at();

-- RLS Policies
ALTER TABLE company_format_profiles ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs authentifiés peuvent lire tous les profils
CREATE POLICY "Lecture des profils pour utilisateurs authentifiés"
  ON company_format_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Seuls les super admins peuvent créer/modifier/supprimer
CREATE POLICY "Gestion des profils pour super admins uniquement"
  ON company_format_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Insertion du profil standard par défaut
INSERT INTO company_format_profiles (
  profile_name,
  is_standard,
  description,
  format_config
) VALUES (
  'Format Standard',
  true,
  'Format standard pour l''import de registre des titres. À utiliser si votre société n''a pas de format spécifique.',
  '{
    "file_type": "excel",
    "accepted_extensions": [".xlsx", ".xls", ".csv"],
    "structure": {
      "type": "two_sections",
      "section_markers": {
        "physical": "Personnes Physiques",
        "moral": "Personnes Morales"
      },
      "encoding": "utf-8",
      "fallback_encoding": "windows-1252"
    },
    "column_mappings": {
      "physical": {
        "Quantité": "Quantité",
        "Montant": "Montant",
        "Nom(s)": "Nom(s)",
        "Prénom(s)": "Prénom(s)",
        "E-mail": "E-mail",
        "Téléphone": "Téléphone",
        "Né(e) le": "Né(e) le",
        "Lieu de naissance": "Lieu de naissance",
        "Département de naissance": "Département de naissance",
        "Adresse du domicile": "Adresse du domicile",
        "Résidence Fiscale 1": "Résidence Fiscale 1",
        "PPE": "PPE",
        "Catégorisation": "Catégorisation",
        "Date de Transfert": "Date de Transfert",
        "Date de Validation BS": "Date de Validation BS",
        "PEA / PEA-PME": "PEA / PEA-PME",
        "Numéro de Compte PEA / PEA-PME": "Numéro de Compte PEA / PEA-PME",
        "CGP": "CGP",
        "E-mail du CGP": "E-mail du CGP",
        "Code du CGP": "Code du CGP",
        "Siren du CGP": "Siren du CGP"
      },
      "moral": {
        "Quantité": "Quantité",
        "Montant": "Montant",
        "Raison sociale": "Raison sociale",
        "N° SIREN": "N° SIREN",
        "E-mail du représentant légal": "E-mail du représentant légal",
        "Prénom du représentant légal": "Prénom du représentant légal",
        "Nom du représentant légal": "Nom du représentant légal",
        "Téléphone": "Téléphone",
        "Adresse du siège social": "Adresse du siège social",
        "Résidence Fiscale 1 du représentant légal": "Résidence Fiscale 1 du représentant légal",
        "Département de naissance du représentant": "Département de naissance du représentant",
        "PPE": "PPE",
        "Catégorisation": "Catégorisation",
        "Date de Transfert": "Date de Transfert",
        "Date de Validation BS": "Date de Validation BS",
        "PEA / PEA-PME": "PEA / PEA-PME",
        "Numéro de Compte PEA / PEA-PME": "Numéro de Compte PEA / PEA-PME",
        "CGP": "CGP",
        "E-mail du CGP": "E-mail du CGP",
        "Code du CGP": "Code du CGP",
        "Siren du CGP": "Siren du CGP"
      }
    },
    "data_transformations": {
      "date_format": "dd/mm/yyyy",
      "date_format_alternative": "yyyy-mm-dd",
      "decimal_separator": ",",
      "phone_format": "international",
      "skip_rows_with": ["TOTAL", "SOUS-TOTAL", "Total", "Sous-total"]
    },
    "validation_rules": {
      "required_fields_physical": [
        "Quantité",
        "Montant",
        "Nom(s)",
        "Prénom(s)",
        "E-mail"
      ],
      "required_fields_moral": [
        "Quantité",
        "Montant",
        "Raison sociale",
        "N° SIREN",
        "E-mail du représentant légal"
      ],
      "email_validation": true,
      "siren_length": 9,
      "phone_validation": true
    }
  }'::jsonb
);

-- Commentaires
COMMENT ON TABLE company_format_profiles IS 'Profils de format pour l''import de registre des titres';
COMMENT ON COLUMN company_format_profiles.company_id IS 'Identifiant de la société (null = format standard)';
COMMENT ON COLUMN company_format_profiles.is_standard IS 'Indique si c''est le format standard (un seul autorisé)';
COMMENT ON COLUMN company_format_profiles.format_config IS 'Configuration JSON du format (mappings, transformations, validations)';
COMMENT ON COLUMN company_format_profiles.version IS 'Numéro de version du profil (incrémenté à chaque modification)';
