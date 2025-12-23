-- ============================================
-- EXPORT: payment_proofs
-- Run this in US Supabase SQL Editor
-- Copy the results and provide them
-- ============================================

SELECT
  id::text,
  paiement_id::text,
  file_url,
  file_name,
  file_size::text,
  extracted_data::text,
  confidence::text,
  validated_at::text,
  created_at::text
FROM payment_proofs
ORDER BY created_at;

-- Copy all the data from the results table
