-- Create optimized materialized view for coupons with all pre-calculated fields
CREATE MATERIALIZED VIEW IF NOT EXISTS public.coupons_optimized AS
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

  -- Pre-calculate dynamic status
  CASE
    WHEN ce.statut = 'paye' THEN 'paye'
    WHEN ce.date_echeance < CURRENT_DATE THEN 'en_retard'
    ELSE 'en_attente'
  END as statut_calculated,

  -- Pre-calculate days until due
  (ce.date_echeance - CURRENT_DATE) as jours_restants,

  -- Add timestamp for refresh tracking
  NOW() as view_updated_at

FROM public.coupons_echeances ce
INNER JOIN public.souscriptions s ON ce.souscription_id = s.id
INNER JOIN public.investisseurs inv ON s.investisseur_id = inv.id
INNER JOIN public.tranches tr ON s.tranche_id = tr.id
INNER JOIN public.projets proj ON tr.projet_id = proj.id;

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_coupons_opt_org_id ON public.coupons_optimized(org_id);
CREATE INDEX IF NOT EXISTS idx_coupons_opt_date_echeance ON public.coupons_optimized(date_echeance);
CREATE INDEX IF NOT EXISTS idx_coupons_opt_statut_calc ON public.coupons_optimized(statut_calculated);
CREATE INDEX IF NOT EXISTS idx_coupons_opt_projet_id ON public.coupons_optimized(projet_id);
CREATE INDEX IF NOT EXISTS idx_coupons_opt_tranche_id ON public.coupons_optimized(tranche_id);
CREATE INDEX IF NOT EXISTS idx_coupons_opt_investisseur_id ON public.coupons_optimized(investisseur_id);
CREATE INDEX IF NOT EXISTS idx_coupons_opt_investor_search ON public.coupons_optimized
  USING gin(to_tsvector('french', investisseur_nom));
CREATE INDEX IF NOT EXISTS idx_coupons_opt_project_search ON public.coupons_optimized
  USING gin(to_tsvector('french', projet_nom));

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_opt_id ON public.coupons_optimized(id);

-- Set up RLS policies
ALTER MATERIALIZED VIEW public.coupons_optimized OWNER TO postgres;

-- Note: Materialized views don't support RLS directly, so we'll filter by org_id in queries

-- Create a function to refresh the view
CREATE OR REPLACE FUNCTION refresh_coupons_optimized()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.coupons_optimized;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_coupons_optimized() TO authenticated;

-- Optionally, create a trigger to auto-refresh on data changes
-- (commented out for now as it might be too aggressive - can refresh manually or on schedule)
-- CREATE OR REPLACE FUNCTION trigger_refresh_coupons_optimized()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   PERFORM refresh_coupons_optimized();
--   RETURN NULL;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER refresh_coupons_on_payment
--   AFTER INSERT OR UPDATE OR DELETE ON public.coupons_echeances
--   FOR EACH STATEMENT
--   EXECUTE FUNCTION trigger_refresh_coupons_optimized();

COMMENT ON MATERIALIZED VIEW public.coupons_optimized IS
  'Optimized view of coupons with pre-calculated fields for better query performance.
   Refresh using: SELECT refresh_coupons_optimized();';
