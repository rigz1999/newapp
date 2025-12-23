# Supabase Migration: Correct Approach

## Problem
The migration files in `supabase/migrations/` are **incremental changes** to an existing schema, NOT a complete schema setup from scratch. They assume base tables already exist.

## Solution: Use Supabase's Built-in Migration Tool

### Step 1: Export US Database Schema

Run this in your terminal:

```bash
# You need to use Supabase CLI or pg_dump to get the FULL schema from US
# Including ALL table definitions that are currently in production
```

### Step 2: Use Dashboard Instead

**EASIER APPROACH - Use Supabase Dashboard:**

1. Go to your **OLD US project**: https://supabase.com/dashboard/project/wmgukeonxszbfdrrmkhy
2. Click **Database** → **Backup & Restore**
3. Download a backup (or use the SQL Dump option)
4. Go to your **NEW Paris project**: https://supabase.com/dashboard/project/nyyneivgrwksesgsmpjm
5. Click **SQL Editor** → **New Query**
6. Paste the entire SQL dump
7. Run it

### Step 3: After Schema is Set Up

Once the base schema exists in Paris, THEN you can run the incremental migrations from `migration-batches/` if needed.

## Alternative: Manual Table Creation Order

If you want to create tables manually, here's the dependency order:

1. **auth.users** (already exists in Supabase)
2. **profiles** (references auth.users)
3. **organizations** (references auth.users)
4. **memberships** (references organizations, auth.users)
5. **invitations** (references organizations, auth.users)
6. **projets** (references organizations)
7. **investisseurs** (references organizations)
8. **tranches** (references projets)
9. **souscriptions** (references projets, tranches, investisseurs)
10. **coupons_echeances** (references souscriptions)
11. **paiements** (references coupons_echeances)
12. **payment_proofs** (references paiements)
13. **user_reminder_settings** (references auth.users)

## Recommended Next Steps

1. **Ask me to create a complete base schema migration** that includes all table definitions
2. OR **export your US database schema** using pg_dump and apply it to Paris
3. OR **use Supabase's migration diffing tool** to generate the correct migration

Let me know which approach you prefer and I'll help you execute it properly.
