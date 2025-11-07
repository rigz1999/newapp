-- ============================================
-- Fix Security Definer Views
-- Created: 2025-11-07
-- Purpose: Remove SECURITY DEFINER from views to properly enforce RLS policies
-- ============================================

-- Drop views (in order due to dependencies)
-- v_souscriptions_with_next depends on v_prochains_coupons, so drop it first
DROP VIEW IF EXISTS v_souscriptions_with_next;
DROP VIEW IF EXISTS v_prochains_coupons;
DROP VIEW IF EXISTS v_coupons_stats;
DROP VIEW IF EXISTS v_souscriptions_with_cgp;

-- Recreate v_coupons_stats (independent view)
CREATE VIEW v_coupons_stats AS
SELECT
  souscription_id,
  count(*) FILTER (WHERE (statut = 'paye'::text)) AS coupons_payes,
  count(*) FILTER (WHERE ((statut = 'en_attente'::text) AND (date_echeance < CURRENT_DATE))) AS coupons_en_retard,
  count(*) FILTER (WHERE ((statut = 'en_attente'::text) AND (date_echeance >= CURRENT_DATE))) AS coupons_a_venir,
  sum(montant_coupon) FILTER (WHERE (statut = 'paye'::text)) AS total_paye,
  sum(montant_coupon) FILTER (WHERE ((statut = 'en_attente'::text) AND (date_echeance < CURRENT_DATE))) AS total_en_retard,
  max(date_paiement) FILTER (WHERE (statut = 'paye'::text)) AS dernier_paiement
FROM coupons_echeances ce
GROUP BY souscription_id;

-- Recreate v_souscriptions_with_cgp (independent view)
CREATE VIEW v_souscriptions_with_cgp AS
SELECT
  s.id,
  s.id_souscription,
  s.projet_id,
  s.tranche_id,
  s.investisseur_id,
  s.date_souscription,
  s.nombre_obligations,
  s.montant_investi,
  s.coupon_brut,
  s.coupon_net,
  s.prochaine_date_coupon,
  s.created_at,
  s.cgp,
  s.email_cgp,
  s.date_validation_bs,
  s.date_transfert,
  s.pea,
  s.pea_compte,
  s.code_cgp,
  s.siren_cgp,
  i.cgp AS investisseur_cgp,
  i.email_cgp AS investisseur_email_cgp
FROM souscriptions s
JOIN investisseurs i ON (s.investisseur_id = i.id);

-- Recreate v_prochains_coupons (used by v_souscriptions_with_next)
CREATE VIEW v_prochains_coupons AS
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

-- Recreate v_souscriptions_with_next (depends on v_prochains_coupons)
CREATE VIEW v_souscriptions_with_next AS
SELECT
  s.id AS souscription_id,
  i.nom_raison_sociale AS investisseur,
  i.type AS type_investisseur,
  p.projet AS projet_nom,
  p.id AS projet_id,
  t.tranche_name,
  t.id AS tranche_id,
  p.periodicite_coupons,
  p.taux_nominal,
  t.date_emission,
  ((t.date_emission + ((p.maturite_mois || ' months'::text))::interval))::date AS date_echeance_finale,
  s.montant_investi,
  s.coupon_net,
  nx.date_prochain_coupon,
  nx.montant_prochain_coupon,
  nx.statut AS statut_prochain_coupon
FROM souscriptions s
JOIN investisseurs i ON (i.id = s.investisseur_id)
JOIN tranches t ON (t.id = s.tranche_id)
JOIN projets p ON (p.id = t.projet_id)
LEFT JOIN v_prochains_coupons nx ON (nx.souscription_id = s.id);

-- Set all views to use SECURITY INVOKER (enforces RLS policies of querying user)
ALTER VIEW v_coupons_stats SET (security_invoker = true);
ALTER VIEW v_souscriptions_with_cgp SET (security_invoker = true);
ALTER VIEW v_prochains_coupons SET (security_invoker = true);
ALTER VIEW v_souscriptions_with_next SET (security_invoker = true);

-- Add comments
COMMENT ON VIEW v_coupons_stats IS 'Coupon statistics per subscription - uses SECURITY INVOKER to enforce RLS';
COMMENT ON VIEW v_souscriptions_with_cgp IS 'Subscriptions with CGP information - uses SECURITY INVOKER to enforce RLS';
COMMENT ON VIEW v_prochains_coupons IS 'Next upcoming coupon per subscription - uses SECURITY INVOKER to enforce RLS';
COMMENT ON VIEW v_souscriptions_with_next IS 'Subscriptions with next coupon information - uses SECURITY INVOKER to enforce RLS';
