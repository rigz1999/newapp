-- ============================================
-- EXPORT: coupons_echeances
-- Run this in US Supabase SQL Editor
-- Copy the results and provide them
-- ============================================

SELECT
  id::text,
  souscription_id::text,
  date_echeance::text,
  montant_coupon::text,
  statut,
  date_paiement::text,
  montant_paye::text,
  created_at::text,
  updated_at::text,
  echeance_id::text
FROM coupons_echeances
ORDER BY created_at;

-- After running, you should see ~27 rows
-- Copy all the data from the results table
