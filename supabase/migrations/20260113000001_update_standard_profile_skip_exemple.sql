-- Update standard profile to skip example rows marked with "EXEMPLE"
-- This allows the Excel template to include clear example rows that won't be imported

UPDATE company_format_profiles
SET
  format_config = jsonb_set(
    format_config,
    '{data_transformations,skip_rows_with}',
    '["TOTAL", "SOUS-TOTAL", "Total", "Sous-total", "EXEMPLE", "Exemple", "exemple"]'::jsonb
  ),
  version = version + 1,
  updated_at = now()
WHERE is_standard = true;

-- Add comment
COMMENT ON TABLE company_format_profiles IS 'Profils de format pour l''import de registre des titres. V2: Support des lignes EXEMPLE.';
