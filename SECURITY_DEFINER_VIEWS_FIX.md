# Security Definer Views Fix

## Issue Summary

The Supabase database linter detected two views with the `SECURITY DEFINER` property:

1. `public.v_prochains_coupons`
2. `public.coupons_optimized`

## Why This Is a Critical Security Issue

### What is SECURITY DEFINER?

- **SECURITY DEFINER**: View runs with the permissions of the view **creator**
- **SECURITY INVOKER**: View runs with the permissions of the **querying user** (safe default)

### The Problem

With `SECURITY DEFINER`, when any user queries these views:
- The view executes with the **creator's permissions** (usually postgres superuser)
- Row Level Security (RLS) policies are **bypassed or applied incorrectly**
- Users can see data from **ALL organizations**, not just their own

### Real-World Impact

In your multi-tenant application:

❌ **BEFORE FIX (SECURITY DEFINER)**:
```sql
-- User from Organization A queries:
SELECT * FROM v_prochains_coupons;
-- Returns coupons from ALL organizations (A, B, C, etc.)
-- CRITICAL DATA LEAKAGE!
```

✅ **AFTER FIX (SECURITY INVOKER)**:
```sql
-- User from Organization A queries:
SELECT * FROM v_prochains_coupons;
-- Returns coupons from ONLY Organization A
-- RLS policies properly enforced!
```

## Root Cause Analysis

### 1. v_prochains_coupons

- **Original Issue**: Created with default SECURITY DEFINER
- **First Fix Attempt**: Migration `20251107000001_fix_security_definer_views.sql` set `security_invoker = true`
- **Current Status**: Either the migration didn't apply to production, or the view was recreated later

### 2. coupons_optimized

- **Original**: Created as materialized view in `20251226000002_create_coupons_optimized_view.sql`
- **Conversion**: Migration `20251226000003_convert_coupons_to_regular_view.sql` converted it to a regular view
- **Problem**: The conversion migration **forgot to set `security_invoker = true`**
- **Result**: View defaulted to SECURITY DEFINER

## The Solution

### Migration Created

File: `supabase/migrations/20260109000001_fix_security_definer_views_final.sql`

This migration:
1. ✓ Sets `security_invoker = true` on both views
2. ✓ Verifies the settings were applied correctly
3. ✓ Updates view comments with security documentation
4. ✓ Is idempotent (safe to run multiple times)
5. ✓ Provides detailed verification output

### What It Does

```sql
-- Convert views to SECURITY INVOKER
ALTER VIEW public.v_prochains_coupons SET (security_invoker = true);
ALTER VIEW public.coupons_optimized SET (security_invoker = true);

-- Verify and report success
```

## RLS Policy Verification

All underlying tables have RLS enabled and proper policies:

| Table | RLS Enabled | Policies |
|-------|-------------|----------|
| `coupons_echeances` | ✓ | SELECT, INSERT, UPDATE, DELETE |
| `souscriptions` | ✓ | SELECT, INSERT, UPDATE, DELETE |
| `investisseurs` | ✓ | SELECT, INSERT, UPDATE, DELETE |
| `tranches` | ✓ | SELECT, INSERT, UPDATE, DELETE |
| `projets` | ✓ | SELECT, INSERT, UPDATE, DELETE |

## Testing

### Automated Testing

Run the test script:
```bash
psql $DATABASE_URL -f test-rls-views.sql
```

The script will verify:
- ✓ Views use SECURITY INVOKER
- ✓ Underlying tables have RLS enabled
- ✓ RLS policies exist

### Manual Testing

**Test 1: Regular User Access**
```sql
-- As user from Organization A
SELECT DISTINCT org_id FROM coupons_optimized;
-- Expected: Only Organization A's ID

-- As user from Organization B
SELECT DISTINCT org_id FROM coupons_optimized;
-- Expected: Only Organization B's ID
```

**Test 2: Cross-Organization Isolation**
```sql
-- As user from Organization A
SELECT COUNT(*) FROM v_prochains_coupons;
-- Note the count

-- As user from Organization B
SELECT COUNT(*) FROM v_prochains_coupons;
-- Should be different count (their own data only)
```

**Test 3: Super Admin Access (if applicable)**
```sql
-- As super admin
SELECT COUNT(DISTINCT org_id) FROM coupons_optimized;
-- Expected: All organization IDs
```

## Deployment Instructions

### 1. Review the Migration

```bash
cat supabase/migrations/20260109000001_fix_security_definer_views_final.sql
```

### 2. Apply to Development First

```bash
# Apply to local/dev database
supabase db push
```

### 3. Test Thoroughly

```bash
# Run test script
psql $DEV_DATABASE_URL -f test-rls-views.sql
```

### 4. Apply to Production

```bash
# Apply to production
supabase db push --project-ref your-project-ref
```

### 5. Verify in Production

- Check Supabase Dashboard > Database > Database Linter
- The two warnings should be **resolved**
- No more "Security Definer View" errors

## Impact Assessment

### Security Impact

| Before | After |
|--------|-------|
| 🔴 **CRITICAL**: Data leakage across organizations | 🟢 **SECURE**: Proper multi-tenant isolation |
| Users see all organizations' data | Users see only their organization's data |
| RLS policies bypassed | RLS policies enforced |

### Performance Impact

- **No performance impact**: Only changes security context
- **No data changes**: Views still query the same underlying data
- **No schema changes**: View structures remain identical

### Breaking Changes

- **None**: This fix makes the system MORE secure without breaking existing functionality
- **Existing queries**: All queries continue to work
- **API endpoints**: No changes needed

### User Experience

- **Regular users**: Will now only see their organization's data (as intended)
- **Super admins**: Should still see all data (if your RLS policies allow it)
- **No UI changes needed**: Frontend code remains the same

## Compliance & Regulatory

This fix addresses:
- ✓ **GDPR**: Data access limited to authorized scope
- ✓ **SOC 2**: Proper data isolation controls
- ✓ **Multi-tenancy**: Organization boundaries enforced
- ✓ **Least Privilege**: Users only access their data

## Rollback Plan

If issues arise (unlikely), rollback by running:

```sql
-- DO NOT DO THIS unless absolutely necessary
ALTER VIEW public.v_prochains_coupons RESET (security_invoker);
ALTER VIEW public.coupons_optimized RESET (security_invoker);
```

**Warning**: Rolling back reintroduces the security vulnerability!

## Long-term Prevention

### 1. View Creation Checklist

When creating views, always:
- [ ] Set `security_invoker = true`
- [ ] Verify RLS policies exist on underlying tables
- [ ] Test with users from different organizations
- [ ] Document security implications

### 2. Code Review Guidelines

When reviewing view creation/modification:
- [ ] Check for `SECURITY DEFINER` (reject if found)
- [ ] Verify `SECURITY INVOKER` is explicitly set
- [ ] Require RLS testing before approval

### 3. Monitoring

- Enable Supabase Database Linter in CI/CD
- Set up alerts for security findings
- Regular security audits of database objects

## References

- [Supabase Docs: Database Linter - Security Definer View](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)
- [PostgreSQL Docs: CREATE VIEW - security_invoker](https://www.postgresql.org/docs/current/sql-createview.html)
- [PostgreSQL Docs: Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

## Questions?

If you have any questions about this fix, contact the development team or refer to the test script for validation procedures.

---

**Status**: ✅ Ready to deploy
**Severity**: 🔴 Critical (Data Leakage Risk)
**Testing**: ✓ Tested locally
**Review**: Pending
