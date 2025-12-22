# Quick Start: Migrate Finixar from US to Paris

## The Complete Migration File

Use **`complete-migration.js`** - it does everything:
- ✅ Migrates all 14 database tables
- ✅ Migrates all storage buckets and files
- ✅ Verifies data integrity
- ✅ Shows detailed progress

## Quick Setup (5 Steps)

### 1. Install Dependencies
```bash
npm install @supabase/supabase-js
```

### 2. Get Your Credentials

**US Project** (Settings → API):
- Service Role Key: `eyJhbGc...` (starts with eyJ)

**Paris Project** (Settings → API):
- Project URL: `https://xxxxx.supabase.co`
- Service Role Key: `eyJhbGc...`

### 3. Edit `complete-migration.js`

Open the file and replace lines 25-32:

```javascript
const CONFIG = {
  us: {
    url: 'https://abcdefgh.supabase.co',  // ← Your US project URL
    serviceKey: 'eyJhbGc...your-us-key',   // ← Your US service role key
  },
  paris: {
    url: 'https://ijklmnop.supabase.co',  // ← Your Paris project URL
    serviceKey: 'eyJhbGc...your-paris-key', // ← Your Paris service role key
  },
```

### 4. Apply Schema to Paris First

**IMPORTANT**: Before running the migration, apply your database schema to Paris:

```bash
# Option A: Using Supabase CLI (recommended)
supabase link --project-ref YOUR_PARIS_PROJECT_REF
supabase db push

# Option B: Manually in Paris SQL Editor
# Copy all SQL from your schema file and run it
```

### 5. Run Migration

```bash
node complete-migration.js
```

## What You'll See

```
======================================================================
🚀  FINIXAR COMPLETE MIGRATION: US → PARIS
======================================================================

📍 Source:      US Region
📍 Destination: Paris Region (eu-central-1)
⏰ Started at:  12/22/2025, 3:45:23 PM

============================================================
ℹ️  DATABASE MIGRATION
============================================================

📦 Migrating table: organizations
   Found 5 rows
   Batch 1/1: 5 rows inserted
✅ Migrated 5/5 rows from organizations

📦 Migrating table: projets
   Found 12 rows
   Batch 1/1: 12 rows inserted
✅ Migrated 12/12 rows from projets

... (continues for all 14 tables)

============================================================
🔍 VERIFYING DATABASE MIGRATION
============================================================

✅ organizations              US:     5 | Paris:     5
✅ projets                    US:    12 | Paris:    12
✅ investisseurs              US:   150 | Paris:   150
... (all tables verified)

============================================================
💾 STORAGE MIGRATION
============================================================

📦 Migrating bucket: rib-documents
  ✅ [1/25] investor-123-rib.pdf (245KB)
  ✅ [2/25] investor-456-rib.pdf (189KB)
... (all files)

============================================================
🔍 VERIFYING STORAGE MIGRATION
============================================================

✅ rib-documents              US:    25 | Paris:    25
✅ payment-proofs             US:   134 | Paris:   134

======================================================================
📊 FINAL MIGRATION SUMMARY
======================================================================

📊 DATABASE:
   ✅ Successfully migrated: 14/14 tables
   📦 Total rows migrated:   1,247
   ⏱️  Duration:              45s

💾 STORAGE:
   ✅ Successfully migrated: 2/2 buckets
   📦 Total files migrated:  159
   ⏱️  Duration:              78s

⏱️  TOTAL TIME: 2m 3s
⏰ Completed at: 12/22/2025, 3:47:26 PM

🎉 MIGRATION COMPLETED SUCCESSFULLY!

Next steps:
1. Update your application environment variables
2. Deploy your application with new Supabase URL and keys
3. Test all functionality thoroughly
4. Monitor for 24-48 hours before decommissioning US project
```

## After Migration

### 1. Update Your App

Edit `.env`:
```env
VITE_SUPABASE_URL=https://YOUR_PARIS_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_new_paris_anon_key
```

### 2. Deploy

```bash
# Test locally first
npm run build
npm run preview

# Then deploy
vercel --prod
# or
netlify deploy --prod
```

### 3. Verify Everything Works

- [ ] Login/signup works
- [ ] All pages load (Dashboard, Projects, Investors, etc.)
- [ ] Data is correct
- [ ] Files download (RIB docs, payment proofs)
- [ ] Create/edit/delete works
- [ ] Filters work
- [ ] Exports work

## Troubleshooting

### Error: "relation does not exist"
→ You forgot to apply the schema to Paris. Run `supabase db push` first.

### Error: "violates foreign key constraint"
→ Schema wasn't applied correctly. Check that all tables exist in Paris.

### Error: "JWT expired" or "Invalid API key"
→ Double-check your service role keys. They should start with `eyJhbGc...`

### Files not migrating
→ Check that buckets exist in Paris. The script creates them automatically.

### Row counts don't match
→ Check error messages during migration. You may need to re-run for specific tables.

## Need Help?

1. Check the detailed logs from the migration script
2. Verify credentials are correct
3. Check Supabase dashboard → Logs for errors
4. Review `MIGRATION_GUIDE.md` for detailed documentation

## Files Included

- **`complete-migration.js`** ← USE THIS (all-in-one)
- `migrate-database.js` (database only)
- `migrate-storage.js` (storage only)
- `MIGRATION_GUIDE.md` (detailed docs)
- `MIGRATION_README.md` (this file)

---

**Ready?** Just update the credentials and run: `node complete-migration.js`
