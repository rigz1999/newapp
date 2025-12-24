# Database Column Name Audit - Paris Migration

## Audit Date
2024-12-24

## Purpose
Verify that all database functions in `paris-functions.sql` use correct column names matching the actual schema in `paris-base-schema.sql`.

## Issues Found and Fixed

### 1. ✅ FIXED: `recalculate_coupons_on_date_emission_change()` function
**Location:** `paris-functions.sql` lines 371-400

**Errors:**
- ❌ `NEW.date_fin` → Column doesn't exist
- ❌ `NEW.periodicite` → Column doesn't exist
- ❌ `s.montant_coupon` → Column doesn't exist in souscriptions table

**Corrections:**
- ✅ `NEW.date_echeance_finale` → Correct column name in tranches table
- ✅ `NEW.periodicite_coupons` → Correct column name in tranches table
- ✅ `s.coupon_net` → Correct column name in souscriptions table

**Fixed in commits:**
- `bf3d3ac` - Fixed date_fin and periodicite
- `1ac72e0` - Fixed montant_coupon

## Schema Verification

### Tranches Table Columns
```sql
- id (uuid)
- tranche_name (text)
- projet_id (uuid)
- date_emission (date)
- date_echeance (date)
- date_echeance_finale (date)  ← Used by functions
- created_at (timestamp)
- date_transfert_fonds (date)
- taux_nominal (numeric)
- periodicite_coupons (text)  ← Used by functions
- duree_mois (integer)
- updated_at (timestamp)
```

### Souscriptions Table Columns
```sql
- id (uuid)
- id_souscription (text)
- projet_id (uuid)
- tranche_id (uuid)
- investisseur_id (uuid)
- date_souscription (date)
- nombre_obligations (integer)
- montant_investi (numeric)
- coupon_brut (numeric)
- coupon_net (numeric)  ← Used by functions
- prochaine_date_coupon (date)
- created_at (timestamp)
- cgp, email_cgp, date_validation_bs, date_transfert, pea, pea_compte, code_cgp, siren_cgp
```

### Coupons_Echeances Table Columns
```sql
- id (uuid)
- souscription_id (uuid)
- date_echeance (date)
- montant_coupon (numeric)  ← Valid column (used in INSERT/UPDATE)
- statut (text)
- date_paiement (date)
- montant_paye (numeric)
- created_at, updated_at (timestamp)
- echeance_id (uuid)
```

### Projets Table Columns
```sql
- id (uuid)
- projet (text)
- emetteur (text)
- taux_nominal (numeric)
- periodicite_coupons (text)
- date_emission (date)
- duree_mois (integer)
- maturite_mois (integer)  ← Valid column (used as fallback)
- base_interet (integer)
- org_id (uuid)
- ... other fields
```

## Verified Correct Usage

### ✅ Valid column references confirmed:
1. `p.maturite_mois` - Valid column in projets table (used as fallback for duree_mois)
2. `montant_coupon` - Valid column in coupons_echeances table (not in souscriptions)
3. `generate_coupon_schedule()` function signature matches all callers

### ✅ No remaining issues with:
- `NEW.*` references in triggers
- Table alias column references (s., t., p.)
- Function parameter names vs actual columns

## Audit Result
**Status:** ✅ PASSED

All column name mismatches have been identified and corrected. The Paris database functions now properly reference the correct column names according to the schema.

## Next Steps
1. Run `fix-tranche-trigger.sql` in Paris database
2. Test tranche updates to verify fixes work
3. Test import-registre with écheancier generation

## Files Modified
- `paris-functions.sql` - Fixed column names
- `fix-tranche-trigger.sql` - SQL script to apply fixes to Paris DB
