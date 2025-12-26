-- Fix double tax calculation issue in coupons_optimized view
-- Problem: coupons_echeances.montant_coupon is already NET (after 30% tax for physique)
--          but we were applying the tax AGAIN in the view
-- Solution: montant_net = montant_coupon (no additional calculation needed)

-- Drop and recreate the view with correct calculation
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

  -- FIXED: montant_coupon is ALREADY net (tax already applied)
  -- No need to calculate again - this was causing double taxation!
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
   IMPORTANT: montant_coupon from coupons_echeances is ALREADY the net amount.
   The tax (30% for physique) was already applied when creating the coupon.
   Do NOT apply tax calculation again or it will double-tax investors!';

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'FIXED DOUBLE TAX CALCULATION BUG';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'coupons_echeances.montant_coupon is populated from souscriptions.coupon_net';
  RAISE NOTICE 'souscriptions.coupon_net already has 30%% tax applied for physique investors';
  RAISE NOTICE 'The view was incorrectly applying tax AGAIN: montant_coupon * 0.7';
  RAISE NOTICE 'Fixed: montant_net = montant_coupon (no additional calculation)';
  RAISE NOTICE '===========================================';
END $$;
