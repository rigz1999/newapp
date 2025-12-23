-- Check org_id column definition on projets table
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'projets'
  AND column_name = 'org_id';
