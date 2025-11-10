# Row Level Security (RLS) Setup Instructions

This guide will help you enable comprehensive Row Level Security (RLS) on your Supabase database without losing access.

## Overview

The RLS implementation is split into **two phases** to prevent lockouts:

1. **Phase 1**: Setup superadmin (without enabling RLS)
2. **Phase 2**: Enable RLS policies (after confirming superadmin works)

## Files Included

- `phase1_setup_superadmin.sql` - Adds superadmin column and sets your superadmin status
- `verify_superadmin.sql` - Verification script to check Phase 1 success
- `phase2_enable_rls.sql` - Enables RLS on all tables with comprehensive policies
- `disable_rls.sql` - Emergency script to disable RLS if needed

## Authentication Model

After RLS is enabled:

- **Superadmin** (`zrig.ayman@gmail.com`): Full access to all data across all organizations
- **Admin/Members**: Can only access data from their own organization(s)

## Step-by-Step Guide

### Step 1: Run Phase 1 (Setup Superadmin)

1. Go to your Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste the contents of `phase1_setup_superadmin.sql`
4. Click **Run**

**Expected output:**
```
NOTICE: Column is_superadmin added to profiles table
NOTICE: SUCCESS: Superadmin setup complete for zrig.ayman@gmail.com
```

**What this does:**
- Adds `is_superadmin` column to the `profiles` table
- Creates helper functions: `get_user_org_ids()` and `is_superadmin()`
- Sets `zrig.ayman@gmail.com` as superadmin
- **Does NOT enable RLS** - your access remains unchanged

---

### Step 2: Verify Phase 1 Success

1. In Supabase SQL Editor, create a new query
2. Copy and paste the contents of `verify_superadmin.sql`
3. Click **Run**

**Expected output:**
```
✓ PASS: is_superadmin column exists in profiles table
✓ PASS: Superadmin user(s) found: zrig.ayman@gmail.com
✓ PASS: get_user_org_ids() function exists
✓ PASS: is_superadmin() function exists
RESULT: ✓ ALL CHECKS PASSED
You are ready to proceed with Phase 2!
```

**If any checks fail:**
- Review the error messages
- Re-run Phase 1 script
- **DO NOT** proceed to Phase 2 until all checks pass

---

### Step 3: Test Your Current Access

Before enabling RLS, verify your application still works:

1. Log in to your application as `zrig.ayman@gmail.com`
2. Navigate through different sections (projects, investors, payments)
3. Ensure you can view and edit data

**This confirms:**
- Phase 1 didn't break anything
- Your session is active
- You're ready for Phase 2

---

### Step 4: Run Phase 2 (Enable RLS)

**IMPORTANT**: Only run this after all verification checks pass!

1. In Supabase SQL Editor, create a new query
2. Copy and paste the contents of `phase2_enable_rls.sql`
3. Click **Run**

**Expected output:**
```
NOTICE: Prerequisites verified. Proceeding with RLS enablement...
NOTICE: ========================================
NOTICE: RLS POLICIES ENABLED SUCCESSFULLY
NOTICE: ========================================
```

**What this does:**
- Verifies prerequisites (superadmin exists, functions exist)
- Enables RLS on all tables
- Creates comprehensive policies for all tables
- Grants superadmin full access
- Restricts regular users to their organization's data only

---

### Step 5: Test RLS is Working

After Phase 2, immediately test:

1. **As Superadmin** (`zrig.ayman@gmail.com`):
   - Log in to your application
   - Verify you can see all data
   - Verify you can create/edit/delete records

2. **As Regular User** (if available):
   - Log in with a non-superadmin account
   - Verify you can ONLY see your organization's data
   - Verify you cannot see other organizations' data

3. **Check the browser console**:
   - Should be no 403 (Forbidden) errors
   - All queries should return successfully

---

## Tables Protected by RLS

Phase 2 enables RLS on these tables:

### Core Business Tables
- `projets` - Projects (filtered by `org_id`)
- `investisseurs` - Investors (filtered by `org_id`)
- `paiements` - Payments (filtered by `org_id`)
- `tranches` - Tranches (filtered through parent project)
- `souscriptions` - Subscriptions (filtered through parent project)
- `coupons_echeances` - Coupons (filtered through parent subscription)
- `payment_proofs` - Payment proofs (filtered through parent payment)

### System Tables
- `organizations` - Organizations (users see only their orgs)
- `memberships` - Organization memberships
- `invitations` - Organization invitations
- `profiles` - User profiles (users see only their own)
- `user_reminder_settings` - User settings (users see only their own)

---

## Policy Rules

### For Tables with `org_id`
```sql
-- Example: projets, investisseurs, paiements
SELECT: is_superadmin() OR org_id IN (user's organizations)
INSERT: is_superadmin() OR org_id IN (user's organizations)
UPDATE: is_superadmin() OR org_id IN (user's organizations)
DELETE: is_superadmin() OR org_id IN (user's organizations)
```

### For Related Tables (tranches, souscriptions, etc.)
```sql
-- Access determined by parent record's org_id
SELECT: is_superadmin() OR parent.org_id IN (user's organizations)
-- Similar for INSERT, UPDATE, DELETE
```

### For Organizations Table
```sql
SELECT: is_superadmin() OR user is member of org
INSERT: is_superadmin() only
UPDATE: is_superadmin() OR owner OR admin of org
DELETE: is_superadmin() only
```

### For Profiles Table
```sql
SELECT: is_superadmin() OR own profile
INSERT: own profile only
UPDATE: is_superadmin() OR own profile
DELETE: is_superadmin() only
```

---

## Emergency: Disable RLS

If something goes wrong and you need to disable RLS:

1. Run the `disable_rls.sql` script in Supabase SQL Editor
2. This will disable RLS on all tables
3. You'll regain full access immediately
4. Review the issue before re-enabling RLS

---

## Troubleshooting

### Issue: "No superadmin found" in Phase 1

**Cause**: The email `zrig.ayman@gmail.com` doesn't exist in `auth.users`

**Solution**:
1. Verify your email in Supabase Dashboard → Authentication → Users
2. Update the email in `phase1_setup_superadmin.sql` (line 44)
3. Re-run Phase 1

### Issue: 403 Errors After Phase 2

**Cause**: Superadmin wasn't properly set before enabling RLS

**Solution**:
1. Run `disable_rls.sql` immediately
2. Run `verify_superadmin.sql` to check status
3. Fix any issues in Phase 1
4. Re-run Phase 2 only after verification passes

### Issue: Regular users can see all organizations' data

**Cause**: User might have superadmin flag set incorrectly

**Solution**:
```sql
-- Check who has superadmin flag
SELECT u.email, p.is_superadmin
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.is_superadmin = true;

-- Remove superadmin from specific user if needed
UPDATE profiles
SET is_superadmin = false
WHERE id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
```

### Issue: User can't see their own organization's data

**Cause**: User might not have a membership record

**Solution**:
```sql
-- Check user's memberships
SELECT m.*, o.name as org_name
FROM memberships m
JOIN organizations o ON m.org_id = o.id
WHERE m.user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');

-- If no membership exists, create one (as superadmin)
INSERT INTO memberships (user_id, org_id, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'user@example.com'),
  'org-uuid-here',
  'member'
);
```

---

## Adding More Superadmins

To add additional superadmin users:

```sql
UPDATE profiles
SET is_superadmin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'another.admin@example.com');
```

To remove superadmin access:

```sql
UPDATE profiles
SET is_superadmin = false
WHERE id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
```

---

## Summary

**Before RLS**: All authenticated users can see all data (no isolation)

**After RLS**:
- Superadmin: Full access to everything
- Regular users: Only see their organization's data
- Proper data isolation between organizations

**Key Success Factors**:
1. ✓ Run Phase 1 first
2. ✓ Verify all checks pass
3. ✓ Test current access works
4. ✓ Then run Phase 2
5. ✓ Test RLS is working correctly

---

## Questions?

If you encounter issues not covered here:

1. Check the Supabase logs for detailed error messages
2. Review the browser console for 403/400 errors
3. Use `verify_superadmin.sql` to check current state
4. Use `disable_rls.sql` if you need to emergency-disable RLS

The RLS implementation is designed to be safe - Phase 1 prepares everything without breaking access, and Phase 2 only runs if prerequisites are met.
