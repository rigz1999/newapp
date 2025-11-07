# Database Indexes Migration

## Overview
This migration adds performance indexes to improve query performance on large datasets.

## How to Apply

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20250107_add_performance_indexes.sql`
4. Paste into the SQL editor
5. Click **Run** to execute

### Option 2: Using Supabase CLI
```bash
supabase db push
```

## Indexes Created

### Membership Indexes
- `idx_memberships_user_id` - User lookup
- `idx_memberships_org_id` - Organization queries
- `idx_memberships_org_user` - Composite for org-user lookups (most common)
- `idx_memberships_created_at` - Temporal ordering

### Payment Indexes
- `idx_paiements_date` - Date-based ordering and filtering
- `idx_paiements_tranche_id` - Join with tranches
- `idx_paiements_created_at` - Temporal ordering
- `idx_payment_proofs_paiement_id` - Proof lookup

### Subscription Indexes
- `idx_souscriptions_tranche_id` - Tranche queries
- `idx_souscriptions_investisseur_id` - Investor queries
- `idx_souscriptions_created_at` - Temporal ordering

### Tranche Indexes
- `idx_tranches_projet_id` - Project queries
- `idx_tranches_created_at` - Temporal ordering

### Project Indexes
- `idx_projets_org_id` - Organization queries
- `idx_projets_created_at` - Temporal ordering

### Investor Indexes
- `idx_investisseurs_org_id` - Organization queries
- `idx_investisseurs_created_at` - Temporal ordering

### Invitation Indexes
- `idx_invitations_org_id` - Organization queries
- `idx_invitations_email` - Email lookup
- `idx_invitations_status` - Status filtering
- `idx_invitations_org_status` - Partial index for pending invitations (optimized)
- `idx_invitations_created_at` - Temporal ordering

### Schedule Indexes
- `idx_echeancier_tranche_id` - Schedule queries
- `idx_echeancier_date` - Date-based queries
- `idx_echeancier_tranche_date` - Partial index for upcoming schedules (optimized)

### Profile Indexes
- `idx_profiles_id` - Profile lookups

## Performance Impact

### Before
- Organization member queries: Full table scan
- Payment history: Full table scan with sort
- Pending invitations: Full table scan

### After (Expected)
- Organization member queries: Index seek (~100x faster)
- Payment history: Index seek with index-only scan (~50x faster)
- Pending invitations: Partial index scan (~200x faster)

## Query Optimization Examples

### Optimized Queries

#### Before:
```sql
-- Full table scan
SELECT * FROM memberships WHERE org_id = 'xxx' AND user_id = 'yyy';
```

#### After:
```sql
-- Uses idx_memberships_org_user composite index
SELECT * FROM memberships WHERE org_id = 'xxx' AND user_id = 'yyy';
```

#### Before:
```sql
-- Full table scan + sort
SELECT * FROM paiements WHERE tranche_id = 'xxx' ORDER BY date_paiement DESC;
```

#### After:
```sql
-- Uses idx_paiements_date for sorted retrieval
SELECT * FROM paiements WHERE tranche_id = 'xxx' ORDER BY date_paiement DESC;
```

## Monitoring

After applying, monitor query performance in Supabase:

1. Go to **Database** → **Query Performance**
2. Check for slow queries (>100ms)
3. Verify indexes are being used with `EXPLAIN ANALYZE`

## Rollback

If needed, drop indexes with:

```sql
-- Drop all performance indexes
DROP INDEX IF EXISTS idx_memberships_user_id;
DROP INDEX IF EXISTS idx_memberships_org_id;
DROP INDEX IF EXISTS idx_memberships_org_user;
DROP INDEX IF EXISTS idx_paiements_date;
DROP INDEX IF EXISTS idx_paiements_tranche_id;
-- ... (drop all other indexes)
```

## Notes

- All indexes use `IF NOT EXISTS` to prevent errors on re-run
- Partial indexes used for common query patterns to reduce index size
- ANALYZE run after creation to update query planner statistics
- Composite indexes created for most common multi-column queries

## Estimated Storage Impact

- Total additional storage: ~5-10% of current database size
- Trade-off: Slightly slower writes for much faster reads
- Recommended for production databases with >1000 rows per table
