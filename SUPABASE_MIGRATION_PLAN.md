# Supabase Migration Plan: US → Paris (GDPR Compliance)

**Date:** 2025-12-23
**Current Region:** US
**Target Region:** Paris (eu-central-1)
**Reason:** GDPR compliance requirements

---

## Overview

This plan outlines the migration of your Supabase database from US servers to Paris (EU) servers to ensure GDPR compliance. Your application is well-structured for this migration as all Supabase configuration is environment-based with no hardcoded regions.

### Current Setup Summary
- **69 database migrations** to replay
- **12 core tables** with Row-Level Security (RLS)
- **3 storage buckets** (payment-proofs, payment-proofs-temp, ribs)
- **9 edge functions** (Deno-based)
- **Environment-based configuration** (no code changes needed)

---

## Pre-Migration Checklist

### 1. Backup Current Database
- [ ] Create full database backup via Supabase Dashboard
- [ ] Export all storage bucket files locally
- [ ] Document current `VITE_SUPABASE_URL` and project reference
- [ ] Save current RLS policies (already in migrations)
- [ ] Export edge function secrets/environment variables

### 2. Prepare New Paris Project
- [ ] Create new Supabase project in **Paris region** (eu-central-1)
- [ ] Note new project URL: `https://<new-project-ref>.supabase.co`
- [ ] Save new Anon Key and Service Role Key
- [ ] Verify Paris region in project settings

---

## Migration Steps

### Phase 1: Database Schema Migration (Day 1)

#### Step 1.1: Apply All Migrations
```bash
# Set up Supabase CLI to point to new Paris project
supabase link --project-ref <new-paris-project-ref>

# Apply all 69 migrations in order
supabase db push
```

**What this does:**
- Creates all 12 tables with proper schemas
- Applies all Row-Level Security policies
- Sets up triggers and functions
- Configures storage bucket RLS policies

**Verification:**
```bash
# Check all tables exist
supabase db dump --data-only --schema public

# Verify RLS is enabled on all tables
```

#### Step 1.2: Verify Schema Integrity
- [ ] Compare table structures between old and new projects
- [ ] Verify all RLS policies are active
- [ ] Check database functions and triggers
- [ ] Confirm storage buckets exist: `payment-proofs`, `payment-proofs-temp`, `ribs`

---

### Phase 2: Data Migration (Day 1-2)

#### Step 2.1: Export Data from US Project

**Option A: Using Supabase Dashboard (Recommended for smaller datasets)**
```bash
# Export each table via SQL
SELECT * FROM organizations;
SELECT * FROM memberships;
SELECT * FROM profiles;
# ... (all 12 tables)
```

**Option B: Using pg_dump (Recommended for production)**
```bash
# Get connection string from old US project dashboard
pg_dump "postgresql://postgres:[PASSWORD]@db.[OLD-PROJECT-REF].supabase.co:5432/postgres" \
  --data-only \
  --schema=public \
  --exclude-table=schema_migrations \
  --exclude-table=supabase_migrations \
  -f us_data_backup.sql
```

#### Step 2.2: Import Data to Paris Project

**Using psql:**
```bash
# Connect to new Paris project
psql "postgresql://postgres:[NEW-PASSWORD]@db.[NEW-PROJECT-REF].supabase.co:5432/postgres" \
  -f us_data_backup.sql
```

**Important Considerations:**
- Disable RLS temporarily during import: `ALTER TABLE <table> DISABLE ROW LEVEL SECURITY;`
- Re-enable RLS after import: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
- Verify foreign key relationships are intact
- Check sequence values are correct

#### Step 2.3: Data Verification
```sql
-- Compare row counts
SELECT 'organizations' as table_name, COUNT(*) FROM organizations
UNION ALL
SELECT 'memberships', COUNT(*) FROM memberships
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
-- ... (all tables)

-- Verify recent records
SELECT * FROM projets ORDER BY created_at DESC LIMIT 10;
SELECT * FROM souscriptions ORDER BY created_at DESC LIMIT 10;
```

---

### Phase 3: Storage Migration (Day 2)

#### Step 3.1: Create Storage Buckets
Buckets should already exist from migrations, but verify:
- [ ] `payment-proofs` (private)
- [ ] `payment-proofs-temp` (private)
- [ ] `ribs` (private)

#### Step 3.2: Migrate Storage Files

**Using Supabase Storage API:**
```typescript
// migration-script.ts
import { createClient } from '@supabase/supabase-js';

const oldSupabase = createClient(
  'OLD_US_URL',
  'OLD_SERVICE_ROLE_KEY'
);

const newSupabase = createClient(
  'NEW_PARIS_URL',
  'NEW_SERVICE_ROLE_KEY'
);

const buckets = ['payment-proofs', 'payment-proofs-temp', 'ribs'];

for (const bucket of buckets) {
  // List all files
  const { data: files } = await oldSupabase.storage.from(bucket).list();

  for (const file of files) {
    // Download from old
    const { data: fileData } = await oldSupabase.storage
      .from(bucket)
      .download(file.name);

    // Upload to new
    await newSupabase.storage
      .from(bucket)
      .upload(file.name, fileData);
  }
}
```

**Verification:**
- [ ] Compare file counts in each bucket
- [ ] Spot-check file accessibility
- [ ] Verify RLS policies work correctly

---

### Phase 4: Edge Functions Migration (Day 2)

#### Step 4.1: Deploy Edge Functions to Paris Project
```bash
# Deploy all 9 edge functions
supabase functions deploy send-invitation
supabase functions deploy send-coupon-reminders
supabase functions deploy analyze-payment
supabase functions deploy analyze-payment-batch
supabase functions deploy accept-invitation
supabase functions deploy create-admin
supabase functions deploy delete-pending-user
supabase functions deploy import-registre
supabase functions deploy regenerate-echeancier
```

#### Step 4.2: Configure Edge Function Secrets
```bash
# Set environment variables for all functions
supabase secrets set RESEND_API_KEY=<your-resend-key>
supabase secrets set SUPABASE_URL=<new-paris-url>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<new-service-role-key>
supabase secrets set SUPABASE_ANON_KEY=<new-anon-key>
```

**IMPORTANT:** Update hardcoded URL in `send-invitation` function:
- File: `supabase/functions/send-invitation/index.ts`
- Change: `APP_URL='https://finixar.com'` if needed for region-specific routing

#### Step 4.3: Test Edge Functions
```bash
# Test each function
supabase functions invoke send-invitation --data '{"test": true}'
supabase functions invoke send-coupon-reminders --data '{"test": true}'
# ... (test all functions)
```

---

### Phase 5: Application Configuration Update (Day 3)

#### Step 5.1: Update Environment Variables

**For Development (.env.local):**
```bash
VITE_SUPABASE_URL=https://<new-paris-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<new-paris-anon-key>
```

**For Production (Vercel/Netlify):**
Update these environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**No code changes needed** - your application is already region-agnostic!

#### Step 5.2: Update CI/CD Pipeline
- [ ] Update GitHub Actions secrets if Supabase URL is stored there
- [ ] Update deployment platform environment variables (Vercel/Netlify)
- [ ] Keep old project running until migration is verified

---

### Phase 6: Testing (Day 3-4)

#### Step 6.1: Functional Testing
- [ ] User authentication (sign up, sign in, password reset)
- [ ] Organization creation and membership
- [ ] Project creation with tranches
- [ ] Investor management
- [ ] Subscription creation with coupon calculations
- [ ] Payment proof uploads
- [ ] RIB document uploads
- [ ] Coupon reminder functionality

#### Step 6.2: Security Testing
- [ ] Verify RLS policies block unauthorized access
- [ ] Test role-based permissions (member vs admin vs super_admin)
- [ ] Verify storage bucket access controls
- [ ] Test edge function authentication

#### Step 6.3: Performance Testing
- [ ] Compare query latency (should be similar or better for EU users)
- [ ] Test storage file upload/download speeds
- [ ] Monitor edge function cold start times

#### Step 6.4: Data Integrity Verification
```sql
-- Compare critical data checksums
SELECT
  MD5(array_agg(id::text ORDER BY id)::text) as checksum,
  COUNT(*) as count
FROM organizations;

-- Repeat for all tables
```

---

### Phase 7: Cutover (Day 5)

#### Step 7.1: Maintenance Window Planning
**Recommended approach:** Blue-green deployment with minimal downtime

**Option A: Zero-Downtime (Recommended)**
1. Keep old US project running
2. Deploy new environment variables to production
3. Monitor for issues
4. Quick rollback available by reverting env vars

**Option B: Maintenance Window**
1. Enable maintenance mode
2. Stop new writes to old database
3. Final data sync (incremental)
4. Update production environment variables
5. Disable maintenance mode

#### Step 7.2: Deployment Steps
```bash
# 1. Deploy to staging first
# Update staging environment variables
# Test thoroughly

# 2. Deploy to production
# Update production environment variables on Vercel/Netlify
# Monitor logs and error rates

# 3. DNS/CDN cache considerations
# Clear CDN cache if using Cloudflare/similar
# May take 5-10 minutes for all users to use new config
```

#### Step 7.3: Monitoring
- [ ] Watch error rates in Sentry (if configured)
- [ ] Monitor Supabase dashboard for query errors
- [ ] Check edge function invocation logs
- [ ] Monitor user authentication success rates

---

### Phase 8: Post-Migration (Day 5-7)

#### Step 8.1: Validation Period
- [ ] Monitor for 24-48 hours
- [ ] Collect user feedback
- [ ] Check all scheduled jobs (coupon reminders) work
- [ ] Verify email delivery (Resend integration)

#### Step 8.2: Old Project Decommissioning
**Wait 7-14 days before decommissioning old project**

Steps:
1. Archive old US project (don't delete immediately)
2. Download final backup
3. Remove production traffic routing
4. After 30 days: Consider deleting old project

#### Step 8.3: Documentation Updates
- [ ] Update README with new Supabase region info
- [ ] Document new project URL in team wiki
- [ ] Update onboarding docs for new developers
- [ ] Update incident response procedures

---

## Rollback Plan

If critical issues are discovered:

### Quick Rollback (< 1 hour)
```bash
# Revert environment variables to old US project
VITE_SUPABASE_URL=<old-us-url>
VITE_SUPABASE_ANON_KEY=<old-us-anon-key>

# Redeploy with old config
```

### Data Sync Rollback
If data was written to Paris project during testing:
1. Export incremental changes from Paris
2. Import to US project
3. Revert environment variables
4. Retry migration after fixing issues

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Data loss during migration | Critical | Low | Full backup before starting, verify checksums |
| Downtime during cutover | High | Medium | Use blue-green deployment, test thoroughly |
| Storage file migration errors | Medium | Low | Verify checksums, test file access |
| Edge function configuration errors | Medium | Medium | Test all functions before cutover |
| RLS policy issues | High | Low | All policies in migrations, tested |
| Performance degradation | Medium | Low | Paris closer to EU users, should improve |
| Auth token incompatibility | Critical | Very Low | Same Supabase version, test auth first |

---

## Cost Considerations

- New Paris project will have same pricing as US project
- During migration: Running two projects simultaneously (~2x cost for 1-2 weeks)
- Storage egress fees for downloading files from US project
- Estimated additional cost: $50-200 depending on data volume

---

## GDPR Compliance Checklist

After migration:
- [ ] Data is stored in EU (Paris region)
- [ ] Update privacy policy to reflect EU data residency
- [ ] Verify data processing agreements with Supabase
- [ ] Document data location in GDPR records
- [ ] Update data subject access request procedures

---

## Timeline Summary

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Pre-migration setup | 0.5 day | - |
| Schema migration | 0.5 day | - |
| Data migration | 1 day | Schema complete |
| Storage migration | 0.5 day | - |
| Edge functions | 0.5 day | - |
| Testing | 1.5 days | All migrations complete |
| Deployment | 0.5 day | Testing passed |
| Monitoring | 2-7 days | Deployment complete |

**Total estimated time:** 5-7 days (can be compressed to 3-4 days with parallel work)

---

## Required Access & Tools

- [ ] Supabase Dashboard access (admin)
- [ ] Supabase CLI installed: `npm install -g supabase`
- [ ] PostgreSQL client tools: `pg_dump`, `psql`
- [ ] Production deployment platform access (Vercel/Netlify)
- [ ] Service role keys for both projects
- [ ] Resend API key (for edge functions)

---

## Support & Resources

- **Supabase Migration Docs:** https://supabase.com/docs/guides/platform/migrating-and-upgrading-projects
- **Supabase CLI Reference:** https://supabase.com/docs/reference/cli
- **GDPR Compliance:** https://supabase.com/docs/guides/platform/going-into-prod#gdpr

---

## Next Steps

1. **Review this plan** with your team
2. **Schedule migration window** (recommend weekend/low-traffic period)
3. **Create new Paris Supabase project**
4. **Set up test environment** with Paris project first
5. **Run through migration** on test environment
6. **Execute production migration** following this plan

---

## Notes & Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-23 | Use Paris region (eu-central-1) | GDPR compliance, closest EU region |
| 2025-12-23 | Blue-green deployment strategy | Minimal downtime, easy rollback |
| 2025-12-23 | Keep old project for 30 days | Safety buffer for unforeseen issues |

---

**Migration Manager:** _[Your Name]_
**Start Date:** _[To be scheduled]_
**Completion Date:** _[To be confirmed]_
