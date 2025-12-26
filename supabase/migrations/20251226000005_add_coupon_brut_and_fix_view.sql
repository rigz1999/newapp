-- Add coupon_brut to coupons_optimized view for proper brut/net display
-- Fix: Currently showing same value for brut and net
-- Solution: Join to souscriptions to get coupon_brut (gross amount before tax)

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
  inv.type as investisseur_type,
  inv.email as investisseur_email,
  inv.cgp as investisseur_cgp,
  (inv.rib_file_path IS NOT NULL) as has_rib,

  -- Project and tranche fields
  proj.id as projet_id,
  proj.projet as projet_nom,
  tr.id as tranche_id,
  tr.tranche_name as tranche_nom,

  -- FIXED: Add coupon_brut from souscriptions for proper brut/net display
  s.coupon_brut as montant_brut,

  -- montant_coupon is ALREADY net (tax already applied from souscriptions.coupon_net)
  ce.montant_coupon as montant_net,

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

-- Grant permissions
GRANT SELECT ON public.coupons_optimized TO authenticated;

COMMENT ON VIEW public.coupons_optimized IS
  'Optimized view of coupons with pre-calculated fields.
   montant_brut: Original gross amount from souscriptions.coupon_brut
   montant_net: Net amount after tax from coupons_echeances.montant_coupon (which comes from souscriptions.coupon_net)
   For physique investors: montant_net = montant_brut * 0.7 (30% tax)
   For morale investors: montant_net = montant_brut (no tax)';

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'ADDED COUPON_BRUT FOR PROPER BRUT/NET DISPLAY';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'montant_brut: From souscriptions.coupon_brut (original gross amount)';
  RAISE NOTICE 'montant_net: From coupons_echeances.montant_coupon (already has tax applied)';
  RAISE NOTICE 'Removed: org_id, investisseur_id_display (not needed in view)';
  RAISE NOTICE '===========================================';
END $$;
