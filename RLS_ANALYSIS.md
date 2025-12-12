# RLS Policy System Analysis

## Executive Summary
Your RLS system has **CRITICAL architectural problems** that need immediate attention. The current state is a result of 45+ migrations with 1000+ policy operations, creating a tangled mess that's prone to security vulnerabilities and circular dependencies.

---

## Critical Issues Found

### 1. ✅ Duplicate Policies - CONFIRMED
**Severity: HIGH**

**Evidence:**
- 610 policy operations in Dec 11 migrations alone
- 1059 total policy-related statements across 45 migration files
- Multiple migrations creating/dropping the same policies repeatedly

**Example Pattern:**
```
20251211183638_cleanup_duplicate_policies.sql
20251211183716_final_cleanup_all_duplicate_policies.sql
20251211185628_fix_all_rls_correct_final.sql
20251211185705_clean_all_policies_and_recreate.sql
```

**Problem:** Each "cleanup" migration adds MORE policies instead of truly cleaning up.

**Risk:** Unknown which policies are actually active. Potential for conflicting policies.

---

### 2. ⚠️ Missing SECURITY DEFINER on Trigger - NEED TO VERIFY
**Severity: UNKNOWN (need to check triggers)**

**What to check:**
```sql
-- Need to query actual database for triggers
SELECT tgname, tgrelid::regclass, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid::regclass::text IN ('projets', 'profiles', 'memberships');
```

**Hypothesis:** If there's a trigger that auto-assigns `org_id` or validates org membership, and it's not SECURITY DEFINER, it can't bypass RLS to check memberships table.

---

### 3. ✅ Two Competing Superadmin Systems - CONFIRMED
**Severity: CRITICAL**

**System 1: Global Superadmin**
```sql
-- profiles.is_superadmin (boolean column)
CREATE FUNCTION is_superadmin() RETURNS boolean AS $$
  SELECT COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false);
$$;
```

**System 2: Org-Level Superadmin Role**
```sql
-- memberships.role = 'superadmin' | 'admin' | 'member'
-- Used in many policies like:
WHERE role IN ('admin', 'superadmin')
```

**Confusion:**
- Is `memberships.role = 'superadmin'` an org-level super-admin (admin of that org)?
- Or is it meant to be the same as `profiles.is_superadmin` (global)?
- Policies use `is_superadmin()` function (checks profiles) but also check `role = 'superadmin'` in memberships

**Recommendation:** **Pick ONE system:**
- **Option A:** Global superadmin ONLY (remove 'superadmin' from memberships.role enum, keep only 'admin' and 'member')
- **Option B:** Org-level superadmins (remove profiles.is_superadmin, promote one user per org to 'superadmin' role)
- **My vote: Option A** - Simpler, clearer separation: global superadmin vs org admin vs org member

---

### 4. ✅ Circular Dependency Risk - CONFIRMED
**Severity: CRITICAL - ALREADY CAUSED 500 ERRORS**

**What happened:**
Migration `20251211201000_secure_identity_tables_properly.sql` created this policy:

```sql
CREATE POLICY "memberships_select_policy" ON memberships
  FOR SELECT TO authenticated
  USING (
    is_superadmin()
    OR user_id = auth.uid()
    OR org_id IN (
      SELECT org_id FROM memberships  -- RECURSION!
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );
```

**Problem:** Policy on `memberships` table queries `memberships` table = infinite loop

**Result:** 500 errors, couldn't log in

**Current "fix":** Removed the recursive part, but THIS IS A BAND-AID

**Root cause still exists:**
1. Business policies (projets, tranches, etc.) query memberships table
2. If memberships has RLS enabled, those queries trigger memberships policies
3. If memberships policies query OTHER tables with RLS, boom - circular dependency

**Current state (after emergency fix):**
```sql
-- Migration 20251211184531 DISABLED RLS on identity tables:
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
```

**Then migration 20251211201000 tried to RE-ENABLE with superadmin bypass:**
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
```

**Question:** Which migration ran last? What's the ACTUAL state?

---

### 5. ✅ Missing search_path Security - CONFIRMED
**Severity: HIGH - SQL INJECTION RISK**

**Vulnerable functions (SECURITY DEFINER without SET search_path):**

```sql
-- From 20251211200000_add_superadmin_bypass_to_rls.sql
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER  -- ⚠️ DANGEROUS WITHOUT search_path
AS $$
  SELECT COALESCE((SELECT is_superadmin FROM profiles WHERE id = auth.uid()), false);
$$;
```

```sql
-- From 20251211183534_implement_three_role_system_clean.sql
CREATE OR REPLACE FUNCTION user_can_access_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER  -- ⚠️ DANGEROUS WITHOUT search_path
STABLE
AS $$
  -- ... queries profiles and memberships without explicit schema
$$;
```

**Attack vector:**
1. Attacker creates malicious schema
2. Manipulates search_path to include malicious schema before `public`
3. SECURITY DEFINER function runs with elevated privileges
4. Function calls malicious `profiles` table instead of `public.profiles`
5. Attacker gains unauthorized access

**Fix required:**
```sql
ALTER FUNCTION is_superadmin() SET search_path = public, pg_temp;
ALTER FUNCTION user_can_access_org(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION user_is_admin_of_org(uuid) SET search_path = public, pg_temp;
```

---

## Additional Problems Found

### 6. Inconsistent Policy Naming
```sql
-- Some use descriptive names:
CREATE POLICY "view_projets" ON projets ...
CREATE POLICY "insert_projets" ON projets ...

-- Others use full sentences:
CREATE POLICY "Users can view own profile" ON profiles ...
CREATE POLICY "Admins can insert memberships" ON memberships ...
```

### 7. RLS Toggle Chaos
Identity tables toggled ENABLE/DISABLE **at least 6 times**:

```
20251012211006: ENABLE
20251211183534: DISABLE
20251211184351: ENABLE
20251211184531: DISABLE
20251211184711: ENABLE
20251211201000: ENABLE
```

**Current state: UNKNOWN without querying database**

### 8. Migration Timestamp Issues
All Dec 11 migrations have timestamp `Dec 11 23:30` except:
- `20251211200000_add_superadmin_bypass_to_rls.sql` - `Dec 11 23:41`
- `20251211201000_secure_identity_tables_properly.sql` - `Dec 11 23:44`

But migration `20251211185705` claims to be from `18:57:05` yet has later filesystem timestamp?

**Risk:** Migrations may have run out of order

---

## Architecture Assessment

### Current Design (BROKEN):
```
┌─────────────────────────────────────────┐
│ Application Layer                       │
│ - Dashboard.tsx                         │
│ - Projects.tsx                          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Supabase Client (authenticated user)    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ RLS Policies (CHAOS ZONE)               │
│ - 1000+ policy operations               │
│ - Circular dependencies                 │
│ - Unknown active policies               │
│ - Competing superadmin systems          │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌────────┐  ┌──────────┐  ┌────────────┐
│profiles│  │memberships│ │organizations│
│RLS: ???│  │RLS: ???   │ │RLS: ???     │
└────────┘  └──────────┘  └────────────┘
```

### What Should Happen (CLEAN):
```
┌──────────────────────────────────────────┐
│ Application Layer                        │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│ Supabase Client (JWT with claims)       │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│ SECURITY DEFINER Helper Functions       │
│ (WITH SET search_path)                   │
│ - is_superadmin()                        │
│ - user_orgs() -> uuid[]                  │
│ - user_is_org_admin(org_id) -> boolean   │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│ Simple RLS Policies                      │
│ - Identity tables: RLS DISABLED          │
│   (or minimal policies with no recursion)│
│ - Business tables: Use helper functions  │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│ Data Tables                              │
│ - Clean, predictable access              │
└──────────────────────────────────────────┘
```

---

## Recommended Fix Strategy

### Phase 1: Emergency Stabilization
1. **Verify current RLS state** - Query actual database
2. **Document active policies** - Export actual policies from pg_policies
3. **Fix search_path** - Add to all SECURITY DEFINER functions
4. **Disable RLS on identity tables** - Temporary but safe

### Phase 2: Cleanup
5. **Create ONE cleanup migration** that:
   - Drops ALL policies on ALL tables
   - Drops ALL three helper functions
   - Disables RLS on identity tables
   - Creates fresh baseline

### Phase 3: Rebuild (Right Way)
6. **Pick ONE superadmin system** - Recommend: profiles.is_superadmin only
7. **Create SECURE helper functions**:
   ```sql
   CREATE FUNCTION is_superadmin() ... SET search_path = public, pg_temp;
   CREATE FUNCTION user_orgs() RETURNS uuid[] ... SET search_path = public, pg_temp;
   CREATE FUNCTION user_is_org_admin(uuid) ... SET search_path = public, pg_temp;
   ```
8. **Create SIMPLE policies** - One per table, using helper functions
9. **Test incrementally** - One table at a time

### Phase 4: Validation
10. **Integration tests** - Verify no 403/500 errors
11. **Security audit** - Verify no data leaks
12. **Performance test** - Ensure no slow queries

---

## Opinion Summary

**Current state: 🔴 CRITICAL**
- Your RLS system is a ticking time bomb
- You've already experienced one circular dependency crash
- Security vulnerabilities exist (missing search_path)
- Unknown what policies are actually active
- Two competing permission systems causing confusion

**Biggest issues:**
1. **Migration hell** - 45+ migrations, 1000+ operations, no clear baseline
2. **Circular dependencies** - Will cause MORE 500 errors in the future
3. **Security holes** - search_path vulnerability, possible data leaks
4. **Confusion** - Two superadmin systems, unknown RLS state

**Recommendation: NUCLEAR OPTION**
- Create ONE migration that drops EVERYTHING
- Rebuild from scratch with clean architecture
- Use SECURITY DEFINER functions properly (with search_path)
- Keep it SIMPLE - complexity kills security

**Timeline:**
- Current system: UNSAFE for production
- Quick fix (disable identity RLS, fix search_path): 30 minutes
- Proper rebuild: 2-4 hours of careful work
- Worth it: YES - prevents future crashes and security breaches
