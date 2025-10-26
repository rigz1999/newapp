// supabase/functions/import-registre/index.ts
// Deno Edge Function: Parse CSV "Registre des titres" with semicolon separator

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ---------------- CORS ---------------- */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

/* --------------- Helpers --------------- */
const parseDate = (value: any): string | null => {
  if (!value) return null;
  const v = String(value).trim();
  
  // Format: dd/mm/yyyy
  const frMatch = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (frMatch) {
    const [_, dd, mm, yyyy] = frMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
  
  // Format: yyyy-mm-dd HH:MM:SS (from Excel/CSV export)
  const isoMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  
  return null;
};

const toBool = (s?: string | null): boolean | null => {
  if (!s) return null;
  const v = s.trim().toLowerCase();
  return v === "oui" || v === "yes" || v === "true" ? true
       : v === "non" || v === "no" || v === "false" ? false
       : null;
};

const cleanPhone = (s?: string | null): string | null => {
  if (!s) return null;
  return s.replace(/[^0-9+]/g, "") || null;
};

const toNumber = (s?: string | number | null): number | null => {
  if (s === null || s === undefined || s === "") return null;
  const str = String(s).replace(/\s/g, "").replace(",", ".");
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
};

const cleanString = (s?: string | null): string | null => {
  if (!s) return null;
  const cleaned = String(s).trim().replace(/^'+|'+$/g, ""); // Remove leading/trailing quotes
  return cleaned || null;
};

// Parse CSV manually (semicolon separator)
function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/);
  const result: Array<Record<string, string>> = [];
  
  let headers: string[] = [];
  let inDataSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check if this is a header line (contains "Projet" and "Quantité")
    if (trimmed.includes("Projet;") && trimmed.includes("Quantité")) {
      headers = trimmed.split(";").map(h => h.trim());
      inDataSection = true;
      continue;
    }
    
    // Skip title lines
    if (trimmed.startsWith("Registre des titres") || trimmed === "Total") {
      inDataSection = false;
      continue;
    }
    
    // Parse data lines
    if (inDataSection && headers.length > 0) {
      const values = line.split(";");
      
      // Check if this is a valid data row (has Projet value)
      if (values[0] && values[0].trim() && !values[0].includes("Registre")) {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] ? values[index].trim() : "";
        });
        result.push(row);
      }
    }
  }
  
  return result;
}

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
        "Send multipart/form-data with fields: projet_id, tranche_id, file",
        { status: 400, headers: corsHeaders }
      );
    }

    const form = await req.formData();
    const projetId = String(form.get("projet_id") ?? "");
    const trancheName = String(form.get("tranche_name") ?? "");
    const file = form.get("file") as File | null;

    if (!projetId || !trancheName || !file) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Missing projet_id, tranche_name or file" 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log("=== DÉBUT TRAITEMENT ===");
    console.log("Projet ID:", projetId);
    console.log("Nom tranche:", trancheName);
    console.log("Fichier:", file.name);

    // Supabase client (service role)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // 1) CREATE TRANCHE FIRST
    console.log("Création de la tranche...");
    const { data: trancheData, error: trancheError } = await supabase
      .from("tranches")
      .insert({
        projet_id: projetId,
        tranche_name: trancheName,
      })
      .select()
      .single();

    if (trancheError) {
      console.error("Erreur création tranche:", trancheError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Erreur création tranche: ${trancheError.message}` 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!trancheData) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Tranche non créée (données manquantes)" 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const trancheId = trancheData.id;
    console.log("Tranche créée avec succès, ID:", trancheId);

    // Read CSV text
    const text = await file.text();
    console.log("Taille fichier:", text.length, "caractères");
    console.log("Premières 500 caractères:", text.substring(0, 500));
    
    // Parse CSV
    const rows = parseCSV(text);
    
    console.log(`Parsed ${rows.length} rows from CSV`);
    if (rows.length > 0) {
      console.log("Colonnes détectées:", Object.keys(rows[0]));
      console.log("Première ligne:", rows[0]);
    } else {
      console.error("⚠️ AUCUNE LIGNE DÉTECTÉE DANS LE CSV!");
      await supabase.from("tranches").delete().eq("id", trancheId);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Aucune donnée trouvée dans le CSV. Vérifiez le format (séparateur ';')",
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "content-type": "application/json" } 
        }
      );
    }

    let total = 0;
    let createdInvestisseurs = 0;
    let updatedInvestisseurs = 0;
    let createdSouscriptions = 0;
    const errors: Array<{ line: number; error: string }> = [];

    for (const r of rows) {
      total++;
      try {
        // Determine investor type based on available fields
        const isPersonneMorale = r["Raison sociale"] || r["N° SIREN"];
        const investorType = isPersonneMorale ? "morale" : "physique";

        let investisseurId: string | null = null;
        let investorName = "";

        if (investorType === "physique") {
          // Physical person
          const prenom = cleanString(r["Prénom(s)"]) || "";
          const nom = cleanString(r["Nom(s)"]) || "";
          const nomUsage = cleanString(r["Nom d'usage"]);
          investorName = [prenom, nomUsage || nom].filter(Boolean).join(" ").trim();
          
          const email = cleanString(r["Email"])?.toLowerCase() || null;
          const dateNaissance = parseDate(r["Né(e) le"]);
          
          // Try to find existing investor by email or name+birthdate
          let existing = null;
          if (email) {
            const { data } = await supabase
              .from("investisseurs")
              .select("id")
              .eq("email", email)
              .maybeSingle();
            existing = data;
          }

          const invPayload: any = {
            type: "physique",
            nom_raison_sociale: investorName || nom || "Investisseur",
            email: email,
            telephone: cleanPhone(r["Téléphone"]),
            adresse: cleanString(r["Adresse du domicile"]),
            residence_fiscale: cleanString(r["Résidence Fiscale 1"]),
            departement_naissance: cleanString(r["Département de naissance"]),
            date_naissance: dateNaissance,
            lieu_naissance: cleanString(r["Lieu de naissance"]),
            ppe: toBool(r["PPE"]),
            categorie_mifid: cleanString(r["Catégorisation"]),
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
          // Moral person (company)
          const raisonSociale = cleanString(r["Raison sociale"]) || "";
          investorName = raisonSociale;
          
          const sirenStr = cleanString(r["N° SIREN"]);
          const siren = sirenStr ? parseInt(sirenStr.replace(/\D/g, "")) : null;
          const emailRepLegal = cleanString(r["Email du représentant légal"])?.toLowerCase() || null;
          
          // Try to find by SIREN or email
          let existing = null;
          if (siren) {
            const { data } = await supabase
              .from("investisseurs")
              .select("id")
              .eq("siren", siren)
              .maybeSingle();
            existing = data;
          }

          const prenomRep = cleanString(r["Prénom du représentant légal"]) || "";
          const nomRep = cleanString(r["Nom du représentant légal"]) || "";
          const representantLegal = [prenomRep, nomRep].filter(Boolean).join(" ").trim() || null;

          const invPayload: any = {
            type: "morale",
            nom_raison_sociale: investorName,
            siren: siren,
            representant_legal: representantLegal,
            email: emailRepLegal,
            telephone: cleanPhone(r["Téléphone"]),
            adresse: cleanString(r["Adresse du siège social"]),
            residence_fiscale: cleanString(r["Résidence Fiscale 1 du représentant légal"]),
            departement_naissance: cleanString(r["Département de naissance du représentant"]),
            ppe: toBool(r["PPE"]),
            categorie_mifid: cleanString(r["Catégorisation"]),
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
        }

        // Create subscription
        const quantite = toNumber(r["Quantité"]);
        const montant = toNumber(r["Montant"]);
        const dateSouscription = parseDate(r["Date de souscription"]);

        const cgp = cleanString(r["CGP"]);
        const emailCgp = cleanString(r["Email du CGP"]);
        const codeCgp = cleanString(r["Code du CGP"]);
        const sirenCgpStr = cleanString(r["Siren du CGP"]);
        const sirenCgp = sirenCgpStr ? parseInt(sirenCgpStr.replace(/\D/g, "")) : null;

        const { error: subErr } = await supabase
          .from("souscriptions")
          .insert([{
            projet_id: projetId,
            tranche_id: trancheId,
            investisseur_id: investisseurId,
            date_souscription: dateSouscription,
            nombre_obligations: quantite,
            montant_investi: montant,
            date_validation_bs: parseDate(r["Date de Validation BS"]),
            date_transfert: parseDate(r["Date de Transfert"]),
            pea: r["PEA / PEA-PME"] ? true : null,
            pea_compte: cleanString(r["Numéro de Compte PEA / PEA-PME"]),
            cgp,
            email_cgp: emailCgp,
            code_cgp: codeCgp,
            siren_cgp: sirenCgp,
          }]);

        if (subErr) throw subErr;
        createdSouscriptions++;

      } catch (e: any) {
        console.error(`Error processing row ${total}:`, e);
        errors.push({ line: total, error: e?.message ?? String(e) });
      }
    }

    console.log("=== RÉSUMÉ IMPORT ===");
    console.log("Total lignes:", total);
    console.log("Investisseurs créés:", createdInvestisseurs);
    console.log("Investisseurs mis à jour:", updatedInvestisseurs);
    console.log("Souscriptions créées:", createdSouscriptions);
    console.log("Erreurs:", errors.length);

    // ROLLBACK: Delete tranche if no subscriptions created
    if (createdSouscriptions === 0) {
      console.warn("⚠️ Aucune souscription créée, suppression de la tranche");
      await supabase.from("tranches").delete().eq("id", trancheId);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: "Aucune souscription n'a pu être créée. Vérifiez le format du CSV.",
          total,
          errors,
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "content-type": "application/json" } 
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        trancheId,
        trancheName,
        total,
        createdInvestisseurs,
        updatedInvestisseurs,
        createdSouscriptions,
        errors,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      }
    );

  } catch (err: any) {
    console.error("Global error:", err);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: err?.message ?? String(err) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      }
    );
  }
});