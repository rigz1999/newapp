// profile-parser.ts
// Gestionnaire de profils de format pour l'import de registre des titres

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Structure d'un profil de format
 */
export interface FormatProfile {
  id: string;
  profile_name: string;
  is_standard: boolean;
  format_config: {
    file_type: 'excel' | 'csv';
    accepted_extensions: string[];
    structure: {
      type: 'two_sections' | 'single_list' | 'multi_sheet';
      section_markers?: {
        physical: string;
        moral: string;
      };
      type_column?: string;
      encoding?: string;
      fallback_encoding?: string;
    };
    column_mappings: {
      physical: Record<string, string>;
      moral: Record<string, string>;
    };
    data_transformations: {
      date_format: string;
      date_format_alternative?: string;
      decimal_separator: string;
      phone_format: string;
      skip_rows_with?: string[];
    };
    validation_rules: {
      required_fields_physical: string[];
      required_fields_moral: string[];
      email_validation: boolean;
      siren_length: number;
      phone_validation: boolean;
    };
  };
}

/**
 * Récupère le profil de format approprié pour une société
 *
 * @param supabase - Client Supabase
 * @param projetId - ID du projet (pour récupérer l'org_id)
 * @returns Profil de format (standard ou personnalisé)
 */
export async function getFormatProfile(
  supabase: SupabaseClient,
  projetId: string
): Promise<FormatProfile> {
  console.log('🔍 Recherche du profil de format...');

  // 1. Récupérer l'org_id du projet
  const { data: projectData, error: projectError } = await supabase
    .from('projets')
    .select('org_id')
    .eq('id', projetId)
    .single();

  if (projectError) {
    console.error('❌ Erreur récupération projet:', projectError);
    throw new Error(`Impossible de récupérer le projet: ${projectError.message}`);
  }

  const orgId = projectData.org_id;
  console.log('📂 Organization ID:', orgId);

  // 2. Chercher un profil personnalisé pour cette société
  if (orgId) {
    const { data: customProfile, error: customError } = await supabase
      .from('company_format_profiles')
      .select('*')
      .eq('company_id', orgId)
      .eq('is_active', true)
      .single();

    if (!customError && customProfile) {
      console.log('✅ Profil personnalisé trouvé:', customProfile.profile_name);
      return customProfile as FormatProfile;
    }

    if (customError && customError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (attendu si pas de profil custom)
      console.warn('⚠️ Erreur lors de la recherche du profil personnalisé:', customError);
    } else {
      console.log('ℹ️ Aucun profil personnalisé pour cette société');
    }
  }

  // 3. Utiliser le profil standard par défaut
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

/**
 * Applique les mappings de colonnes selon le profil
 *
 * @param rawRow - Ligne brute du CSV avec les noms de colonnes de la société
 * @param mappings - Mappings de colonnes du profil
 * @returns Ligne avec les noms de colonnes standard
 */
export function applyColumnMappings(
  rawRow: Record<string, string>,
  mappings: Record<string, string>
): Record<string, string> {
  const mappedRow: Record<string, string> = {};

  // Pour chaque mapping dans le profil
  Object.entries(mappings).forEach(([companyColumn, standardColumn]) => {
    // Chercher la valeur dans la ligne brute (insensible à la casse)
    const rawValue = Object.entries(rawRow).find(
      ([key]) => key.toLowerCase().trim() === companyColumn.toLowerCase().trim()
    )?.[1];

    if (rawValue !== undefined) {
      mappedRow[standardColumn] = rawValue;
    }
  });

  return mappedRow;
}

/**
 * Parse le CSV en utilisant le profil de format
 *
 * @param text - Contenu du CSV
 * @param profile - Profil de format à appliquer
 * @returns Lignes parsées avec le format standard
 */
export function parseCSVWithProfile(
  text: string,
  profile: FormatProfile
): Array<Record<string, string> & { _investorType: string }> {
  console.log('📝 Parsing CSV avec profil:', profile.profile_name);

  const lines = text.split(/\r?\n/);
  const result: Array<Record<string, string> & { _investorType: string }> = [];
  const config = profile.format_config;

  // Détecter le séparateur automatiquement
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

  // Gestion selon le type de structure
  if (config.structure.type === 'two_sections') {
    return parseTwoSectionsFormat(lines, separator, profile);
  } else if (config.structure.type === 'single_list') {
    return parseSingleListFormat(lines, separator, profile);
  } else {
    throw new Error(`Type de structure non supporté: ${config.structure.type}`);
  }
}

/**
 * Parse format avec deux sections (Personnes Physiques / Personnes Morales)
 */
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

    // Détecter les marqueurs de section
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

    // Ignorer les lignes à sauter (TOTAL, etc.)
    if (skipRows.some(skip => trimmed.toLowerCase().includes(skip.toLowerCase()))) {
      inDataSection = false;
      continue;
    }

    // Détecter la ligne d'en-têtes (contient "Quantit")
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

    // Parser les lignes de données
    if (inDataSection && headers.length > 0 && currentSection) {
      const values = line.split(separator);
      const firstValue = values[0] ? values[0].trim() : '';

      // Vérifier si c'est une ligne de données valide
      if (
        firstValue &&
        !skipRows.some(skip => firstValue.toLowerCase().includes(skip.toLowerCase())) &&
        firstValue.length > 0
      ) {
        // Créer l'objet ligne brute
        const rawRow: Record<string, string> = {};
        headers.forEach((header, index) => {
          rawRow[header] = values[index] ? values[index].trim() : '';
        });

        // Appliquer les mappings de colonnes
        const mappings =
          currentSection === 'physique'
            ? config.column_mappings.physical
            : config.column_mappings.moral;

        const mappedRow = applyColumnMappings(rawRow, mappings);

        // Ajouter le type d'investisseur
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

/**
 * Parse format avec une seule liste (colonne "Type" pour distinguer physique/morale)
 */
function parseSingleListFormat(
  lines: string[],
  separator: string,
  profile: FormatProfile
): Array<Record<string, string> & { _investorType: string }> {
  const result: Array<Record<string, string> & { _investorType: string }> = [];
  const config = profile.format_config;
  const typeColumn = config.structure.type_column || 'Type';
  const skipRows = config.data_transformations.skip_rows_with || [];

  let headers: string[] = [];
  let inDataSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Ignorer les lignes à sauter
    if (skipRows.some(skip => trimmed.toLowerCase().includes(skip.toLowerCase()))) {
      continue;
    }

    // Détecter la ligne d'en-têtes
    if (
      trimmed.toLowerCase().includes('quantit') &&
      trimmed.toLowerCase().includes(typeColumn.toLowerCase())
    ) {
      headers = trimmed.split(separator).map(h => h.trim());
      inDataSection = true;
      console.log(`En-têtes (${headers.length} colonnes)`);
      continue;
    }

    // Parser les lignes de données
    if (inDataSection && headers.length > 0) {
      const values = line.split(separator);
      const firstValue = values[0] ? values[0].trim() : '';

      if (
        firstValue &&
        !skipRows.some(skip => firstValue.toLowerCase().includes(skip.toLowerCase()))
      ) {
        // Créer l'objet ligne brute
        const rawRow: Record<string, string> = {};
        headers.forEach((header, index) => {
          rawRow[header] = values[index] ? values[index].trim() : '';
        });

        // Déterminer le type d'investisseur
        const typeValue = rawRow[typeColumn]?.toLowerCase() || '';
        const investorType: 'physique' | 'morale' =
          typeValue.includes('morale') || typeValue.includes('entreprise') ? 'morale' : 'physique';

        // Appliquer les mappings appropriés
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
  return result;
}

/**
 * Valide les données selon les règles du profil
 *
 * @param rows - Lignes de données à valider
 * @param profile - Profil contenant les règles de validation
 * @returns Liste des erreurs de validation
 */
export function validateData(
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

    // Vérifier les champs obligatoires
    requiredFields.forEach(field => {
      const value = row[field];
      if (!value || value.trim() === '') {
        errors.push({
          row: rowNumber,
          field,
          error: `Champ obligatoire manquant: ${field}`,
        });
      }
    });

    // Validation e-mail
    if (rules.email_validation) {
      const emailField = isPhysical ? 'E-mail' : 'E-mail du représentant légal';
      const email = row[emailField];
      if (email && !email.includes('@')) {
        errors.push({
          row: rowNumber,
          field: emailField,
          error: 'E-mail invalide (doit contenir @)',
          value: email,
        });
      }
    }

    // Validation SIREN (pour morales uniquement)
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

    // Validation téléphone (basique)
    if (rules.phone_validation) {
      const phone = row['Téléphone'];
      if (phone && !/^[0-9+\s()-]+$/.test(phone)) {
        errors.push({
          row: rowNumber,
          field: 'Téléphone',
          error: 'Format de téléphone invalide',
          value: phone,
        });
      }
    }
  });

  return errors;
}
