import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Script de generation du modele Excel optimise pour l'import de registre des titres
 * Version 2.0 - Optimisations UX et compatibilite parser
 *
 * Ameliorations:
 * - Colonnes obligatoires en premier
 * - Pas d'asterisques dans les noms de colonnes (compatibilite parser)
 * - Indicateurs visuels clairs (couleurs, groupes)
 * - Dropdowns pour tous les champs contraints
 * - Messages d'aide sur les cellules
 * - Lignes d'exemple marquees "EXEMPLE" (ignorees par le parser)
 * - En-tetes figes pour navigation facile
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const COLORS = {
  // Section headers
  PHYSICAL_HEADER: 'FF2563EB', // Blue
  MORAL_HEADER: 'FF059669', // Green

  // Column groups
  REQUIRED_HEADER: 'FF3B82F6', // Lighter blue
  OPTIONAL_HEADER: 'FF9CA3AF', // Gray

  // Data cells
  REQUIRED_CELL: 'FFDBEAFE', // Very light blue
  OPTIONAL_CELL: 'FFF3F4F6', // Very light gray

  // Example row
  EXAMPLE_BG: 'FFFEF3C7', // Light yellow
  EXAMPLE_TEXT: 'FF92400E', // Brown

  // Group label row
  GROUP_REQUIRED: 'FFBFDBFE', // Light blue
  GROUP_OPTIONAL: 'FFE5E7EB', // Light gray

  // Instructions
  INSTRUCTIONS_HEADER: 'FF1E40AF',
  INSTRUCTIONS_BG: 'FFF8FAFC',
};

// Personnes Physiques columns - REQUIRED FIRST
// Column names MUST match exactly what the parser expects (from standard profile)
const PHYSICAL_COLUMNS = {
  required: [
    {
      header: 'Quantité',
      key: 'quantite',
      width: 12,
      tooltip: "Nombre d'obligations souscrites (nombre entier)",
      example: 100,
    },
    {
      header: 'Montant',
      key: 'montant',
      width: 15,
      tooltip: 'Montant total investi en euros',
      example: 10000,
    },
    {
      header: 'Nom(s)',
      key: 'nom',
      width: 20,
      tooltip: "Nom(s) de famille de l'investisseur",
      example: 'Dupont',
    },
    {
      header: 'Prénom(s)',
      key: 'prenom',
      width: 20,
      tooltip: "Prénom(s) de l'investisseur",
      example: 'Jean',
    },
    {
      header: 'E-mail',
      key: 'email',
      width: 30,
      tooltip: 'Adresse e-mail valide',
      example: 'jean.dupont@exemple.fr',
    },
  ],
  optional: [
    {
      header: 'Téléphone',
      key: 'telephone',
      width: 18,
      tooltip: 'Format: +33612345678 ou 0612345678',
      example: '+33612345678',
    },
    {
      header: 'Né(e) le',
      key: 'date_naissance',
      width: 15,
      tooltip: 'Date de naissance (jj/mm/aaaa)',
      example: '15/03/1980',
    },
    {
      header: 'Lieu de naissance',
      key: 'lieu_naissance',
      width: 20,
      tooltip: 'Ville de naissance',
      example: 'Paris',
    },
    {
      header: 'Département de naissance',
      key: 'dept_naissance',
      width: 22,
      tooltip: 'Numéro du département',
      example: '75',
    },
    {
      header: 'Adresse du domicile',
      key: 'adresse',
      width: 35,
      tooltip: 'Adresse complète',
      example: '123 Rue de la République, 75001 Paris',
    },
    {
      header: 'Résidence Fiscale 1',
      key: 'residence_fiscale',
      width: 20,
      tooltip: 'Pays de résidence fiscale',
      example: 'France',
      dropdown: ['France', 'Belgique', 'Suisse', 'Luxembourg', 'Autre'],
    },
    {
      header: 'PPE',
      key: 'ppe',
      width: 10,
      tooltip: 'Personne Politiquement Exposée',
      example: 'Non',
      dropdown: ['Oui', 'Non'],
    },
    {
      header: 'Catégorisation',
      key: 'categorisation',
      width: 22,
      tooltip: 'Catégorie MiFID',
      example: 'Client Non Professionnel',
      dropdown: ['Client Professionnel', 'Client Non Professionnel', 'Contrepartie Éligible'],
    },
    {
      header: 'Date de Transfert',
      key: 'date_transfert',
      width: 18,
      tooltip: 'Date de souscription (jj/mm/aaaa)',
      example: '01/01/2024',
    },
    {
      header: "Nom d'usage",
      key: 'nom_usage',
      width: 18,
      tooltip: "Nom d'usage si différent",
      example: '',
    },
    {
      header: 'Date de Validation BS',
      key: 'date_validation',
      width: 20,
      tooltip: 'Date de validation back-office',
      example: '',
    },
    {
      header: 'PEA / PEA-PME',
      key: 'pea',
      width: 15,
      tooltip: 'Compte PEA actif',
      example: 'Non',
      dropdown: ['Oui', 'Non'],
    },
    {
      header: 'Numéro de Compte PEA / PEA-PME',
      key: 'numero_pea',
      width: 28,
      tooltip: 'Numéro du compte PEA si applicable',
      example: '',
    },
    {
      header: 'CGP',
      key: 'cgp',
      width: 22,
      tooltip: 'Nom du Conseiller en Gestion de Patrimoine',
      example: '',
    },
    {
      header: 'E-mail du CGP',
      key: 'email_cgp',
      width: 25,
      tooltip: 'E-mail du CGP',
      example: '',
    },
    {
      header: 'Code du CGP',
      key: 'code_cgp',
      width: 15,
      tooltip: 'Code identifiant du CGP',
      example: '',
    },
    {
      header: 'Siren du CGP',
      key: 'siren_cgp',
      width: 15,
      tooltip: 'SIREN du CGP (9 chiffres)',
      example: '',
    },
  ],
};

// Personnes Morales columns - REQUIRED FIRST
// Column names MUST match exactly what the parser expects (from standard profile)
const MORAL_COLUMNS = {
  required: [
    {
      header: 'Quantité',
      key: 'quantite',
      width: 12,
      tooltip: "Nombre d'obligations souscrites",
      example: 500,
    },
    {
      header: 'Montant',
      key: 'montant',
      width: 15,
      tooltip: 'Montant total investi en euros',
      example: 50000,
    },
    {
      header: 'Raison sociale',
      key: 'raison_sociale',
      width: 28,
      tooltip: "Dénomination sociale de l'entreprise",
      example: 'ACME Corporation SAS',
    },
    {
      header: 'N° SIREN',
      key: 'siren',
      width: 15,
      tooltip: 'Numéro SIREN (exactement 9 chiffres)',
      example: '123456789',
    },
    {
      header: 'E-mail du représentant légal',
      key: 'email_rep',
      width: 32,
      tooltip: 'E-mail du représentant légal',
      example: 'contact@acme-corp.fr',
    },
  ],
  optional: [
    {
      header: 'Prénom du représentant légal',
      key: 'prenom_rep',
      width: 25,
      tooltip: 'Prénom du représentant',
      example: 'Marie',
    },
    {
      header: 'Nom du représentant légal',
      key: 'nom_rep',
      width: 25,
      tooltip: 'Nom du représentant',
      example: 'Dubois',
    },
    {
      header: 'Téléphone',
      key: 'telephone',
      width: 18,
      tooltip: "Téléphone de l'entreprise",
      example: '+33123456789',
    },
    {
      header: 'Adresse du siège social',
      key: 'adresse',
      width: 38,
      tooltip: 'Adresse complète du siège',
      example: '10 Boulevard des Entreprises, 92000 Nanterre',
    },
    {
      header: 'Résidence Fiscale 1 du représentant légal',
      key: 'residence_fiscale',
      width: 32,
      tooltip: 'Pays de résidence fiscale du représentant',
      example: 'France',
      dropdown: ['France', 'Belgique', 'Suisse', 'Luxembourg', 'Autre'],
    },
    {
      header: 'Département de naissance du représentant',
      key: 'dept_naissance',
      width: 32,
      tooltip: 'Département de naissance du représentant',
      example: '75',
    },
    {
      header: 'PPE',
      key: 'ppe',
      width: 10,
      tooltip: 'Représentant Politiquement Exposé',
      example: 'Non',
      dropdown: ['Oui', 'Non'],
    },
    {
      header: 'Catégorisation',
      key: 'categorisation',
      width: 22,
      tooltip: 'Catégorie MiFID',
      example: 'Client Professionnel',
      dropdown: ['Client Professionnel', 'Client Non Professionnel', 'Contrepartie Éligible'],
    },
    {
      header: 'Date de Transfert',
      key: 'date_transfert',
      width: 18,
      tooltip: 'Date de souscription (jj/mm/aaaa)',
      example: '01/01/2024',
    },
    {
      header: 'Date de Validation BS',
      key: 'date_validation',
      width: 20,
      tooltip: 'Date de validation back-office',
      example: '',
    },
    {
      header: 'PEA / PEA-PME',
      key: 'pea',
      width: 15,
      tooltip: 'Compte PEA-PME actif',
      example: 'Non',
      dropdown: ['Oui', 'Non'],
    },
    {
      header: 'Numéro de Compte PEA / PEA-PME',
      key: 'numero_pea',
      width: 28,
      tooltip: 'Numéro du compte si applicable',
      example: '',
    },
    {
      header: 'CGP',
      key: 'cgp',
      width: 22,
      tooltip: 'Conseiller en Gestion de Patrimoine',
      example: '',
    },
    {
      header: 'E-mail du CGP',
      key: 'email_cgp',
      width: 25,
      tooltip: 'E-mail du CGP',
      example: '',
    },
    {
      header: 'Code du CGP',
      key: 'code_cgp',
      width: 15,
      tooltip: 'Code du CGP',
      example: '',
    },
    {
      header: 'Siren du CGP',
      key: 'siren_cgp',
      width: 15,
      tooltip: 'SIREN du CGP',
      example: '',
    },
  ],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Apply cell styling for headers
 */
function styleHeaderCell(cell, isRequired, sectionColor) {
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: isRequired ? sectionColor : COLORS.OPTIONAL_HEADER },
  };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
  };
}

/**
 * Apply cell styling for data entry cells
 */
function styleDataCell(cell, isRequired) {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: isRequired ? COLORS.REQUIRED_CELL : COLORS.OPTIONAL_CELL },
  };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  };
}

/**
 * Apply cell styling for example rows
 */
function styleExampleCell(cell) {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.EXAMPLE_BG },
  };
  cell.font = { italic: true, color: { argb: COLORS.EXAMPLE_TEXT } };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFFCD34D' } },
    bottom: { style: 'thin', color: { argb: 'FFFCD34D' } },
    left: { style: 'thin', color: { argb: 'FFFCD34D' } },
    right: { style: 'thin', color: { argb: 'FFFCD34D' } },
  };
}

/**
 * Add data validation dropdown to a cell
 */
function addDropdown(cell, options) {
  cell.dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: [`"${options.join(',')}"`],
    showErrorMessage: true,
    errorTitle: 'Valeur invalide',
    error: `Veuillez choisir parmi: ${options.join(', ')}`,
  };
}

/**
 * Add input message (tooltip) to a cell
 */
function addInputMessage(cell, title, message) {
  cell.dataValidation = {
    ...cell.dataValidation,
    showInputMessage: true,
    promptTitle: title,
    prompt: message,
  };
}

// =============================================================================
// MAIN GENERATION FUNCTION
// =============================================================================

async function generateTemplate() {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Finixar';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.title = 'Modele Import Registre des Titres';
  workbook.properties.subject = 'Import de donnees investisseurs';
  workbook.properties.company = 'Finixar';

  // =============================================================================
  // SHEET 1: REGISTRE (Data Entry) - MUST BE FIRST FOR PARSER
  // =============================================================================
  const registreSheet = workbook.addWorksheet('Registre', {
    properties: { tabColor: { argb: 'FF10B981' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }], // Freeze first 3 rows
  });

  const allPhysicalCols = [...PHYSICAL_COLUMNS.required, ...PHYSICAL_COLUMNS.optional];
  const allMoralCols = [...MORAL_COLUMNS.required, ...MORAL_COLUMNS.optional];
  const totalCols = Math.max(allPhysicalCols.length, allMoralCols.length);

  // ----- PERSONNES PHYSIQUES SECTION -----
  let currentRow = 1;

  // Row 1: Section header "Personnes Physiques"
  registreSheet.mergeCells(currentRow, 1, currentRow, totalCols);
  const ppTitle = registreSheet.getCell(currentRow, 1);
  ppTitle.value = 'Personnes Physiques';
  ppTitle.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  ppTitle.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.PHYSICAL_HEADER },
  };
  ppTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  registreSheet.getRow(currentRow).height = 28;
  currentRow++;

  // Row 2: Group labels (OBLIGATOIRE | OPTIONNEL)
  const ppRequiredCount = PHYSICAL_COLUMNS.required.length;
  const ppOptionalCount = PHYSICAL_COLUMNS.optional.length;

  // Merge cells for "OBLIGATOIRE"
  registreSheet.mergeCells(currentRow, 1, currentRow, ppRequiredCount);
  const ppRequiredLabel = registreSheet.getCell(currentRow, 1);
  ppRequiredLabel.value = 'OBLIGATOIRE';
  ppRequiredLabel.font = { bold: true, size: 10, color: { argb: 'FF1E40AF' } };
  ppRequiredLabel.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.GROUP_REQUIRED },
  };
  ppRequiredLabel.alignment = { vertical: 'middle', horizontal: 'center' };

  // Merge cells for "OPTIONNEL"
  if (ppOptionalCount > 0) {
    registreSheet.mergeCells(currentRow, ppRequiredCount + 1, currentRow, totalCols);
    const ppOptionalLabel = registreSheet.getCell(currentRow, ppRequiredCount + 1);
    ppOptionalLabel.value = 'OPTIONNEL';
    ppOptionalLabel.font = { bold: true, size: 10, color: { argb: 'FF4B5563' } };
    ppOptionalLabel.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.GROUP_OPTIONAL },
    };
    ppOptionalLabel.alignment = { vertical: 'middle', horizontal: 'center' };
  }
  registreSheet.getRow(currentRow).height = 22;
  currentRow++;

  // Row 3: Column headers
  allPhysicalCols.forEach((col, index) => {
    const cell = registreSheet.getCell(currentRow, index + 1);
    cell.value = col.header;
    const isRequired = index < ppRequiredCount;
    styleHeaderCell(cell, isRequired, COLORS.REQUIRED_HEADER);
    registreSheet.getColumn(index + 1).width = col.width;

    // Add input message to header
    if (col.tooltip) {
      addInputMessage(cell, col.header, col.tooltip);
    }
  });
  registreSheet.getRow(currentRow).height = 35;
  currentRow++;

  // Row 4: Example row (marked with EXEMPLE)
  allPhysicalCols.forEach((col, index) => {
    const cell = registreSheet.getCell(currentRow, index + 1);
    // First cell gets "EXEMPLE" prefix for parser to skip
    if (index === 0) {
      cell.value = 'EXEMPLE';
    } else {
      cell.value = col.example;
    }
    styleExampleCell(cell);

    // Add dropdown if applicable
    if (col.dropdown) {
      addDropdown(cell, col.dropdown);
    }
  });
  registreSheet.getRow(currentRow).height = 22;
  currentRow++;

  // Rows 5-24: Empty data entry rows (20 rows)
  const ppDataStartRow = currentRow;
  for (let i = 0; i < 20; i++) {
    allPhysicalCols.forEach((col, colIndex) => {
      const cell = registreSheet.getCell(currentRow, colIndex + 1);
      const isRequired = colIndex < ppRequiredCount;
      styleDataCell(cell, isRequired);

      // Add dropdown validation
      if (col.dropdown) {
        addDropdown(cell, col.dropdown);
      }

      // Add tooltip
      if (col.tooltip) {
        addInputMessage(cell, col.header, col.tooltip);
      }
    });
    registreSheet.getRow(currentRow).height = 22;
    currentRow++;
  }

  // Add empty row before next section
  currentRow += 2;

  // ----- PERSONNES MORALES SECTION -----
  const moralStartRow = currentRow;

  // Row N: Section header "Personnes Morales"
  registreSheet.mergeCells(currentRow, 1, currentRow, totalCols);
  const pmTitle = registreSheet.getCell(currentRow, 1);
  pmTitle.value = 'Personnes Morales';
  pmTitle.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  pmTitle.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.MORAL_HEADER },
  };
  pmTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  registreSheet.getRow(currentRow).height = 28;
  currentRow++;

  // Row N+1: Group labels
  const pmRequiredCount = MORAL_COLUMNS.required.length;
  const pmOptionalCount = MORAL_COLUMNS.optional.length;

  registreSheet.mergeCells(currentRow, 1, currentRow, pmRequiredCount);
  const pmRequiredLabel = registreSheet.getCell(currentRow, 1);
  pmRequiredLabel.value = 'OBLIGATOIRE';
  pmRequiredLabel.font = { bold: true, size: 10, color: { argb: 'FF065F46' } };
  pmRequiredLabel.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD1FAE5' },
  };
  pmRequiredLabel.alignment = { vertical: 'middle', horizontal: 'center' };

  if (pmOptionalCount > 0) {
    registreSheet.mergeCells(currentRow, pmRequiredCount + 1, currentRow, totalCols);
    const pmOptionalLabel = registreSheet.getCell(currentRow, pmRequiredCount + 1);
    pmOptionalLabel.value = 'OPTIONNEL';
    pmOptionalLabel.font = { bold: true, size: 10, color: { argb: 'FF4B5563' } };
    pmOptionalLabel.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.GROUP_OPTIONAL },
    };
    pmOptionalLabel.alignment = { vertical: 'middle', horizontal: 'center' };
  }
  registreSheet.getRow(currentRow).height = 22;
  currentRow++;

  // Row N+2: Column headers
  allMoralCols.forEach((col, index) => {
    const cell = registreSheet.getCell(currentRow, index + 1);
    cell.value = col.header;
    const isRequired = index < pmRequiredCount;
    styleHeaderCell(cell, isRequired, 'FF10B981');
    registreSheet.getColumn(index + 1).width = Math.max(
      registreSheet.getColumn(index + 1).width || 0,
      col.width
    );

    if (col.tooltip) {
      addInputMessage(cell, col.header, col.tooltip);
    }
  });
  registreSheet.getRow(currentRow).height = 35;
  currentRow++;

  // Row N+3: Example row
  allMoralCols.forEach((col, index) => {
    const cell = registreSheet.getCell(currentRow, index + 1);
    if (index === 0) {
      cell.value = 'EXEMPLE';
    } else {
      cell.value = col.example;
    }
    styleExampleCell(cell);

    if (col.dropdown) {
      addDropdown(cell, col.dropdown);
    }
  });
  registreSheet.getRow(currentRow).height = 22;
  currentRow++;

  // Rows N+4 to N+23: Empty data entry rows (20 rows)
  for (let i = 0; i < 20; i++) {
    allMoralCols.forEach((col, colIndex) => {
      const cell = registreSheet.getCell(currentRow, colIndex + 1);
      const isRequired = colIndex < pmRequiredCount;
      styleDataCell(cell, isRequired);

      if (col.dropdown) {
        addDropdown(cell, col.dropdown);
      }

      if (col.tooltip) {
        addInputMessage(cell, col.header, col.tooltip);
      }
    });
    registreSheet.getRow(currentRow).height = 22;
    currentRow++;
  }

  // =============================================================================
  // SHEET 2: INSTRUCTIONS
  // =============================================================================
  const instructionsSheet = workbook.addWorksheet('Instructions', {
    properties: { tabColor: { argb: 'FF2563EB' } },
  });

  instructionsSheet.getColumn(1).width = 80;

  // Title
  instructionsSheet.mergeCells('A1:A2');
  const titleCell = instructionsSheet.getCell('A1');
  titleCell.value = 'GUIDE D\'UTILISATION';
  titleCell.font = { size: 18, bold: true, color: { argb: COLORS.INSTRUCTIONS_HEADER } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.INSTRUCTIONS_BG },
  };

  let instRow = 4;

  const addSection = (title, items) => {
    const sectionCell = instructionsSheet.getCell(`A${instRow}`);
    sectionCell.value = title;
    sectionCell.font = { size: 13, bold: true, color: { argb: COLORS.INSTRUCTIONS_HEADER } };
    instRow++;

    items.forEach(item => {
      const itemCell = instructionsSheet.getCell(`A${instRow}`);
      itemCell.value = item;
      itemCell.alignment = { wrapText: true };
      instRow++;
    });
    instRow++;
  };

  addSection('ETAPES', [
    '1. Allez sur l\'onglet "Registre" (premier onglet)',
    '2. Remplissez la section "Personnes Physiques" pour les investisseurs individuels',
    '3. Remplissez la section "Personnes Morales" pour les entreprises',
    '4. Supprimez les lignes "EXEMPLE" avant l\'import (ou laissez-les, elles seront ignorees)',
    '5. Enregistrez le fichier et importez-le dans Finixar',
  ]);

  addSection('COLONNES', [
    'Les colonnes sur fond BLEU sont OBLIGATOIRES - vous devez les remplir',
    'Les colonnes sur fond GRIS sont OPTIONNELLES - remplissez-les si vous avez l\'information',
    'Les lignes JAUNES sont des exemples - elles ne seront pas importees',
  ]);

  addSection('FORMATS ATTENDUS', [
    'Dates: jj/mm/aaaa (exemple: 15/03/1980)',
    'E-mail: format valide avec @ (exemple: nom@domaine.fr)',
    'SIREN: exactement 9 chiffres (exemple: 123456789)',
    'Telephone: avec ou sans indicatif (exemple: +33612345678 ou 0612345678)',
    'Montants: nombres (exemple: 10000 ou 10000.50)',
  ]);

  addSection('CONSEILS', [
    'Utilisez les listes deroulantes quand elles sont disponibles (PPE, Categorisation, etc.)',
    'Survolez les en-tetes de colonnes pour voir les explications',
    'Ne modifiez pas les en-tetes de colonnes',
    'Gardez la structure avec les deux sections separees',
  ]);

  addSection('SUPPORT', [
    'En cas de probleme, contactez le support Finixar',
    'Consultez la documentation en ligne pour plus de details',
  ]);

  // Protect instructions sheet
  await instructionsSheet.protect('finixar', {
    selectLockedCells: true,
    selectUnlockedCells: true,
  });

  // =============================================================================
  // SHEET 3: AIDE (Field Reference)
  // =============================================================================
  const helpSheet = workbook.addWorksheet('Aide', {
    properties: { tabColor: { argb: 'FFFBBF24' } },
  });

  helpSheet.getColumn(1).width = 35;
  helpSheet.getColumn(2).width = 60;
  helpSheet.getColumn(3).width = 15;

  // Title
  helpSheet.mergeCells('A1:C1');
  const helpTitle = helpSheet.getCell('A1');
  helpTitle.value = 'DICTIONNAIRE DES CHAMPS';
  helpTitle.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  helpTitle.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFBBF24' },
  };
  helpTitle.alignment = { vertical: 'middle', horizontal: 'center' };

  // Headers
  let helpRow = 3;
  ['Champ', 'Description', 'Obligatoire'].forEach((header, index) => {
    const cell = helpSheet.getCell(helpRow, index + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };
  });
  helpRow++;

  // Personnes Physiques section
  const ppSectionCell = helpSheet.getCell(`A${helpRow}`);
  ppSectionCell.value = 'PERSONNES PHYSIQUES';
  ppSectionCell.font = { bold: true, color: { argb: COLORS.PHYSICAL_HEADER } };
  helpRow++;

  allPhysicalCols.forEach((col, index) => {
    helpSheet.getCell(helpRow, 1).value = col.header;
    helpSheet.getCell(helpRow, 2).value = col.tooltip;
    helpSheet.getCell(helpRow, 2).alignment = { wrapText: true };
    helpSheet.getCell(helpRow, 3).value = index < ppRequiredCount ? 'Oui' : 'Non';
    helpSheet.getCell(helpRow, 3).font = {
      color: { argb: index < ppRequiredCount ? 'FF059669' : 'FF6B7280' },
    };
    helpRow++;
  });

  helpRow++;

  // Personnes Morales section
  const pmSectionCell = helpSheet.getCell(`A${helpRow}`);
  pmSectionCell.value = 'PERSONNES MORALES';
  pmSectionCell.font = { bold: true, color: { argb: COLORS.MORAL_HEADER } };
  helpRow++;

  allMoralCols.forEach((col, index) => {
    helpSheet.getCell(helpRow, 1).value = col.header;
    helpSheet.getCell(helpRow, 2).value = col.tooltip;
    helpSheet.getCell(helpRow, 2).alignment = { wrapText: true };
    helpSheet.getCell(helpRow, 3).value = index < pmRequiredCount ? 'Oui' : 'Non';
    helpSheet.getCell(helpRow, 3).font = {
      color: { argb: index < pmRequiredCount ? 'FF059669' : 'FF6B7280' },
    };
    helpRow++;
  });

  // Protect help sheet
  await helpSheet.protect('finixar', {
    selectLockedCells: true,
    selectUnlockedCells: true,
  });

  // =============================================================================
  // SAVE FILE
  // =============================================================================
  const outputPath = join(__dirname, '..', 'public', 'templates', 'Modele_Registre_Titres.xlsx');
  await workbook.xlsx.writeFile(outputPath);

  console.log('');
  console.log('Modele Excel v2.0 genere avec succes!');
  console.log(`Fichier: ${outputPath}`);
  console.log('');
  console.log('Ameliorations:');
  console.log('  - Colonnes obligatoires en premier');
  console.log('  - Pas d\'asterisques (compatibilite parser)');
  console.log('  - Labels OBLIGATOIRE/OPTIONNEL');
  console.log('  - Dropdowns pour PPE, Categorisation, PEA, Residence Fiscale');
  console.log('  - Tooltips sur toutes les cellules');
  console.log('  - Lignes d\'exemple marquees "EXEMPLE"');
  console.log('  - En-tetes figes');
  console.log('');
}

// Run
generateTemplate().catch(err => {
  console.error('Erreur lors de la generation:', err);
  process.exit(1);
});
