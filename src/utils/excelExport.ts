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
 */
export async function downloadRegistreTemplate(): Promise<void> {
  await exportToExcel(workbook => {
    workbook.creator = 'Finixar';
    workbook.created = new Date();

    // ===== Sheet 1: Instructions =====
    const instructionsSheet = workbook.addWorksheet('Instructions', {
      properties: { tabColor: { argb: 'FF2563EB' } },
    });

    instructionsSheet.getColumn(1).width = 100;

    instructionsSheet.mergeCells('A1:A3');
    const titleCell = instructionsSheet.getCell('A1');
    titleCell.value = '📋 MODÈLE REGISTRE DES TITRES';
    titleCell.font = { size: 20, bold: true, color: { argb: 'FF2563EB' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

    let row = 5;

    instructionsSheet.getCell(`A${row}`).value = '📖 À propos de ce modèle';
    instructionsSheet.getCell(`A${row}`).font = { size: 14, bold: true };
    row++;

    instructionsSheet.getCell(`A${row}`).value =
      "Ce modèle Excel vous permet d'importer facilement votre registre des titres dans Finixar. " +
      'Il contient des validations automatiques pour garantir la qualité des données.';
    instructionsSheet.getCell(`A${row}`).alignment = { wrapText: true };
    row += 2;

    instructionsSheet.getCell(`A${row}`).value = "📝 Instructions d'utilisation";
    instructionsSheet.getCell(`A${row}`).font = { size: 14, bold: true };
    row++;

    const instructions = [
      '1. Ouvrez l\'onglet "Registre" en bas de l\'écran',
      '2. Remplissez les sections "Personnes Physiques" et "Personnes Morales"',
      "3. Les champs marqués d'un astérisque (*) sont obligatoires",
      "4. Les cellules avec erreur s'afficheront en rouge",
      '5. Ne modifiez pas les en-têtes de colonnes',
      '6. Conservez la structure avec les deux sections',
      '7. Une fois terminé, enregistrez et importez le fichier dans Finixar',
    ];

    instructions.forEach(instruction => {
      instructionsSheet.getCell(`A${row}`).value = instruction;
      row++;
    });
    row++;

    instructionsSheet.getCell(`A${row}`).value = '⚠️ Champs obligatoires';
    instructionsSheet.getCell(`A${row}`).font = { size: 14, bold: true };
    row++;

    instructionsSheet.getCell(`A${row}`).value = 'Personnes Physiques :';
    instructionsSheet.getCell(`A${row}`).font = { bold: true };
    row++;

    const requiredPhysical = [
      '• Quantité, Montant',
      '• Nom(s), Prénom(s)',
      '• E-mail, Téléphone',
      '• Date de naissance, Lieu de naissance',
      '• Adresse, Résidence Fiscale',
      '• Date de Transfert',
    ];
    requiredPhysical.forEach(field => {
      instructionsSheet.getCell(`A${row}`).value = field;
      row++;
    });
    row++;

    instructionsSheet.getCell(`A${row}`).value = 'Personnes Morales :';
    instructionsSheet.getCell(`A${row}`).font = { bold: true };
    row++;

    const requiredMoral = [
      '• Quantité, Montant',
      '• Raison sociale, N° SIREN (9 chiffres)',
      '• E-mail du représentant légal, Téléphone',
      '• Adresse du siège social',
      '• Date de Transfert',
    ];
    requiredMoral.forEach(field => {
      instructionsSheet.getCell(`A${row}`).value = field;
      row++;
    });
    row++;

    instructionsSheet.getCell(`A${row}`).value = '📐 Formats attendus';
    instructionsSheet.getCell(`A${row}`).font = { size: 14, bold: true };
    row++;

    const formats = [
      '• Dates : jj/mm/aaaa (exemple : 15/03/1980)',
      '• E-mail : doit contenir un @',
      '• SIREN : exactement 9 chiffres (personnes morales uniquement)',
      '• Téléphone : numéros avec ou sans +',
      '• Montants : nombres décimaux acceptés',
    ];
    formats.forEach(format => {
      instructionsSheet.getCell(`A${row}`).value = format;
      row++;
    });

    // ===== Sheet 2: Registre (data entry) =====
    const registreSheet = workbook.addWorksheet('Registre', {
      properties: { tabColor: { argb: 'FF10B981' } },
    });

    const physicalColumns = [
      { header: 'Quantité *', key: 'quantite', width: 12 },
      { header: 'Montant *', key: 'montant', width: 15 },
      { header: 'Nom(s) *', key: 'nom', width: 20 },
      { header: 'Prénom(s) *', key: 'prenom', width: 20 },
      { header: 'E-mail *', key: 'email', width: 30 },
      { header: 'Téléphone *', key: 'telephone', width: 18 },
      { header: 'Né(e) le *', key: 'date_naissance', width: 15 },
      { header: 'Lieu de naissance *', key: 'lieu_naissance', width: 25 },
      { header: 'Département de naissance', key: 'dept_naissance', width: 25 },
      { header: 'Adresse du domicile *', key: 'adresse', width: 35 },
      { header: 'Résidence Fiscale 1 *', key: 'residence_fiscale', width: 25 },
      { header: 'Date de Transfert *', key: 'date_transfert', width: 18 },
      { header: 'CGP', key: 'cgp', width: 25 },
      { header: 'E-mail du CGP', key: 'email_cgp', width: 30 },
    ];

    // Physical persons section title
    registreSheet.mergeCells('A1:N1');
    const ppTitle = registreSheet.getCell('A1');
    ppTitle.value = 'Personnes Physiques';
    ppTitle.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    ppTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    ppTitle.alignment = { vertical: 'middle', horizontal: 'center' };

    // Physical persons headers
    let colIndex = 1;
    physicalColumns.forEach(col => {
      const cell = registreSheet.getCell(2, colIndex);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      registreSheet.getColumn(colIndex).width = col.width;
      colIndex++;
    });

    // Example data for physical persons
    const examplePhysical = [
      {
        quantite: 100,
        montant: 10000,
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'jean.dupont@exemple.fr',
        telephone: '+33612345678',
        date_naissance: '15/03/1980',
        lieu_naissance: 'Paris',
        dept_naissance: '75 - Paris',
        adresse: '123 Rue de la République, 75001 Paris',
        residence_fiscale: 'France',
        date_transfert: '01/01/2024',
        cgp: 'Cabinet Dupuis',
        email_cgp: 'contact@cabinet-dupuis.fr',
      },
      {
        quantite: 50,
        montant: 5000,
        nom: 'Martin',
        prenom: 'Sophie',
        email: 'sophie.martin@exemple.fr',
        telephone: '0687654321',
        date_naissance: '22/07/1975',
        lieu_naissance: 'Lyon',
        dept_naissance: '69 - Rhône',
        adresse: '45 Avenue des Champs, 69001 Lyon',
        residence_fiscale: 'France',
        date_transfert: '01/01/2024',
        cgp: '',
        email_cgp: '',
      },
    ];

    examplePhysical.forEach((data, index) => {
      const rowNum = 3 + index;
      colIndex = 1;
      physicalColumns.forEach(col => {
        const cell = registreSheet.getCell(rowNum, colIndex);
        cell.value = data[col.key as keyof typeof data];
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        cell.font = { italic: true, color: { argb: 'FF92400E' } };
        colIndex++;
      });
    });

    // Empty rows for data entry (physical)
    for (let i = 0; i < 10; i++) {
      const rowNum = 5 + i;
      physicalColumns.forEach((col, idx) => {
        const cell = registreSheet.getCell(rowNum, idx + 1);
        cell.value = null;
        if (col.header.includes('*')) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
        }
      });
    }

    // === Legal entities section ===
    const moralStartRow = 17;

    registreSheet.mergeCells(`A${moralStartRow}:M${moralStartRow}`);
    const pmTitle = registreSheet.getCell(`A${moralStartRow}`);
    pmTitle.value = 'Personnes Morales';
    pmTitle.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    pmTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
    pmTitle.alignment = { vertical: 'middle', horizontal: 'center' };

    const moralColumns = [
      { header: 'Quantité *', key: 'quantite', width: 12 },
      { header: 'Montant *', key: 'montant', width: 15 },
      { header: 'Raison sociale *', key: 'raison_sociale', width: 30 },
      { header: 'N° SIREN *', key: 'siren', width: 15 },
      { header: 'E-mail du représentant légal *', key: 'email_rep', width: 35 },
      { header: 'Prénom du représentant légal', key: 'prenom_rep', width: 25 },
      { header: 'Nom du représentant légal', key: 'nom_rep', width: 25 },
      { header: 'Téléphone *', key: 'telephone', width: 18 },
      { header: 'Adresse du siège social *', key: 'adresse', width: 40 },
      { header: 'Département de naissance du représentant', key: 'dept_naissance', width: 35 },
      { header: 'Date de Transfert *', key: 'date_transfert', width: 18 },
      { header: 'CGP', key: 'cgp', width: 25 },
      { header: 'E-mail du CGP', key: 'email_cgp', width: 30 },
    ];

    // Legal entities headers
    colIndex = 1;
    moralColumns.forEach(col => {
      const cell = registreSheet.getCell(moralStartRow + 1, colIndex);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      colIndex++;
    });

    // Example data for legal entities
    const exampleMoral = [
      {
        quantite: 500,
        montant: 50000,
        raison_sociale: 'ACME Corporation',
        siren: '123456789',
        email_rep: 'contact@acme-corp.fr',
        prenom_rep: 'Marie',
        nom_rep: 'Dubois',
        telephone: '+33123456789',
        adresse: '10 Boulevard des Entreprises, 92000 Nanterre',
        dept_naissance: '75 - Paris',
        date_transfert: '01/01/2024',
        cgp: 'Cabinet Finance Pro',
        email_cgp: 'info@financepro.fr',
      },
      {
        quantite: 200,
        montant: 20000,
        raison_sociale: 'Tech Innovations SAS',
        siren: '987654321',
        email_rep: 'dirigeant@tech-innov.fr',
        prenom_rep: 'Pierre',
        nom_rep: 'Leroy',
        telephone: '0145678901',
        adresse: '25 Rue de la Tech, 69002 Lyon',
        dept_naissance: '69 - Rhône',
        date_transfert: '01/01/2024',
        cgp: '',
        email_cgp: '',
      },
    ];

    exampleMoral.forEach((data, index) => {
      const rowNum = moralStartRow + 2 + index;
      colIndex = 1;
      moralColumns.forEach(col => {
        const cell = registreSheet.getCell(rowNum, colIndex);
        cell.value = data[col.key as keyof typeof data];
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        cell.font = { italic: true, color: { argb: 'FF92400E' } };
        colIndex++;
      });
    });

    // Empty rows for data entry (legal entities)
    for (let i = 0; i < 10; i++) {
      const rowNum = moralStartRow + 4 + i;
      moralColumns.forEach((col, idx) => {
        const cell = registreSheet.getCell(rowNum, idx + 1);
        cell.value = null;
        if (col.header.includes('*')) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        }
      });
    }

    // ===== Sheet 3: Help =====
    const helpSheet = workbook.addWorksheet('Aide', {
      properties: { tabColor: { argb: 'FFFBBF24' } },
    });

    helpSheet.getColumn(1).width = 35;
    helpSheet.getColumn(2).width = 70;

    helpSheet.mergeCells('A1:B1');
    const helpTitle = helpSheet.getCell('A1');
    helpTitle.value = '📚 DICTIONNAIRE DES CHAMPS';
    helpTitle.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    helpTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBBF24' } };
    helpTitle.alignment = { vertical: 'middle', horizontal: 'center' };

    let helpRow = 3;

    helpSheet.getCell(`A${helpRow}`).value = 'PERSONNES PHYSIQUES';
    helpSheet.getCell(`A${helpRow}`).font = { size: 14, bold: true, color: { argb: 'FF2563EB' } };
    helpRow++;

    const physicalHelp = [
      ['Quantité *', "Nombre d'obligations souscrites. Exemple : 100"],
      ['Montant *', 'Montant total investi en euros. Exemple : 10000'],
      ['Nom(s) *', "Nom(s) de famille de l'investisseur. Exemple : Dupont"],
      ['Prénom(s) *', "Prénom(s) de l'investisseur. Exemple : Jean"],
      ['E-mail *', 'Adresse e-mail valide. Exemple : jean.dupont@exemple.fr'],
      ['Téléphone *', 'Format : +33612345678 ou 0612345678'],
      ['Né(e) le *', 'Date de naissance au format jj/mm/aaaa. Exemple : 15/03/1980'],
      ['Lieu de naissance *', 'Ville de naissance. Exemple : Paris'],
      ['Département de naissance', 'Exemple : 75 - Paris'],
      [
        'Adresse du domicile *',
        'Adresse complète. Exemple : 123 Rue de la République, 75001 Paris',
      ],
      ['Résidence Fiscale 1 *', 'Pays de résidence fiscale. Exemple : France'],
      ['Date de Transfert *', 'Date de souscription. Format : jj/mm/aaaa'],
      ['CGP', 'Nom du Conseiller en Gestion de Patrimoine. Optionnel.'],
      ['E-mail du CGP', 'Adresse e-mail du CGP. Optionnel.'],
    ];

    physicalHelp.forEach(([field, description]) => {
      helpSheet.getCell(`A${helpRow}`).value = field;
      helpSheet.getCell(`A${helpRow}`).font = { bold: true };
      helpSheet.getCell(`B${helpRow}`).value = description;
      helpSheet.getCell(`B${helpRow}`).alignment = { wrapText: true };
      helpRow++;
    });

    helpRow += 2;

    helpSheet.getCell(`A${helpRow}`).value = 'PERSONNES MORALES';
    helpSheet.getCell(`A${helpRow}`).font = { size: 14, bold: true, color: { argb: 'FF10B981' } };
    helpRow++;

    const moralHelp = [
      ['Quantité *', "Nombre d'obligations souscrites. Exemple : 500"],
      ['Montant *', 'Montant total investi en euros. Exemple : 50000'],
      ['Raison sociale *', 'Dénomination sociale. Exemple : ACME Corporation'],
      ['N° SIREN *', 'Exactement 9 chiffres. Exemple : 123456789'],
      ['E-mail du représentant légal *', 'Exemple : contact@acme-corp.fr'],
      ['Prénom du représentant légal', 'Optionnel.'],
      ['Nom du représentant légal', 'Optionnel.'],
      ['Téléphone *', 'Format : +33123456789 ou 0123456789'],
      ['Adresse du siège social *', 'Adresse complète du siège.'],
      ['Département de naissance du représentant', 'Optionnel. Exemple : 75 - Paris'],
      ['Date de Transfert *', 'Date de souscription. Format : jj/mm/aaaa'],
      ['CGP', 'Nom du Conseiller en Gestion de Patrimoine. Optionnel.'],
      ['E-mail du CGP', 'Adresse e-mail du CGP. Optionnel.'],
    ];

    moralHelp.forEach(([field, description]) => {
      helpSheet.getCell(`A${helpRow}`).value = field;
      helpSheet.getCell(`A${helpRow}`).font = { bold: true };
      helpSheet.getCell(`B${helpRow}`).value = description;
      helpSheet.getCell(`B${helpRow}`).alignment = { wrapText: true };
      helpRow++;
    });
  }, 'Modele_Registre_Titres.xlsx');
}
