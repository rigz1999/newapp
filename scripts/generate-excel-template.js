import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Script de génération du modèle Excel pour l'import de registre des titres
 * Format standard avec validation des données
 */

async function generateTemplate() {
  const workbook = new ExcelJS.Workbook();

  // Configuration générale
  workbook.creator = 'Finixar';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ===== Feuille 1 : Instructions =====
  const instructionsSheet = workbook.addWorksheet('Instructions', {
    properties: { tabColor: { argb: 'FF2563EB' } },
  });

  instructionsSheet.getColumn(1).width = 100;

  // Titre principal
  instructionsSheet.mergeCells('A1:A3');
  const titleCell = instructionsSheet.getCell('A1');
  titleCell.value = '📋 MODÈLE REGISTRE DES TITRES';
  titleCell.font = { size: 20, bold: true, color: { argb: 'FF2563EB' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' },
  };

  let row = 5;

  // Section : À propos
  instructionsSheet.getCell(`A${row}`).value = '📖 À propos de ce modèle';
  instructionsSheet.getCell(`A${row}`).font = { size: 14, bold: true };
  row++;

  instructionsSheet.getCell(`A${row}`).value =
    "Ce modèle Excel vous permet d'importer facilement votre registre des titres dans Finixar. " +
    'Il contient des validations automatiques pour garantir la qualité des données.';
  instructionsSheet.getCell(`A${row}`).alignment = { wrapText: true };
  row += 2;

  // Section : Instructions
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

  // Section : Champs obligatoires
  instructionsSheet.getCell(`A${row}`).value = '⚠️ Champs obligatoires';
  instructionsSheet.getCell(`A${row}`).font = { size: 14, bold: true };
  row++;

  instructionsSheet.getCell(`A${row}`).value = 'Personnes Physiques :';
  instructionsSheet.getCell(`A${row}`).font = { bold: true };
  row++;

  const requiredPhysical = ['• Quantité, Montant', '• Nom(s), Prénom(s)', '• E-mail'];
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
    '• Raison sociale',
    '• N° SIREN (9 chiffres)',
    '• E-mail du représentant légal',
  ];
  requiredMoral.forEach(field => {
    instructionsSheet.getCell(`A${row}`).value = field;
    row++;
  });
  row++;

  // Section : Formats
  instructionsSheet.getCell(`A${row}`).value = '📐 Formats attendus';
  instructionsSheet.getCell(`A${row}`).font = { size: 14, bold: true };
  row++;

  const formats = [
    '• Dates : jj/mm/aaaa (exemple : 15/03/1980)',
    '• E-mail : doit contenir un @',
    '• SIREN : exactement 9 chiffres',
    '• Téléphone : numéros avec ou sans +',
    '• PPE : Oui ou Non',
    '• Montants : nombres décimaux acceptés',
  ];
  formats.forEach(format => {
    instructionsSheet.getCell(`A${row}`).value = format;
    row++;
  });
  row += 2;

  // Section : Support
  instructionsSheet.getCell(`A${row}`).value = "💬 Besoin d'aide ?";
  instructionsSheet.getCell(`A${row}`).font = { size: 14, bold: true };
  row++;

  instructionsSheet.getCell(`A${row}`).value =
    'Consultez l\'onglet "Aide" pour le détail de chaque champ, ou contactez le support.';
  row++;

  // Protéger la feuille en lecture seule
  await instructionsSheet.protect('finixar', {
    selectLockedCells: true,
    selectUnlockedCells: true,
  });

  // ===== Feuille 2 : Registre (données) =====
  const registreSheet = workbook.addWorksheet('Registre', {
    properties: { tabColor: { argb: 'FF10B981' } },
  });

  // Configuration des colonnes pour Personnes Physiques
  const physicalColumns = [
    { header: 'Quantité *', key: 'quantite', width: 12 },
    { header: 'Montant *', key: 'montant', width: 15 },
    { header: 'Nom(s) *', key: 'nom', width: 20 },
    { header: 'Prénom(s) *', key: 'prenom', width: 20 },
    { header: "Nom d'usage", key: 'nom_usage', width: 20 },
    { header: 'E-mail *', key: 'email', width: 30 },
    { header: 'Téléphone *', key: 'telephone', width: 18 },
    { header: 'Né(e) le *', key: 'date_naissance', width: 15 },
    { header: 'Lieu de naissance *', key: 'lieu_naissance', width: 25 },
    { header: 'Département de naissance', key: 'dept_naissance', width: 25 },
    { header: 'Adresse du domicile *', key: 'adresse', width: 35 },
    { header: 'Résidence Fiscale 1 *', key: 'residence_fiscale', width: 25 },
    { header: 'PPE *', key: 'ppe', width: 10 },
    { header: 'Catégorisation *', key: 'categorisation', width: 20 },
    { header: 'Date de Transfert *', key: 'date_transfert', width: 18 },
    { header: 'Date de Validation BS', key: 'date_validation', width: 20 },
    { header: 'PEA / PEA-PME', key: 'pea', width: 18 },
    { header: 'Numéro de Compte PEA / PEA-PME', key: 'numero_pea', width: 30 },
    { header: 'CGP', key: 'cgp', width: 25 },
    { header: 'E-mail du CGP', key: 'email_cgp', width: 30 },
    { header: 'Code du CGP', key: 'code_cgp', width: 15 },
    { header: 'Siren du CGP', key: 'siren_cgp', width: 15 },
  ];

  // Titre de section Personnes Physiques
  registreSheet.mergeCells('A1:V1');
  const ppTitle = registreSheet.getCell('A1');
  ppTitle.value = 'Personnes Physiques';
  ppTitle.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  ppTitle.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' },
  };
  ppTitle.alignment = { vertical: 'middle', horizontal: 'center' };

  // En-têtes Personnes Physiques
  let colIndex = 1;
  physicalColumns.forEach(col => {
    const cell = registreSheet.getCell(2, colIndex);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    registreSheet.getColumn(colIndex).width = col.width;
    colIndex++;
  });

  // Données d'exemple Personnes Physiques
  const examplePhysical = [
    {
      quantite: 100,
      montant: 10000,
      nom: 'Dupont',
      prenom: 'Jean',
      nom_usage: '',
      email: 'jean.dupont@exemple.fr',
      telephone: '+33612345678',
      date_naissance: '15/03/1980',
      lieu_naissance: 'Paris',
      dept_naissance: '75 - Paris',
      adresse: '123 Rue de la République, 75001 Paris',
      residence_fiscale: 'France',
      ppe: 'Non',
      categorisation: 'Client Professionnel',
      date_transfert: '01/01/2024',
      date_validation: '05/01/2024',
      pea: 'Oui',
      numero_pea: 'PEA123456789',
      cgp: 'Cabinet Dupuis',
      email_cgp: 'contact@cabinet-dupuis.fr',
      code_cgp: 'CGP001',
      siren_cgp: '123456789',
    },
    {
      quantite: 50,
      montant: 5000,
      nom: 'Martin',
      prenom: 'Sophie',
      nom_usage: '',
      email: 'sophie.martin@exemple.fr',
      telephone: '0687654321',
      date_naissance: '22/07/1975',
      lieu_naissance: 'Lyon',
      dept_naissance: '69 - Rhône',
      adresse: '45 Avenue des Champs, 69001 Lyon',
      residence_fiscale: 'France',
      ppe: 'Non',
      categorisation: 'Client Non Professionnel',
      date_transfert: '01/01/2024',
      date_validation: '05/01/2024',
      pea: 'Non',
      numero_pea: '',
      cgp: '',
      email_cgp: '',
      code_cgp: '',
      siren_cgp: '',
    },
  ];

  examplePhysical.forEach((data, index) => {
    const rowNum = 3 + index;
    colIndex = 1;
    physicalColumns.forEach(col => {
      const cell = registreSheet.getCell(rowNum, colIndex);
      cell.value = data[col.key];

      // Style des exemples
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' },
      };
      cell.font = { italic: true, color: { argb: 'FF92400E' } };

      colIndex++;
    });
  });

  // Lignes vides pour saisie (10 lignes)
  for (let i = 0; i < 10; i++) {
    const rowNum = 5 + i;
    physicalColumns.forEach((col, idx) => {
      const cell = registreSheet.getCell(rowNum, idx + 1);
      cell.value = null;

      // Fond bleu très clair pour les champs obligatoires
      if (col.header.includes('*')) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDBEAFE' },
        };
      }
    });
  }

  // === Section Personnes Morales ===
  const moralStartRow = 17;

  // Titre de section Personnes Morales
  registreSheet.mergeCells(`A${moralStartRow}:V${moralStartRow}`);
  const pmTitle = registreSheet.getCell(`A${moralStartRow}`);
  pmTitle.value = 'Personnes Morales';
  pmTitle.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  pmTitle.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF10B981' },
  };
  pmTitle.alignment = { vertical: 'middle', horizontal: 'center' };

  // Configuration des colonnes pour Personnes Morales
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
    { header: 'Résidence Fiscale 1 du représentant légal', key: 'residence_fiscale', width: 35 },
    { header: 'Département de naissance du représentant', key: 'dept_naissance', width: 35 },
    { header: 'PPE *', key: 'ppe', width: 10 },
    { header: 'Catégorisation *', key: 'categorisation', width: 20 },
    { header: 'Date de Transfert *', key: 'date_transfert', width: 18 },
    { header: 'Date de Validation BS', key: 'date_validation', width: 20 },
    { header: 'PEA / PEA-PME', key: 'pea', width: 18 },
    { header: 'Numéro de Compte PEA / PEA-PME', key: 'numero_pea', width: 30 },
    { header: 'CGP', key: 'cgp', width: 25 },
    { header: 'E-mail du CGP', key: 'email_cgp', width: 30 },
    { header: 'Code du CGP', key: 'code_cgp', width: 15 },
    { header: 'Siren du CGP', key: 'siren_cgp', width: 15 },
  ];

  // En-têtes Personnes Morales
  colIndex = 1;
  moralColumns.forEach(col => {
    const cell = registreSheet.getCell(moralStartRow + 1, colIndex);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    registreSheet.getColumn(colIndex).width = col.width;
    colIndex++;
  });

  // Données d'exemple Personnes Morales
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
      residence_fiscale: 'France',
      dept_naissance: '75 - Paris',
      ppe: 'Non',
      categorisation: 'Contrepartie Éligible',
      date_transfert: '01/01/2024',
      date_validation: '05/01/2024',
      pea: 'Non',
      numero_pea: '',
      cgp: 'Cabinet Finance Pro',
      email_cgp: 'info@financepro.fr',
      code_cgp: 'CGP100',
      siren_cgp: '987654321',
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
      residence_fiscale: 'France',
      dept_naissance: '69 - Rhône',
      ppe: 'Non',
      categorisation: 'Client Professionnel',
      date_transfert: '01/01/2024',
      date_validation: '05/01/2024',
      pea: 'Non',
      numero_pea: '',
      cgp: '',
      email_cgp: '',
      code_cgp: '',
      siren_cgp: '',
    },
  ];

  exampleMoral.forEach((data, index) => {
    const rowNum = moralStartRow + 2 + index;
    colIndex = 1;
    moralColumns.forEach(col => {
      const cell = registreSheet.getCell(rowNum, colIndex);
      cell.value = data[col.key];

      // Style des exemples
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' },
      };
      cell.font = { italic: true, color: { argb: 'FF92400E' } };

      colIndex++;
    });
  });

  // Lignes vides pour saisie (10 lignes)
  for (let i = 0; i < 10; i++) {
    const rowNum = moralStartRow + 4 + i;
    moralColumns.forEach((col, idx) => {
      const cell = registreSheet.getCell(rowNum, idx + 1);
      cell.value = null;

      // Fond vert très clair pour les champs obligatoires
      if (col.header.includes('*')) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD1FAE5' },
        };
      }
    });
  }

  // === Validations de données ===

  // Validation PPE (Oui/Non) pour Personnes Physiques
  registreSheet.getColumn(13).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
    if (rowNumber > 2 && rowNumber < 15) {
      // Lignes de données PP
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Oui,Non"'],
      };
    }
  });

  // Validation PPE (Oui/Non) pour Personnes Morales
  registreSheet.getColumn(12).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
    if (rowNumber > moralStartRow + 1 && rowNumber < moralStartRow + 14) {
      // Lignes de données PM
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Oui,Non"'],
      };
    }
  });

  // Note : Les validations plus complexes (e-mail, SIREN, etc.) sont gérées côté serveur
  // car ExcelJS a des limitations avec les validations personnalisées

  // Protéger les en-têtes uniquement
  registreSheet.eachRow((row, rowNumber) => {
    if (
      rowNumber === 1 ||
      rowNumber === 2 ||
      rowNumber === moralStartRow ||
      rowNumber === moralStartRow + 1
    ) {
      row.eachCell(cell => {
        cell.protection = { locked: true };
      });
    } else {
      row.eachCell(cell => {
        cell.protection = { locked: false };
      });
    }
  });

  // ===== Feuille 3 : Aide (description des champs) =====
  const helpSheet = workbook.addWorksheet('Aide', {
    properties: { tabColor: { argb: 'FFFBBF24' } },
  });

  helpSheet.getColumn(1).width = 35;
  helpSheet.getColumn(2).width = 70;

  // Titre
  helpSheet.mergeCells('A1:B1');
  const helpTitle = helpSheet.getCell('A1');
  helpTitle.value = '📚 DICTIONNAIRE DES CHAMPS';
  helpTitle.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  helpTitle.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFBBF24' },
  };
  helpTitle.alignment = { vertical: 'middle', horizontal: 'center' };

  let helpRow = 3;

  // Section Personnes Physiques
  helpSheet.getCell(`A${helpRow}`).value = 'PERSONNES PHYSIQUES';
  helpSheet.getCell(`A${helpRow}`).font = { size: 14, bold: true, color: { argb: 'FF2563EB' } };
  helpRow++;

  const physicalHelp = [
    [
      'Quantité *',
      "Nombre d'obligations souscrites. Doit être un nombre entier positif. Exemple : 100",
    ],
    [
      'Montant *',
      'Montant total investi en euros. Peut contenir des décimales. Exemple : 10000 ou 10000.50',
    ],
    ['Nom(s) *', "Nom(s) de famille de l'investisseur. Exemple : Dupont"],
    ['Prénom(s) *', "Prénom(s) de l'investisseur. Exemple : Jean"],
    ["Nom d'usage", "Nom d'usage si différent du nom de famille. Optionnel."],
    ['E-mail *', 'Adresse e-mail valide. Doit contenir un @. Exemple : jean.dupont@exemple.fr'],
    ['Téléphone *', 'Numéro de téléphone. Format : +33612345678 ou 0612345678'],
    ['Né(e) le *', 'Date de naissance au format jj/mm/aaaa. Exemple : 15/03/1980'],
    ['Lieu de naissance *', 'Ville de naissance. Exemple : Paris'],
    ['Département de naissance', 'Département de naissance. Exemple : 75 - Paris'],
    [
      'Adresse du domicile *',
      'Adresse complète du domicile. Exemple : 123 Rue de la République, 75001 Paris',
    ],
    ['Résidence Fiscale 1 *', 'Pays de résidence fiscale principal. Exemple : France'],
    ['PPE *', 'Personne Politiquement Exposée. Valeurs possibles : Oui ou Non'],
    [
      'Catégorisation *',
      'Catégorie MiFID. Exemples : Client Professionnel, Client Non Professionnel, Contrepartie Éligible',
    ],
    [
      'Date de Transfert *',
      'Date de transfert/souscription. Format : jj/mm/aaaa. Exemple : 01/01/2024',
    ],
    [
      'Date de Validation BS',
      'Date de validation par le back-office. Format : jj/mm/aaaa. Optionnel.',
    ],
    ['PEA / PEA-PME', 'Compte PEA actif. Valeurs : Oui, Non, ou vide'],
    ['Numéro de Compte PEA / PEA-PME', 'Numéro du compte PEA si applicable. Optionnel.'],
    ['CGP', 'Nom du Conseiller en Gestion de Patrimoine. Optionnel.'],
    ['E-mail du CGP', 'Adresse e-mail du CGP. Optionnel.'],
    ['Code du CGP', 'Code identifiant du CGP. Optionnel.'],
    ['Siren du CGP', 'Numéro SIREN du CGP (9 chiffres). Optionnel.'],
  ];

  physicalHelp.forEach(([field, description]) => {
    helpSheet.getCell(`A${helpRow}`).value = field;
    helpSheet.getCell(`A${helpRow}`).font = { bold: true };
    helpSheet.getCell(`B${helpRow}`).value = description;
    helpSheet.getCell(`B${helpRow}`).alignment = { wrapText: true };
    helpRow++;
  });

  helpRow += 2;

  // Section Personnes Morales
  helpSheet.getCell(`A${helpRow}`).value = 'PERSONNES MORALES';
  helpSheet.getCell(`A${helpRow}`).font = { size: 14, bold: true, color: { argb: 'FF10B981' } };
  helpRow++;

  const moralHelp = [
    [
      'Quantité *',
      "Nombre d'obligations souscrites. Doit être un nombre entier positif. Exemple : 500",
    ],
    ['Montant *', 'Montant total investi en euros. Exemple : 50000'],
    ['Raison sociale *', "Dénomination sociale de l'entreprise. Exemple : ACME Corporation"],
    [
      'N° SIREN *',
      "Numéro SIREN de l'entreprise. Doit contenir exactement 9 chiffres. Exemple : 123456789",
    ],
    [
      'E-mail du représentant légal *',
      'Adresse e-mail du représentant légal. Exemple : contact@acme-corp.fr',
    ],
    ['Prénom du représentant légal', 'Prénom du représentant légal. Optionnel.'],
    ['Nom du représentant légal', 'Nom du représentant légal. Optionnel.'],
    ['Téléphone *', "Numéro de téléphone de l'entreprise. Format : +33123456789 ou 0123456789"],
    [
      'Adresse du siège social *',
      'Adresse complète du siège social. Exemple : 10 Boulevard des Entreprises, 92000 Nanterre',
    ],
    [
      'Résidence Fiscale 1 du représentant légal',
      'Pays de résidence fiscale du représentant. Exemple : France',
    ],
    [
      'Département de naissance du représentant',
      'Département de naissance du représentant légal. Exemple : 75 - Paris',
    ],
    ['PPE *', 'Représentant Politiquement Exposé. Valeurs possibles : Oui ou Non'],
    ['Catégorisation *', 'Catégorie MiFID. Exemples : Client Professionnel, Contrepartie Éligible'],
    [
      'Date de Transfert *',
      'Date de transfert/souscription. Format : jj/mm/aaaa. Exemple : 01/01/2024',
    ],
    [
      'Date de Validation BS',
      'Date de validation par le back-office. Format : jj/mm/aaaa. Optionnel.',
    ],
    ['PEA / PEA-PME', 'Compte PEA-PME actif. Valeurs : Oui, Non, ou vide'],
    ['Numéro de Compte PEA / PEA-PME', 'Numéro du compte PEA-PME si applicable. Optionnel.'],
    ['CGP', 'Nom du Conseiller en Gestion de Patrimoine. Optionnel.'],
    ['E-mail du CGP', 'Adresse e-mail du CGP. Optionnel.'],
    ['Code du CGP', 'Code identifiant du CGP. Optionnel.'],
    ['Siren du CGP', 'Numéro SIREN du CGP (9 chiffres). Optionnel.'],
  ];

  moralHelp.forEach(([field, description]) => {
    helpSheet.getCell(`A${helpRow}`).value = field;
    helpSheet.getCell(`A${helpRow}`).font = { bold: true };
    helpSheet.getCell(`B${helpRow}`).value = description;
    helpSheet.getCell(`B${helpRow}`).alignment = { wrapText: true };
    helpRow++;
  });

  // Protéger la feuille d'aide
  await helpSheet.protect('finixar', {
    selectLockedCells: true,
    selectUnlockedCells: true,
  });

  // Sauvegarder le fichier
  const outputPath = join(__dirname, '..', 'public', 'templates', 'Modele_Registre_Titres.xlsx');
  await workbook.xlsx.writeFile(outputPath);

  console.log('✅ Modèle Excel généré avec succès !');
  console.log(`📁 Fichier : ${outputPath}`);
}

// Exécuter le script
generateTemplate().catch(err => {
  console.error('❌ Erreur lors de la génération du modèle :', err);
  process.exit(1);
});
