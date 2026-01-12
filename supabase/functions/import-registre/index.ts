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
    // Read CSV with proper encoding detection
    const arrayBuffer = await file.arrayBuffer();

    // Try UTF-8 first
    let decoder = new TextDecoder('utf-8', { fatal: true });
    try {
      textContent = decoder.decode(arrayBuffer);
    } catch (e) {
      // If UTF-8 fails, try Windows-1252 (common for French Excel exports)
      console.log('UTF-8 decoding failed, trying Windows-1252');
      decoder = new TextDecoder('windows-1252');
      textContent = decoder.decode(arrayBuffer);
    }

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

  // Get name components
  const prenomField = (row['Prénom(s)'] || row['Prénom'] || row['Prénoms'] || '').trim();

  const nomField = (
    row['Nom'] ||
    row['Nom(s)'] ||
    row["Nom de l'investisseur"] ||
    row['Raison sociale'] ||
    row['Nom/Raison sociale'] ||
    ''
  ).trim();

  const nomJeuneFille = (row['Nom de jeune fille'] || '').trim();

  // Build full name for physical persons: Prénom Nom (née Nom de jeune fille)
  // For legal entities, just use the raison sociale
  let fullName = '';
  if (isPhysical) {
    const nameParts = [prenomField, nomField].filter(Boolean);
    fullName = nameParts.join(' ');
    if (nomJeuneFille) {
      fullName += ` (née ${nomJeuneFille})`;
    }
  } else {
    fullName = nomField;
  }

  if (!fullName.trim()) {
    throw new Error(`Nom obligatoire manquant`);
  }

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
    nom_raison_sociale: fullName,
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
 * Upsert subscription with proper calculations
 */
async function upsertSubscription(
  supabase: SupabaseClient,
  row: ParsedRow,
  trancheId: string,
  projetId: string,
  investorId: string,
  investorType: string,
  tauxNominal: number,
  periodiciteCoupons: string,
  baseInteret: number
): Promise<void> {
  const datesouscription =
    parseDate(row['Date de souscription']) || parseDate(row['Date de Souscription']);
  const montantInvesti = toNumber(row['Montant investi']) || toNumber(row['Montant']);
  const nombreObligations =
    toNumber(row['Quantité de titres']) || toNumber(row['Quantité']) || toNumber(row['Quantite']);

  // Calculate coupon_brut and coupon_net
  const periodRatio = getPeriodRatio(periodiciteCoupons, baseInteret);
  const couponAnnuel = (montantInvesti * tauxNominal) / 100;
  const couponBrut = couponAnnuel * periodRatio;
  const couponNet = investorType.toLowerCase() === 'physique' ? couponBrut * 0.7 : couponBrut;

  const subData: any = {
    projet_id: projetId,
    tranche_id: trancheId,
    investisseur_id: investorId,
    date_souscription: datesouscription || new Date().toISOString().split('T')[0],
    montant_investi: montantInvesti || 0,
    nombre_obligations: nombreObligations || 0,
    coupon_brut: Math.round(couponBrut * 100) / 100,
    coupon_net: Math.round(couponNet * 100) / 100,
  };

  const { error: subErr } = await supabase.from('souscriptions').insert(subData);

  if (subErr) {
    throw subErr;
  }
}

/**
 * Get period ratio based on periodicite and base_interet
 */
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
      return 1.0;
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
    const previewMode = formData.get('preview_mode') === 'true';

    const trancheId = formData.get('tranche_id') as string | null;
    const projetId = formData.get('projet_id') as string | null;
    const trancheName = formData.get('tranche_name') as string | null;
    const tauxNominal = formData.get('taux_nominal') as string | null;
    const dateEmission = formData.get('date_emission') as string | null;
    const dureeMois = formData.get('duree_mois') as string | null;

    console.log('📥 Received:', { projetId, trancheName, trancheId, hasFile: !!file, previewMode });

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

    // 4. GET ORG ID FIRST
    let orgId: string;
    let finalProjetId: string;
    let finalTrancheId: string;

    if (projetId && trancheName && !trancheId) {
      // Get projet first to get orgId
      const { data: projet, error: projetErr } = await supabaseClient
        .from('projets')
        .select('org_id')
        .eq('id', projetId)
        .single();

      if (projetErr || !projet) {
        throw new Error('Projet introuvable');
      }

      orgId = projet.org_id;
      finalProjetId = projetId;

      // In preview mode, skip tranche creation
      if (!previewMode) {
        // Create tranche (without date_emission for now - will extract from CSV next)
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
      } else {
        // In preview mode, use a placeholder tranche ID (won't be persisted)
        finalTrancheId = 'preview-mode';
        console.log('👁️  Mode aperçu: Tranche non créée');
      }
    } else if (trancheId && !projetId) {
      // Use existing tranche
      console.log('📝 Mode: Import vers tranche existante');

      const { data: tranche, error: trancheErr } = await supabaseClient
        .from('tranches')
        .select(
          '*, projets!inner(id, org_id, taux_nominal, periodicite_coupons, duree_mois, base_interet)'
        )
        .eq('id', trancheId)
        .single();

      if (trancheErr || !tranche) {
        throw new Error('Tranche introuvable');
      }

      finalTrancheId = trancheId;
      finalProjetId = (tranche.projets as any).id;
      orgId = (tranche.projets as any).org_id;
    } else {
      throw new Error('Vous devez fournir soit (projet_id + tranche_name) soit (tranche_id)');
    }

    // Get project and tranche details
    let trancheDetails: any;
    let project: any;
    let tauxNominalFinal: number;
    let periodiciteCoupons: string;
    let baseInteret: number;

    if (previewMode && finalTrancheId === 'preview-mode') {
      // In preview mode, get project details directly (no tranche exists yet)
      const { data: projectData, error: projectErr } = await supabaseClient
        .from('projets')
        .select('taux_nominal, periodicite_coupons, duree_mois, base_interet')
        .eq('id', finalProjetId)
        .single();

      if (projectErr || !projectData) {
        throw new Error('Impossible de récupérer les détails du projet');
      }

      project = projectData;
      trancheDetails = {
        taux_nominal: tauxNominal ? parseFloat(tauxNominal) : null,
        date_emission: null, // Will be extracted from CSV
        duree_mois: dureeMois ? parseInt(dureeMois, 10) : null,
        projets: projectData,
      };
      tauxNominalFinal = trancheDetails.taux_nominal ?? project.taux_nominal;
      periodiciteCoupons = project.periodicite_coupons;
      baseInteret = project.base_interet ?? 360;
    } else {
      // Normal mode: get tranche details with project fallback
      const { data: trancheDetailsData, error: trancheDetailsErr } = await supabaseClient
        .from('tranches')
        .select(
          'taux_nominal, date_emission, duree_mois, projets!inner(taux_nominal, periodicite_coupons, duree_mois, base_interet)'
        )
        .eq('id', finalTrancheId)
        .single();

      if (trancheDetailsErr || !trancheDetailsData) {
        throw new Error('Impossible de récupérer les détails de la tranche');
      }

      trancheDetails = trancheDetailsData;
      project = trancheDetails.projets as any;
      tauxNominalFinal = trancheDetails.taux_nominal ?? project.taux_nominal;
      periodiciteCoupons = project.periodicite_coupons;
      baseInteret = project.base_interet ?? 360;
    }

    if (!tauxNominalFinal || !periodiciteCoupons) {
      throw new Error(
        'Taux nominal ou périodicité des coupons manquants. Vérifiez la configuration du projet.'
      );
    }

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

    // Extract date_emission from CSV if not provided in form
    // Try "Date de Transfert" (case-insensitive)
    let extractedDateEmission: string | null = null;
    if (!dateEmission && rows.length > 0) {
      // Debug: show available columns
      const firstRow = rows[0];
      const availableColumns = Object.keys(firstRow).filter(k => !k.startsWith('_'));
      console.log(
        `📋 Colonnes disponibles dans le CSV (${availableColumns.length}):`,
        availableColumns.slice(0, 30).join(', ')
      );

      // Find "Date de Transfert" column (case-insensitive)
      console.log(`🔍 Recherche de date d'émission (Date de Transfert)...`);

      // Try exact matches first (common variations)
      let dateTransfertValue =
        firstRow['Date de Transfert'] ||
        firstRow['Date de transfert'] ||
        firstRow['Date de Transfert des Fonds'] ||
        firstRow['Date de transfert des fonds'] ||
        firstRow['Date Transfert'] ||
        firstRow['Date transfert'];

      // If not found, try case-insensitive search
      if (!dateTransfertValue) {
        const transferColumn = availableColumns.find(
          col => col.toLowerCase().includes('date') && col.toLowerCase().includes('transfert')
        );
        if (transferColumn) {
          dateTransfertValue = firstRow[transferColumn];
          console.log(`   Trouvé colonne: "${transferColumn}" = "${dateTransfertValue}"`);
        }
      } else {
        console.log(`   Valeur trouvée: "${dateTransfertValue}"`);
      }

      const dateTransfert = parseDate(dateTransfertValue);

      if (dateTransfert) {
        extractedDateEmission = dateTransfert;
        console.log(`📅 Date émission extraite du CSV: ${extractedDateEmission}`);
      } else {
        console.log(`   ❌ Colonne "Date de Transfert" non trouvée ou vide dans le CSV!`);
        console.log(`   ⚠️  Import annulé - la date d'émission est requise`);
        throw new Error(
          'Date d\'émission manquante: La colonne "Date de Transfert" doit être présente dans le fichier CSV avec une valeur valide.'
        );
      }
    } else if (dateEmission) {
      console.log(`📅 Date émission fournie par le formulaire: ${dateEmission}`);
    }

    const finalDateEmission = dateEmission || extractedDateEmission;

    // Update tranche with extracted date if we created a new one and extracted a date
    if (projetId && trancheName && !trancheId && extractedDateEmission && !dateEmission) {
      console.log(`📅 Mise à jour de la tranche avec date émission: ${extractedDateEmission}`);
      console.log(
        `   Conditions: projetId=${!!projetId}, trancheName=${!!trancheName}, !trancheId=${!trancheId}, extractedDate=${!!extractedDateEmission}, !dateEmission=${!dateEmission}`
      );

      const { error: updateErr } = await supabaseClient
        .from('tranches')
        .update({ date_emission: extractedDateEmission })
        .eq('id', finalTrancheId);

      if (updateErr) {
        console.error('❌ Erreur mise à jour date émission:', updateErr);
      } else {
        console.log('✅ Date émission mise à jour sur la tranche');

        // Re-fetch tranche details to get updated date_emission
        const { data: updatedTranche, error: refetchErr } = await supabaseClient
          .from('tranches')
          .select('date_emission')
          .eq('id', finalTrancheId)
          .single();

        if (!refetchErr && updatedTranche) {
          console.log(`✅ Date émission confirmée dans la DB: ${updatedTranche.date_emission}`);
          // Update trancheDetails with new date
          (trancheDetails as any).date_emission = updatedTranche.date_emission;
        }
      }
    } else {
      console.log(`⏭️  Pas de mise à jour de date - conditions non remplies:`);
      console.log(
        `   projetId=${!!projetId}, trancheName=${!!trancheName}, !trancheId=${!trancheId}`
      );
      console.log(
        `   extractedDateEmission=${!!extractedDateEmission}, !dateEmission=${!dateEmission}`
      );
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

    // 6.5 PREVIEW MODE: Return preview data without persisting
    if (previewMode) {
      console.log('👁️  Mode aperçu: Génération des données de prévisualisation');

      // Build preview data for investors
      const investorsPreview = rows.slice(0, 20).map(row => {
        const isPhysical = row._investorType === 'physique';
        const prenomField = (row['Prénom(s)'] || row['Prénom'] || row['Prénoms'] || '').trim();
        const nomField = (
          row['Nom'] ||
          row['Nom(s)'] ||
          row["Nom de l'investisseur"] ||
          row['Raison sociale'] ||
          row['Nom/Raison sociale'] ||
          ''
        ).trim();
        const nomJeuneFille = (row['Nom de jeune fille'] || '').trim();

        let fullName = '';
        if (isPhysical) {
          const nameParts = [prenomField, nomField].filter(Boolean);
          fullName = nameParts.join(' ');
          if (nomJeuneFille) {
            fullName += ` (née ${nomJeuneFille})`;
          }
        } else {
          fullName = nomField;
        }

        const montantInvesti = toNumber(row['Montant investi']) || toNumber(row['Montant']) || 0;
        const nombreObligations =
          toNumber(row['Quantité de titres']) ||
          toNumber(row['Quantité']) ||
          toNumber(row['Quantite']) ||
          0;

        return {
          nom: fullName,
          type: row._investorType,
          montant_investi: montantInvesti,
          nombre_obligations: nombreObligations,
        };
      });

      // Calculate totals
      const totalMontant = rows.reduce((sum, row) => {
        const montant = toNumber(row['Montant investi']) || toNumber(row['Montant']) || 0;
        return sum + montant;
      }, 0);

      // Count unique investors
      const uniqueInvestors = new Set(
        rows.map(row => {
          const isPhysical = row._investorType === 'physique';
          const prenomField = (row['Prénom(s)'] || row['Prénom'] || row['Prénoms'] || '').trim();
          const nomField = (
            row['Nom'] ||
            row['Nom(s)'] ||
            row["Nom de l'investisseur"] ||
            row['Raison sociale'] ||
            row['Nom/Raison sociale'] ||
            ''
          ).trim();
          const nomJeuneFille = (row['Nom de jeune fille'] || '').trim();

          if (isPhysical) {
            const nameParts = [prenomField, nomField].filter(Boolean);
            let fullName = nameParts.join(' ');
            if (nomJeuneFille) {
              fullName += ` (née ${nomJeuneFille})`;
            }
            return fullName;
          }
          return nomField;
        })
      );

      console.log(
        `✅ Aperçu généré: ${rows.length} lignes, ${uniqueInvestors.size} investisseurs uniques`
      );

      return new Response(
        JSON.stringify({
          success: true,
          preview: true,
          data: {
            extracted_date_emission: extractedDateEmission,
            tranche_name: trancheName,
            taux_nominal: tauxNominalFinal,
            periodicite_coupons: periodiciteCoupons,
            duree_mois: trancheDetails.duree_mois || project.duree_mois,
            investors_preview: investorsPreview,
            total_investors: uniqueInvestors.size,
            total_souscriptions: rows.length,
            total_montant: totalMontant,
            has_more: rows.length > 20,
          },
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    // 7. IMPORT DATA
    let createdInvestisseurs = 0;
    let updatedInvestisseurs = 0;
    let createdSouscriptions = 0;
    const errors: string[] = [];

    for (const row of rows) {
      // Build full name same way as upsertInvestor
      const isPhysical = row._investorType === 'physique';
      const prenomField = (row['Prénom(s)'] || row['Prénom'] || row['Prénoms'] || '').trim();
      const nomField = (
        row['Nom'] ||
        row['Nom(s)'] ||
        row["Nom de l'investisseur"] ||
        row['Raison sociale'] ||
        row['Nom/Raison sociale'] ||
        ''
      ).trim();
      const nomJeuneFille = (row['Nom de jeune fille'] || '').trim();

      let rowName = '';
      if (isPhysical) {
        const nameParts = [prenomField, nomField].filter(Boolean);
        rowName = nameParts.join(' ');
        if (nomJeuneFille) {
          rowName += ` (née ${nomJeuneFille})`;
        }
      } else {
        rowName = nomField;
      }

      try {
        // Check if investor already exists
        const { data: existingInvestor } = await supabaseClient
          .from('investisseurs')
          .select('id')
          .eq('org_id', orgId)
          .eq('type', row._investorType)
          .eq('nom_raison_sociale', rowName)
          .maybeSingle();

        const investorId = await upsertInvestor(supabaseClient, row, orgId);

        if (existingInvestor) {
          updatedInvestisseurs++;
        } else {
          createdInvestisseurs++;
        }

        // Create subscription with all required parameters
        await upsertSubscription(
          supabaseClient,
          row,
          finalTrancheId,
          finalProjetId,
          investorId,
          row._investorType,
          tauxNominalFinal,
          periodiciteCoupons,
          baseInteret
        );
        createdSouscriptions++;
      } catch (rowErr: any) {
        console.error(`Erreur traitement ${rowName}:`, rowErr);
        errors.push(`${rowName}: ${rowErr.message}`);
      }
    }

    console.log(
      `✅ Import terminé: ${createdInvestisseurs} investisseurs, ${createdSouscriptions} souscriptions`
    );

    // 8. GENERATE ECHEANCIER
    if (createdSouscriptions > 0) {
      console.log("📅 Génération de l'échéancier...");
      console.log(`   Tranche ID: ${finalTrancheId}`);
      console.log(`   Taux nominal: ${tauxNominalFinal}`);
      console.log(`   Périodicité: ${periodiciteCoupons}`);
      console.log(`   Date émission: ${trancheDetails.date_emission}`);
      console.log(`   Durée (mois): ${trancheDetails.duree_mois || project.duree_mois}`);

      try {
        const regenerateUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/regenerate-echeancier`;
        console.log(`   Calling: ${regenerateUrl}`);

        const regenerateResponse = await fetch(regenerateUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({ tranche_id: finalTrancheId }),
        });

        console.log(`   Response status: ${regenerateResponse.status}`);

        if (!regenerateResponse.ok) {
          const errorText = await regenerateResponse.text();
          console.error('❌ Erreur génération échéancier:', errorText);
        } else {
          const result = await regenerateResponse.json();
          console.log(`✅ Échéancier généré: ${result.created_coupons} échéances créées`);
        }
      } catch (echeancierErr: any) {
        console.error('❌ Exception génération échéancier:', echeancierErr.message);
        console.error('   Stack:', echeancierErr.stack);
        // Don't fail the whole import if échéancier generation fails
      }
    } else {
      console.log('⏭️  Aucune souscription créée, échéancier non généré');
    }

    // 9. RETURN RESULTS
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
