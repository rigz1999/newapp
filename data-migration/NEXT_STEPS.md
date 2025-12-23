# Migration Next Steps

## Current Status

✅ **Completed:**
- Paris Supabase project created
- Base schema applied (all 14 tables)
- Database functions applied (30+ functions)
- RLS policies applied
- Database triggers applied (11 triggers)
- Auth data migration files created (profiles, organizations, memberships, invitations)
- Business data migration files created (projets, investisseurs, tranches, souscriptions)

## Immediate Next Steps

### Step 1: Run Business Data Migrations in Paris

If you haven't already run migrations 05-08, do this now:

1. Open Paris SQL Editor: https://nyyneivgrwksesgsmpjm.supabase.co
2. Run each file in order:
   - `data-migration/05-projets.sql`
   - `data-migration/06-investisseurs.sql`
   - `data-migration/07-tranches.sql`
   - `data-migration/08-souscriptions.sql`

Each file has a verification query at the end. Expected results:
- projets: 2 rows
- investisseurs: 3 rows
- tranches: 3 rows
- souscriptions: 5 rows

### Step 2: Export Remaining Data from US

Open US SQL Editor: https://wmgukeonxszbfdrrmkhy.supabase.co

Run the export scripts in the `export-scripts/` directory:

**Priority 1 (Required):**
1. `export-scripts/01-export-coupons-echeances.sql` (~27 rows expected)
2. `export-scripts/02-export-paiements.sql`
3. `export-scripts/03-export-payment-proofs.sql`

**Priority 2 (If not empty):**
4. `export-scripts/04-export-optional-tables.sql`

### Step 3: Provide Export Results

For each export, copy the entire results table and provide it in this format:

```
Table: coupons_echeances

| id | souscription_id | date_echeance | montant_coupon | statut | ... |
|----|-----------------|---------------|----------------|--------|-----|
| uuid-1 | uuid-2 | 2025-01-01 | 100.00 | payé | ... |
| uuid-3 | uuid-4 | 2025-02-01 | 100.00 | en_attente | ... |
```

This allows me to create the migration SQL files (09, 10, 11, etc.)

### Step 4: Run Verification

After all data migrations are complete, run:

```sql
-- In Paris SQL Editor
-- Copy content from data-migration/verify-migration.sql
```

This will show:
- Row counts for all tables
- Data integrity checks
- Orphaned records (if any)
- Sample data from each table

## What Comes After Data Migration

Once all data is migrated and verified:

1. **Storage Migration**
   - Create storage buckets in Paris (payment-proofs, payment-proofs-temp, ribs)
   - Download files from US buckets
   - Upload to Paris buckets

2. **Edge Functions**
   - Deploy 9 edge functions to Paris
   - Configure secrets and environment variables

3. **User Authentication**
   - Send magic links to 4 users for Paris project
   - Verify profile linking works

4. **Environment Variables**
   - Update production env vars to point to Paris
   - Test application

5. **Final Testing**
   - Test all features
   - Verify data integrity
   - Monitor for errors

## Estimated Time Remaining

- Data migration completion: 15-30 minutes
- Storage migration: 20-40 minutes
- Edge functions: 15-25 minutes
- Testing: 20-30 minutes

**Total: 70-125 minutes**

## Need Help?

If you encounter any errors during migration, provide:
1. The error message
2. Which migration file you were running
3. The SQL query that failed

This helps quickly identify and fix the issue.
