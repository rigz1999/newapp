// supabase/functions/import-registre/index.ts
// Deno Edge Function: Parse CSV "Registre des titres" with dual sections (Physiques/Morales)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ---------------- CORS ---------------- */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
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
  return v === 'oui' || v === 'yes' || v === 'true'
    ? true
    : v === 'non' || v === 'no' || v === 'false'
      ? false
      : null;
};

const cleanPhone = (s?: string | null): string | null => {
  if (!s) return null;
  return s.replace(/[^0-9+]/g, '') || null;
};

const toNumber = (s?: string | number | null): number | null => {
  if (s === null || s === undefined || s === '') return null;
  const str = String(s).replace(/\s/g, '').replace(',', '.');
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
};

const cleanString = (s?: string | null): string | null => {
  if (!s) return null;
  const cleaned = String(s)
    .trim()
    .replace(/^'+|'+$/g, ''); // Remove leading/trailing quotes
  return cleaned || null;
};

// Helper to get column value with fallback for encoding issues
const getColumn = (row: Record<string, string>, ...columnNames: string[]): string | undefined => {
  for (const name of columnNames) {
    if (row[name] !== undefined) {
      return row[name];
    }
  }
  return undefined;
};

// Calculate period ratio based on periodicite and base_interet
const getPeriodRatio = (periodicite: string | null, baseInteret: number): number => {
  const base = baseInteret || 360;

  switch (periodicite?.toLowerCase()) {
    case 'annuel':
    case 'annuelle':
      return base / base; // 1.0
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
};

// Parse CSV with dual sections (Personnes Physiques / Personnes Morales)
function parseCSV(text: string): Array<Record<string, string> & { _investorType: string }> {
  const lines = text.split(/\r?\n/);
  const result: Array<Record<string, string> & { _investorType: string }> = [];

  // Auto-detect separator
  let separator = '\t'; // Default to tab
  const sampleLine = lines.find(
    line => line.includes('Projet') && line.toLowerCase().includes('quantit')
  );

  if (sampleLine) {
    const tabCount = (sampleLine.match(/\t/g) || []).length;
    const semicolonCount = (sampleLine.match(/;/g) || []).length;
    const commaCount = (sampleLine.match(/,/g) || []).length;

    if (tabCount > Math.max(semicolonCount, commaCount)) {
      separator = '\t';
    } else if (semicolonCount > Math.max(tabCount, commaCount)) {
      separator = ';';
    } else if (commaCount > 0) {
      separator = ',';
    }

    console.log(
      'Séparateur détecté:',
      separator === '\t' ? 'tabulation' : separator === ';' ? 'point-virgule' : 'virgule'
    );
  }

  let headers: string[] = [];
  let currentSection: 'physique' | 'morale' | null = null;
  let inDataSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect section headers
    if (trimmed.toLowerCase().includes('personnes physiques')) {
      console.log('📍 Section détectée: Personnes Physiques');
      currentSection = 'physique';
      inDataSection = false;
      headers = [];
      continue;
    }

    if (trimmed.toLowerCase().includes('personnes morales')) {
      console.log('📍 Section détectée: Personnes Morales');
      currentSection = 'morale';
      inDataSection = false;
      headers = [];
      continue;
    }

    // Check if this is a header line (has "Projet" and "Quantit")
    if (
      (trimmed.includes('Projet') || trimmed.toLowerCase().includes('projet')) &&
      trimmed.toLowerCase().includes('quantit')
    ) {
      headers = trimmed.split(separator).map(h => h.trim());
      inDataSection = true;
      console.log(
        `En-têtes section ${currentSection}:`,
        headers.slice(0, 5),
        '... (total: ' + headers.length + ')'
      );
      continue;
    }

    // Skip title/summary lines
    if (
      trimmed.toLowerCase().includes('registre des titres') ||
      trimmed.toLowerCase() === 'total'
    ) {
      inDataSection = false;
      continue;
    }

    // Parse data lines
    if (inDataSection && headers.length > 0 && currentSection) {
      const values = line.split(separator);

      // Check if this is a valid data row (has Projet value in first column)
      const firstValue = values[0] ? values[0].trim() : '';
      if (
        firstValue &&
        !firstValue.toLowerCase().includes('registre') &&
        !firstValue.toLowerCase().includes('total') &&
        firstValue.length > 0
      ) {
        const row: Record<string, string> & { _investorType: string } = {
          _investorType: currentSection,
        };

        headers.forEach((header, index) => {
          row[header] = values[index] ? values[index].trim() : '';
        });

        result.push(row);
      }
    }
  }

  console.log(`✅ Total lignes parsées: ${result.length}`);
  console.log(
    `   - Personnes physiques: ${result.filter(r => r._investorType === 'physique').length}`
  );
  console.log(`   - Personnes morales: ${result.filter(r => r._investorType === 'morale').length}`);

  return result;
}

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Use POST', { status: 405, headers: corsHeaders });
    }

    const ctype = req.headers.get('content-type') ?? '';
    if (!ctype.includes('multipart/form-data')) {
      return new Response('Send multipart/form-data with fields: projet_id, tranche_name, file', {
        status: 400,
        headers: corsHeaders,
      });
    }

    const form = await req.formData();
    const projetId = String(form.get('projet_id') ?? '');
    const trancheName = String(form.get('tranche_name') ?? '');
    const file = form.get('file') as File | null;

    // Get optional tranche metadata from form
    const tauxNominalStr = form.get('taux_nominal');
    const tauxNominal = tauxNominalStr ? parseFloat(String(tauxNominalStr)) : null;
    const periodiciteCoupons = form.get('periodicite_coupons')
      ? String(form.get('periodicite_coupons'))
      : null;
    const dateEmissionForm = form.get('date_emission') ? String(form.get('date_emission')) : null;
    const dateEcheanceFinale = form.get('date_echeance_finale')
      ? String(form.get('date_echeance_finale'))
      : null;
    const dureeMoisStr = form.get('duree_mois');
    const dureeMois = dureeMoisStr ? parseInt(String(dureeMoisStr)) : null;

    if (!projetId || !trancheName || !file) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing projet_id, tranche_name or file',
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('=== DÉBUT TRAITEMENT ===');
    console.log('Projet ID:', projetId);
    console.log('Nom tranche:', trancheName);
    console.log('Fichier:', file.name);
    console.log('📊 Paramètres pour écheancier:');
    console.log('  - Taux nominal:', tauxNominal);
    console.log('  - Périodicité:', periodiciteCoupons);
    console.log('  - Date émission (form):', dateEmissionForm);
    console.log('  - Durée (mois):', dureeMois);

    // Supabase client (service role)
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Fetch project to get all required parameters
    const { data: projectData, error: projectError } = await supabase
      .from('projets')
      .select('base_interet, taux_nominal, periodicite_coupons, duree_mois, date_emission')
      .eq('id', projetId)
      .single();

    if (projectError) {
      console.error('Erreur récupération projet:', projectError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erreur récupération projet: ${projectError.message}`,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const baseInteret = projectData?.base_interet || 360;
    console.log('Base de calcul:', baseInteret);

    // Use project values as fallback for tranche parameters
    const finalTauxNominal = tauxNominal ?? projectData?.taux_nominal ?? null;
    const finalPeriodiciteCoupons = periodiciteCoupons ?? projectData?.periodicite_coupons ?? null;
    const finalDureeMois = dureeMois ?? projectData?.duree_mois ?? null;
    const finalDateEmission = dateEmissionForm ?? projectData?.date_emission ?? null;

    console.log('📊 Paramètres finaux (form + projet):');
    console.log('  - Taux nominal:', finalTauxNominal);
    console.log('  - Périodicité:', finalPeriodiciteCoupons);
    console.log('  - Durée (mois):', finalDureeMois);
    console.log('  - Date émission:', finalDateEmission);

    // 1) CREATE TRANCHE FIRST
    console.log('Création de la tranche...');
    console.log('Données tranche:', {
      projet_id: projetId,
      tranche_name: trancheName,
      taux_nominal: finalTauxNominal,
      periodicite_coupons: finalPeriodiciteCoupons,
      duree_mois: finalDureeMois,
      date_emission: finalDateEmission,
      date_echeance_finale: dateEcheanceFinale,
    });
    const { data: trancheData, error: trancheError } = await supabase
      .from('tranches')
      .insert({
        projet_id: projetId,
        tranche_name: trancheName,
        taux_nominal: finalTauxNominal,
        periodicite_coupons: finalPeriodiciteCoupons,
        duree_mois: finalDureeMois,
        date_emission: finalDateEmission,
        date_echeance_finale: dateEcheanceFinale,
      })
      .select()
      .single();

    if (trancheError) {
      console.error('Erreur création tranche:', trancheError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erreur création tranche: ${trancheError.message}`,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!trancheData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Tranche non créée (données manquantes)',
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const trancheId = trancheData.id;
    console.log('Tranche créée avec succès, ID:', trancheId);

    // Read file with proper encoding handling
    console.log('=== ANALYSE DU FICHIER ===');
    console.log('Nom:', file.name);
    console.log('Type:', file.type);
    console.log('Taille:', file.size, 'bytes');

    // Read file as ArrayBuffer and decode with proper encoding
    const buffer = await file.arrayBuffer();

    // Try UTF-8 first, then fallback to Windows-1252 if encoding issues detected
    let text = new TextDecoder('utf-8').decode(buffer);

    // Detect encoding issues
    if (text.includes('�') || text.includes('Ã©') || text.includes('Ã')) {
      console.warn("⚠️ PROBLÈME D'ENCODAGE UTF-8 DÉTECTÉ! Tentative avec Windows-1252...");
      text = new TextDecoder('windows-1252').decode(buffer);
      console.log('✅ Fichier décodé avec Windows-1252');
    } else {
      console.log('✅ Fichier décodé avec UTF-8');
    }

    console.log('Taille:', text.length, 'caractères');
    console.log('Premières 500 caractères:');
    console.log(text.substring(0, 500));
    console.log('---');

    // Count lines
    const lineCount = text.split(/\r?\n/).length;
    console.log('Nombre de lignes:', lineCount);

    // Parse CSV
    const rows = parseCSV(text);

    console.log(`✅ Parsed ${rows.length} rows from CSV`);

    if (rows.length > 0) {
      const firstRow = rows[0];
      console.log(
        '📋 Colonnes CSV détectées:',
        Object.keys(firstRow).filter(k => k !== '_investorType')
      );
      console.log(
        'Première ligne (physique):',
        rows.find(r => r._investorType === 'physique')
      );
      console.log(
        'Première ligne (morale):',
        rows.find(r => r._investorType === 'morale')
      );
    } else {
      console.error('❌ AUCUNE LIGNE DÉTECTÉE!');

      await supabase.from('tranches').delete().eq('id', trancheId);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Aucune donnée trouvée dans le fichier. Vérifiez le format.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        }
      );
    }

    // Find earliest Date de Transfert from CSV to set as tranche date_emission
    let earliestDateTransfert: string | null = null;
    for (const r of rows) {
      const dateTransfert = parseDate(r['Date de Transfert']);
      if (dateTransfert) {
        if (!earliestDateTransfert || dateTransfert < earliestDateTransfert) {
          earliestDateTransfert = dateTransfert;
        }
      }
    }

    // Update tranche with the earliest date_emission from CSV if found and not provided by form
    if (earliestDateTransfert && !dateEmissionForm) {
      console.log('Mise à jour date_emission de la tranche:', earliestDateTransfert);
      const { error: updateError } = await supabase
        .from('tranches')
        .update({ date_emission: earliestDateTransfert })
        .eq('id', trancheId);

      if (updateError) {
        console.error('❌ ERREUR mise à jour date_emission:', updateError);
      } else {
        console.log('✅ date_emission mise à jour avec succès');
      }
    }

    const trancheEmissionDate = earliestDateTransfert || finalDateEmission || null;
    console.log("Date d'émission finale de la tranche:", trancheEmissionDate);

    let total = 0;
    let createdInvestisseurs = 0;
    let updatedInvestisseurs = 0;
    let createdSouscriptions = 0;
    const errors: Array<{ line: number; error: string }> = [];

    for (const r of rows) {
      total++;
      try {
        console.log(`\n=== TRAITEMENT LIGNE ${total} ===`);
        console.log('Type:', r._investorType);

        const investorType = r._investorType;
        let investisseurId: string | null = null;
        let investorName = '';

        if (investorType === 'physique') {
          // Physical person - handle encoding issues with column names
          const prenom = cleanString(getColumn(r, 'Prénom(s)', 'Pr�nom(s)', 'Prenom(s)')) || '';
          const nom = cleanString(getColumn(r, 'Nom(s)')) || '';
          const nomUsage = cleanString(getColumn(r, "Nom d'usage")) || '';

          console.log('📝 Extraction nom:', { prenom, nom, nomUsage });

          // Include all three fields: prénom + nom d'usage + nom
          investorName = [prenom, nomUsage, nom].filter(Boolean).join(' ').trim();

          console.log('Nom complet:', investorName);

          // Skip if no name at all
          if (!investorName) {
            console.warn("⚠️ Ligne ignorée - Pas de nom d'investisseur");
            continue;
          }

          const email = cleanString(r['Email'])?.toLowerCase() || null;
          console.log('Email:', email);

          const dateNaissance = parseDate(r['Né(e) le']);

          // Extract CGP information
          const cgpNom = cleanString(r['CGP']) || null;
          const cgpEmail = cleanString(r['Email du CGP'])?.toLowerCase() || null;

          // Try to find existing investor by email
          let existing = null;
          if (email) {
            const { data, error: qErr } = await supabase
              .from('investisseurs')
              .select('id')
              .eq('email', email)
              .eq('type', 'physique')
              .maybeSingle();
            if (qErr) {
              console.error('Erreur recherche investisseur:', qErr);
              throw qErr;
            }
            existing = data;
            console.log(
              'Investisseur existant trouvé par email:',
              existing ? 'OUI (ID: ' + existing.id + ')' : 'NON'
            );
          }

          // If no email match, try by name and birthdate
          if (!existing && investorName && dateNaissance) {
            const { data, error: qErr } = await supabase
              .from('investisseurs')
              .select('id')
              .eq('nom_raison_sociale', investorName)
              .eq('date_naissance', dateNaissance)
              .eq('type', 'physique')
              .maybeSingle();
            if (qErr) {
              console.error('Erreur recherche par nom+date:', qErr);
            } else if (data) {
              existing = data;
              console.log(
                'Investisseur existant trouvé par nom+date:',
                'OUI (ID: ' + existing.id + ')'
              );
            }
          }

          const invPayload: any = {
            type: 'physique',
            nom_raison_sociale: investorName || 'Investisseur',
            email: email,
            telephone: cleanPhone(r['Téléphone']),
            adresse: cleanString(r['Adresse du domicile']),
            residence_fiscale: cleanString(r['Résidence Fiscale 1']),
            departement_naissance: cleanString(r['Département de naissance']),
            date_naissance: dateNaissance,
            lieu_naissance: cleanString(r['Lieu de naissance']),
            ppe: toBool(r['PPE']),
            categorie_mifid: cleanString(r['Catégorisation']),
            cgp: cgpNom,
            email_cgp: cgpEmail,
          };

          console.log('Payload investisseur physique');

          if (!existing) {
            console.log('Création nouvel investisseur...');
            const { data: ins, error: insErr } = await supabase
              .from('investisseurs')
              .insert([invPayload])
              .select('id')
              .single();
            if (insErr) {
              console.error('Erreur création investisseur:', insErr);
              throw insErr;
            }
            if (!ins || !ins.id) {
              throw new Error("Pas d'ID investisseur retourné");
            }
            investisseurId = ins.id;
            console.log('✅ Investisseur créé avec ID:', investisseurId);
            createdInvestisseurs++;
          } else {
            investisseurId = existing.id;
            console.log('Mise à jour investisseur existant ID:', investisseurId);
            const { error: updErr } = await supabase
              .from('investisseurs')
              .update(invPayload)
              .eq('id', investisseurId);
            if (updErr) {
              console.error('Erreur update investisseur:', updErr);
              throw updErr;
            }
            console.log('✅ Investisseur mis à jour');
            updatedInvestisseurs++;
          }
        } else {
          // Moral person (company)
          const raisonSociale = cleanString(r['Raison sociale']) || '';
          investorName = raisonSociale;
          console.log('Raison sociale:', raisonSociale);

          // Skip if no company name
          if (!investorName) {
            console.warn('⚠️ Ligne ignorée - Pas de raison sociale');
            continue;
          }

          const sirenStr = cleanString(r['N° SIREN']);
          const siren = sirenStr ? parseInt(sirenStr.replace(/\D/g, '')) : null;
          console.log('SIREN:', siren);

          const emailRepLegal =
            cleanString(r['Email du représentant légal'])?.toLowerCase() || null;
          console.log('Email rep legal:', emailRepLegal);

          // Extract CGP information
          const cgpNomMorale = cleanString(r['CGP']) || null;
          const cgpEmailMorale = cleanString(r['Email du CGP'])?.toLowerCase() || null;

          // Try to find by SIREN or email
          let existing = null;
          if (siren) {
            const { data, error: qErr } = await supabase
              .from('investisseurs')
              .select('id')
              .eq('siren', siren)
              .eq('type', 'morale')
              .maybeSingle();
            if (qErr) {
              console.error('Erreur recherche par SIREN:', qErr);
              throw qErr;
            }
            existing = data;
            console.log(
              'Société existante trouvée par SIREN:',
              existing ? 'OUI (ID: ' + existing.id + ')' : 'NON'
            );
          }

          // Try by email if no SIREN match
          if (!existing && emailRepLegal) {
            const { data, error: qErr } = await supabase
              .from('investisseurs')
              .select('id')
              .eq('email', emailRepLegal)
              .eq('type', 'morale')
              .maybeSingle();
            if (qErr) {
              console.error('Erreur recherche par email:', qErr);
            } else if (data) {
              existing = data;
              console.log('Société existante trouvée par email:', 'OUI (ID: ' + existing.id + ')');
            }
          }

          const prenomRep =
            cleanString(
              getColumn(r, 'Prénom du représentant légal', 'Pr�nom du repr�sentant l�gal')
            ) || '';
          const nomRep =
            cleanString(getColumn(r, 'Nom du représentant légal', 'Nom du repr�sentant l�gal')) ||
            '';
          const representantLegal = [prenomRep, nomRep].filter(Boolean).join(' ').trim() || null;

          const invPayload: any = {
            type: 'morale',
            nom_raison_sociale: investorName,
            siren: siren,
            representant_legal: representantLegal,
            email: emailRepLegal,
            telephone: cleanPhone(r['Téléphone']),
            adresse: cleanString(r['Adresse du siège social']),
            residence_fiscale: cleanString(r['Résidence Fiscale 1 du représentant légal']),
            departement_naissance: cleanString(r['Département de naissance du représentant']),
            ppe: toBool(r['PPE']),
            categorie_mifid: cleanString(r['Catégorisation']),
            cgp: cgpNomMorale,
            email_cgp: cgpEmailMorale,
          };

          console.log('Payload société');

          if (!existing) {
            console.log('Création nouvelle société...');
            const { data: ins, error: insErr } = await supabase
              .from('investisseurs')
              .insert([invPayload])
              .select('id')
              .single();
            if (insErr) {
              console.error('Erreur création société:', insErr);
              throw insErr;
            }
            if (!ins || !ins.id) {
              throw new Error("Pas d'ID société retourné");
            }
            investisseurId = ins.id;
            console.log('✅ Société créée avec ID:', investisseurId);
            createdInvestisseurs++;
          } else {
            investisseurId = existing.id;
            console.log('Mise à jour société existante ID:', investisseurId);
            const { error: updErr } = await supabase
              .from('investisseurs')
              .update(invPayload)
              .eq('id', investisseurId);
            if (updErr) {
              console.error('Erreur update société:', updErr);
              throw updErr;
            }
            console.log('✅ Société mise à jour');
            updatedInvestisseurs++;
          }
        }

        // Verify we have an investor ID before creating subscription
        if (!investisseurId) {
          console.error("❌ PAS D'ID INVESTISSEUR!");
          throw new Error('investisseurId est null');
        }

        // Create subscription - handle encoding issues with column names
        const quantite = toNumber(getColumn(r, 'Quantité', 'Quantit�', 'Quantite'));
        const montant = toNumber(getColumn(r, 'Montant'));

        console.log('📊 Valeurs CSV:', {
          'Quantité (brut)': getColumn(r, 'Quantité', 'Quantit�', 'Quantite'),
          'Montant (brut)': r['Montant'],
          'quantite (parsé)': quantite,
          'montant (parsé)': montant,
        });

        // Skip if no quantity or amount (empty row)
        if (!quantite || !montant || quantite <= 0 || montant <= 0) {
          console.warn('⚠️ Ligne ignorée - Quantité ou Montant invalide:', { quantite, montant });
          continue;
        }

        // Use only Date de Transfert for subscription date
        const dateTransfert = parseDate(r['Date de Transfert']);
        const dateSouscription = dateTransfert || trancheEmissionDate || null;

        console.log('Date souscription:', dateSouscription);

        // Extract CGP info for subscription - handle encoding issues
        const cgp = cleanString(getColumn(r, 'CGP'));
        const emailCgp = cleanString(getColumn(r, 'Email du CGP'));
        const codeCgp = cleanString(getColumn(r, 'Code du CGP'));
        const sirenCgpStr = cleanString(getColumn(r, 'Siren du CGP'));
        const sirenCgp = sirenCgpStr ? parseInt(sirenCgpStr.replace(/\D/g, '')) : null;

        console.log('📋 CGP Info:', { cgp, emailCgp, codeCgp, sirenCgp });

        // Calculate coupon amounts with period adjustment (use final values from project)
        const couponAnnuel = finalTauxNominal ? (montant * finalTauxNominal) / 100 : 0;
        const periodRatio = getPeriodRatio(finalPeriodiciteCoupons, baseInteret);
        const couponBrut = couponAnnuel * periodRatio;
        // Physique: 30% flat tax -> net = brut * 0.7
        // Morale: no flat tax -> net = brut
        // Case-insensitive comparison to handle both 'physique' and 'Physique'
        const couponNet =
          investorType?.toLowerCase() === 'physique' ? couponBrut * 0.7 : couponBrut;

        console.log('Création souscription - Quantité:', quantite, 'Montant:', montant);
        console.log('Calcul coupons:');
        console.log('  - Coupon annuel:', couponAnnuel);
        console.log('  - Périodicité:', finalPeriodiciteCoupons, 'Ratio:', periodRatio);
        console.log('  - Base:', baseInteret);
        console.log('  - Coupon par période (brut):', couponBrut);
        console.log('  - Type investisseur:', investorType);
        console.log('  - Coupon net:', couponNet);

        const { error: subErr } = await supabase.from('souscriptions').insert([
          {
            projet_id: projetId,
            tranche_id: trancheId,
            investisseur_id: investisseurId,
            date_souscription: dateSouscription,
            nombre_obligations: quantite,
            montant_investi: montant,
            coupon_brut: couponBrut,
            coupon_net: couponNet,
            date_validation_bs: parseDate(r['Date de Validation BS']),
            date_transfert: dateTransfert,
            pea: r['PEA / PEA-PME'] ? true : null,
            pea_compte: cleanString(r['Numéro de Compte PEA / PEA-PME']),
            cgp,
            email_cgp: emailCgp,
            code_cgp: codeCgp,
            siren_cgp: sirenCgp,
          },
        ]);

        if (subErr) {
          console.error('Erreur création souscription:', subErr);
          throw subErr;
        }
        console.log('✅ Souscription créée');
        createdSouscriptions++;
      } catch (e: any) {
        console.error(`❌ Erreur ligne ${total}:`, e);
        errors.push({ line: total, error: e?.message ?? String(e) });
      }
    }

    console.log('=== RÉSUMÉ IMPORT ===');
    console.log('Total lignes:', total);
    console.log('Investisseurs créés:', createdInvestisseurs);
    console.log('Investisseurs mis à jour:', updatedInvestisseurs);
    console.log('Souscriptions créées:', createdSouscriptions);
    console.log('Erreurs:', errors.length);

    // ROLLBACK: Delete tranche if no subscriptions created
    if (createdSouscriptions === 0) {
      console.warn('⚠️ Aucune souscription créée, suppression de la tranche');
      await supabase.from('tranches').delete().eq('id', trancheId);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Aucune souscription n'a pu être créée. Vérifiez le format du CSV.",
          total,
          errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
        }
      );
    }

    // Generate payment schedule (écheancier) using the dedicated function
    console.log('\n=== CALLING REGENERATE-ECHEANCIER ===');
    try {
      const regenerateUrl = `${SUPABASE_URL}/functions/v1/regenerate-echeancier`;
      console.log('Calling:', regenerateUrl);

      const regenerateResponse = await fetch(regenerateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ tranche_id: trancheId }),
      });

      const regenerateResult = await regenerateResponse.json();

      if (regenerateResult.success) {
        console.log('✅ Écheancier généré avec succès!');
        console.log(`   Souscriptions mises à jour: ${regenerateResult.updated_souscriptions}`);
        console.log(`   Coupons créés: ${regenerateResult.created_coupons}`);
        console.log(`   Date d'échéance finale: ${regenerateResult.final_maturity_date}`);
      } else {
        console.warn('⚠️ Écheancier non généré:', regenerateResult.error);
        if (regenerateResult.missing_params) {
          console.warn('   Paramètres manquants:', regenerateResult.missing_params.join(', '));
          console.warn(
            '   💡 Vous pouvez modifier la tranche plus tard pour ajouter ces informations.'
          );
        }
      }
    } catch (echeancierError: any) {
      console.error("❌ ERREUR LORS DE LA GÉNÉRATION DE L'ÉCHEANCIER:", echeancierError);
      console.error('   Message:', echeancierError?.message);
      // Don't fail the entire import if écheancier generation fails
      console.warn("⚠️ L'import a réussi mais l'écheancier n'a pas pu être généré.");
      console.warn('   Vous pouvez le générer manuellement plus tard.');
    }

    console.log('\n=== 🎉 IMPORT TERMINÉ AVEC SUCCÈS ===');
    console.log(`Tranche ID: ${trancheId}`);
    console.log(`Nom: ${trancheName}`);
    console.log(`Investisseurs: ${createdInvestisseurs} créés, ${updatedInvestisseurs} mis à jour`);
    console.log(`Souscriptions: ${createdSouscriptions} créées`);
    console.log(`Erreurs: ${errors.length}`);
    console.log('=====================================\n');

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
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Global error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message ?? String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      }
    );
  }
});
