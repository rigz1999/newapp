# Finixar Database Migration: US → Paris

Complete guide for migrating your Supabase project from US region to Paris (France) region.

## Prerequisites

- [ ] Node.js installed (v18+)
- [ ] Access to both US and Paris Supabase projects
- [ ] Service role keys for both projects
- [ ] Backup of current data
- [ ] Scheduled maintenance window (2-4 hours recommended)

## Step-by-Step Migration Process

### 1. Create Paris Project

1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Select your organization
4. **Important**: Choose **Europe (Paris) - eu-central-1** region
5. Set project name: "Finixar Production Paris" (or similar)
6. Set a strong database password (save it!)
7. Wait ~2 minutes for project creation

### 2. Save Credentials

**Paris Project** → Settings → API:
- Project URL: `https://xxxxx.supabase.co`
- Anon key: `eyJhbGc...` (public key)
- Service role key: `eyJhbGc...` (secret - keep safe!)

**US Project** → Settings → API:
- Service role key: `eyJhbGc...` (needed for migration)

### 3. Apply Database Schema to Paris

**Option A: Using your migration files** (recommended)

You already have migrations in `supabase/migrations/`. Apply them:

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link to Paris project:
```bash
supabase link --project-ref YOUR_PARIS_PROJECT_REF
```

3. Push migrations:
```bash
supabase db push
```

**Option B: Manual via SQL Editor**

In **Paris project** → SQL Editor:
- Copy the entire schema from the file you provided
- Run it to create all tables

### 4. Apply RLS Policies

In **US project** → Authentication → Policies:
- Click on each table
- Copy the SQL for each policy
- Paste and run in **Paris project** → SQL Editor

Example policies you need to copy:
- Organizations policies
- Profiles policies
- Memberships policies
- Projects (projets) policies
- Investors (investisseurs) policies
- Subscriptions (souscriptions) policies
- Payments (paiements) policies
- etc.

### 5. Migrate Data

**Step 1**: Install dependencies
```bash
cd /home/user/newapp
npm install @supabase/supabase-js
```

**Step 2**: Update credentials in `migrate-database.js`

Open the file and update:
```javascript
const US_URL = 'https://YOUR_US_PROJECT.supabase.co';
const US_SERVICE_KEY = 'your-us-service-role-key';
const PARIS_URL = 'https://YOUR_PARIS_PROJECT.supabase.co';
const PARIS_SERVICE_KEY = 'your-paris-service-role-key';
```

**Step 3**: Run migration
```bash
node migrate-database.js
```

This will:
- ✅ Migrate all 14 tables in correct order
- ✅ Respect foreign key dependencies
- ✅ Show progress for each table
- ✅ Verify row counts
- ✅ Provide detailed summary

Expected output:
```
🚀 Starting Finixar Database Migration
📍 From: US Region
📍 To: Paris Region

📦 Migrating table: organizations
   Found 5 rows
✅ Migrated 5/5 rows from organizations

📦 Migrating table: projets
   Found 12 rows
✅ Migrated 12/12 rows from projets

... (continues for all tables)

🔍 Verifying migration...
✅ organizations: US=5, Paris=5
✅ projets: US=12, Paris=12
... (verification for all tables)

🎉 Migration completed successfully!
```

### 6. Migrate Storage (Files)

Your app likely stores:
- RIB documents (investor bank details)
- Payment proof documents

**Step 1**: Update credentials in `migrate-storage.js` (same as above)

**Step 2**: Run migration
```bash
node migrate-storage.js
```

This will:
- ✅ Create buckets in Paris
- ✅ Download files from US
- ✅ Upload to Paris
- ✅ Verify file counts
- ✅ Show progress

### 7. Migrate Auth Users

**Option 1: Users reset passwords** (simplest)

1. Export user emails from US project (SQL Editor):
```sql
SELECT email FROM auth.users;
```

2. Create users in Paris with temporary passwords
3. Trigger password reset emails for all users

**Option 2: Keep existing passwords** (advanced)

This requires Supabase CLI and direct database access. Contact me if you need this.

### 8. Deploy Edge Functions (if any)

If you have Supabase Edge Functions:

```bash
supabase link --project-ref YOUR_PARIS_PROJECT_REF
supabase functions deploy
```

### 9. Update Application

**Step 1**: Update `.env` file
```env
VITE_SUPABASE_URL=https://YOUR_PARIS_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_new_paris_anon_key
```

**Step 2**: Update on hosting platform

If deployed on **Vercel**:
- Go to project settings → Environment Variables
- Update `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Redeploy

If deployed on **Netlify**:
- Site settings → Environment variables
- Update and redeploy

**Step 3**: Build and test locally
```bash
npm run build
npm run preview
```

Test all functionality before deploying!

### 10. Validation Checklist

Run these checks in **Paris project** → SQL Editor:

```sql
-- Verify row counts
SELECT
  'organizations' as table_name, COUNT(*) as count FROM organizations
UNION ALL
  SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
  SELECT 'projets', COUNT(*) FROM projets
UNION ALL
  SELECT 'tranches', COUNT(*) FROM tranches
UNION ALL
  SELECT 'investisseurs', COUNT(*) FROM investisseurs
UNION ALL
  SELECT 'souscriptions', COUNT(*) FROM souscriptions
UNION ALL
  SELECT 'paiements', COUNT(*) FROM paiements
UNION ALL
  SELECT 'coupons_echeances', COUNT(*) FROM coupons_echeances;
```

Compare with same query in US project.

**Manual testing**:
- [ ] Login works
- [ ] Dashboard loads with correct data
- [ ] Projects page shows all projects
- [ ] Investors page shows all investors
- [ ] Subscriptions page works
- [ ] Payments/Coupons page works
- [ ] File uploads work (RIB, payment proofs)
- [ ] File downloads work
- [ ] Filters work
- [ ] Excel exports work
- [ ] Create/Edit/Delete operations work
- [ ] Real-time updates work (open two browsers)

### 11. Go Live

**Recommended cutover plan**:

1. **Friday 6 PM**: Start migration
2. Put maintenance banner on app
3. Run final data sync (re-run migration scripts)
4. Update environment variables
5. Deploy to production
6. Remove maintenance banner
7. **Friday 8 PM**: Monitor closely
8. Keep US project running for 1 week as backup

## Troubleshooting

### Migration script fails

**Error: "Row violates foreign key constraint"**
- Tables migrated out of order
- Check that schema was applied first
- Re-run with correct table order (script handles this)

**Error: "Duplicate key value"**
- Data already exists in Paris
- Either clear Paris tables or use `upsert` mode

### Storage migration fails

**Error: "Bucket already exists"**
- Safe to ignore, script will continue

**Error: "File size too large"**
- Check bucket limits in Paris project
- Adjust `fileSizeLimit` in script

### App doesn't work after migration

1. Check browser console for errors
2. Verify environment variables are correct
3. Check Supabase dashboard → Logs for API errors
4. Verify RLS policies were copied

## Rollback Plan

If something goes wrong:

1. Update environment variables back to US project
2. Redeploy application
3. Investigate issue
4. Fix and retry migration

## Data Residency Compliance

After migration to Paris:
- ✅ All data stored in EU (France)
- ✅ GDPR compliant
- ✅ Meets French data residency requirements
- ✅ Lower latency for French users

## Cost Comparison

Both regions have same pricing. No change in costs.

## Timeline

- Schema setup: 30 minutes
- Data migration: 10-30 minutes (depends on data size)
- Storage migration: 15-60 minutes (depends on files)
- Testing: 30-60 minutes
- **Total: 2-3 hours**

## Support

If you encounter issues:
1. Check Supabase documentation: https://supabase.com/docs
2. Review migration logs for specific errors
3. Check Supabase status: https://status.supabase.com
4. Contact Supabase support if needed

## Post-Migration

- [ ] Monitor application for 24-48 hours
- [ ] Check error logs in Sentry
- [ ] Verify all features work
- [ ] Keep US project for 1-2 weeks before deletion
- [ ] Update documentation with new project details
- [ ] Notify team of new credentials

---

**Good luck with your migration! 🚀**
