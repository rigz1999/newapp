import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Script de generation du modele Excel optimise pour l'import de registre des titres
 * Version 2.1 - Fixed validation issues
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const COLORS = {
  PHYSICAL_HEADER: 'FF2563EB',
  MORAL_HEADER: 'FF059669',
  REQUIRED_HEADER: 'FF3B82F6',
  OPTIONAL_HEADER: 'FF9CA3AF',
  REQUIRED_CELL: 'FFDBEAFE',
  OPTIONAL_CELL: 'FFF3F4F6',
  EXAMPLE_BG: 'FFFEF3C7',
  EXAMPLE_TEXT: 'FF92400E',
  GROUP_REQUIRED: 'FFBFDBFE',
  GROUP_OPTIONAL: 'FFE5E7EB',
};

// Column definitions with exact names matching parser profile
const PHYSICAL_COLUMNS = {
  required: [
    { header: 'Quantité', width: 12, example: 100 },
    { header: 'Montant', width: 15, example: 10000 },
    { header: 'Nom(s)', width: 20, example: 'Dupont' },
    { header: 'Prénom(s)', width: 20, example: 'Jean' },
    { header: 'E-mail', width: 30, example: 'jean.dupont@exemple.fr' },
  ],
  optional: [
    { header: 'Téléphone', width: 18, example: '+33612345678' },
    { header: 'Né(e) le', width: 15, example: '15/03/1980' },
    { header: 'Lieu de naissance', width: 20, example: 'Paris' },
    { header: 'Département de naissance', width: 22, example: '75' },
    { header: 'Adresse du domicile', width: 35, example: '123 Rue de la République, 75001 Paris' },
    { header: 'Résidence Fiscale 1', width: 20, example: 'France', dropdown: ['France', 'Belgique', 'Suisse', 'Luxembourg', 'Autre'] },
    { header: 'PPE', width: 10, example: 'Non', dropdown: ['Oui', 'Non'] },
    { header: 'Catégorisation', width: 22, example: 'Client Non Professionnel', dropdown: ['Client Professionnel', 'Client Non Professionnel', 'Contrepartie Éligible'] },
    { header: 'Date de Transfert', width: 18, example: '01/01/2024' },
    { header: "Nom d'usage", width: 18, example: '' },
    { header: 'Date de Validation BS', width: 20, example: '' },
    { header: 'PEA / PEA-PME', width: 15, example: 'Non', dropdown: ['Oui', 'Non'] },
    { header: 'Numéro de Compte PEA / PEA-PME', width: 28, example: '' },
    { header: 'CGP', width: 22, example: '' },
    { header: 'E-mail du CGP', width: 25, example: '' },
    { header: 'Code du CGP', width: 15, example: '' },
    { header: 'Siren du CGP', width: 15, example: '' },
  ],
};

const MORAL_COLUMNS = {
  required: [
    { header: 'Quantité', width: 12, example: 500 },
    { header: 'Montant', width: 15, example: 50000 },
    { header: 'Raison sociale', width: 28, example: 'ACME Corporation SAS' },
    { header: 'N° SIREN', width: 15, example: '123456789' },
    { header: 'E-mail du représentant légal', width: 32, example: 'contact@acme-corp.fr' },
  ],
  optional: [
    { header: 'Prénom du représentant légal', width: 25, example: 'Marie' },
    { header: 'Nom du représentant légal', width: 25, example: 'Dubois' },
    { header: 'Téléphone', width: 18, example: '+33123456789' },
    { header: 'Adresse du siège social', width: 38, example: '10 Boulevard des Entreprises, 92000 Nanterre' },
    { header: 'Résidence Fiscale 1 du représentant légal', width: 32, example: 'France', dropdown: ['France', 'Belgique', 'Suisse', 'Luxembourg', 'Autre'] },
    { header: 'Département de naissance du représentant', width: 32, example: '75' },
    { header: 'PPE', width: 10, example: 'Non', dropdown: ['Oui', 'Non'] },
    { header: 'Catégorisation', width: 22, example: 'Client Professionnel', dropdown: ['Client Professionnel', 'Client Non Professionnel', 'Contrepartie Éligible'] },
    { header: 'Date de Transfert', width: 18, example: '01/01/2024' },
    { header: 'Date de Validation BS', width: 20, example: '' },
    { header: 'PEA / PEA-PME', width: 15, example: 'Non', dropdown: ['Oui', 'Non'] },
    { header: 'Numéro de Compte PEA / PEA-PME', width: 28, example: '' },
    { header: 'CGP', width: 22, example: '' },
    { header: 'E-mail du CGP', width: 25, example: '' },
    { header: 'Code du CGP', width: 15, example: '' },
    { header: 'Siren du CGP', width: 15, example: '' },
  ],
};

// =============================================================================
// MAIN GENERATION FUNCTION
// =============================================================================

async function generateTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Finixar';
  workbook.created = new Date();

  // =============================================================================
  // SHEET 1: REGISTRE
  // =============================================================================
  const sheet = workbook.addWorksheet('Registre', {
    properties: { tabColor: { argb: 'FF10B981' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }],
  });

  const ppCols = [...PHYSICAL_COLUMNS.required, ...PHYSICAL_COLUMNS.optional];
  const pmCols = [...MORAL_COLUMNS.required, ...MORAL_COLUMNS.optional];
  const totalCols = Math.max(ppCols.length, pmCols.length);
  const ppReqCount = PHYSICAL_COLUMNS.required.length;
  const pmReqCount = MORAL_COLUMNS.required.length;

  // Set column widths
  ppCols.forEach((col, i) => {
    sheet.getColumn(i + 1).width = col.width;
  });

  let row = 1;

  // ----- PERSONNES PHYSIQUES -----

  // Section header
  sheet.mergeCells(row, 1, row, totalCols);
  const ppTitle = sheet.getCell(row, 1);
  ppTitle.value = 'Personnes Physiques';
  ppTitle.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  ppTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.PHYSICAL_HEADER } };
  ppTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(row).height = 28;
  row++;

  // Group labels
  sheet.mergeCells(row, 1, row, ppReqCount);
  const ppReqLabel = sheet.getCell(row, 1);
  ppReqLabel.value = 'OBLIGATOIRE';
  ppReqLabel.font = { bold: true, size: 10, color: { argb: 'FF1E40AF' } };
  ppReqLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GROUP_REQUIRED } };
  ppReqLabel.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells(row, ppReqCount + 1, row, totalCols);
  const ppOptLabel = sheet.getCell(row, ppReqCount + 1);
  ppOptLabel.value = 'OPTIONNEL';
  ppOptLabel.font = { bold: true, size: 10, color: { argb: 'FF4B5563' } };
  ppOptLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GROUP_OPTIONAL } };
  ppOptLabel.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(row).height = 22;
  row++;

  // Column headers
  const ppHeaderRow = row;
  ppCols.forEach((col, i) => {
    const cell = sheet.getCell(row, i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i < ppReqCount ? COLORS.REQUIRED_HEADER : COLORS.OPTIONAL_HEADER } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  sheet.getRow(row).height = 35;
  row++;

  // Example row
  const ppExampleRow = row;
  ppCols.forEach((col, i) => {
    const cell = sheet.getCell(row, i + 1);
    cell.value = i === 0 ? 'EXEMPLE' : col.example;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.EXAMPLE_BG } };
    cell.font = { italic: true, color: { argb: COLORS.EXAMPLE_TEXT } };
  });
  sheet.getRow(row).height = 22;
  row++;

  // Data entry rows
  const ppDataStart = row;
  for (let i = 0; i < 20; i++) {
    ppCols.forEach((col, colIdx) => {
      const cell = sheet.getCell(row, colIdx + 1);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colIdx < ppReqCount ? COLORS.REQUIRED_CELL : COLORS.OPTIONAL_CELL } };
    });
    sheet.getRow(row).height = 22;
    row++;
  }
  const ppDataEnd = row - 1;

  // Add dropdowns for PP section (apply to range, not individual cells)
  ppCols.forEach((col, colIdx) => {
    if (col.dropdown) {
      const colLetter = String.fromCharCode(65 + colIdx);
      // Apply to example row
      sheet.getCell(`${colLetter}${ppExampleRow}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${col.dropdown.join(',')}"`],
      };
      // Apply to data range
      for (let r = ppDataStart; r <= ppDataEnd; r++) {
        sheet.getCell(`${colLetter}${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${col.dropdown.join(',')}"`],
        };
      }
    }
  });

  row += 2; // Gap before next section

  // ----- PERSONNES MORALES -----

  // Section header
  sheet.mergeCells(row, 1, row, totalCols);
  const pmTitle = sheet.getCell(row, 1);
  pmTitle.value = 'Personnes Morales';
  pmTitle.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  pmTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.MORAL_HEADER } };
  pmTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(row).height = 28;
  row++;

  // Group labels
  sheet.mergeCells(row, 1, row, pmReqCount);
  const pmReqLabel = sheet.getCell(row, 1);
  pmReqLabel.value = 'OBLIGATOIRE';
  pmReqLabel.font = { bold: true, size: 10, color: { argb: 'FF065F46' } };
  pmReqLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
  pmReqLabel.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells(row, pmReqCount + 1, row, totalCols);
  const pmOptLabel = sheet.getCell(row, pmReqCount + 1);
  pmOptLabel.value = 'OPTIONNEL';
  pmOptLabel.font = { bold: true, size: 10, color: { argb: 'FF4B5563' } };
  pmOptLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GROUP_OPTIONAL } };
  pmOptLabel.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(row).height = 22;
  row++;

  // Column headers
  pmCols.forEach((col, i) => {
    const cell = sheet.getCell(row, i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i < pmReqCount ? 'FF10B981' : COLORS.OPTIONAL_HEADER } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    // Update column width if PM column is wider
    if (col.width > (sheet.getColumn(i + 1).width || 0)) {
      sheet.getColumn(i + 1).width = col.width;
    }
  });
  sheet.getRow(row).height = 35;
  row++;

  // Example row
  const pmExampleRow = row;
  pmCols.forEach((col, i) => {
    const cell = sheet.getCell(row, i + 1);
    cell.value = i === 0 ? 'EXEMPLE' : col.example;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.EXAMPLE_BG } };
    cell.font = { italic: true, color: { argb: COLORS.EXAMPLE_TEXT } };
  });
  sheet.getRow(row).height = 22;
  row++;

  // Data entry rows
  const pmDataStart = row;
  for (let i = 0; i < 20; i++) {
    pmCols.forEach((col, colIdx) => {
      const cell = sheet.getCell(row, colIdx + 1);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colIdx < pmReqCount ? 'FFD1FAE5' : COLORS.OPTIONAL_CELL } };
    });
    sheet.getRow(row).height = 22;
    row++;
  }
  const pmDataEnd = row - 1;

  // Add dropdowns for PM section
  pmCols.forEach((col, colIdx) => {
    if (col.dropdown) {
      const colLetter = String.fromCharCode(65 + colIdx);
      sheet.getCell(`${colLetter}${pmExampleRow}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${col.dropdown.join(',')}"`],
      };
      for (let r = pmDataStart; r <= pmDataEnd; r++) {
        sheet.getCell(`${colLetter}${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${col.dropdown.join(',')}"`],
        };
      }
    }
  });

  // =============================================================================
  // SHEET 2: INSTRUCTIONS
  // =============================================================================
  const instSheet = workbook.addWorksheet('Instructions', {
    properties: { tabColor: { argb: 'FF2563EB' } },
  });
  instSheet.getColumn(1).width = 80;

  instSheet.getCell('A1').value = 'GUIDE D\'UTILISATION';
  instSheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FF1E40AF' } };

  const instructions = [
    '',
    'ETAPES:',
    '1. Allez sur l\'onglet "Registre" (premier onglet)',
    '2. Remplissez la section "Personnes Physiques" pour les investisseurs individuels',
    '3. Remplissez la section "Personnes Morales" pour les entreprises',
    '4. Les lignes jaunes "EXEMPLE" seront ignorées lors de l\'import',
    '5. Enregistrez et importez le fichier dans Finixar',
    '',
    'COLONNES:',
    '- Fond BLEU/VERT = OBLIGATOIRE',
    '- Fond GRIS = OPTIONNEL',
    '- Fond JAUNE = Exemple (ignoré)',
    '',
    'FORMATS:',
    '- Dates: jj/mm/aaaa (ex: 15/03/1980)',
    '- E-mail: format valide avec @',
    '- SIREN: exactement 9 chiffres',
    '- Téléphone: +33612345678 ou 0612345678',
    '',
    'CONSEILS:',
    '- Utilisez les listes déroulantes (PPE, Catégorisation, etc.)',
    '- Ne modifiez pas les en-têtes de colonnes',
    '- Gardez les deux sections séparées',
  ];

  instructions.forEach((text, i) => {
    instSheet.getCell(`A${i + 1}`).value = text;
    if (text.endsWith(':')) {
      instSheet.getCell(`A${i + 1}`).font = { bold: true, color: { argb: 'FF1E40AF' } };
    }
  });

  // =============================================================================
  // SHEET 3: AIDE
  // =============================================================================
  const helpSheet = workbook.addWorksheet('Aide', {
    properties: { tabColor: { argb: 'FFFBBF24' } },
  });
  helpSheet.getColumn(1).width = 35;
  helpSheet.getColumn(2).width = 15;

  helpSheet.getCell('A1').value = 'CHAMPS OBLIGATOIRES';
  helpSheet.getCell('A1').font = { size: 14, bold: true };

  let helpRow = 3;
  helpSheet.getCell(`A${helpRow}`).value = 'Personnes Physiques:';
  helpSheet.getCell(`A${helpRow}`).font = { bold: true, color: { argb: COLORS.PHYSICAL_HEADER } };
  helpRow++;
  PHYSICAL_COLUMNS.required.forEach(col => {
    helpSheet.getCell(`A${helpRow}`).value = col.header;
    helpRow++;
  });

  helpRow++;
  helpSheet.getCell(`A${helpRow}`).value = 'Personnes Morales:';
  helpSheet.getCell(`A${helpRow}`).font = { bold: true, color: { argb: COLORS.MORAL_HEADER } };
  helpRow++;
  MORAL_COLUMNS.required.forEach(col => {
    helpSheet.getCell(`A${helpRow}`).value = col.header;
    helpRow++;
  });

  // =============================================================================
  // SAVE
  // =============================================================================
  const outputPath = join(__dirname, '..', 'public', 'templates', 'Modele_Registre_Titres.xlsx');
  await workbook.xlsx.writeFile(outputPath);

  console.log('');
  console.log('Modele Excel v2.1 genere avec succes!');
  console.log(`Fichier: ${outputPath}`);
  console.log('');
}

generateTemplate().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});
