import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import * as XLSX from 'npm:xlsx@0.18.5';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

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

interface ParsedRow extends Record<string, string> {
  _investorType: 'physique' | 'morale';
}

interface ValidationError {
  row: number;
  field: string;
  error: string;
  value?: string;
}

interface ImportResult {
  success: boolean;
  createdInvestisseurs?: number;
  updatedInvestisseurs?: number;
  createdSouscriptions?: number;
  total_rows?: number;
  errors?: string[];
  error?: string;
  validation_errors?: ValidationError[];
  total_errors?: number;
}

type FileType = 'csv' | 'xlsx' | 'xls';

// =============================================================================
// CONSTANTS
// =============================================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 10000; // Safety limit

const SUPPORTED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/csv',
  'text/plain',
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Detect file type from extension or MIME type
 */
const detectFileType = (file: File): FileType => {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.xlsx')) {
    return 'xlsx';
  } else if (fileName.endsWith('.xls')) {
    return 'xls';
  } else if (fileName.endsWith('.csv')) {
    return 'csv';
  }

  // Fallback to MIME type
  const mimeType = file.type.toLowerCase();
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return 'xlsx';
  }

  return 'csv'; // Default
};

/**
 * Normalize string for comparison (remove accents, normalize whitespace)
 */
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/\s+/g, ' '); // Normalize whitespace
};

/**
 * Calculate similarity between two strings (0 to 1, where 1 is identical)
 * Uses Levenshtein distance for fuzzy matching
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);

  // If strings are identical after normalization, return 1
  if (s1 === s2) return 1;

  // Remove common corruption characters for better matching
  const cleanStr1 = s1.replace(/[�\uFFFD]/g, '');
  const cleanStr2 = s2.replace(/[�\uFFFD]/g, '');

  if (cleanStr1 === cleanStr2) return 0.95;

  // Check if one string starts with the other (common for truncated/corrupted headers)
  const minLength = Math.min(cleanStr1.length, cleanStr2.length);
  if (minLength >= 4) {
    const prefix1 = cleanStr1.substring(0, minLength);
    const prefix2 = cleanStr2.substring(0, minLength);
    if (prefix1 === prefix2) {
      return 0.85;
    }
  }

  // Levenshtein distance calculation
  const matrix: number[][] = [];
  const len1 = cleanStr1.length;
  const len2 = cleanStr2.length;

  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = cleanStr1[i - 1] === cleanStr2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLength = Math.max(len1, len2);
  return 1 - distance / maxLength;
};

/**
 * Find the best matching key in rawRow for a given target column
 * Returns the key and its similarity score
 */
const findBestMatch = (
  targetColumn: string,
  rawRowKeys: string[],
  threshold: number = 0.7
): { key: string; similarity: number } | null => {
  let bestMatch: { key: string; similarity: number } | null = null;

  for (const key of rawRowKeys) {
    const similarity = calculateSimilarity(targetColumn, key);

    if (similarity >= threshold) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { key, similarity };
      }
    }
  }

  return bestMatch;
};

/**
 * Parse date from various formats to ISO format
 */
const parseDate = (value: unknown): string | null => {
  if (!value) return null;

  // Handle Excel serial date numbers
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toISOString().split('T')[0];
  }

  const v = String(value).trim();

  // French format: DD/MM/YYYY
  const frMatch = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (frMatch) {
    const [, dd, mm, yyyy] = frMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  // ISO format: YYYY-MM-DD
  const isoMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // US format: MM/DD/YYYY
  const usMatch = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (usMatch) {
    const [, mm, dd, yyyy] = usMatch;
    // Heuristic: if dd > 12, it's likely DD/MM/YYYY not MM/DD/YYYY
    if (parseInt(dd) > 12) {
      return `${yyyy}-${mm}-${dd}`;
    }
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
};

/**
 * Clean phone number by removing formatting characters
 */
const cleanPhone = (s?: string | null): string | null => {
  if (!s) return null;
  const cleaned = String(s)
    .replace(/['"\s()-]/g, '')
    .replace(/[^0-9+]/g, '');
  return cleaned || null;
};

/**
 * Convert string to number, handling commas and spaces
 */
const toNumber = (s?: string | number | null): number | null => {
  if (s === null || s === undefined || s === '') return null;
  if (typeof s === 'number') return s;
  const str = String(s).replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
};

/**
 * Detect CSV separator from sample line
 */
const detectSeparator = (lines: string[]): string => {
  const sampleLines = lines.slice(0, 20).filter(line => line.length > 10);

  const counts = { '\t': 0, ';': 0, ',': 0 };

  for (const line of sampleLines) {
    counts['\t'] += (line.match(/\t/g) || []).length;
    counts[';'] += (line.match(/;/g) || []).length;
    counts[','] += (line.match(/,/g) || []).length;
  }

  const max = Math.max(counts['\t'], counts[';'], counts[',']);
  if (max === 0) return '\t'; // Default

  return (Object.keys(counts).find(k => counts[k as keyof typeof counts] === max) ||
    '\t') as string;
};

// =============================================================================
// XLSX PARSING
// =============================================================================

/**
 * Convert XLSX sheet to array of string arrays
 */
const xlsxSheetToRows = (sheet: XLSX.WorkSheet): string[][] => {
  const rows: string[][] = [];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  for (let R = range.s.r; R <= range.e.r; ++R) {
    const row: string[] = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = sheet[cellAddress];

      let cellValue = '';
      if (cell) {
        if (cell.t === 'd') {
          // Date type
          cellValue = cell.v.toISOString().split('T')[0];
        } else if (cell.w) {
          // Use formatted value if available
          cellValue = cell.w;
        } else {
          cellValue = String(cell.v || '');
        }
      }

      row.push(cellValue.trim());
    }
    rows.push(row);
  }

  return rows;
};

/**
 * Convert XLSX rows to CSV-like text format
 */
const xlsxRowsToCsvText = (rows: string[][]): string => {
  return rows.map(row => row.join('\t')).join('\n');
};

/**
 * Parse XLSX file and convert to CSV-like format
 */
const parseXLSXFile = async (file: File): Promise<string> => {
  console.log('📊 Parsing XLSX file:', file.name);

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    cellNF: false,
  });

  // Use first sheet
  const firstSheetName = workbook.SheetNames[0];
  console.log(`  Using sheet: ${firstSheetName}`);

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = xlsxSheetToRows(worksheet);

  console.log(`  Parsed ${rows.length} rows from XLSX`);

  // Convert to CSV-like text format
  return xlsxRowsToCsvText(rows);
};

// =============================================================================
// PROFILE MANAGEMENT
// =============================================================================

/**
 * Get format profile with proper fallback logic
 */
async function getFormatProfile(
  supabase: SupabaseClient,
  orgId: string,
  profileId?: string
): Promise<FormatProfile> {
  // 1. Try specific profile if provided
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

  // 2. Try organization-specific profile
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

  // 3. Fallback to standard profile
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

// =============================================================================
// CSV PARSING (Keep existing functions)
// =============================================================================

/**
 * Apply column mappings from company format to standard format
 */
function applyColumnMappings(
  rawRow: Record<string, string>,
  mappings: Record<string, string>
): Record<string, string> {
  const mappedRow: Record<string, string> = {};
  const rawRowKeys = Object.keys(rawRow);

  Object.entries(mappings).forEach(([companyColumn, standardColumn]) => {
    const normalizedCompanyColumn = normalizeString(companyColumn);

    // First try exact match (normalized)
    let rawValue = Object.entries(rawRow).find(
      ([key]) => normalizeString(key) === normalizedCompanyColumn
    )?.[1];

    // If exact match fails, try fuzzy matching
    if (rawValue === undefined) {
      const bestMatch = findBestMatch(companyColumn, rawRowKeys, 0.7);

      if (bestMatch) {
        rawValue = rawRow[bestMatch.key];
        console.log(
          `🔍 Fuzzy match: "${bestMatch.key}" → "${companyColumn}" ` +
            `(similarity: ${(bestMatch.similarity * 100).toFixed(1)}%)`
        );
      }
    }

    if (rawValue !== undefined) {
      mappedRow[standardColumn] = rawValue;
    }
  });

  return mappedRow;
}

/**
 * Parse CSV with two-sections format (separate sections for physical/moral)
 */
function parseTwoSectionsFormat(
  lines: string[],
  separator: string,
  profile: FormatProfile
): ParsedRow[] {
  const result: ParsedRow[] = [];
  const config = profile.format_config;
  const markers = config.structure.section_markers!;
  const skipRows = config.data_transformations.skip_rows_with || [];

  let headers: string[] = [];
  let currentSection: 'physique' | 'morale' | null = null;
  let inDataSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for section markers
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

    // Skip designated rows
    if (skipRows.some(skip => trimmed.toLowerCase().includes(skip.toLowerCase()))) {
      inDataSection = false;
      continue;
    }

    // Detect header row with normalized matching (handles encoding issues)
    const normalizedLine = normalizeString(trimmed);
    if (normalizedLine.includes('quantit') || normalizedLine.includes('montant')) {
      headers = trimmed.split(separator).map(h => h.trim());
      inDataSection = true;
      console.log(
        `  En-têtes (${headers.length} colonnes):`,
        headers.slice(0, 3).join(', '),
        '...'
      );
      continue;
    }

    // Process data rows
    if (inDataSection && headers.length > 0 && currentSection) {
      const values = line.split(separator);
      const firstValue = values[0]?.trim() || '';

      if (
        firstValue &&
        !skipRows.some(skip => firstValue.toLowerCase().includes(skip.toLowerCase()))
      ) {
        const rawRow: Record<string, string> = {};
        headers.forEach((header, index) => {
          rawRow[header] = values[index]?.trim() || '';
        });

        const mappings =
          currentSection === 'physique'
            ? config.column_mappings.physical
            : config.column_mappings.moral;

        const mappedRow = applyColumnMappings(rawRow, mappings);

        result.push({
          ...mappedRow,
          _investorType: currentSection,
        });
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
 * Parse CSV with single-list format (type column determines physical/moral)
 */
function parseSingleListFormat(
  lines: string[],
  separator: string,
  profile: FormatProfile
): ParsedRow[] {
  const result: ParsedRow[] = [];
  const config = profile.format_config;
  const skipRows = config.data_transformations.skip_rows_with || [];
  const typeColumn = config.structure.type_column!;
  const typeValues = config.structure.type_values!;

  let headers: string[] = [];
  let inDataSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip designated rows
    if (skipRows.some(skip => trimmed.toLowerCase().includes(skip.toLowerCase()))) {
      continue;
    }

    // Detect header row with normalized matching (handles encoding issues)
    const normalizedLine = normalizeString(trimmed);
    const normalizedTypeColumn = normalizeString(typeColumn);
    if (
      normalizedLine.includes('quantit') ||
      normalizedLine.includes('montant') ||
      normalizedLine.includes(normalizedTypeColumn)
    ) {
      headers = trimmed.split(separator).map(h => h.trim());
      inDataSection = true;
      console.log(
        `  En-têtes (${headers.length} colonnes):`,
        headers.slice(0, 3).join(', '),
        '...'
      );
      continue;
    }

    // Process data rows
    if (inDataSection && headers.length > 0) {
      const values = line.split(separator);
      const firstValue = values[0]?.trim() || '';

      if (firstValue) {
        const rawRow: Record<string, string> = {};
        headers.forEach((header, index) => {
          rawRow[header] = values[index]?.trim() || '';
        });

        const typeValue = rawRow[typeColumn]?.toLowerCase() || '';
        let investorType: 'physique' | 'morale';

        if (typeValue.includes(typeValues.physical.toLowerCase())) {
          investorType = 'physique';
        } else if (typeValue.includes(typeValues.moral.toLowerCase())) {
          investorType = 'morale';
        } else {
          console.warn(`⚠️  Type inconnu: ${typeValue}, ligne ignorée`);
          continue;
        }

        const mappings =
          investorType === 'physique'
            ? config.column_mappings.physical
            : config.column_mappings.moral;

        const mappedRow = applyColumnMappings(rawRow, mappings);

        result.push({
          ...mappedRow,
          _investorType: investorType,
        });
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
 * Main parsing function - handles both CSV and XLSX
 */
async function parseFile(file: File, profile: FormatProfile): Promise<ParsedRow[]> {
  const fileType = detectFileType(file);
  console.log('📄 Type de fichier détecté:', fileType.toUpperCase());

  let textContent: string;

  if (fileType === 'xlsx' || fileType === 'xls') {
    // Parse XLSX and convert to CSV-like text
    textContent = await parseXLSXFile(file);
  } else {
    // Read CSV with proper UTF-8 encoding handling
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    textContent = decoder.decode(arrayBuffer);

    // Remove BOM if present (Excel sometimes adds it)
    if (textContent.charCodeAt(0) === 0xfeff) {
      textContent = textContent.substring(1);
    }
  }

  console.log('📝 Parsing avec profil:', profile.profile_name);

  const lines = textContent.split(/\r?\n/);
  const config = profile.format_config;

  // Detect separator (for CSV or converted XLSX)
  const separator = detectSeparator(lines);
  console.log(
    '🔍 Séparateur détecté:',
    separator === '\t' ? 'tabulation' : separator === ';' ? 'point-virgule' : 'virgule'
  );

  // Parse based on structure type
  if (config.structure.type === 'two_sections') {
    return parseTwoSectionsFormat(lines, separator, profile);
  } else if (config.structure.type === 'single_list') {
    return parseSingleListFormat(lines, separator, profile);
  } else {
    throw new Error(`Type de structure non supporté: ${config.structure.type}`);
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate parsed data against profile rules
 */
function validateData(rows: ParsedRow[], profile: FormatProfile): ValidationError[] {
  const errors: ValidationError[] = [];
  const rules = profile.format_config.validation_rules;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const isPhysical = row._investorType === 'physique';
    const requiredFields = isPhysical
      ? rules.required_fields_physical
      : rules.required_fields_moral;

    // Check required fields (except email which is handled separately)
    requiredFields.forEach(field => {
      if (field === 'E-mail' || field === 'E-mail du représentant légal') {
        return; // Email is optional, validated separately
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

    // Email validation (optional but must be valid if present)
    if (rules.email_validation) {
      const emailField = isPhysical ? 'E-mail' : 'E-mail du représentant légal';
      const email = row[emailField];
      if (email && email.trim() !== '') {
        if (!EMAIL_REGEX.test(email)) {
          errors.push({
            row: rowNumber,
            field: emailField,
            error: 'E-mail invalide (format incorrect)',
            value: email,
          });
        }
      }
    }

    // SIREN validation for moral persons
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

    // Phone validation (optional but must be valid if present)
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

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Upsert investor with proper duplicate detection
 */
async function upsertInvestor(
  supabase: SupabaseClient,
  row: ParsedRow,
  orgId: string
): Promise<string> {
  const isPhysical = row._investorType === 'physique';

  // Get name field - try different possible column names, trim empty strings
  const nomField = (
    row['Nom'] ||
    row['Nom(s)'] ||
    row["Nom de l'investisseur"] ||
    row['Raison sociale'] ||
    row['Nom/Raison sociale'] ||
    ''
  ).trim();

  console.log(`🔍 Checking Nom(s): "${row['Nom(s)']}" (length: ${row['Nom(s)']?.length})`);

  if (!nomField) {
    console.error(
      '❌ Nom vide! row["Nom(s)"]:',
      row['Nom(s)'],
      'Toutes colonnes:',
      Object.keys(row)
    );
    throw new Error(
      `Nom obligatoire vide. Valeur Nom(s): "${row['Nom(s)']}" Colonnes: ${Object.keys(row).join(', ')}`
    );
  }

  console.log(`✅ Nom trouvé: "${nomField}" (type: ${row._investorType})`);

  // Build full address from available components
  const adresseField =
    row['Adresse du domicile'] || row['Adresse du siège social'] || row['Adresse'];
  const addressParts = [adresseField, row['Code Postal'], row['Ville'], row['Pays']].filter(
    Boolean
  );
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null;

  // Generate unique investor ID
  const idInvestisseur = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Parse phone number to bigint
  const phoneStr = cleanPhone(row['Téléphone']);
  const telephone = phoneStr ? parseInt(phoneStr.replace(/\D/g, ''), 10) : null;

  // Parse SIREN to bigint
  const sirenStr = row['N° SIREN']?.replace(/\s/g, '');
  const siren = sirenStr ? parseInt(sirenStr, 10) : null;

  // Parse departement to integer
  const deptStr = isPhysical
    ? row['Département de naissance']
    : row['Département de naissance du représentant'];
  const departement_naissance = deptStr ? parseInt(deptStr, 10) : null;

  // Parse birth date
  const dateNaissance = parseDate(row['Né(e) le']) || parseDate(row['Date de naissance']);

  const investorData: any = {
    id_investisseur: idInvestisseur,
    org_id: orgId,
    type: isPhysical ? 'physique' : 'morale',
    nom_raison_sociale: nomField,
    email: row['E-mail'] || row['E-mail du représentant légal'] || row['Email'] || null,
    telephone: telephone,
    adresse: fullAddress,
    departement_naissance: departement_naissance,
    date_naissance: dateNaissance,
    lieu_naissance: row['Lieu de naissance'] || row['Ville de naissance'] || null,
    residence_fiscale: row['Résidence Fiscale 1'] || row['Résidence fiscale'] || null,
    cgp: row['Nom du CGP'] || row['CGP'] || null,
    email_cgp: row['E-mail du CGP'] || row['Email CGP'] || null,
  };

  if (!isPhysical) {
    // Combine nom and prenom for representant_legal
    const nomRepresentant = row['Nom du représentant légal'] || '';
    const prenomRepresentant = row['Prénom du représentant légal'] || '';
    const representantCombined = [nomRepresentant, prenomRepresentant]
      .filter(Boolean)
      .join(' ')
      .trim();

    investorData.representant_legal = representantCombined || row['Représentant légal'] || null;
    investorData.siren = siren;
  }

  // Check for existing investor by name and email (better duplicate detection)
  let query = supabase
    .from('investisseurs')
    .select('id')
    .eq('org_id', orgId)
    .eq('type', investorData.type)
    .eq('nom_raison_sociale', investorData.nom_raison_sociale);

  // Add email to query if available for better matching
  if (investorData.email) {
    query = query.eq('email', investorData.email);
  }

  const { data: existingInvestor } = await query.maybeSingle();

  if (existingInvestor) {
    // Update existing (exclude id_investisseur from update)
    const { id_investisseur, ...updateData } = investorData;
    const { data: updated, error: updateErr } = await supabase
      .from('investisseurs')
      .update(updateData)
      .eq('id', existingInvestor.id)
      .select('id')
      .single();

    if (updateErr) throw updateErr;
    return updated.id;
  } else {
    // Create new
    const { data: created, error: insertErr } = await supabase
      .from('investisseurs')
      .insert(investorData)
      .select('id')
      .single();

    if (insertErr) throw insertErr;
    return created.id;
  }
}

/**
 * Upsert subscription
 */
async function upsertSubscription(
  supabase: SupabaseClient,
  row: ParsedRow,
  trancheId: string,
  investorId: string
): Promise<void> {
  const datesouscription = parseDate(row['Date de souscription']);
  const montantInvesti = toNumber(row['Montant investi']);
  const nombreObligations = toNumber(row['Quantité de titres']);

  const subData: any = {
    tranche_id: trancheId,
    investisseur_id: investorId,
    date_souscription: datesouscription || new Date().toISOString().split('T')[0],
    montant_investi: montantInvesti || 0,
    nombre_obligations: nombreObligations || 0,
  };

  const { error: subErr } = await supabase.from('souscriptions').insert(subData);

  if (subErr) {
    throw subErr;
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async req => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // 1. AUTHENTICATION
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

    // 2. PARSE FORM DATA
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

    // 3. VALIDATE INPUT
    if (!file) {
      throw new Error('Missing file');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Validate file type
    const fileType = detectFileType(file);
    if (!['csv', 'xlsx', 'xls'].includes(fileType)) {
      throw new Error('Type de fichier non supporté. Utilisez CSV ou XLSX/XLS.');
    }

    console.log(
      '📄 Fichier:',
      file.name,
      `(${(file.size / 1024).toFixed(2)} KB)`,
      `Type: ${fileType.toUpperCase()}`
    );

    // 4. GET/CREATE TRANCHE
    let finalTrancheId: string;
    let orgId: string;

    if (projetId && trancheName && !trancheId) {
      // Create new tranche
      console.log('📝 Mode: Création nouvelle tranche');

      const { data: projet, error: projetErr } = await supabaseClient
        .from('projets')
        .select('org_id')
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
        duree_mois: dureeMois ? parseInt(dureeMois, 10) : null,
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
      // Use existing tranche
      console.log('📝 Mode: Import vers tranche existante');

      const { data: tranche, error: trancheErr } = await supabaseClient
        .from('tranches')
        .select('*, projets!inner(org_id)')
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

    console.log('🏢 Organisation ID:', orgId);

    // 5. PARSE FILE (CSV or XLSX)
    const profile = await getFormatProfile(supabaseClient, orgId, profileId);
    const rows = await parseFile(file, profile);

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Aucune donnée valide trouvée dans le fichier',
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    if (rows.length > MAX_ROWS) {
      throw new Error(`Too many rows. Maximum: ${MAX_ROWS}, Found: ${rows.length}`);
    }

    // 6. VALIDATE DATA
    const validationErrors = validateData(rows, profile);

    if (validationErrors.length > 0) {
      console.warn(`⚠️  ${validationErrors.length} erreur(s) de validation`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Erreurs de validation détectées',
          validation_errors: validationErrors,
          total_errors: validationErrors.length,
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Validation OK - Insertion en base...');

    // 7. IMPORT DATA
    let createdInvestisseurs = 0;
    let updatedInvestisseurs = 0;
    let createdSouscriptions = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        // Check if investor already exists
        const { data: existingInvestor } = await supabaseClient
          .from('investisseurs')
          .select('id')
          .eq('org_id', orgId)
          .eq('type', row._investorType)
          .eq('nom', row['Nom'])
          .maybeSingle();

        const investorId = await upsertInvestor(supabaseClient, row, orgId);

        if (existingInvestor) {
          updatedInvestisseurs++;
        } else {
          createdInvestisseurs++;
        }

        // Upsert subscription
        await upsertSubscription(supabaseClient, row, finalTrancheId, investorId);
        createdSouscriptions++;
      } catch (rowErr: any) {
        console.error('Erreur traitement ligne:', rowErr);
        errors.push(`Erreur pour ${row['Nom']}: ${rowErr.message}`);
      }
    }

    console.log('✅ Import terminé:');
    console.log(`   - ${createdInvestisseurs} investisseurs créés`);
    console.log(`   - ${updatedInvestisseurs} investisseurs mis à jour`);
    console.log(`   - ${createdSouscriptions} souscriptions créées`);

    // 8. RETURN RESULTS
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
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
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
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
});
