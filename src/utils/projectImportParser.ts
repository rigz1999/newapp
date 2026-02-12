import * as ExcelJS from 'exceljs';

// =============================================================================
// TYPES
// =============================================================================

export interface ExtractedProject {
  projet?: string;
  type?: string;
  taux_interet?: string;
  montant_global_eur?: string;
  maturite_mois?: string;
  base_interet?: string;
  valeur_nominale?: string;
  periodicite_coupon?: string;
  emetteur?: string;
  siren_emetteur?: string;
  nom_representant?: string;
  prenom_representant?: string;
  email_representant?: string;
  representant_masse?: string;
  email_rep_masse?: string;
  telephone_rep_masse?: string;
  date_emission?: string;
  apply_flat_tax?: boolean;
}

export interface ProjectImportResult {
  projects: ExtractedProject[];
  headers: string[];
  sheetName: string;
}

export type FieldAliases = Record<keyof ExtractedProject, string[]>;

// =============================================================================
// DEFAULT FIELD ALIASES (used when no org profile is configured)
// =============================================================================

export const DEFAULT_FIELD_ALIASES: FieldAliases = {
  projet: [
    'Nom du projet',
    "Nom de l'émission",
    'Nom projet',
    'Projet',
    'Libellé du projet',
    'Libellé',
    'Project Name',
  ],
  taux_interet: [
    'Rendement',
    "Taux d'intérêt",
    'Taux nominal',
    'Taux',
    'Interest Rate',
    'Rendement annuel',
    'Taux annuel',
  ],
  montant_global_eur: [
    'Plafond',
    'Montant global',
    'Montant total',
    'Montant à lever',
    'Montant',
    'Total Amount',
    'Montant collecté',
    'Objectif de collecte',
  ],
  maturite_mois: [
    "Durée d'investissement",
    'Durée',
    'Maturité',
    'Maturité (mois)',
    'Durée (mois)',
    'Duration',
    'Terme',
  ],
  emetteur: [
    'Marque',
    'Émetteur',
    'Emetteur',
    'Porteur de projet',
    'Raison sociale émetteur',
    'Société',
    'Issuer',
    'Raison sociale',
  ],
  siren_emetteur: ['SIREN', 'N° SIREN', 'SIREN émetteur', 'Numéro SIREN', 'SIREN emetteur'],
  date_emission: [
    'Date de jouissance',
    "Date d'émission",
    'Date de début',
    'Date emission',
    'Date de début de collecte',
    'Issue Date',
  ],
  periodicite_coupon: [
    'Périodicité',
    'Fréquence coupon',
    'Périodicité du coupon',
    'Periodicite',
    'Coupon Frequency',
  ],
  valeur_nominale: ['Valeur nominale', 'Nominal', 'Prix unitaire', 'Valeur faciale', 'Face Value'],
  type: [
    "Type d'obligation",
    "Type d'obligations",
    'Type',
    'Nature',
    "Nature de l'obligation",
    'Bond Type',
  ],
  base_interet: ['Base de calcul', 'Base intérêt', 'Base calcul', 'Day Count', 'Base interet'],
  nom_representant: [
    'Nom du représentant',
    'Nom représentant',
    'Nom du dirigeant',
    'Nom dirigeant',
  ],
  prenom_representant: [
    'Prénom du représentant',
    'Prénom représentant',
    'Prénom du dirigeant',
    'Prénom dirigeant',
  ],
  email_representant: [
    'Email du représentant',
    'E-mail du représentant',
    'Email représentant',
    'Email dirigeant',
  ],
  representant_masse: [
    'Représentant de la masse',
    'Représentant masse',
    'Rep. masse',
    'Bondholder Representative',
  ],
  email_rep_masse: [
    'Email représentant masse',
    'E-mail rep. masse',
    'Email du représentant de la masse',
  ],
  telephone_rep_masse: ['Téléphone représentant masse', 'Tel rep. masse', 'Phone rep. masse'],
  apply_flat_tax: ['PFU', 'Flat Tax', 'Prélèvement forfaitaire', 'PFU 30%'],
};

// =============================================================================
// FUZZY MATCHING (same algorithm as import-registre edge function)
// =============================================================================

export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function levenshteinSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);

  if (s1 === s2) {
    return 1;
  }

  const cleanStr1 = s1.replace(/[�\uFFFD]/g, '');
  const cleanStr2 = s2.replace(/[�\uFFFD]/g, '');

  if (cleanStr1 === cleanStr2) {
    return 0.95;
  }

  // Prefix match
  const minLength = Math.min(cleanStr1.length, cleanStr2.length);
  if (minLength >= 4) {
    if (cleanStr1.substring(0, minLength) === cleanStr2.substring(0, minLength)) {
      return 0.85;
    }
  }

  // Levenshtein distance
  const len1 = cleanStr1.length;
  const len2 = cleanStr2.length;

  if (len1 === 0) {
    return len2 === 0 ? 1 : 0;
  }
  if (len2 === 0) {
    return 0;
  }

  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = cleanStr1[i - 1] === cleanStr2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  return 1 - distance / Math.max(len1, len2);
}

export function findBestColumnMatch(
  aliases: string[],
  headers: string[],
  threshold = 0.7
): string | null {
  let bestHeader: string | null = null;
  let bestScore = 0;

  for (const alias of aliases) {
    for (const header of headers) {
      const score = levenshteinSimilarity(alias, header);
      if (score >= threshold && score > bestScore) {
        bestScore = score;
        bestHeader = header;
      }
    }
  }

  return bestHeader;
}

// =============================================================================
// VALUE TRANSFORMATIONS
// =============================================================================

function parsePercentage(value: string): string {
  if (!value) {
    return '';
  }
  // Remove % sign and whitespace
  let cleaned = value.replace(/%/g, '').trim();
  // Handle comma as decimal separator
  cleaned = cleaned.replace(',', '.');
  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    return '';
  }
  // If value looks like a decimal (e.g., 0.085), convert to percentage
  if (num > 0 && num < 1) {
    return (num * 100).toString();
  }
  return num.toString();
}

function parseCurrencyToDigits(value: string): string {
  if (!value) {
    return '';
  }
  // Remove currency symbols, spaces, and non-digit characters (keep digits only)
  const digits = value.replace(/[^\d]/g, '');
  return digits;
}

function parseDuration(value: string): string {
  if (!value) {
    return '';
  }
  const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    return '';
  }

  // Heuristic: if value <= 15, it's likely years -> convert to months
  // if value > 15, it's likely already months
  if (num > 0 && num <= 15) {
    return Math.round(num * 12).toString();
  }
  return Math.round(num).toString();
}

function parsePeriodicite(value: string): string {
  if (!value) {
    return '';
  }
  const lower = normalizeString(value);
  if (lower.includes('mensuel')) {
    return 'mensuelle';
  }
  if (lower.includes('trimestr')) {
    return 'trimestrielle';
  }
  if (lower.includes('semestr')) {
    return 'semestrielle';
  }
  if (lower.includes('annuel')) {
    return 'annuelle';
  }
  if (lower.includes('month')) {
    return 'mensuelle';
  }
  if (lower.includes('quarter')) {
    return 'trimestrielle';
  }
  if (lower.includes('semi')) {
    return 'semestrielle';
  }
  if (lower.includes('annual') || lower.includes('year')) {
    return 'annuelle';
  }
  return '';
}

function parseBondType(value: string): string {
  if (!value) {
    return '';
  }
  const lower = normalizeString(value);
  if (lower.includes('convertib')) {
    return 'obligations_convertibles';
  }
  if (lower.includes('simple') || lower.includes('obligat')) {
    return 'obligations_simples';
  }
  return '';
}

function parseBaseInteret(value: string): string {
  if (!value) {
    return '';
  }
  if (value.includes('365')) {
    return '365';
  }
  if (value.includes('360')) {
    return '360';
  }
  return '';
}

function parseSiren(value: string): string {
  if (!value) {
    return '';
  }
  return value.replace(/\D/g, '').slice(0, 9);
}

function parseBoolean(value: string): boolean | undefined {
  if (!value) {
    return undefined;
  }
  const lower = value.toLowerCase().trim();
  if (['oui', 'yes', 'true', '1', 'vrai'].includes(lower)) {
    return true;
  }
  if (['non', 'no', 'false', '0', 'faux'].includes(lower)) {
    return false;
  }
  return undefined;
}

// =============================================================================
// HEADER EXTRACTION (used by admin panel for upload-based mapping)
// =============================================================================

export async function extractExcelHeaders(
  file: File
): Promise<{ headers: string[]; sheetName: string }> {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = pickBestSheet(workbook);

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const text = cell.text?.trim();
    if (text) {
      headers[colNumber - 1] = text;
    }
  });

  return { headers: headers.filter(Boolean), sheetName: worksheet.name };
}

/**
 * Auto-map: given a list of target fields with their known aliases,
 * and a list of extracted client headers, return the best match for each field.
 * Returns { fieldKey: clientColumnName | '' }
 */
export function autoMapFields(
  fields: { key: string; aliases: string[] }[],
  clientHeaders: string[]
): Record<string, string> {
  const result: Record<string, string> = {};
  const usedHeaders = new Set<string>();

  // Sort fields by number of aliases (more specific first)
  const sorted = [...fields].sort((a, b) => a.aliases.length - b.aliases.length);

  for (const field of sorted) {
    const match = findBestColumnMatch(
      field.aliases,
      clientHeaders.filter(h => !usedHeaders.has(h))
    );
    if (match) {
      result[field.key] = match;
      usedHeaders.add(match);
    } else {
      result[field.key] = '';
    }
  }

  return result;
}

function pickBestSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  let worksheet = workbook.worksheets[0];
  const dataSheetNames = ['Registre', 'Data', 'Données', 'Projets', 'Projects', 'Sheet1'];
  const nonDataSheets = ['Instructions', 'Aide', 'Help'];

  for (const ws of workbook.worksheets) {
    if (dataSheetNames.some(n => ws.name.toLowerCase() === n.toLowerCase())) {
      worksheet = ws;
      break;
    }
  }
  if (nonDataSheets.some(n => worksheet.name.toLowerCase() === n.toLowerCase())) {
    const alt = workbook.worksheets.find(
      ws => !nonDataSheets.some(n => ws.name.toLowerCase() === n.toLowerCase())
    );
    if (alt) {
      worksheet = alt;
    }
  }

  return worksheet;
}

// =============================================================================
// MAIN PARSER
// =============================================================================

/**
 * Parse a project Excel file.
 * @param file The Excel file
 * @param profileConfig Optional: direct column mappings { fieldKey: "Client Column Name" }
 *                      from the org's saved profile. Takes precedence over fuzzy matching.
 * @param aliasOverrides Optional: alias overrides (legacy format) for fuzzy matching
 */
export async function parseProjectFile(
  file: File,
  profileConfig?: Record<string, string>,
  aliasOverrides?: Record<string, string[]>
): Promise<ProjectImportResult> {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = pickBestSheet(workbook);

  // Read headers from first row
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cell.text?.trim() || `Column_${colNumber}`;
  });

  // Build column mapping: project field -> column index
  const fieldToColumnIndex: Partial<Record<keyof ExtractedProject, number>> = {};

  if (profileConfig) {
    // Direct mappings from saved profile (admin mapped columns explicitly)
    for (const [field, clientCol] of Object.entries(profileConfig)) {
      if (clientCol) {
        const idx = headers.indexOf(clientCol);
        if (idx !== -1) {
          fieldToColumnIndex[field as keyof ExtractedProject] = idx;
        }
      }
    }
  } else {
    // Fuzzy matching with aliases
    const aliases: FieldAliases = aliasOverrides
      ? { ...DEFAULT_FIELD_ALIASES, ...aliasOverrides }
      : DEFAULT_FIELD_ALIASES;

    for (const [field, fieldAliases] of Object.entries(aliases)) {
      const matchedHeader = findBestColumnMatch(fieldAliases, headers);
      if (matchedHeader) {
        fieldToColumnIndex[field as keyof ExtractedProject] = headers.indexOf(matchedHeader);
      }
    }
  }

  // Extract project rows
  const projects: ExtractedProject[] = [];
  const rowCount = worksheet.rowCount;

  for (let rowIdx = 2; rowIdx <= rowCount; rowIdx++) {
    const row = worksheet.getRow(rowIdx);

    // Skip empty rows
    const hasData =
      row.values && (row.values as unknown[]).some(v => v !== null && v !== undefined && v !== '');
    if (!hasData) {
      continue;
    }

    const getCellValue = (colIdx: number | undefined): string => {
      if (colIdx === undefined) {
        return '';
      }
      const cell = row.getCell(colIdx + 1);
      if (!cell || cell.value === null || cell.value === undefined) {
        return '';
      }
      // Handle date objects
      if (cell.value instanceof Date) {
        return cell.value.toISOString().split('T')[0];
      }
      // Handle rich text
      if (typeof cell.value === 'object' && 'richText' in (cell.value as object)) {
        return (cell.value as { richText: { text: string }[] }).richText.map(r => r.text).join('');
      }
      return String(cell.value).trim();
    };

    const extracted: ExtractedProject = {};

    // Extract and transform each field
    const rawProjet = getCellValue(fieldToColumnIndex.projet);
    if (rawProjet) {
      extracted.projet = rawProjet;
    }

    const rawTaux = getCellValue(fieldToColumnIndex.taux_interet);
    if (rawTaux) {
      extracted.taux_interet = parsePercentage(rawTaux);
    }

    const rawMontant = getCellValue(fieldToColumnIndex.montant_global_eur);
    if (rawMontant) {
      extracted.montant_global_eur = parseCurrencyToDigits(rawMontant);
    }

    const rawMaturite = getCellValue(fieldToColumnIndex.maturite_mois);
    if (rawMaturite) {
      extracted.maturite_mois = parseDuration(rawMaturite);
    }

    const rawEmetteur = getCellValue(fieldToColumnIndex.emetteur);
    if (rawEmetteur) {
      extracted.emetteur = rawEmetteur;
    }

    const rawSiren = getCellValue(fieldToColumnIndex.siren_emetteur);
    if (rawSiren) {
      extracted.siren_emetteur = parseSiren(rawSiren);
    }

    const rawDate = getCellValue(fieldToColumnIndex.date_emission);
    if (rawDate) {
      extracted.date_emission = rawDate;
    }

    const rawPeriodicite = getCellValue(fieldToColumnIndex.periodicite_coupon);
    if (rawPeriodicite) {
      extracted.periodicite_coupon = parsePeriodicite(rawPeriodicite);
    }

    const rawValeurNominale = getCellValue(fieldToColumnIndex.valeur_nominale);
    if (rawValeurNominale) {
      extracted.valeur_nominale = rawValeurNominale.replace(/[^\d.,]/g, '').replace(',', '.');
    }

    const rawType = getCellValue(fieldToColumnIndex.type);
    if (rawType) {
      extracted.type = parseBondType(rawType);
    }

    const rawBase = getCellValue(fieldToColumnIndex.base_interet);
    if (rawBase) {
      extracted.base_interet = parseBaseInteret(rawBase);
    }

    const rawNomRep = getCellValue(fieldToColumnIndex.nom_representant);
    if (rawNomRep) {
      extracted.nom_representant = rawNomRep;
    }

    const rawPrenomRep = getCellValue(fieldToColumnIndex.prenom_representant);
    if (rawPrenomRep) {
      extracted.prenom_representant = rawPrenomRep;
    }

    const rawEmailRep = getCellValue(fieldToColumnIndex.email_representant);
    if (rawEmailRep) {
      extracted.email_representant = rawEmailRep;
    }

    const rawRepMasse = getCellValue(fieldToColumnIndex.representant_masse);
    if (rawRepMasse) {
      extracted.representant_masse = rawRepMasse;
    }

    const rawEmailRepMasse = getCellValue(fieldToColumnIndex.email_rep_masse);
    if (rawEmailRepMasse) {
      extracted.email_rep_masse = rawEmailRepMasse;
    }

    const rawTelRepMasse = getCellValue(fieldToColumnIndex.telephone_rep_masse);
    if (rawTelRepMasse) {
      extracted.telephone_rep_masse = rawTelRepMasse.replace(/\D/g, '');
    }

    const rawFlatTax = getCellValue(fieldToColumnIndex.apply_flat_tax);
    if (rawFlatTax) {
      const parsed = parseBoolean(rawFlatTax);
      if (parsed !== undefined) {
        extracted.apply_flat_tax = parsed;
      }
    }

    // Only include row if it has at least a project name or emetteur
    if (extracted.projet || extracted.emetteur) {
      projects.push(extracted);
    }
  }

  return {
    projects,
    headers,
    sheetName: worksheet.name,
  };
}
