import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function getCorsHeaders(req?: Request) {
  const allowedOrigins = (
    Deno.env.get('ALLOWED_ORIGINS') ||
    Deno.env.get('ALLOWED_ORIGIN') ||
    'https://finixar.com'
  ).split(',');
  const origin = req?.headers.get('origin') || '';
  const matchedOrigin = allowedOrigins.find(o => o.trim() === origin) || allowedOrigins[0].trim();
  return {
    'Access-Control-Allow-Origin': matchedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Note: Use getCorsHeaders(req) in the handler for dynamic origin matching

// Helper function to calculate period ratio based on periodicite and base_interet
function getPeriodRatio(periodicite: string | null, baseInteret: number): number {
  const base = baseInteret || 360;

  switch (periodicite?.toLowerCase()) {
    case 'annuel':
    case 'annuelle':
      return 1.0;
    case 'semestriel':
    case 'semestrielle':
      return base === 365 ? 182.5 / 365 : 180 / 360;
    case 'trimestriel':
    case 'trimestrielle':
      return base === 365 ? 91.25 / 365 : 90 / 360;
    case 'mensuel':
    case 'mensuelle':
      return base === 365 ? 30.42 / 365 : 30 / 360;
    default:
      console.warn(`Périodicité inconnue: ${periodicite}, utilisation annuelle par défaut`);
      return 1.0;
  }
}

Deno.serve(async req => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { tranche_id } = await req.json();

    if (!tranche_id) {
      return new Response(JSON.stringify({ success: false, error: 'tranche_id is required' }), {
        status: 400,
        headers: { ...cors, 'content-type': 'application/json' },
      });
    }

    console.log('\n=== REGENERATE ECHEANCIER ===');
    console.log('Tranche ID:', tranche_id);

    // Get tranche details with project fallback
    const { data: tranche, error: trancheError } = await supabase
      .from('tranches')
      .select(
        `
        id,
        tranche_name,
        taux_nominal,
        periodicite_coupons,
        date_emission,
        duree_mois,
        projet_id,
        projets (
          taux_nominal,
          periodicite_coupons,
          duree_mois,
          base_interet
        )
      `
      )
      .eq('id', tranche_id)
      .single();

    if (trancheError || !tranche) {
      console.error('Tranche not found:', trancheError);
      return new Response(JSON.stringify({ success: false, error: 'Tranche not found' }), {
        status: 404,
        headers: { ...cors, 'content-type': 'application/json' },
      });
    }

    // Fetch prorogation fields separately (columns may not exist yet)
    let prorogationData: {
      prorogation_possible?: boolean;
      prorogation_activee?: boolean;
      duree_prorogation_mois?: number | null;
      step_up_taux?: number | null;
    } = {};

    const { data: prorogationRow } = await supabase
      .from('projets')
      .select('prorogation_possible, prorogation_activee, duree_prorogation_mois, step_up_taux')
      .eq('id', tranche.projet_id)
      .maybeSingle();

    if (prorogationRow) {
      prorogationData = prorogationRow;
    }

    // Inherit from project if tranche values are null
    const project = tranche.projets as {
      taux_nominal?: number | null;
      periodicite_coupons?: string | null;
      duree_mois?: number | null;
      base_interet?: number | null;
    } | null;
    const tauxNominal = tranche.taux_nominal ?? project?.taux_nominal;
    // IMPORTANT: periodicite ALWAYS comes from project, never from tranche
    const periodiciteCoupons = project?.periodicite_coupons;
    // IMPORTANT: date_emission ONLY comes from tranche, never from project
    const dateEmission = tranche.date_emission;
    const dureeMois = tranche.duree_mois ?? project?.duree_mois;
    const baseInteret = project?.base_interet ?? 360;

    // Prorogation (maturity extension with step-up rate)
    const prorogationActive =
      prorogationData.prorogation_possible && prorogationData.prorogation_activee;
    const dureeProrogation = prorogationActive ? (prorogationData.duree_prorogation_mois ?? 0) : 0;
    const stepUpTaux = prorogationActive ? (prorogationData.step_up_taux ?? 0) : 0;

    console.log('Tranche parameters:');
    console.log('  Taux nominal:', tauxNominal);
    console.log('  Périodicité:', periodiciteCoupons);
    console.log('  Date émission:', dateEmission);
    console.log('  Durée (mois):', dureeMois);
    console.log('  Base de calcul:', baseInteret);
    if (prorogationActive) {
      console.log('  PROROGATION ACTIVE:');
      console.log('    Durée prorogation:', dureeProrogation, 'mois');
      console.log('    Step-up taux:', `+${stepUpTaux}%`);
      console.log('    Taux prorogé:', `${(tauxNominal ?? 0) + stepUpTaux}%`);
    }

    // Validate required parameters
    if (tauxNominal === null || !periodiciteCoupons || !dateEmission || dureeMois === null) {
      const missing = [];
      if (tauxNominal === null) missing.push('taux_nominal');
      if (!periodiciteCoupons) missing.push('periodicite_coupons');
      if (!dateEmission) missing.push('date_emission');
      if (dureeMois === null) missing.push('duree_mois');

      console.warn('Missing required parameters:', missing);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Missing required parameters: ${missing.join(', ')}`,
          missing_params: missing,
        }),
        { status: 400, headers: { ...cors, 'content-type': 'application/json' } }
      );
    }

    // Step 1: Recalculate souscriptions coupon_brut and coupon_net
    // Note: souscription stores the BASE rate coupon. Extension coupons are computed at generation time.
    console.log('\n=== RECALCULATING SOUSCRIPTIONS ===');
    const { data: souscriptions, error: souscriptionsError } = await supabase
      .from('souscriptions')
      .select('id, investisseur_id, montant_investi, coupon_net, investisseurs(type)')
      .eq('tranche_id', tranche_id);

    if (souscriptionsError) {
      console.error('Error fetching souscriptions:', souscriptionsError);
      throw souscriptionsError;
    }

    if (!souscriptions || souscriptions.length === 0) {
      console.log('No souscriptions found for this tranche');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No souscriptions to process',
          updated_souscriptions: 0,
          deleted_coupons: 0,
          created_coupons: 0,
        }),
        { status: 200, headers: { ...cors, 'content-type': 'application/json' } }
      );
    }

    console.log(`Found ${souscriptions.length} souscriptions`);

    // Update each souscription with recalculated coupons (base rate)
    const periodRatio = getPeriodRatio(periodiciteCoupons, baseInteret);
    console.log(`Period ratio: ${periodRatio} (${periodiciteCoupons}, base ${baseInteret})`);

    // Pre-compute coupon amounts per souscription for both base and extension periods
    const subCouponData = new Map<
      string,
      { couponNetBase: number; couponNetExtension: number; montant: number }
    >();

    let updatedSouscriptions = 0;
    for (const sub of souscriptions) {
      const montant = Number(sub.montant_investi);
      const investorType = (sub.investisseurs as { type?: string } | null)?.type;
      // Apply 30% tax for all investors that are NOT explicitly 'morale'
      // This handles null/empty types that display as 'physique' in the UI
      const isMorale = investorType?.toLowerCase() === 'morale';
      const taxMultiplier = isMorale ? 1.0 : 0.7;

      // Base rate coupon
      const couponAnnuelBase = (montant * tauxNominal) / 100;
      const couponBrutBase = couponAnnuelBase * periodRatio;
      const couponNetBase = couponBrutBase * taxMultiplier;

      // Extension rate coupon (base + step-up)
      const tauxProroge = tauxNominal + stepUpTaux;
      const couponAnnuelExt = (montant * tauxProroge) / 100;
      const couponBrutExt = couponAnnuelExt * periodRatio;
      const couponNetExt = couponBrutExt * taxMultiplier;

      subCouponData.set(sub.id, { couponNetBase, couponNetExtension: couponNetExt, montant });

      // Update souscription record with base rate coupon (stored value)
      const { error: updateError } = await supabase
        .from('souscriptions')
        .update({
          coupon_brut: couponBrutBase,
          coupon_net: couponNetBase,
        })
        .eq('id', sub.id);

      if (updateError) {
        console.error(`Error updating souscription ${sub.id}:`, updateError);
      } else {
        updatedSouscriptions++;
        console.log(
          `  ✓ Souscription ${sub.id}: Base=${couponNetBase.toFixed(2)}€` +
            (prorogationActive
              ? `, Extension=${couponNetExt.toFixed(2)}€ (taux ${tauxProroge}%)`
              : '')
        );
      }
    }

    // Step 2: Delete pending coupons (keep paid ones)
    console.log('\n=== DELETING PENDING COUPONS ===');
    const { data: deletedCoupons, error: deleteError } = await supabase
      .from('coupons_echeances')
      .delete()
      .in(
        'souscription_id',
        souscriptions.map(s => s.id)
      )
      .neq('statut', 'payé')
      .select('id');

    if (deleteError) {
      console.error('Error deleting pending coupons:', deleteError);
      throw deleteError;
    }

    const deletedCount = deletedCoupons?.length || 0;
    console.log(`Deleted ${deletedCount} pending coupons`);

    // Step 3: Generate new payment schedule
    console.log('\n=== GENERATING NEW ECHEANCIER ===');

    // Map frequency to months between payments (handle both masculine and feminine forms)
    const frequencyMap: Record<string, { months: number; paymentsPerYear: number }> = {
      annuel: { months: 12, paymentsPerYear: 1 },
      annuelle: { months: 12, paymentsPerYear: 1 },
      semestriel: { months: 6, paymentsPerYear: 2 },
      semestrielle: { months: 6, paymentsPerYear: 2 },
      trimestriel: { months: 3, paymentsPerYear: 4 },
      trimestrielle: { months: 3, paymentsPerYear: 4 },
      mensuel: { months: 1, paymentsPerYear: 12 },
      mensuelle: { months: 1, paymentsPerYear: 12 },
    };

    const freq = frequencyMap[periodiciteCoupons.toLowerCase()];

    if (!freq) {
      console.error('Unknown frequency:', periodiciteCoupons);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unknown frequency: ${periodiciteCoupons}`,
        }),
        { status: 400, headers: { ...cors, 'content-type': 'application/json' } }
      );
    }

    // Calculate total duration including prorogation
    const totalDureeMois = dureeMois + dureeProrogation;
    const basePayments = Math.ceil(dureeMois / freq.months);
    const totalPayments = Math.ceil(totalDureeMois / freq.months);

    console.log(`Base payments: ${basePayments} (${dureeMois} months)`);
    if (prorogationActive) {
      console.log(
        `Extension payments: ${totalPayments - basePayments} (${dureeProrogation} months)`
      );
      console.log(`Total payments: ${totalPayments} (${totalDureeMois} months)`);
    }

    // Calculate final maturity date
    const finalMaturityDate = new Date(dateEmission);
    finalMaturityDate.setMonth(finalMaturityDate.getMonth() + totalPayments * freq.months);
    const dateEcheanceFinale = finalMaturityDate.toISOString().split('T')[0];

    console.log('Final maturity date:', dateEcheanceFinale);

    // Update tranche with calculated final maturity date
    await supabase
      .from('tranches')
      .update({ date_echeance_finale: dateEcheanceFinale })
      .eq('id', tranche_id);

    // Get existing paid coupons to avoid regenerating those dates
    const { data: paidCoupons } = await supabase
      .from('coupons_echeances')
      .select('souscription_id, date_echeance')
      .in(
        'souscription_id',
        souscriptions.map(s => s.id)
      )
      .eq('statut', 'payé');

    const paidCouponDates = new Map<string, Set<string>>();
    if (paidCoupons) {
      for (const coupon of paidCoupons) {
        if (!paidCouponDates.has(coupon.souscription_id)) {
          paidCouponDates.set(coupon.souscription_id, new Set());
        }
        paidCouponDates.get(coupon.souscription_id)!.add(coupon.date_echeance);
      }
    }

    // Generate coupons for all souscriptions
    const couponsToInsert: any[] = [];

    for (const sub of souscriptions) {
      const couponData = subCouponData.get(sub.id);
      if (!couponData) continue;

      const paidDates = paidCouponDates.get(sub.id);

      // Generate payment dates for full duration (base + extension)
      for (let i = 1; i <= totalPayments; i++) {
        const paymentDate = new Date(dateEmission);
        paymentDate.setMonth(paymentDate.getMonth() + i * freq.months);
        const dateEcheance = paymentDate.toISOString().split('T')[0];

        // Skip if this date already has a paid coupon
        if (paidDates?.has(dateEcheance)) {
          console.log(`    Skipping ${dateEcheance} (already paid)`);
          continue;
        }

        // Use stepped-up rate for extension period coupons
        const isExtensionPeriod = i > basePayments;
        const montantCoupon = isExtensionPeriod
          ? couponData.couponNetExtension
          : couponData.couponNetBase;

        if (isExtensionPeriod) {
          console.log(
            `    ${dateEcheance}: ${montantCoupon.toFixed(2)}€ (PROROGATION - taux majoré)`
          );
        }

        couponsToInsert.push({
          souscription_id: sub.id,
          date_echeance: dateEcheance,
          montant_coupon: Math.round(montantCoupon * 100) / 100,
          statut: 'en_attente',
        });
      }
    }

    // Bulk insert coupons
    let createdCount = 0;
    if (couponsToInsert.length > 0) {
      console.log(`Inserting ${couponsToInsert.length} coupons...`);

      const { error: couponsError } = await supabase
        .from('coupons_echeances')
        .insert(couponsToInsert);

      if (couponsError) {
        console.error('Error creating coupons:', couponsError);
        throw couponsError;
      }

      createdCount = couponsToInsert.length;
      console.log(`✅ Created ${createdCount} coupons`);
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Updated souscriptions: ${updatedSouscriptions}`);
    console.log(`Deleted pending coupons: ${deletedCount}`);
    console.log(`Created new coupons: ${createdCount}`);
    if (prorogationActive) {
      console.log(`Extension: +${dureeProrogation} months at +${stepUpTaux}% step-up`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Echeancier regenerated successfully for ${tranche.tranche_name}`,
        tranche_name: tranche.tranche_name,
        updated_souscriptions: updatedSouscriptions,
        deleted_coupons: deletedCount,
        created_coupons: createdCount,
        final_maturity_date: dateEcheanceFinale,
        prorogation_active: !!prorogationActive,
      }),
      { status: 200, headers: { ...cors, 'content-type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('=== ERROR ===');
    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      { status: 500, headers: { ...cors, 'content-type': 'application/json' } }
    );
  }
});
