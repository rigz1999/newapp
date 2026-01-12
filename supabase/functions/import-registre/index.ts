import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

interface FormatProfile {
  id: string;
  profile_name: string;
  org_id: string;
  is_standard: boolean;
  format_config: {
    structure: {
      type: 'two_sections' | 'single_list';
      section_markers?: {
        physical: string;
        moral: string;
      };
      type_column?: string;
      type_values?: {
        physical: string;
        moral: string;
      };
    };
    column_mappings: {
      physical: Record<string, string>;
      moral: Record<string, string>;
    };
    data_transformations: {
      skip_rows_with: string[];
      date_formats: string[];
    };
    validation_rules: {
      required_fields_physical: string[];
      required_fields_moral: string[];
      email_validation: boolean;
      phone_validation: boolean;
      siren_length: number;
    };
  };
}

async function getFormatProfile(
  supabase: SupabaseClient,
  orgId: string,
  profileId?: string
): Promise<FormatProfile> {
  if (profileId) {
    const { data: specificProfile, error: specificError } = await supabase
      .from('company_format_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('org_id', orgId)
      .single();

    if (specificError) {
      console.error('❌ Erreur récupération profil spécifique:', specificError);
      throw new Error('Profil spécifié introuvable ou accès refusé');
    }

    console.log('✅ Utilisation du profil:', specificProfile.profile_name);
    return specificProfile as FormatProfile;
  }

  const { data: orgProfile, error: orgError } = await supabase
    .from('company_format_profiles')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_standard', false)
    .single();

  if (orgProfile && !orgError) {
    console.log('✅ Utilisation du profil organisation:', orgProfile.profile_name);
    return orgProfile as FormatProfile;
  }

  const { data: standardProfile, error: standardError } = await supabase
    .from('company_format_profiles')
    .select('*')
    .eq('is_standard', true)
    .single();

  if (standardError || !standardProfile) {
    console.error('❌ Erreur récupération profil standard:', standardError);
    throw new Error('Profil standard introuvable. Veuillez contacter le support.');
  }

  console.log('✅ Utilisation du profil standard');
  return standardProfile as FormatProfile;
}

function applyColumnMappings(
  rawRow: Record<string, string>,
  mappings: Record<string, string>
): Record<string, string> {
  const mappedRow: Record<string, string> = {};

  Object.entries(mappings).forEach(([companyColumn, standardColumn]) => {
    const rawValue = Object.entries(rawRow).find(
      ([key]) => key.toLowerCase().trim() === companyColumn.toLowerCase().trim()
    )?.[1];

    if (rawValue !== undefined) {
      mappedRow[standardColumn] = rawValue;
    }
  });

  return mappedRow;
}

function parseCSVWithProfile(
  text: string,
  profile: FormatProfile
): Array<Record<string, string> & { _investorType: string }> {
  console.log('📝 Parsing CSV avec profil:', profile.profile_name);

  const lines = text.split(/\r?\n/);
  const config = profile.format_config;

  let separator = '\t';
  const sampleLine = lines.find(line => line.length > 10 && line.includes('Quantit'));

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
      '🔍 Séparateur détecté:',
      separator === '\t' ? 'tabulation' : separator === ';' ? 'point-virgule' : 'virgule'
    );
  }

  if (config.structure.type === 'two_sections') {
    return parseTwoSectionsFormat(lines, separator, profile);
  } else if (config.structure.type === 'single_list') {
    return parseSingleListFormat(lines, separator, profile);
  } else {
    throw new Error(`Type de structure non supporté: ${config.structure.type}`);
  }
}

function parseTwoSectionsFormat(
  lines: string[],
  separator: string,
  profile: FormatProfile
): Array<Record<string, string> & { _investorType: string }> {
  const result: Array<Record<string, string> & { _investorType: string }> = [];
  const config = profile.format_config;
  const markers = config.structure.section_markers!;
  const skipRows = config.data_transformations.skip_rows_with || [];

  let headers: string[] = [];
  let currentSection: 'physique' | 'morale' | null = null;
  let inDataSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.toLowerCase().includes(markers.physical.toLowerCase())) {
      console.log('📍 Section: Personnes Physiques');
      currentSection = 'physique';
      inDataSection = false;
      headers = [];
      continue;
    }

    if (trimmed.toLowerCase().includes(markers.moral.toLowerCase())) {
      console.log('📍 Section: Personnes Morales');
      currentSection = 'morale';
      inDataSection = false;
      headers = [];
      continue;
    }

    if (skipRows.some(skip => trimmed.toLowerCase().includes(skip.toLowerCase()))) {
      inDataSection = false;
      continue;
    }

    if (trimmed.toLowerCase().includes('quantit')) {
      headers = trimmed.split(separator).map(h => h.trim());
      inDataSection = true;
      console.log(
        `  En-têtes (${headers.length} colonnes):`,
        headers.slice(0, 3).join(', '),
        '...'
      );
      continue;
    }

    if (inDataSection && headers.length > 0 && currentSection) {
      const values = line.split(separator);
      const firstValue = values[0] ? values[0].trim() : '';

      if (
        firstValue &&
        !skipRows.some(skip => firstValue.toLowerCase().includes(skip.toLowerCase())) &&
        firstValue.length > 0
      ) {
        const rawRow: Record<string, string> = {};
        headers.forEach((header, index) => {
          rawRow[header] = values[index] ? values[index].trim() : '';
        });

        const mappings =
          currentSection === 'physique'
            ? config.column_mappings.physical
            : config.column_mappings.moral;

        const mappedRow = applyColumnMappings(rawRow, mappings);

        const finalRow = {
          ...mappedRow,
          _investorType: currentSection,
        };

        result.push(finalRow);
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

function parseSingleListFormat(
  lines: string[],
  separator: string,
  profile: FormatProfile
): Array<Record<string, string> & { _investorType: string }> {
  const result: Array<Record<string, string> & { _investorType: string }> = [];
  const config = profile.format_config;
  const skipRows = config.data_transformations.skip_rows_with || [];
  const typeColumn = config.structure.type_column!;
  const typeValues = config.structure.type_values!;

  let headers: string[] = [];
  let inDataSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (skipRows.some(skip => trimmed.toLowerCase().includes(skip.toLowerCase()))) {
      continue;
    }

    if (trimmed.toLowerCase().includes('quantit') || trimmed.toLowerCase().includes(typeColumn.toLowerCase())) {
      headers = trimmed.split(separator).map(h => h.trim());
      inDataSection = true;
      console.log(`  En-têtes (${headers.length} colonnes):`, headers.slice(0, 3).join(', '), '...');
      continue;
    }

    if (inDataSection && headers.length > 0) {
      const values = line.split(separator);
      const firstValue = values[0] ? values[0].trim() : '';

      if (firstValue && firstValue.length > 0) {
        const rawRow: Record<string, string> = {};
        headers.forEach((header, index) => {
          rawRow[header] = values[index] ? values[index].trim() : '';
        });

        const typeValue = rawRow[typeColumn]?.toLowerCase() || '';
        let investorType: 'physique' | 'morale';

        if (typeValue.includes(typeValues.physical.toLowerCase())) {
          investorType = 'physique';
        } else if (typeValue.includes(typeValues.moral.toLowerCase())) {
          investorType = 'morale';
        } else {
          console.warn(`Type inconnu: ${typeValue}, ligne ignorée`);
          continue;
        }

        const mappings =
          investorType === 'physique'
            ? config.column_mappings.physical
            : config.column_mappings.moral;

        const mappedRow = applyColumnMappings(rawRow, mappings);

        const finalRow = {
          ...mappedRow,
          _investorType: investorType,
        };

        result.push(finalRow);
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

function validateData(
  rows: Array<Record<string, string> & { _investorType: string }>,
  profile: FormatProfile
): Array<{ row: number; field: string; error: string; value?: string }> {
  const errors: Array<{ row: number; field: string; error: string; value?: string }> = [];
  const rules = profile.format_config.validation_rules;

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const isPhysical = row._investorType === 'physique';
    const requiredFields = isPhysical
      ? rules.required_fields_physical
      : rules.required_fields_moral;

    requiredFields.forEach(field => {
      if (field === 'E-mail' || field === 'E-mail du représentant légal') {
        return;
      }

      const value = row[field];
      if (!value || value.trim() === '') {
        errors.push({
          row: rowNumber,
          field,
          error: `Champ obligatoire manquant: ${field}`,
        });
      }
    });

    if (rules.email_validation) {
      const emailField = isPhysical ? 'E-mail' : 'E-mail du représentant légal';
      const email = row[emailField];
      if (email && email.trim() !== '' && !email.includes('@')) {
        errors.push({
          row: rowNumber,
          field: emailField,
          error: 'E-mail invalide (doit contenir @)',
          value: email,
        });
      }
    }

    if (!isPhysical) {
      const siren = row['N° SIREN'];
      if (siren) {
        const sirenClean = siren.replace(/\s/g, '');
        if (sirenClean.length !== rules.siren_length || !/^\d+$/.test(sirenClean)) {
          errors.push({
            row: rowNumber,
            field: 'N° SIREN',
            error: `SIREN invalide (doit contenir exactement ${rules.siren_length} chiffres)`,
            value: siren,
          });
        }
      }
    }

    if (rules.phone_validation) {
      const phone = row['Téléphone'];
      if (phone && phone.trim() !== '') {
        const cleanedPhone = phone.replace(/['"]/g, '');
        if (!/^[0-9+\s().-]+$/.test(cleanedPhone)) {
          errors.push({
            row: rowNumber,
            field: 'Téléphone',
            error: 'Format de téléphone invalide',
            value: phone,
          });
        }
      }
    }
  });

  return errors;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const parseDate = (value: any): string | null => {
  if (!value) return null;
  const v = String(value).trim();

  const frMatch = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (frMatch) {
    const [_, dd, mm, yyyy] = frMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  const isoMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  return null;
};

const cleanPhone = (s?: string | null): string | null => {
  if (!s) return null;
  return s.replace(/['"\s()-]/g, '').replace(/[^0-9+]/g, '') || null;
};

const toNumber = (s?: string | number | null): number | null => {
  if (s === null || s === undefined || s === '') return null;
  const str = String(s).replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const profileId = formData.get('profile_id') as string | undefined;

    const trancheId = formData.get('tranche_id') as string | null;
    const projetId = formData.get('projet_id') as string | null;
    const trancheName = formData.get('tranche_name') as string | null;
    const tauxNominal = formData.get('taux_nominal') as string | null;
    const dateEmission = formData.get('date_emission') as string | null;
    const dureeMois = formData.get('duree_mois') as string | null;

    console.log('📥 Received:', { projetId, trancheName, trancheId, hasFile: !!file });

    if (!file) {
      throw new Error('Missing file');
    }

    let finalTrancheId: string;
    let orgId: string;

    if (projetId && trancheName && !trancheId) {
      console.log('📝 Mode: Création nouvelle tranche');

      const { data: projet, error: projetErr } = await supabaseClient
        .from('projets')
        .select('org_id, emetteur, projet')
        .eq('id', projetId)
        .single();

      if (projetErr || !projet) {
        throw new Error('Projet introuvable');
      }

      orgId = projet.org_id;

      const trancheData: any = {
        projet_id: projetId,
        tranche_name: trancheName,
        taux_nominal: tauxNominal ? parseFloat(tauxNominal) : null,
        date_emission: dateEmission || null,
        duree_mois: dureeMois ? parseInt(dureeMois) : null,
      };

      const { data: newTranche, error: trancheErr } = await supabaseClient
        .from('tranches')
        .insert(trancheData)
        .select('id')
        .single();

      if (trancheErr || !newTranche) {
        console.error('Erreur création tranche:', trancheErr);
        throw new Error('Erreur lors de la création de la tranche: ' + trancheErr?.message);
      }

      finalTrancheId = newTranche.id;
      console.log('✅ Tranche créée:', finalTrancheId);
    } else if (trancheId && !projetId) {
      console.log('📝 Mode: Import vers tranche existante');

      const { data: tranche, error: trancheErr } = await supabaseClient
        .from('tranches')
        .select('*, projets!inner(org_id, emetteur, projet)')
        .eq('id', trancheId)
        .single();

      if (trancheErr || !tranche) {
        throw new Error('Tranche introuvable');
      }

      finalTrancheId = trancheId;
      orgId = (tranche.projets as any).org_id;
    } else {
      throw new Error('Vous devez fournir soit (projet_id + tranche_name) soit (tranche_id)');
    }

    console.log('📁 Fichier:', file.name, `(${file.size} bytes)`);
    console.log('🏢 Organisation ID:', orgId);

    const fileContent = await file.text();

    const profile = await getFormatProfile(supabaseClient, orgId, profileId);

    const rows = parseCSVWithProfile(fileContent, profile);

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Aucune donnée valide trouvée dans le fichier',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const validationErrors = validateData(rows, profile);

    if (validationErrors.length > 0) {
      console.warn(`⚠️ ${validationErrors.length} erreur(s) de validation`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Erreurs de validation détectées',
          validation_errors: validationErrors,
          total_errors: validationErrors.length,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Validation OK - Insertion en base...');

    let createdInvestisseurs = 0;
    let updatedInvestisseurs = 0;
    let createdSouscriptions = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const isPhysical = row._investorType === 'physique';

        const investorData: any = {
          org_id: orgId,
          type: isPhysical ? 'physique' : 'morale',
          nom: row['Nom'],
          prenom: isPhysical ? row['Prénom'] : null,
          email: row['E-mail'] || row['E-mail du représentant légal'] || null,
          telephone: cleanPhone(row['Téléphone']),
          adresse: row['Adresse'] || null,
          code_postal: row['Code Postal'] || null,
          ville: row['Ville'] || null,
          pays: row['Pays'] || null,
        };

        if (!isPhysical) {
          investorData.representant_legal = row['Représentant légal'] || null;
          investorData.email_representant = row['E-mail du représentant légal'] || null;
          investorData.siren = row['N° SIREN']?.replace(/\s/g, '') || null;
        }

        const { data: existingInvestor } = await supabaseClient
          .from('investisseurs')
          .select('id')
          .eq('org_id', orgId)
          .eq('type', investorData.type)
          .eq('nom', investorData.nom)
          .maybeSingle();

        let investorId: string;

        if (existingInvestor) {
          const { data: updated, error: updateErr } = await supabaseClient
            .from('investisseurs')
            .update(investorData)
            .eq('id', existingInvestor.id)
            .select('id')
            .single();

          if (updateErr) throw updateErr;
          investorId = updated.id;
          updatedInvestisseurs++;
        } else {
          const { data: created, error: insertErr } = await supabaseClient
            .from('investisseurs')
            .insert(investorData)
            .select('id')
            .single();

          if (insertErr) throw insertErr;
          investorId = created.id;
          createdInvestisseurs++;
        }

        const datesouscription = parseDate(row['Date de souscription']);
        const montantInvesti = toNumber(row['Montant investi']);
        const nombreObligations = toNumber(row['Quantité de titres']);

        const subData: any = {
          tranche_id: finalTrancheId,
          investisseur_id: investorId,
          date_souscription: datesouscription || new Date().toISOString().split('T')[0],
          montant_investi: montantInvesti || 0,
          nombre_obligations: nombreObligations || 0,
          statut: 'active',
        };

        const { error: subErr } = await supabaseClient.from('souscriptions').upsert(subData, {
          onConflict: 'tranche_id,investisseur_id',
        });

        if (subErr) {
          console.error('Erreur souscription:', subErr);
          errors.push(`Erreur souscription pour ${investorData.nom}: ${subErr.message}`);
        } else {
          createdSouscriptions++;
        }
      } catch (rowErr: any) {
        console.error('Erreur traitement ligne:', rowErr);
        errors.push(`Erreur: ${rowErr.message}`);
      }
    }

    console.log('✅ Import terminé:');
    console.log(`   - ${createdInvestisseurs} investisseurs créés`);
    console.log(`   - ${updatedInvestisseurs} investisseurs mis à jour`);
    console.log(`   - ${createdSouscriptions} souscriptions créées`);

    return new Response(
      JSON.stringify({
        success: true,
        createdInvestisseurs,
        updatedInvestisseurs,
        createdSouscriptions,
        total_rows: rows.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('❌ Error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Internal server error',
      }),
      {
        status: err.message?.includes('Unauthorized') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
