# Paris Migration - Final Checklist

## Status: ✅ Écheancier Working!

The écheancier generation is now working successfully. Here's what remains to complete the migration.

---

## 1️⃣ Data Verification (CRITICAL)

### ✅ Already Migrated
- [x] Schema (14 tables)
- [x] Functions, triggers, RLS policies
- [x] Auth data (profiles, organizations, memberships, invitations)
- [x] Business data (projets, investisseurs, tranches, souscriptions)
- [x] coupons_echeances
- [x] paiements
- [x] payment_proofs

### ⚠️ Verify Data Integrity

Run these queries in Paris SQL Editor to verify:

```sql
-- 1. Count all critical data
SELECT
  'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'organizations', COUNT(*) FROM organizations
UNION ALL
SELECT 'memberships', COUNT(*) FROM memberships
UNION ALL
SELECT 'projets', COUNT(*) FROM projets
UNION ALL
SELECT 'tranches', COUNT(*) FROM tranches
UNION ALL
SELECT 'investisseurs', COUNT(*) FROM investisseurs
UNION ALL
SELECT 'souscriptions', COUNT(*) FROM souscriptions
UNION ALL
SELECT 'coupons_echeances', COUNT(*) FROM coupons_echeances
UNION ALL
SELECT 'paiements', COUNT(*) FROM paiements
UNION ALL
SELECT 'payment_proofs', COUNT(*) FROM payment_proofs;

-- 2. Check for orphaned records (should return 0)
SELECT COUNT(*) as orphaned_tranches
FROM tranches t
WHERE NOT EXISTS (SELECT 1 FROM projets p WHERE p.id = t.projet_id);

SELECT COUNT(*) as orphaned_souscriptions
FROM souscriptions s
WHERE NOT EXISTS (SELECT 1 FROM tranches t WHERE t.id = s.tranche_id);

-- 3. Verify superadmin exists
SELECT id, email, is_superadmin
FROM profiles
WHERE is_superadmin = true;

-- 4. Check org_id is set everywhere
SELECT COUNT(*) as missing_org_id_projets FROM projets WHERE org_id IS NULL;
SELECT COUNT(*) as missing_org_id_investisseurs FROM investisseurs WHERE org_id IS NULL;
```

**Compare counts with US database** to ensure nothing was lost.

---

## 2️⃣ Environment Configuration

### Production Environment Variables

**Current status:** Check what's deployed in production

```bash
# Check current .env files
cat .env
cat .env.production
```

### Update for Paris (if not already done)

**In `.env.production` or production hosting:**
```env
VITE_SUPABASE_URL=https://nyyneivgrwksesgsmpjm.supabase.co
VITE_SUPABASE_ANON_KEY=<Paris anon key>
```

**In Vercel/Netlify (if applicable):**
- Update `VITE_SUPABASE_URL` environment variable
- Update `VITE_SUPABASE_ANON_KEY` environment variable
- Trigger a new production deployment

### GitHub Secrets

**Update these secrets** if using GitHub Actions:
- `SUPABASE_ACCESS_TOKEN` - Should work for both (personal access token)
- `SUPABASE_PARIS_PROJECT_REF` - Should be `nyyneivgrwksesgsmpjm` ✅

---

## 3️⃣ Edge Functions Deployment

### Verify All Functions Deployed to Paris

Go to: https://supabase.com/dashboard/project/nyyneivgrwksesgsmpjm/functions

**Check these 9 functions are deployed:**
- [ ] accept-invitation
- [ ] analyze-payment
- [ ] analyze-payment-batch
- [ ] change-password
- [ ] delete-pending-user
- [ ] import-registre ✅ (with inline écheancier)
- [ ] regenerate-echeancier ✅
- [ ] send-coupon-reminders
- [ ] send-invitation

**If any are missing, deploy them:**
```bash
supabase functions deploy <function-name> --project-ref nyyneivgrwksesgsmpjm
```

Or trigger GitHub Actions workflow.

### Edge Function Secrets

**Verify these secrets are set in Paris:**

Go to: https://supabase.com/dashboard/project/nyyneivgrwksesgsmpjm/settings/vault

Required secrets:
- `RESEND_API_KEY` (for email sending)
- Any other API keys your functions use

---

## 4️⃣ Storage Buckets

### Verify Buckets Exist

Go to: https://supabase.com/dashboard/project/nyyneivgrwksesgsmpjm/storage/buckets

**Required buckets:**
- [ ] `payment-proofs`
- [ ] `payment-proofs-temp`

**If missing, create them:**
```sql
-- Run in Paris SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('payment-proofs', 'payment-proofs', false),
  ('payment-proofs-temp', 'payment-proofs-temp', false);
```

### Storage Policies

Check that RLS policies exist for storage buckets:
```sql
-- Verify storage policies
SELECT * FROM storage.policies;
```

If missing, apply from your migration files.

---

## 5️⃣ RLS Policies Verification

### Test as Different User Roles

**Test these scenarios:**

1. **Superadmin:**
   - [ ] Can see all organizations
   - [ ] Can see all projects
   - [ ] Can create/edit/delete anything

2. **Regular User (Member):**
   - [ ] Can only see their organization's data
   - [ ] Cannot see other organizations
   - [ ] Can create projects in their org

3. **Anonymous (logged out):**
   - [ ] Cannot access any data
   - [ ] Cannot bypass RLS

### Check for RLS Errors

Monitor for these in logs:
- 406 errors (RLS rejection)
- 500 errors (RLS policy bugs)
- Empty results when data should be visible

---

## 6️⃣ Critical Workflows Testing

### End-to-End Tests

**Test these workflows in Paris:**

1. **Authentication:**
   - [ ] User login works
   - [ ] User logout works
   - [ ] Password reset works
   - [ ] Invitation flow works

2. **Superadmin:**
   - [ ] Create organization
   - [ ] Create user
   - [ ] Assign roles
   - [ ] View all data

3. **Project Management:**
   - [ ] Create new project ✅ (you tested this)
   - [ ] Edit project
   - [ ] Delete project
   - [ ] View project list

4. **Tranche Management:**
   - [ ] Create tranche with CSV ✅ (you tested this)
   - [ ] Edit tranche (regenerate écheancier) ✅ (you tested this)
   - [ ] View tranche details
   - [ ] Delete tranche

5. **Investor Management:**
   - [ ] Create investor (physique/morale)
   - [ ] Edit investor
   - [ ] View investor list

6. **Payment Management:**
   - [ ] Upload payment proof
   - [ ] Mark coupon as paid
   - [ ] View payment history

7. **Reporting:**
   - [ ] Generate reports
   - [ ] Export data
   - [ ] View dashboards

---

## 7️⃣ Performance & Monitoring

### Database Performance

```sql
-- Check for missing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check slow queries (if pg_stat_statements enabled)
SELECT calls, total_exec_time, mean_exec_time, query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Enable Logging

**In Supabase Dashboard:**
- Enable API logs
- Enable Database logs
- Enable Edge Function logs
- Set retention period

---

## 8️⃣ Backup Strategy

### Automated Backups

**Supabase automatic backups:**
- Paris project should have daily backups enabled by default
- Verify in: https://supabase.com/dashboard/project/nyyneivgrwksesgsmpjm/settings/addons

### Manual Backup Script

Create a backup script for critical data:
```bash
#!/bin/bash
# backup-paris.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h db.nyyneivgrwksesgsmpjm.supabase.co -U postgres -d postgres > backup_${DATE}.sql
```

---

## 9️⃣ Documentation Updates

### Update README/Docs

**Update these files:**
- [ ] README.md - Update database URL references
- [ ] DEPLOY.md - Update deployment instructions
- [ ] .env.example - Update with Paris project ref

### Create Migration Record

Document this migration:
```markdown
## Migration History

### 2024-12-24: US → Paris Migration
- **Old:** wmgukeonxszbfdrrmkhy (US East)
- **New:** nyyneivgrwksesgsmpjm (Paris, eu-west-3)
- **Reason:** GDPR compliance, lower latency for EU users
- **Status:** ✅ Complete
```

---

## 🔟 Decommission US Database (AFTER TESTING)

### ⚠️ DO NOT DO THIS YET!

**Only after 1-2 weeks of successful Paris operation:**

1. **Final verification:**
   - All production traffic on Paris
   - No errors in Paris logs
   - All features working
   - Users happy

2. **Create final backup of US:**
   ```bash
   pg_dump US_DATABASE > final_us_backup_$(date +%Y%m%d).sql
   ```

3. **Keep US read-only for 30 days:**
   - Don't delete immediately
   - Downgrade to free tier if possible
   - Keep as emergency fallback

4. **After 30 days:**
   - Download final backup
   - Delete US Supabase project
   - Update billing

---

## 📋 Summary Checklist

### Must Do Now:
- [ ] Verify data counts match (Section 1)
- [ ] Check all edge functions deployed (Section 3)
- [ ] Test critical workflows (Section 6)
- [ ] Update production environment variables (Section 2)

### Should Do Soon:
- [ ] Test all user roles (Section 5)
- [ ] Verify storage buckets (Section 4)
- [ ] Set up monitoring/logging (Section 7)
- [ ] Update documentation (Section 9)

### Can Do Later:
- [ ] Performance optimization (Section 7)
- [ ] Backup automation (Section 8)
- [ ] Decommission US database (Section 10)

---

## ✅ Migration Complete When:

✅ All data verified in Paris
✅ All edge functions deployed
✅ All workflows tested and working
✅ Production pointing to Paris
✅ No errors in logs for 24 hours
✅ Users can work normally

---

## 🆘 Rollback Plan (Just in Case)

If something goes wrong:

1. **Immediate:** Change .env back to US database
2. **Deploy:** Push environment change to production
3. **Investigate:** Debug Paris issue offline
4. **Fix:** Apply fixes to Paris
5. **Re-migrate:** Try again when fixed

**US Database credentials (keep safe):**
- URL: `https://wmgukeonxszbfdrrmkhy.supabase.co`
- Keep ANON and SERVICE_ROLE keys in secure location

---

## Next Steps

1. Run the data verification queries (Section 1)
2. Share the results with me
3. Test the critical workflows (Section 6)
4. Once everything is confirmed working, update production
5. Monitor for 24-48 hours
6. Celebrate! 🎉
