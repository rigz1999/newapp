import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { tranche_id } = await req.json();

    if (!tranche_id) {
      return new Response(
        JSON.stringify({ success: false, error: "tranche_id is required" }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    console.log("\n=== REGENERATE ECHEANCIER ===");
    console.log("Tranche ID:", tranche_id);

    // Get tranche details with project fallback
    const { data: tranche, error: trancheError } = await supabase
      .from("tranches")
      .select(`
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
          date_emission,
          duree_mois,
          base_interet
        )
      `)
      .eq("id", tranche_id)
      .single();

    if (trancheError || !tranche) {
      console.error("Tranche not found:", trancheError);
      return new Response(
        JSON.stringify({ success: false, error: "Tranche not found" }),
        { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Inherit from project if tranche values are null
    const project = tranche.projets as any;
    const tauxNominal = tranche.taux_nominal ?? project?.taux_nominal;
    // IMPORTANT: periodicite ALWAYS comes from project, never from tranche
    const periodiciteCoupons = project?.periodicite_coupons;
    const dateEmission = tranche.date_emission ?? project?.date_emission;
    const dureeMois = tranche.duree_mois ?? project?.duree_mois;
    const baseInteret = project?.base_interet ?? 360;

    console.log("Tranche parameters:");
    console.log("  Taux nominal:", tauxNominal);
    console.log("  Périodicité:", periodiciteCoupons);
    console.log("  Date émission:", dateEmission);
    console.log("  Durée (mois):", dureeMois);
    console.log("  Base de calcul:", baseInteret);

    // Validate required parameters
    if (tauxNominal === null || !periodiciteCoupons || !dateEmission || dureeMois === null) {
      const missing = [];
      if (tauxNominal === null) missing.push("taux_nominal");
      if (!periodiciteCoupons) missing.push("periodicite_coupons");
      if (!dateEmission) missing.push("date_emission");
      if (dureeMois === null) missing.push("duree_mois");

      console.warn("Missing required parameters:", missing);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Missing required parameters: ${missing.join(", ")}`,
          missing_params: missing,
        }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Step 1: Recalculate souscriptions coupon_brut and coupon_net
    console.log("\n=== RECALCULATING SOUSCRIPTIONS ===");
    const { data: souscriptions, error: souscriptionsError } = await supabase
      .from("souscriptions")
      .select("id, investisseur_id, montant_investi, coupon_net, investisseurs(type)")
      .eq("tranche_id", tranche_id);

    if (souscriptionsError) {
      console.error("Error fetching souscriptions:", souscriptionsError);
      throw souscriptionsError;
    }

    if (!souscriptions || souscriptions.length === 0) {
      console.log("No souscriptions found for this tranche");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No souscriptions to process",
          updated_souscriptions: 0,
          deleted_coupons: 0,
          created_coupons: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    console.log(`Found ${souscriptions.length} souscriptions`);

    // Update each souscription with recalculated coupons
    const periodRatio = getPeriodRatio(periodiciteCoupons, baseInteret);
    console.log(`Period ratio: ${periodRatio} (${periodiciteCoupons}, base ${baseInteret})`);

    let updatedSouscriptions = 0;
    for (const sub of souscriptions) {
      const montant = Number(sub.montant_investi);
      const couponAnnuel = (montant * tauxNominal) / 100;
      const couponBrut = couponAnnuel * periodRatio;
      const investorType = (sub.investisseurs as any)?.type;
      // Case-insensitive comparison to handle both 'physique' and 'Physique'
      const couponNet = investorType?.toLowerCase() === 'physique' ? couponBrut * 0.7 : couponBrut;

      const { error: updateError } = await supabase
        .from("souscriptions")
        .update({
          coupon_brut: couponBrut,
          coupon_net: couponNet,
        })
        .eq("id", sub.id);

      if (updateError) {
        console.error(`Error updating souscription ${sub.id}:`, updateError);
      } else {
        updatedSouscriptions++;
        console.log(`  ✓ Souscription ${sub.id}: Annuel=${couponAnnuel.toFixed(2)}, Ratio=${periodRatio}, Brut=${couponBrut.toFixed(2)}, Net=${couponNet.toFixed(2)}`);
      }
    }

    // Step 2: Delete pending coupons (keep paid ones)
    console.log("\n=== DELETING PENDING COUPONS ===");
    const { data: deletedCoupons, error: deleteError } = await supabase
      .from("coupons_echeances")
      .delete()
      .in("souscription_id", souscriptions.map(s => s.id))
      .neq("statut", "payé")
      .select("id");

    if (deleteError) {
      console.error("Error deleting pending coupons:", deleteError);
      throw deleteError;
    }

    const deletedCount = deletedCoupons?.length || 0;
    console.log(`Deleted ${deletedCount} pending coupons`);

    // Step 3: Generate new payment schedule
    console.log("\n=== GENERATING NEW ECHEANCIER ===");

    // Map frequency to months between payments
    const frequencyMap: Record<string, { months: number; paymentsPerYear: number }> = {
      "annuelle": { months: 12, paymentsPerYear: 1 },
      "semestrielle": { months: 6, paymentsPerYear: 2 },
      "trimestrielle": { months: 3, paymentsPerYear: 4 },
      "mensuelle": { months: 1, paymentsPerYear: 12 },
    };

    const freq = frequencyMap[periodiciteCoupons.toLowerCase()];

    if (!freq) {
      console.error("Unknown frequency:", periodiciteCoupons);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unknown frequency: ${periodiciteCoupons}`,
        }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Calculate number of payments
    const numberOfPayments = Math.ceil(dureeMois / freq.months);
    console.log(`Number of payments: ${numberOfPayments}`);
    console.log(`Frequency: ${periodiciteCoupons} (every ${freq.months} months)`);

    // Calculate final maturity date
    const finalMaturityDate = new Date(dateEmission);
    finalMaturityDate.setMonth(finalMaturityDate.getMonth() + (numberOfPayments * freq.months));
    const dateEcheanceFinale = finalMaturityDate.toISOString().split('T')[0];

    console.log("Final maturity date:", dateEcheanceFinale);

    // Update tranche with calculated final maturity date
    await supabase
      .from("tranches")
      .update({ date_echeance_finale: dateEcheanceFinale })
      .eq("id", tranche_id);

    // Get existing paid coupons to avoid regenerating those dates
    const { data: paidCoupons } = await supabase
      .from("coupons_echeances")
      .select("souscription_id, date_echeance")
      .in("souscription_id", souscriptions.map(s => s.id))
      .eq("statut", "payé");

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

    // Refetch souscriptions with updated coupon_net values
    const { data: updatedSouscriptions } = await supabase
      .from("souscriptions")
      .select("id, montant_investi, coupon_net")
      .in("id", souscriptions.map(s => s.id));

    const souscriptionsMap = new Map(updatedSouscriptions?.map(s => [s.id, s]) || []);

    for (const sub of souscriptions) {
      const updatedSub = souscriptionsMap.get(sub.id);
      const montantCoupon = updatedSub?.coupon_net || 0;

      console.log(`  Souscription ${sub.id}: Coupon net (already calculated)=${montantCoupon.toFixed(2)}€`);

      const paidDates = paidCouponDates.get(sub.id);

      // Generate payment dates
      for (let i = 1; i <= numberOfPayments; i++) {
        const paymentDate = new Date(dateEmission);
        paymentDate.setMonth(paymentDate.getMonth() + (i * freq.months));
        const dateEcheance = paymentDate.toISOString().split('T')[0];

        // Skip if this date already has a paid coupon
        if (paidDates?.has(dateEcheance)) {
          console.log(`    Skipping ${dateEcheance} (already paid)`);
          continue;
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
        .from("coupons_echeances")
        .insert(couponsToInsert);

      if (couponsError) {
        console.error("Error creating coupons:", couponsError);
        throw couponsError;
      }

      createdCount = couponsToInsert.length;
      console.log(`✅ Created ${createdCount} coupons`);
    }

    console.log("\n=== SUMMARY ===");
    console.log(`Updated souscriptions: ${updatedSouscriptions}`);
    console.log(`Deleted pending coupons: ${deletedCount}`);
    console.log(`Created new coupons: ${createdCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Echeancier regenerated successfully for ${tranche.tranche_name}`,
        tranche_name: tranche.tranche_name,
        updated_souscriptions: updatedSouscriptions,
        deleted_coupons: deletedCount,
        created_coupons: createdCount,
        final_maturity_date: dateEcheanceFinale,
      }),
      { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
    );

  } catch (error: any) {
    console.error("=== ERROR ===");
    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
