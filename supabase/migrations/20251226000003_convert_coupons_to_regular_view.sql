-- Drop the materialized view and convert to regular view for real-time updates
-- This ensures paid coupons immediately show as "paye" instead of "en_retard"

-- Drop existing materialized view and its indexes
DROP MATERIALIZED VIEW IF EXISTS public.coupons_optimized CASCADE;

-- Drop the refresh function since we no longer need it
DROP FUNCTION IF EXISTS refresh_coupons_optimized();

-- Create regular view with same structure
CREATE OR REPLACE VIEW public.coupons_optimized AS
SELECT
  ce.id,
  ce.souscription_id,
  ce.date_echeance,
  ce.montant_coupon,
  ce.statut,
  ce.date_paiement,
  ce.montant_paye,

  -- Investor fields
  inv.id as investisseur_id,
  inv.nom_raison_sociale as investisseur_nom,
  inv.id_investisseur as investisseur_id_display,
  inv.type as investisseur_type,
  inv.email as investisseur_email,
  inv.cgp as investisseur_cgp,
  inv.org_id,
  (inv.rib_file_path IS NOT NULL) as has_rib,

  -- Project and tranche fields
  proj.id as projet_id,
  proj.projet as projet_nom,
  tr.id as tranche_id,
  tr.tranche_name as tranche_nom,

  -- Pre-calculate net amount based on investor type
  CASE
    WHEN LOWER(inv.type) = 'physique' THEN ce.montant_coupon * 0.70
    ELSE ce.montant_coupon
  END as montant_net,

  -- Pre-calculate dynamic status (IMPORTANT: Check paid status FIRST)
  CASE
    WHEN ce.statut = 'paye' THEN 'paye'
    WHEN ce.date_echeance < CURRENT_DATE THEN 'en_retard'
    ELSE 'en_attente'
  END as statut_calculated,

  -- Pre-calculate days until due
  (ce.date_echeance - CURRENT_DATE) as jours_restants,

  -- Add timestamp
  NOW() as view_updated_at

FROM public.coupons_echeances ce
INNER JOIN public.souscriptions s ON ce.souscription_id = s.id
INNER JOIN public.investisseurs inv ON s.investisseur_id = inv.id
INNER JOIN public.tranches tr ON s.tranche_id = tr.id
INNER JOIN public.projets proj ON tr.projet_id = proj.id;

-- Create indexes on the underlying tables for better performance
-- (these will be used by the view automatically)
CREATE INDEX IF NOT EXISTS idx_coupons_echeances_date ON public.coupons_echeances(date_echeance);
CREATE INDEX IF NOT EXISTS idx_coupons_echeances_statut ON public.coupons_echeances(statut);
CREATE INDEX IF NOT EXISTS idx_souscriptions_investisseur ON public.souscriptions(investisseur_id);
CREATE INDEX IF NOT EXISTS idx_souscriptions_tranche ON public.souscriptions(tranche_id);
CREATE INDEX IF NOT EXISTS idx_investisseurs_org ON public.investisseurs(org_id);
CREATE INDEX IF NOT EXISTS idx_tranches_projet ON public.tranches(projet_id);

-- Grant permissions
GRANT SELECT ON public.coupons_optimized TO authenticated;

COMMENT ON VIEW public.coupons_optimized IS
  'Optimized view of coupons with pre-calculated fields.
   Regular view (not materialized) ensures real-time data updates.
   When a coupon is marked as paid, it immediately shows as "paye" not "en_retard".';
