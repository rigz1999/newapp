# 📋 Documentation du Format Standard - Registre des Titres

**Version :** 1.0
**Date :** Janvier 2026
**Application :** Finixar

---

## 📖 Introduction

Ce document décrit le format standard pour l'import de registre des titres dans Finixar. Si votre société n'a pas de format de registre spécifique, utilisez ce format standard qui garantit une importation sans erreur.

### 🎯 Objectif

Permettre l'import rapide et fiable des données d'investisseurs (personnes physiques et morales) pour la création de tranches d'obligations.

---

## 📥 Téléchargement du Modèle

Le modèle Excel pré-formaté est disponible dans l'application :

- **Nom du fichier :** `Modele_Registre_Titres.xlsx`
- **Téléchargement :** Bouton "Télécharger le modèle" dans l'assistant de création de tranche

### ✅ Avantages du modèle

- ✅ Tous les champs pré-formatés
- ✅ Validations automatiques intégrées
- ✅ Exemples de données fournis
- ✅ Instructions incluses
- ✅ Protection contre les erreurs de structure

---

## 📊 Structure du Fichier

### Format Accepté

- **Excel :** `.xlsx` ou `.xls` (recommandé)
- **CSV :** avec séparateurs `;` ou `,` ou tabulation
- **Encodage :** UTF-8 (Windows-1252 supporté en fallback)

### Organisation

Le fichier doit contenir **deux sections distinctes** :

```
┌─────────────────────────────────────┐
│ Personnes Physiques                 │  ← Section 1
├─────────────────────────────────────┤
│ [En-têtes des colonnes]             │
│ [Données ligne 1]                   │
│ [Données ligne 2]                   │
│ ...                                 │
├─────────────────────────────────────┤
│ [Ligne vide de séparation]          │
├─────────────────────────────────────┤
│ Personnes Morales                   │  ← Section 2
├─────────────────────────────────────┤
│ [En-têtes des colonnes]             │
│ [Données ligne 1]                   │
│ [Données ligne 2]                   │
│ ...                                 │
└─────────────────────────────────────┘
```

---

## 👤 Section 1 : Personnes Physiques

### Champs Obligatoires (\*)

| Nom du Champ              | Type           | Format         | Exemple                                 | Description                     |
| ------------------------- | -------------- | -------------- | --------------------------------------- | ------------------------------- |
| **Quantité\***            | Nombre entier  | > 0            | `100`                                   | Nombre d'obligations souscrites |
| **Montant\***             | Nombre décimal | > 0            | `10000` ou `10000.50`                   | Montant investi en euros        |
| **Nom(s)\***              | Texte          | -              | `Dupont`                                | Nom(s) de famille               |
| **Prénom(s)\***           | Texte          | -              | `Jean`                                  | Prénom(s)                       |
| **E-mail\***              | E-mail         | avec @         | `jean.dupont@exemple.fr`                | Adresse e-mail valide           |
| **Téléphone\***           | Texte          | Chiffres + `+` | `+33612345678` ou `0612345678`          | Numéro de téléphone             |
| **Né(e) le\***            | Date           | `jj/mm/aaaa`   | `15/03/1980`                            | Date de naissance               |
| **Lieu de naissance\***   | Texte          | -              | `Paris`                                 | Ville de naissance              |
| **Adresse du domicile\*** | Texte          | -              | `123 Rue de la République, 75001 Paris` | Adresse complète                |
| **Résidence Fiscale 1\*** | Texte          | -              | `France`                                | Pays de résidence fiscale       |
| **PPE\***                 | Liste          | `Oui` ou `Non` | `Non`                                   | Personne Politiquement Exposée  |
| **Catégorisation\***      | Texte          | -              | `Client Non Professionnel`              | Catégorie MiFID                 |
| **Date de Transfert\***   | Date           | `jj/mm/aaaa`   | `01/01/2024`                            | Date de souscription            |

### Champs Optionnels

| Nom du Champ                       | Type   | Format                | Exemple              | Description                    |
| ---------------------------------- | ------ | --------------------- | -------------------- | ------------------------------ |
| **Nom d'usage**                    | Texte  | -                     | `Martin`             | Nom d'usage si différent       |
| **Département de naissance**       | Texte  | -                     | `75 - Paris`         | Département de naissance       |
| **Date de Validation BS**          | Date   | `jj/mm/aaaa`          | `05/01/2024`         | Date de validation back-office |
| **PEA / PEA-PME**                  | Texte  | `Oui`, `Non`, ou vide | `Oui`                | Compte PEA actif               |
| **Numéro de Compte PEA / PEA-PME** | Texte  | -                     | `PEA123456789`       | Numéro PEA                     |
| **CGP**                            | Texte  | -                     | `Cabinet Dupuis`     | Nom du CGP                     |
| **E-mail du CGP**                  | E-mail | avec @                | `contact@cabinet.fr` | E-mail du CGP                  |
| **Code du CGP**                    | Texte  | -                     | `CGP001`             | Code identifiant CGP           |
| **Siren du CGP**                   | Texte  | 9 chiffres            | `123456789`          | SIREN du CGP                   |

### ⚠️ Règles de Validation

- ✅ **E-mail :** Doit contenir un `@` et un domaine valide
- ✅ **Téléphone :** Doit contenir uniquement des chiffres et éventuellement un `+`
- ✅ **Date de naissance :** Format `jj/mm/aaaa` ou `yyyy-mm-dd`
- ✅ **Quantité :** Nombre entier positif
- ✅ **Montant :** Nombre positif (décimales acceptées)
- ✅ **PPE :** Uniquement `Oui` ou `Non`
- ✅ **SIREN du CGP :** Si renseigné, doit contenir exactement 9 chiffres

### 📝 Exemple de Ligne

```
100 | 10000 | Dupont | Jean | jean.dupont@exemple.fr | +33612345678 | 15/03/1980 | Paris | 123 Rue de la République, 75001 Paris | France | Non | Client Non Professionnel | 01/01/2024
```

---

## 🏢 Section 2 : Personnes Morales

### Champs Obligatoires (\*)

| Nom du Champ                       | Type           | Format         | Exemple                                        | Description                       |
| ---------------------------------- | -------------- | -------------- | ---------------------------------------------- | --------------------------------- |
| **Quantité\***                     | Nombre entier  | > 0            | `500`                                          | Nombre d'obligations souscrites   |
| **Montant\***                      | Nombre décimal | > 0            | `50000`                                        | Montant investi en euros          |
| **Raison sociale\***               | Texte          | -              | `ACME Corporation`                             | Dénomination sociale              |
| **N° SIREN\***                     | Texte          | 9 chiffres     | `123456789`                                    | Numéro SIREN                      |
| **E-mail du représentant légal\*** | E-mail         | avec @         | `contact@acme-corp.fr`                         | E-mail du représentant            |
| **Téléphone\***                    | Texte          | Chiffres + `+` | `+33123456789`                                 | Téléphone société                 |
| **Adresse du siège social\***      | Texte          | -              | `10 Boulevard des Entreprises, 92000 Nanterre` | Adresse complète                  |
| **PPE\***                          | Liste          | `Oui` ou `Non` | `Non`                                          | Représentant politiquement exposé |
| **Catégorisation\***               | Texte          | -              | `Client Professionnel`                         | Catégorie MiFID                   |
| **Date de Transfert\***            | Date           | `jj/mm/aaaa`   | `01/01/2024`                                   | Date de souscription              |

### Champs Optionnels

| Nom du Champ                                  | Type   | Format                | Exemple               | Description           |
| --------------------------------------------- | ------ | --------------------- | --------------------- | --------------------- |
| **Prénom du représentant légal**              | Texte  | -                     | `Marie`               | Prénom représentant   |
| **Nom du représentant légal**                 | Texte  | -                     | `Dubois`              | Nom représentant      |
| **Résidence Fiscale 1 du représentant légal** | Texte  | -                     | `France`              | Résidence fiscale     |
| **Département de naissance du représentant**  | Texte  | -                     | `75 - Paris`          | Département naissance |
| **Date de Validation BS**                     | Date   | `jj/mm/aaaa`          | `05/01/2024`          | Date validation       |
| **PEA / PEA-PME**                             | Texte  | `Oui`, `Non`, ou vide | `Non`                 | Compte PEA-PME        |
| **Numéro de Compte PEA / PEA-PME**            | Texte  | -                     | -                     | Numéro PEA-PME        |
| **CGP**                                       | Texte  | -                     | `Cabinet Finance Pro` | Nom du CGP            |
| **E-mail du CGP**                             | E-mail | avec @                | `info@financepro.fr`  | E-mail du CGP         |
| **Code du CGP**                               | Texte  | -                     | `CGP100`              | Code CGP              |
| **Siren du CGP**                              | Texte  | 9 chiffres            | `987654321`           | SIREN du CGP          |

### ⚠️ Règles de Validation

- ✅ **SIREN :** Exactement 9 chiffres (obligatoire)
- ✅ **E-mail :** Doit contenir un `@` et un domaine valide
- ✅ **Téléphone :** Chiffres et `+` uniquement
- ✅ **Date de Transfert :** Format `jj/mm/aaaa` ou `yyyy-mm-dd`
- ✅ **Quantité / Montant :** Nombres positifs
- ✅ **PPE :** Uniquement `Oui` ou `Non`

### 📝 Exemple de Ligne

```
500 | 50000 | ACME Corporation | 123456789 | contact@acme-corp.fr | +33123456789 | 10 Boulevard des Entreprises, 92000 Nanterre | Non | Client Professionnel | 01/01/2024
```

---

## 🔄 Processus d'Import

### Étape 1 : Préparation

1. ✅ Téléchargez le modèle Excel depuis Finixar
2. ✅ Remplissez les sections "Personnes Physiques" et "Personnes Morales"
3. ✅ Vérifiez que tous les champs obligatoires (\*) sont remplis
4. ✅ Respectez les formats de date (`jj/mm/aaaa`)
5. ✅ Vérifiez les e-mails (présence du `@`)

### Étape 2 : Validation

Avant l'import, le système vérifie automatiquement :

- ✅ Présence de tous les champs obligatoires
- ✅ Format des e-mails
- ✅ Format des dates
- ✅ Validité des numéros SIREN (9 chiffres)
- ✅ Cohérence des montants (> 0)

### Étape 3 : Import

Si la validation réussit :

- ✅ Les investisseurs sont créés ou mis à jour
- ✅ Les souscriptions sont enregistrées
- ✅ La tranche est créée automatiquement
- ✅ Les échéances de coupons sont générées

### Étape 4 : Résultat

Vous recevez un récapitulatif :

- 📊 Nombre d'investisseurs importés
- 💰 Montant total levé
- ✅ Succès ou erreurs détaillées

---

## ❌ Erreurs Courantes et Solutions

### Erreur : "E-mail invalide"

**Cause :** L'e-mail ne contient pas de `@` ou a un format incorrect

**Solution :** Vérifiez que l'e-mail est au format `nom@domaine.fr`

### Erreur : "SIREN invalide"

**Cause :** Le SIREN ne contient pas exactement 9 chiffres

**Solution :** Vérifiez que le SIREN est au format `123456789` (9 chiffres)

### Erreur : "Date invalide"

**Cause :** La date n'est pas au format `jj/mm/aaaa`

**Solution :** Utilisez le format `15/03/1980` (et non `15-03-1980`)

### Erreur : "Champ obligatoire manquant"

**Cause :** Un champ marqué `*` est vide

**Solution :** Remplissez tous les champs obligatoires

### Erreur : "Section introuvable"

**Cause :** Les titres "Personnes Physiques" ou "Personnes Morales" sont modifiés

**Solution :** Utilisez exactement les titres du modèle

---

## 💡 Bonnes Pratiques

### ✅ À Faire

- ✅ Utilisez le modèle Excel fourni
- ✅ Remplissez tous les champs obligatoires
- ✅ Respectez les formats de date (`jj/mm/aaaa`)
- ✅ Vérifiez les e-mails avant l'import
- ✅ Testez avec quelques lignes avant l'import complet
- ✅ Conservez une copie de sauvegarde

### ❌ À Éviter

- ❌ Ne modifiez pas les en-têtes de colonnes
- ❌ Ne supprimez pas les sections "Personnes Physiques" / "Personnes Morales"
- ❌ N'utilisez pas de formules Excel dans les cellules de données
- ❌ Ne fusionnez pas de cellules
- ❌ Ne laissez pas de lignes vides au milieu des données
- ❌ N'importez pas de fichiers avec des erreurs de validation

---

## 🔒 Confidentialité et Sécurité

### Protection des Données

- 🔒 Toutes les données sont chiffrées en transit (HTTPS)
- 🔒 Les fichiers sont traités en mémoire (non stockés sur disque)
- 🔒 Accès limité aux utilisateurs autorisés de votre organisation
- 🔒 Conformité RGPD

### Données Sensibles

- ⚠️ Ne partagez jamais vos fichiers de registre par e-mail non sécurisé
- ⚠️ Utilisez uniquement l'interface Finixar pour l'import
- ⚠️ Supprimez les fichiers temporaires après l'import

---

## 📞 Support et Assistance

### Besoin d'Aide ?

Si vous rencontrez des difficultés avec l'import :

1. 📖 Consultez cette documentation
2. 🔍 Vérifiez les messages d'erreur détaillés
3. 📧 Contactez le support Finixar
4. 💬 Demandez une session de formation

### Formation

Une session de formation est disponible pour chaque nouvelle société. Contactez votre account manager pour planifier une formation personnalisée.

---

## 📝 Notes de Version

**Version 1.0 - Janvier 2026**

- Version initiale du format standard
- Support Excel et CSV
- Validation automatique intégrée
- Documentation complète

---

**© 2026 Finixar - Tous droits réservés**
