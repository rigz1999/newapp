-- Add project_import configuration to format profiles
-- This extends the existing format_config JSONB to support project creation from Excel files

-- Update the standard profile to include project_import mappings
UPDATE company_format_profiles
SET format_config = format_config || '{
  "project_import": {
    "field_aliases": {
      "projet": ["Nom du projet", "Nom de l''émission", "Nom projet", "Projet", "Libellé du projet"],
      "taux_interet": ["Rendement", "Taux d''intérêt", "Taux nominal", "Taux", "Rendement annuel"],
      "montant_global_eur": ["Plafond", "Montant global", "Montant total", "Montant à lever", "Montant collecté", "Objectif de collecte"],
      "maturite_mois": ["Durée d''investissement", "Durée", "Maturité", "Maturité (mois)", "Durée (mois)"],
      "emetteur": ["Marque", "Émetteur", "Emetteur", "Porteur de projet", "Raison sociale émetteur", "Société"],
      "siren_emetteur": ["SIREN", "N° SIREN", "SIREN émetteur", "Numéro SIREN"],
      "date_emission": ["Date de jouissance", "Date d''émission", "Date de début", "Date de début de collecte"],
      "periodicite_coupon": ["Périodicité", "Fréquence coupon", "Périodicité du coupon"],
      "valeur_nominale": ["Valeur nominale", "Nominal", "Prix unitaire", "Valeur faciale"],
      "type": ["Type d''obligation", "Type d''obligations", "Type", "Nature"],
      "base_interet": ["Base de calcul", "Base intérêt"],
      "nom_representant": ["Nom du représentant", "Nom représentant", "Nom du dirigeant"],
      "prenom_representant": ["Prénom du représentant", "Prénom représentant", "Prénom du dirigeant"],
      "email_representant": ["Email du représentant", "E-mail du représentant", "Email représentant"]
    }
  }
}'::jsonb,
    version = version + 1,
    updated_at = now()
WHERE is_standard = true;

COMMENT ON COLUMN company_format_profiles.format_config IS 'Configuration JSON du format (tranche column_mappings, project_import field_aliases, transformations, validations)';
