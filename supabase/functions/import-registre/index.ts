// supabase/functions/import-registre/index.ts
// Deno Edge Function (public): parse "Registre des titres" CSV (';'), upsert investors, insert subscriptions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://deno.land/std@0.224.0/csv/parse.ts";

/* ---------------- CORS ---------------- */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

/* --------------- Helpers --------------- */
const parseFrDate = (s?: string | null) => {
  if (!s) return null;
  const v = s.trim();
  // dd/mm/yyyy
  const m = v.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) {
    const [_, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  }
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return null;
};

const toBool = (s?: string | null) => {
  if (!s) return null;
  const v = s.trim().toLowerCase();
  return v === "oui" || v === "yes" ? true
       : v === "non" || v === "no" ? false
       : null;
};

const cleanPhone = (s?: string | null) =>
  (s || "").replace(/[^0-9+]/g, "") || null;

const toNumber = (s?: string | number | null) => {
  if (s === null || s === undefined) return null;
  const str = String(s).replace(/\s/g, "").replace(",", ".");
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
};

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Use POST", { status: 405, headers: corsHeaders });
    }

    const ctype = req.headers.get("content-type") ?? "";
    if (!ctype.includes("multipart/form-data")) {
      return new Response(
        'Send multipart/form-data with fields: projet_id, tranche_id, file',
        { status: 400, headers: corsHeaders },
      );
    }

    const form = await req.formData();
    const projetId = String(form.get("projet_id") ?? "");
    const trancheId = String(form.get("tranche_id") ?? "");
    const file = form.get("file") as File | null;

    if (!projetId || !trancheId || !file) {
      return new Response(
        "Missing projet_id, tranche_id or file",
        { status: 400, headers: corsHeaders },
      );
    }

    // Supabase (service role) - PUBLIC FUNCTION (no JWT required)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Read CSV text (UTF-8 by default)
    const text = await file.text();

    // Try to find the section header used in your "Registre des titres"
    // Adapt this selector to your header if needed
    // Example header: "Projet;Quantité;Montant;Nom(s);Prénom(s);Email;Téléphone;..."
    const lines = text.split(/\r?\n/);
    let headerIdx = lines.findIndex((l) =>
      l.toLowerCase().includes("projet;") && l.toLowerCase().includes("quantité")
    );
    if (headerIdx === -1) headerIdx = 0; // fallback: parse whole file

    // Extract contiguous non-empty lines after header
    let endIdx = headerIdx + 1;
    while (endIdx < lines.length && lines[endIdx].trim() !== "") endIdx++;
    const section = lines.slice(headerIdx, endIdx).join("\n");

    // Parse CSV with ';' and header row
    const rows = await parse(section, {
      separator: ";",
      skipFirstRow: false,
      columns: true,
      trimLeadingSpace: true,
      trimTrailingSpace: true,
    }) as Record<string, string>[];

    let total = 0;
    let createdInvestisseurs = 0;
    let updatedInvestisseurs = 0;
    let createdSouscriptions = 0;
    const errors: Array<{ line: number; error: string }> = [];

    for (const r of rows) {
      total++;
      try {
        // Map minimal columns (adapt to your CSV headers)
        const email =
          (r["Email"] ||
            r["email"] ||
            r["Email du représentant légal"] ||
            r["email_rep_legal"] ||
            "").trim().toLowerCase();

        const prenom = (r["Prénom(s)"] || r["Prénom"] || r["prenom"] || "").trim();
        const nom = (r["Nom(s)"] || r["Nom"] || r["nom"] || "").trim();
        const fullName = [prenom, nom].filter(Boolean).join(" ").trim();

        // Upsert investisseur by email (fallback to name if email missing)
        let investisseurId: string | null = null;

        if (email) {
          const { data: existing, error: qErr } = await supabase
            .from("investisseurs")
            .select("id")
            .eq("email", email)
            .maybeSingle();
          if (qErr) throw qErr;

          const invPayload: any = {
            type: "Physique",
            nom_raison_sociale: fullName || nom || null,
            email: email || null,
            telephone: cleanPhone(r["Téléphone"] || r["telephone"]),
            adresse: r["Adresse du domicile"] || r["Adresse du siège"] || null,
            residence_fiscale: r["Résidence Fiscale 1"] || r["Residence fiscale"] || null,
            departement_naissance: (r["Département de naissance"] ?? "").toString() || null,
            date_naissance: parseFrDate(r["Né(e) le"] || r["Date de naissance"]),
            lieu_naissance: r["Lieu de naissance"] || null,
            ppe: toBool(r["PPE"]),
            categorie_mifid: r["Catégorisation"] || null,
          };

          if (!existing) {
            const { data: ins, error: insErr } = await supabase
              .from("investisseurs")
              .insert([invPayload])
              .select("id")
              .single();
            if (insErr) throw insErr;
            investisseurId = ins.id;
            createdInvestisseurs++;
          } else {
            investisseurId = existing.id;
            const { error: updErr } = await supabase
              .from("investisseurs")
              .update(invPayload)
              .eq("id", investisseurId);
            if (updErr) throw updErr;
            updatedInvestisseurs++;
          }
        } else {
          // No email -> create a minimal investor row to attach subscription
          const { data: ins, error: insErr } = await supabase
            .from("investisseurs")
            .insert([{
              type: "Physique",
              nom_raison_sociale: fullName || "Investisseur",
            }])
            .select("id")
            .single();
          if (insErr) throw insErr;
          investisseurId = ins.id;
          createdInvestisseurs++;
        }

        // Subscription fields
        const quantite =
          toNumber(r["Quantité"] || r["quantite"] || r["Nombre d'obligations"]);
        const montant =
          toNumber(r["Montant"] || r["montant"] || r["Montant investi"]);
        const dateSouscription =
          parseFrDate(r["Date de souscription"] || r["date_souscription"]) || null;

        const cgp = r["CGP"] || r["cgp"] || r["Conseiller"] || null;
        const email_cgp = r["Email du CGP"] || r["email_cgp"] || null;
        const code_cgp = r["Code du CGP"] || r["code_cgp"] || null;
        const siren_cgp = r["Siren du CGP"] ? String(r["Siren du CGP"]) : null;

        const { error: subErr } = await supabase
          .from("souscriptions")
          .insert([{
            projet_id: projetId,
            tranche_id: trancheId,
            investisseur_id: investisseurId,
            date_souscription: dateSouscription,
            nombre_obligations: quantite,
            montant_investi: montant,
            // facultatif selon ton schéma
            date_validation_bs: parseFrDate(r["Date de Validation BS"]),
            date_transfert: parseFrDate(r["Date de Transfert"]),
            pea: r["PEA / PEA-PME"] ? true : null,
            pea_compte: r["Numéro de Compte PEA / PEA-PME"] || null,
            cgp,
            email_cgp,
            code_cgp,
            siren_cgp,
          }]);
        if (subErr) throw subErr;

        createdSouscriptions++;
      } catch (e: any) {
        errors.push({ line: total, error: e?.message ?? String(e) });
      }
    }

    return new Response(
      JSON.stringify({
        total,
        createdInvestisseurs,
        updatedInvestisseurs,
        createdSouscriptions,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  }
});
