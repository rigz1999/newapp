# Data Migration Progress

## ✅ Completed Migrations

The following migration files have been created and should be run in Paris SQL Editor:

### Phase 1: Auth Constraints (REQUIRED FIRST)
- `00-drop-auth-constraints.sql` - Drops FK constraints to auth.users

### Phase 2: Auth & Organization Data
- `01-profiles-fixed.sql` - Migrates 4 user profiles
- `02-organizations.sql` - Migrates 2 organizations
- `03-memberships.sql` - Migrates 9 memberships (includes role constraint fix)
- `04-invitations.sql` - Migrates 11 invitations

### Phase 3: Business Data
- `05-projets.sql` - Migrates 2 projects
- `06-investisseurs.sql` - Migrates 3 investors
- `07-tranches.sql` - Migrates 3 tranches
- `08-souscriptions.sql` - Migrates 5 subscriptions

## 🔄 Next Steps

### 1. Run Business Data Migrations (if not done yet)

In Paris SQL Editor, run migrations 05-08 in order:

1. Open Paris project: https://nyyneivgrwksesgsmpjm.supabase.co
2. Go to SQL Editor
3. Run each file content from `data-migration/05-projets.sql` through `08-souscriptions.sql`
4. Verify success with the COUNT query at the end of each file

### 2. Export Remaining Tables from US Project

Open US project: https://wmgukeonxszbfdrrmkhy.supabase.co

Go to SQL Editor and run these queries to export remaining data:

#### A. coupons_echeances (needed next)
```sql
SELECT
  id, souscription_id, date_echeance, montant_coupon,
  statut, date_paiement, montant_paye, created_at,
  updated_at, echeance_id
FROM coupons_echeances
ORDER BY created_at;
```

#### B. paiements
```sql
SELECT
  id, id_paiement, type, projet_id, tranche_id,
  investisseur_id, montant, date_paiement, note,
  created_at, proof_url, ocr_raw_text, matched,
  souscription_id, statut, org_id, echeance_id
FROM paiements
ORDER BY created_at;
```

#### C. payment_proofs
```sql
SELECT
  id, paiement_id, file_url, file_name, file_size,
  extracted_data, confidence, validated_at, created_at
FROM payment_proofs
ORDER BY created_at;
```

#### D. user_reminder_settings (if any)
```sql
SELECT
  id, user_id, enabled, remind_7_days, remind_14_days,
  remind_30_days, created_at, updated_at
FROM user_reminder_settings
ORDER BY created_at;
```

#### E. superadmin_users (if any)
```sql
SELECT user_id, email, created_at
FROM superadmin_users
ORDER BY created_at;
```

#### F. app_config (if any)
```sql
SELECT key, value, description, created_at, updated_at
FROM app_config
ORDER BY key;
```

### 3. Provide Data for Migration File Creation

Copy the results from the above queries and provide them so I can create the remaining migration files (09-14).

## 📊 Migration Status Summary

| Table | Rows | Status | File |
|-------|------|--------|------|
| profiles | 4 | ✅ Ready | 01-profiles-fixed.sql |
| organizations | 2 | ✅ Ready | 02-organizations.sql |
| memberships | 9 | ✅ Ready | 03-memberships.sql |
| invitations | 11 | ✅ Ready | 04-invitations.sql |
| projets | 2 | ✅ Ready | 05-projets.sql |
| investisseurs | 3 | ✅ Ready | 06-investisseurs.sql |
| tranches | 3 | ✅ Ready | 07-tranches.sql |
| souscriptions | 5 | ✅ Ready | 08-souscriptions.sql |
| coupons_echeances | ~27 | ⏳ Need export | - |
| paiements | ? | ⏳ Need export | - |
| payment_proofs | ? | ⏳ Need export | - |
| user_reminder_settings | ? | ⏳ Need export | - |
| superadmin_users | ? | ⏳ Need export | - |
| app_config | ? | ⏳ Need export | - |

## ⚠️ Important Notes

1. **Auth constraints dropped**: FK constraints to auth.users were dropped to allow data import without creating auth entries
2. **Users will need to re-authenticate**: After migration, users should use magic link to sign in to Paris project
3. **UUIDs preserved**: All original UUIDs are maintained for data integrity
4. **Run in order**: Migrations must be run in numerical order due to FK dependencies
