// supabase/functions/import-registre/index.ts
// Deno Edge Function: parse "Registre des titres" (CSV, ';'), upsert investors, insert subscriptions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://deno.land/std@0.224.0/csv/parse.ts";

// ---- Helpers ----
const parseFrDate = (s?: string | null) => {
  if (!s) return null;
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [_, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`; // ISO yyyy-mm-dd
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

// ---- Edge handler ----
Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Use POST", { status: 405 });
    }

    // Parse multipart/form-data
    const ctype = req.headers.get("content-type") ?? "";
    if (!ctype.includes("multipart/form-data")) {
      return new Response("Send multipart/form-data with fields: projet_id, tranche_id, file", { status: 400 });
    }

    const form = await req.formData();
    const projetId = String(form.get("projet_id") ?? "");
    const trancheId = String(form.get("tranche_id") ?? "");
    const file = form.get("file") as File | null;

    if (!projetId || !trancheId || !file) {
      return new Response("Missing projet_id, tranche_id or file", { status: 400 });
    }

    // Supabase client with service role (bypasses RLS securely on the server)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Read file (supports ISO-8859-1 or UTF-8)
    // If your CSV is ISO-8859-1 you can force decode:
    // const buf = new Uint8Array(await file.arrayBuffer());
    // const text = new TextDecoder("iso-8859-1").decode(buf);
    const text = await file.text();

    // Find the "Personnes Physiques" section
    const lines = text.split(/\r?\n/);
    const headerIdx = lines.findIndex((l) =>
      l.startsWith("Projet;Quantité;Montant;Nom(s);")
    );
    if (headerIdx === -1) {
      return new Response(
        'Header "Projet;Quantité;Montant;Nom(s);" not found. Is this the right CSV?',
        { status: 400 },
      );
    }
    let endIdx = headerIdx + 1;
    while (endIdx < lines.length && lines[endIdx].trim() !== "") endIdx++;
    const section = lines.slice(headerIdx, endIdx).join("\n");

    // Parse CSV with ';' and header = true
    const rows = await parse(section, {
      separator: ";",
      skipFirstRow: false,   // we want header used as keys
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
        // Map columns (adjust keys if headers vary)
        const email = (r["Email"] || "").trim().toLowerCase();
        if (!email) continue;

        const fullName = [r["Prénom(s)"], r["Nom(s)"]].filter(Boolean).join(" ").trim();

        // --- UPSERT INVESTISSEUR by email ---
        const { data: existingInv, error: findErr } = await supabase
          .from("investisseurs")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (findErr) throw findErr;

        const invPayload: any = {
          type: "Physique",
          nom_raison_sociale: fullName || r["Nom(s)"] || null,
          email,
          telephone: cleanPhone(r["Téléphone"]),
          adresse: r["Adresse du domicile"] || null,
          residence_fiscale: r["Résidence Fiscale 1"] || null,
          departement_naissance: (r["Département de naissance"] ?? "").toString() || null,
          date_naissance: parseFrDate(r["Né(e) le"]),
          lieu_naissance: r["Lieu de naissance"] || null,
          ppe: toBool(r["PPE"]),
          categorie_mifid: r["Catégorisation"] || null,
        };

        let investisseurId = existingInv?.id;
        if (!investisseurId) {
          const { data: inv, error: insErr } = await supabase
            .from("investisseurs")
            .insert([invPayload])
            .select("id")
            .single();
          if (insErr) throw insErr;
          investisseurId = inv.id;
          createdInvestisseurs++;
        } else {
          const { error: updErr } = await supabase
            .from("investisseurs")
            .update(invPayload)
            .eq("id", investisseurId);
          if (updErr) throw updErr;
          updatedInvestisseurs++;
        }

        // --- INSERT SOUSCRIPTION ---
        const qte = toNumber(r["Quantité"]);
        const montant = toNumber(r["Montant"]);

        const subPayload: any = {
          projet_id: projetId,
          tranche_id: trancheId,
          investisseur_id: investisseurId,
          date_souscription: parseFrDate(r["Date de souscription"]),
          nombre_obligations: qte,
          montant_investi: montant,
          date_validation_bs: parseFrDate(r["Date de Validation BS"]),
          date_transfert: parseFrDate(r["Date de Transfert"]),
          pea: r["PEA / PEA-PME"] ? true : null,
          pea_compte: r["Numéro de Compte PEA / PEA-PME"] || null,
          cap: r["CGP"] || null,            // or use dedicated cgp/email_cgp columns if you added them
          email_cap: r["Email du CGP"] || null,
          code_cgp: r["Code du CGP"] || null,
          siren_cgp: r["Siren du CGP"] ? String(r["Siren du CGP"]) : null,
        };

        const { error: subErr } = await supabase
          .from("souscriptions")
          .insert([subPayload]);
        if (subErr) throw subErr;

        createdSouscriptions++;
      } catch (e: any) {
        errors.push({ line: total, error: e?.message ?? String(e) });
      }
    }

    return new Response(
      JSON.stringify({ total, createdInvestisseurs, updatedInvestisseurs, createdSouscriptions, errors }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
