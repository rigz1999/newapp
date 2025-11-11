// supabase/functions/import-registre/index.ts
// Deno Edge Function: Parse CSV "Registre des titres" with semicolon separator

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

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

// Parse CSV manually with auto-detection of separator
function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/);
  const result: Array<Record<string, string>> = [];
  
  // Auto-detect separator - FLEXIBLE for encoding issues
  let separator = ";";
  const firstDataLine = lines.find(line =>
    line.includes("Projet") && line.toLowerCase().includes("quantit")
  );
  
  if (firstDataLine) {
    // Count separators to detect which one is used
    const semicolonCount = (firstDataLine.match(/;/g) || []).length;
    const commaCount = (firstDataLine.match(/,/g) || []).length;
    const tabCount = (firstDataLine.match(/\t/g) || []).length;
    
    if (semicolonCount > Math.max(commaCount, tabCount)) {
      separator = ";";
    } else if (commaCount > Math.max(semicolonCount, tabCount)) {
      separator = ",";
    } else if (tabCount > 0) {
      separator = "\t";
    }
    
    console.log("Séparateur détecté:", separator === ";" ? "point-virgule" : separator === "," ? "virgule" : "tabulation");
    console.log("Ligne d'en-tête:", firstDataLine);
  }
  
  let headers: string[] = [];
  let inDataSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check if this is a header line - FLEXIBLE for encoding issues
    const isHeaderLine = (trimmed.includes("Projet") || trimmed.toLowerCase().includes("projet")) &&
                        trimmed.toLowerCase().includes("quantit"); // Partial match handles encoding issues
    
    if (isHeaderLine) {
      headers = trimmed.split(separator).map(h => h.trim());
      inDataSection = true;
      console.log("En-têtes trouvés:", headers);
      continue;
    }
    
    // Skip title lines
    if (trimmed.toLowerCase().includes("registre des titres") || 
        trimmed.toLowerCase() === "total" ||
        trimmed.toLowerCase().includes("personnes physiques") ||
        trimmed.toLowerCase().includes("personnes morales")) {
      inDataSection = false;
      continue;
    }
    
    // Parse data lines
    if (inDataSection && headers.length > 0) {
      const values = line.split(separator);
      
      // Check if this is a valid data row (has Projet value in first column)
      const firstValue = values[0] ? values[0].trim() : "";
      if (firstValue && 
          !firstValue.toLowerCase().includes("registre") &&
          !firstValue.toLowerCase().includes("total") &&
          firstValue.length > 0) {
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
    
    // Get tranche emission date for subscriptions
    const trancheEmissionDate = trancheData.date_emission || null;
    console.log("Date d'émission de la tranche:", trancheEmissionDate);

    // Read file
    console.log("=== ANALYSE DU FICHIER ===");
    console.log("Nom:", file.name);
    console.log("Type:", file.type);
    console.log("Taille:", file.size, "bytes");
    
    let rows: Array<Record<string, string>> = [];
    
    // Check if Excel or CSV
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || 
                    file.type.includes('spreadsheet') || file.type.includes('excel');
    
    if (isExcel) {
      console.log("📊 Format détecté: Excel");
      
      // Read as array buffer
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      console.log("Feuilles trouvées:", workbook.SheetNames);
      
      // Get first sheet
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Convert to JSON (array of objects)
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
        header: 1,
        raw: false,
        dateNF: 'yyyy-mm-dd'
      }) as any[][];
      
      console.log("Lignes brutes lues:", jsonData.length);
      
      // Parse the rows to find headers and data
      let headers: string[] = [];
      let inDataSection = false;
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;
        
        const firstCell = String(row[0] || "").trim();
        
        // Check if header row
        if ((firstCell.toLowerCase().includes("projet") || firstCell === "Projet") && 
            row.some((cell: any) => String(cell || "").toLowerCase().includes("quantit"))) {
          headers = row.map((cell: any) => String(cell || "").trim());
          inDataSection = true;
          console.log("En-têtes trouvés ligne", i + 1, ":", headers);
          continue;
        }
        
        // Skip section titles
        if (firstCell.toLowerCase().includes("registre") || 
            firstCell.toLowerCase().includes("total") ||
            firstCell.toLowerCase().includes("personnes")) {
          inDataSection = false;
          continue;
        }
        
        // Parse data rows
        if (inDataSection && headers.length > 0 && firstCell && firstCell.length > 0) {
          const rowObj: Record<string, string> = {};
          headers.forEach((header, idx) => {
            rowObj[header] = String(row[idx] || "").trim();
          });
          rows.push(rowObj);
        }
      }
      
      console.log("✅ Lignes de données extraites:", rows.length);
      
    } else {
      console.log("📄 Format détecté: CSV");
      
      // Read as text
      const text = await file.text();
      console.log("Taille:", text.length, "caractères");
      console.log("Premières 1000 caractères:");
      console.log(text.substring(0, 1000));
      console.log("---");
      
      // Detect encoding issues
      if (text.includes("�") || text.includes("Ã©") || text.includes("Ã")) {
        console.warn("⚠️ PROBLÈME D'ENCODAGE DÉTECTÉ!");
      }
      
      // Count lines
      const lineCount = text.split(/\r?\n/).length;
      console.log("Nombre de lignes:", lineCount);
      
      // Parse CSV
      rows = parseCSV(text);
      
      console.log(`✅ Parsed ${rows.length} rows from CSV`);
    }
    
    if (rows.length > 0) {
      console.log("Colonnes détectées:", Object.keys(rows[0]));
      console.log("Première ligne de données:", rows[0]);
      if (rows[1]) console.log("Deuxième ligne de données:", rows[1]);
    } else {
      console.error("❌ AUCUNE LIGNE DÉTECTÉE!");
      
      await supabase.from("tranches").delete().eq("id", trancheId);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Aucune donnée trouvée dans le fichier. Vérifiez le format. Utilisez de préférence un fichier Excel (.xlsx)",
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
        console.log(`\n=== TRAITEMENT LIGNE ${total} ===`);
        console.log("Données brutes:", r);
        
        // Determine investor type based on available fields
        const isPersonneMorale = r["Raison sociale"] || r["N° SIREN"];
        const investorType = isPersonneMorale ? "morale" : "physique";
        console.log("Type investisseur:", investorType);

        let investisseurId: string | null = null;
        let investorName = "";

        if (investorType === "physique") {
          // Physical person
          const prenom = cleanString(r["Prénom(s)"]) || "";
          const nom = cleanString(r["Nom(s)"]) || "";
          const nomUsage = cleanString(r["Nom d'usage"]);
          investorName = [prenom, nomUsage || nom].filter(Boolean).join(" ").trim();
          
          console.log("Nom complet:", investorName);
          
          const email = cleanString(r["Email"])?.toLowerCase() || null;
          console.log("Email:", email);
          
          const dateNaissance = parseDate(r["Né(e) le"]);
          
          // Try to find existing investor by email AND name (stricter matching)
          let existing = null;
          if (email) {
            const { data, error: qErr } = await supabase
              .from("investisseurs")
              .select("id")
              .eq("email", email)
              .eq("type", "physique")
              .maybeSingle();
            if (qErr) {
              console.error("Erreur recherche investisseur:", qErr);
              throw qErr;
            }
            existing = data;
            console.log("Investisseur existant trouvé par email:", existing ? "OUI (ID: " + existing.id + ")" : "NON");
          }
          
          // If no email match, try by name and birthdate (very strict)
          if (!existing && investorName && dateNaissance) {
            const { data, error: qErr } = await supabase
              .from("investisseurs")
              .select("id")
              .eq("nom_raison_sociale", investorName)
              .eq("date_naissance", dateNaissance)
              .eq("type", "physique")
              .maybeSingle();
            if (qErr) {
              console.error("Erreur recherche par nom+date:", qErr);
            } else if (data) {
              existing = data;
              console.log("Investisseur existant trouvé par nom+date:", "OUI (ID: " + existing.id + ")");
            }
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
          
          console.log("Payload investisseur:", invPayload);

          if (!existing) {
            console.log("Création nouvel investisseur...");
            const { data: ins, error: insErr } = await supabase
              .from("investisseurs")
              .insert([invPayload])
              .select("id")
              .single();
            if (insErr) {
              console.error("Erreur création investisseur:", insErr);
              throw insErr;
            }
            if (!ins || !ins.id) {
              console.error("Investisseur créé mais pas d'ID retourné!");
              throw new Error("Pas d'ID investisseur retourné");
            }
            investisseurId = ins.id;
            console.log("✅ Investisseur créé avec ID:", investisseurId);
            createdInvestisseurs++;
          } else {
            investisseurId = existing.id;
            console.log("Mise à jour investisseur existant ID:", investisseurId);
            const { error: updErr } = await supabase
              .from("investisseurs")
              .update(invPayload)
              .eq("id", investisseurId);
            if (updErr) {
              console.error("Erreur update investisseur:", updErr);
              throw updErr;
            }
            console.log("✅ Investisseur mis à jour");
            updatedInvestisseurs++;
          }
        } else {
          // Moral person (company)
          const raisonSociale = cleanString(r["Raison sociale"]) || "";
          investorName = raisonSociale;
          console.log("Raison sociale:", raisonSociale);
          
          const sirenStr = cleanString(r["N° SIREN"]);
          const siren = sirenStr ? parseInt(sirenStr.replace(/\D/g, "")) : null;
          console.log("SIREN:", siren);
          
          const emailRepLegal = cleanString(r["Email du représentant légal"])?.toLowerCase() || null;
          console.log("Email rep legal:", emailRepLegal);
          
          // Try to find by SIREN or email
          let existing = null;
          if (siren) {
            const { data, error: qErr } = await supabase
              .from("investisseurs")
              .select("id")
              .eq("siren", siren)
              .eq("type", "morale")
              .maybeSingle();
            if (qErr) {
              console.error("Erreur recherche par SIREN:", qErr);
              throw qErr;
            }
            existing = data;
            console.log("Société existante trouvée par SIREN:", existing ? "OUI (ID: " + existing.id + ")" : "NON");
          }
          
          // Try by email if no SIREN match
          if (!existing && emailRepLegal) {
            const { data, error: qErr } = await supabase
              .from("investisseurs")
              .select("id")
              .eq("email", emailRepLegal)
              .eq("type", "morale")
              .maybeSingle();
            if (qErr) {
              console.error("Erreur recherche par email:", qErr);
            } else if (data) {
              existing = data;
              console.log("Société existante trouvée par email:", "OUI (ID: " + existing.id + ")");
            }
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
          
          console.log("Payload société:", invPayload);

          if (!existing) {
            console.log("Création nouvelle société...");
            const { data: ins, error: insErr } = await supabase
              .from("investisseurs")
              .insert([invPayload])
              .select("id")
              .single();
            if (insErr) {
              console.error("Erreur création société:", insErr);
              throw insErr;
            }
            if (!ins || !ins.id) {
              console.error("Société créée mais pas d'ID retourné!");
              throw new Error("Pas d'ID société retourné");
            }
            investisseurId = ins.id;
            console.log("✅ Société créée avec ID:", investisseurId);
            createdInvestisseurs++;
          } else {
            investisseurId = existing.id;
            console.log("Mise à jour société existante ID:", investisseurId);
            const { error: updErr } = await supabase
              .from("investisseurs")
              .update(invPayload)
              .eq("id", investisseurId);
            if (updErr) {
              console.error("Erreur update société:", updErr);
              throw updErr;
            }
            console.log("✅ Société mise à jour");
            updatedInvestisseurs++;
          }
        }

        // Verify we have an investor ID before creating subscription
        if (!investisseurId) {
          console.error("❌ PAS D'ID INVESTISSEUR APRÈS CRÉATION/UPDATE!");
          throw new Error("investisseurId est null");
        }

        // Create subscription
        const quantite = toNumber(r["Quantité"]);
        const montant = toNumber(r["Montant"]);
        
        // Use tranche emission date if no subscription date in CSV
        const dateSouscriptionCSV = parseDate(r["Date de souscription"]);
        const dateSouscription = dateSouscriptionCSV || trancheEmissionDate || null;
        
        console.log("Date souscription CSV:", dateSouscriptionCSV);
        console.log("Date souscription finale:", dateSouscription);

        const cgp = cleanString(r["CGP"]);
        const emailCgp = cleanString(r["Email du CGP"]);
        const codeCgp = cleanString(r["Code du CGP"]);
        const sirenCgpStr = cleanString(r["Siren du CGP"]);
        const sirenCgp = sirenCgpStr ? parseInt(sirenCgpStr.replace(/\D/g, "")) : null;

        console.log("Création souscription pour investisseur:", investisseurId);
        console.log("Quantité:", quantite, "Montant:", montant);

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

        if (subErr) {
          console.error("Erreur création souscription:", subErr);
          throw subErr;
        }
        console.log("✅ Souscription créée");
        createdSouscriptions++;

      } catch (e: any) {
        console.error(`❌ Erreur ligne ${total}:`, e);
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