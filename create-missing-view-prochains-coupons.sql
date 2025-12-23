-- Create missing view v_prochains_coupons in Paris database
-- This view is used for the "Prochain Coupon" KPI card

CREATE OR REPLACE VIEW v_prochains_coupons AS
SELECT
  ce.souscription_id,
  ce.date_echeance AS date_prochain_coupon,
  ce.montant_coupon AS montant_prochain_coupon,
  ce.statut
FROM coupons_echeances ce
JOIN (
  SELECT
    coupons_echeances.souscription_id,
    min(coupons_echeances.date_echeance) AS next_date
  FROM coupons_echeances
  WHERE ((coupons_echeances.date_echeance >= CURRENT_DATE) AND (coupons_echeances.statut <> 'paye'::text))
  GROUP BY coupons_echeances.souscription_id
) nx ON ((nx.souscription_id = ce.souscription_id) AND (nx.next_date = ce.date_echeance));

-- Verify view was created
SELECT 'View v_prochains_coupons created successfully' as status;
