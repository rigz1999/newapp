-- ============================================
-- EXPORT: paiements
-- Run this in US Supabase SQL Editor
-- Copy the results and provide them
-- ============================================

SELECT
  id::text,
  id_paiement,
  type,
  projet_id::text,
  tranche_id::text,
  investisseur_id::text,
  montant::text,
  date_paiement::text,
  note,
  created_at::text,
  proof_url,
  ocr_raw_text,
  matched::text,
  souscription_id::text,
  statut,
  org_id::text,
  echeance_id::text
FROM paiements
ORDER BY created_at;

-- Copy all the data from the results table
