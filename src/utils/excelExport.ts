// ============================================
// Excel Export Utility
// Path: src/utils/excelExport.ts
//
// Uses static import for compatibility with WebContainer/bolt.new
// ============================================

import * as ExcelJS from 'exceljs';

/**
 * Create a new Excel workbook
 */
export function createWorkbook(): ExcelJS.Workbook {
  return new ExcelJS.Workbook();
}

/**
 * Export workbook to blob
 */
export async function workbookToBlob(workbook: ExcelJS.Workbook): Promise<Blob> {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Trigger download of Excel file
 */
export function downloadExcelFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Complete Excel export helper
 * Creates workbook, generates file, and triggers download
 */
export async function exportToExcel(
  setupWorkbook: (workbook: ExcelJS.Workbook) => Promise<void> | void,
  filename: string
): Promise<void> {
  const workbook = createWorkbook();
  await Promise.resolve(setupWorkbook(workbook));
  const blob = await workbookToBlob(workbook);
  downloadExcelFile(blob, filename);
}

/**
 * Generate and download the registre import template
 * Professional styling with reduced fields
 */
export async function downloadRegistreTemplate(): Promise<void> {
  // Professional color palette
  const colors = {
    headerBg: 'FF374151', // Dark slate gray
    headerText: 'FFFFFFFF', // White
    sectionTitle: 'FF1F2937', // Darker gray for section titles
    exampleBg: 'FFF9FAFB', // Very light gray for example row
    exampleText: 'FF6B7280', // Medium gray for example text
    border: 'FFE5E7EB', // Light gray border
    white: 'FFFFFFFF',
  };

  await exportToExcel(workbook => {
    workbook.creator = 'Finixar';
    workbook.created = new Date();

    // ===== Sheet 1: Instructions =====
    const instructionsSheet = workbook.addWorksheet('Instructions', {
      properties: { tabColor: { argb: colors.headerBg } },
    });

    instructionsSheet.getColumn(1).width = 80;

    // Title
    instructionsSheet.mergeCells('A1:A2');
    const titleCell = instructionsSheet.getCell('A1');
    titleCell.value = 'MODELE REGISTRE DES TITRES';
    titleCell.font = { size: 18, bold: true, color: { argb: colors.sectionTitle } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

    let row = 4;

    instructionsSheet.getCell(`A${row}`).value = 'A propos de ce modele';
    instructionsSheet.getCell(`A${row}`).font = {
      size: 12,
      bold: true,
      color: { argb: colors.sectionTitle },
    };
    row++;

    instructionsSheet.getCell(`A${row}`).value =
      "Ce modele Excel vous permet d'importer votre registre des titres dans Finixar.";
    instructionsSheet.getCell(`A${row}`).alignment = { wrapText: true };
    row += 2;

    instructionsSheet.getCell(`A${row}`).value = "Instructions d'utilisation";
    instructionsSheet.getCell(`A${row}`).font = {
      size: 12,
      bold: true,
      color: { argb: colors.sectionTitle },
    };
    row++;

    const instructions = [
      '1. Ouvrez l\'onglet "Registre" en bas de l\'ecran',
      '2. Remplissez les sections "Personnes Physiques" et "Personnes Morales"',
      "3. Les champs marques d'un asterisque (*) sont obligatoires",
      '4. Ne modifiez pas les en-tetes de colonnes',
      '5. Une fois termine, enregistrez et importez le fichier dans Finixar',
    ];

    instructions.forEach(instruction => {
      instructionsSheet.getCell(`A${row}`).value = instruction;
      row++;
    });
    row++;

    instructionsSheet.getCell(`A${row}`).value = 'Formats attendus';
    instructionsSheet.getCell(`A${row}`).font = {
      size: 12,
      bold: true,
      color: { argb: colors.sectionTitle },
    };
    row++;

    const formats = [
      'Dates : jj/mm/aaaa (exemple : 01/01/2024)',
      'E-mail : format valide avec @',
      'SIREN : exactement 9 chiffres',
      'Telephone : avec ou sans indicatif (+33)',
    ];
    formats.forEach(format => {
      instructionsSheet.getCell(`A${row}`).value = `- ${format}`;
      row++;
    });

    // ===== Sheet 2: Registre (data entry) =====
    const registreSheet = workbook.addWorksheet('Registre', {
      properties: { tabColor: { argb: colors.headerBg } },
    });

    // Physical persons columns (reduced - no birth info)
    const physicalColumns = [
      { header: 'Quantite *', key: 'quantite', width: 12 },
      { header: 'Montant *', key: 'montant', width: 14 },
      { header: 'Nom *', key: 'nom', width: 18 },
      { header: 'Prenom *', key: 'prenom', width: 18 },
      { header: 'E-mail *', key: 'email', width: 28 },
      { header: 'Telephone *', key: 'telephone', width: 16 },
      { header: 'Adresse *', key: 'adresse', width: 35 },
      { header: 'Residence Fiscale *', key: 'residence_fiscale', width: 18 },
      { header: 'Date de Transfert *', key: 'date_transfert', width: 18 },
      { header: 'CGP', key: 'cgp', width: 20 },
      { header: 'E-mail CGP', key: 'email_cgp', width: 25 },
    ];

    // Physical persons section title
    const ppColCount = physicalColumns.length;
    registreSheet.mergeCells(1, 1, 1, ppColCount);
    const ppTitle = registreSheet.getCell('A1');
    ppTitle.value = 'PERSONNES PHYSIQUES';
    ppTitle.font = { size: 12, bold: true, color: { argb: colors.headerText } };
    ppTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.sectionTitle } };
    ppTitle.alignment = { vertical: 'middle', horizontal: 'center' };

    // Physical persons headers
    let colIndex = 1;
    physicalColumns.forEach(col => {
      const cell = registreSheet.getCell(2, colIndex);
      cell.value = col.header;
      cell.font = { bold: true, size: 10, color: { argb: colors.headerText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: colors.border } },
        bottom: { style: 'thin', color: { argb: colors.border } },
        left: { style: 'thin', color: { argb: colors.border } },
        right: { style: 'thin', color: { argb: colors.border } },
      };
      registreSheet.getColumn(colIndex).width = col.width;
      colIndex++;
    });

    // Example row for physical persons
    const examplePhysical = {
      quantite: 100,
      montant: 10000,
      nom: 'Dupont',
      prenom: 'Jean',
      email: 'jean.dupont@exemple.fr',
      telephone: '+33612345678',
      adresse: '123 Rue de la Republique, 75001 Paris',
      residence_fiscale: 'France',
      date_transfert: '01/01/2024',
      cgp: 'Cabinet Conseil',
      email_cgp: 'contact@cabinet.fr',
    };

    colIndex = 1;
    physicalColumns.forEach(col => {
      const cell = registreSheet.getCell(3, colIndex);
      cell.value = examplePhysical[col.key as keyof typeof examplePhysical];
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.exampleBg } };
      cell.font = { italic: true, size: 10, color: { argb: colors.exampleText } };
      cell.border = {
        top: { style: 'thin', color: { argb: colors.border } },
        bottom: { style: 'thin', color: { argb: colors.border } },
        left: { style: 'thin', color: { argb: colors.border } },
        right: { style: 'thin', color: { argb: colors.border } },
      };
      colIndex++;
    });

    // Empty rows for data entry (physical) - white background with borders
    for (let i = 0; i < 20; i++) {
      const rowNum = 4 + i;
      physicalColumns.forEach((_, idx) => {
        const cell = registreSheet.getCell(rowNum, idx + 1);
        cell.value = null;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.white } };
        cell.border = {
          top: { style: 'thin', color: { argb: colors.border } },
          bottom: { style: 'thin', color: { argb: colors.border } },
          left: { style: 'thin', color: { argb: colors.border } },
          right: { style: 'thin', color: { argb: colors.border } },
        };
      });
    }

    // === Legal entities section ===
    const moralStartRow = 26;

    // Legal entities columns (keep representative names, remove birth dept)
    const moralColumns = [
      { header: 'Quantite *', key: 'quantite', width: 12 },
      { header: 'Montant *', key: 'montant', width: 14 },
      { header: 'Raison sociale *', key: 'raison_sociale', width: 25 },
      { header: 'SIREN *', key: 'siren', width: 14 },
      { header: 'E-mail representant *', key: 'email_rep', width: 28 },
      { header: 'Prenom representant', key: 'prenom_rep', width: 18 },
      { header: 'Nom representant', key: 'nom_rep', width: 18 },
      { header: 'Telephone *', key: 'telephone', width: 16 },
      { header: 'Adresse siege *', key: 'adresse', width: 35 },
      { header: 'Date de Transfert *', key: 'date_transfert', width: 18 },
      { header: 'CGP', key: 'cgp', width: 20 },
      { header: 'E-mail CGP', key: 'email_cgp', width: 25 },
    ];

    const pmColCount = moralColumns.length;
    registreSheet.mergeCells(moralStartRow, 1, moralStartRow, pmColCount);
    const pmTitle = registreSheet.getCell(`A${moralStartRow}`);
    pmTitle.value = 'PERSONNES MORALES';
    pmTitle.font = { size: 12, bold: true, color: { argb: colors.headerText } };
    pmTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.sectionTitle } };
    pmTitle.alignment = { vertical: 'middle', horizontal: 'center' };

    // Legal entities headers
    colIndex = 1;
    moralColumns.forEach(col => {
      const cell = registreSheet.getCell(moralStartRow + 1, colIndex);
      cell.value = col.header;
      cell.font = { bold: true, size: 10, color: { argb: colors.headerText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: colors.border } },
        bottom: { style: 'thin', color: { argb: colors.border } },
        left: { style: 'thin', color: { argb: colors.border } },
        right: { style: 'thin', color: { argb: colors.border } },
      };
      colIndex++;
    });

    // Example row for legal entities
    const exampleMoral = {
      quantite: 500,
      montant: 50000,
      raison_sociale: 'ACME Corporation SAS',
      siren: '123456789',
      email_rep: 'contact@acme-corp.fr',
      prenom_rep: 'Marie',
      nom_rep: 'Dubois',
      telephone: '+33123456789',
      adresse: '10 Boulevard des Entreprises, 92000 Nanterre',
      date_transfert: '01/01/2024',
      cgp: 'Cabinet Finance',
      email_cgp: 'info@cabinet.fr',
    };

    colIndex = 1;
    moralColumns.forEach(col => {
      const cell = registreSheet.getCell(moralStartRow + 2, colIndex);
      cell.value = exampleMoral[col.key as keyof typeof exampleMoral];
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.exampleBg } };
      cell.font = { italic: true, size: 10, color: { argb: colors.exampleText } };
      cell.border = {
        top: { style: 'thin', color: { argb: colors.border } },
        bottom: { style: 'thin', color: { argb: colors.border } },
        left: { style: 'thin', color: { argb: colors.border } },
        right: { style: 'thin', color: { argb: colors.border } },
      };
      colIndex++;
    });

    // Empty rows for data entry (legal entities)
    for (let i = 0; i < 20; i++) {
      const rowNum = moralStartRow + 3 + i;
      moralColumns.forEach((_, idx) => {
        const cell = registreSheet.getCell(rowNum, idx + 1);
        cell.value = null;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.white } };
        cell.border = {
          top: { style: 'thin', color: { argb: colors.border } },
          bottom: { style: 'thin', color: { argb: colors.border } },
          left: { style: 'thin', color: { argb: colors.border } },
          right: { style: 'thin', color: { argb: colors.border } },
        };
      });
    }

    // ===== Sheet 3: Aide (Help) =====
    const helpSheet = workbook.addWorksheet('Aide', {
      properties: { tabColor: { argb: colors.headerBg } },
    });

    helpSheet.getColumn(1).width = 25;
    helpSheet.getColumn(2).width = 60;

    // Title
    helpSheet.mergeCells('A1:B1');
    const helpTitle = helpSheet.getCell('A1');
    helpTitle.value = 'DICTIONNAIRE DES CHAMPS';
    helpTitle.font = { size: 14, bold: true, color: { argb: colors.headerText } };
    helpTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.sectionTitle } };
    helpTitle.alignment = { vertical: 'middle', horizontal: 'center' };

    let helpRow = 3;

    helpSheet.getCell(`A${helpRow}`).value = 'PERSONNES PHYSIQUES';
    helpSheet.getCell(`A${helpRow}`).font = {
      size: 11,
      bold: true,
      color: { argb: colors.sectionTitle },
    };
    helpRow++;

    const physicalHelp = [
      ['Quantite *', "Nombre d'obligations souscrites"],
      ['Montant *', 'Montant total investi en euros'],
      ['Nom *', "Nom de famille de l'investisseur"],
      ['Prenom *', "Prenom de l'investisseur"],
      ['E-mail *', 'Adresse e-mail valide'],
      ['Telephone *', 'Numero avec ou sans indicatif'],
      ['Adresse *', 'Adresse complete du domicile'],
      ['Residence Fiscale *', 'Pays de residence fiscale'],
      ['Date de Transfert *', 'Date de souscription (jj/mm/aaaa)'],
      ['CGP', 'Conseiller en Gestion de Patrimoine (optionnel)'],
      ['E-mail CGP', 'E-mail du CGP (optionnel)'],
    ];

    physicalHelp.forEach(([field, description]) => {
      helpSheet.getCell(`A${helpRow}`).value = field;
      helpSheet.getCell(`A${helpRow}`).font = { bold: true, size: 10 };
      helpSheet.getCell(`B${helpRow}`).value = description;
      helpSheet.getCell(`B${helpRow}`).font = { size: 10 };
      helpRow++;
    });

    helpRow += 2;

    helpSheet.getCell(`A${helpRow}`).value = 'PERSONNES MORALES';
    helpSheet.getCell(`A${helpRow}`).font = {
      size: 11,
      bold: true,
      color: { argb: colors.sectionTitle },
    };
    helpRow++;

    const moralHelp = [
      ['Quantite *', "Nombre d'obligations souscrites"],
      ['Montant *', 'Montant total investi en euros'],
      ['Raison sociale *', 'Denomination sociale de la societe'],
      ['SIREN *', 'Numero SIREN (9 chiffres)'],
      ['E-mail representant *', 'E-mail du representant legal'],
      ['Prenom representant', 'Prenom du representant (optionnel)'],
      ['Nom representant', 'Nom du representant (optionnel)'],
      ['Telephone *', 'Numero de telephone de la societe'],
      ['Adresse siege *', 'Adresse complete du siege social'],
      ['Date de Transfert *', 'Date de souscription (jj/mm/aaaa)'],
      ['CGP', 'Conseiller en Gestion de Patrimoine (optionnel)'],
      ['E-mail CGP', 'E-mail du CGP (optionnel)'],
    ];

    moralHelp.forEach(([field, description]) => {
      helpSheet.getCell(`A${helpRow}`).value = field;
      helpSheet.getCell(`A${helpRow}`).font = { bold: true, size: 10 };
      helpSheet.getCell(`B${helpRow}`).value = description;
      helpSheet.getCell(`B${helpRow}`).font = { size: 10 };
      helpRow++;
    });
  }, 'Modele_Registre_Titres.xlsx');
}
