# Finixar - Quick Reference Guide

## Key Files Location

### Core Architecture Files
| File | Purpose |
|------|---------|
| `/src/lib/supabase.ts` | Supabase client initialization |
| `/src/lib/database.types.ts` | TypeScript database type definitions |
| `/src/App.tsx` | Route configuration & protection |
| `/src/hooks/useAuth.ts` | Authentication & authorization hook |
| `/src/hooks/useOrganization.ts` | Organization context hook |

### Authentication Components
| File | Purpose |
|------|---------|
| `/src/components/auth/Login.tsx` | Login page |
| `/src/components/auth/InvitationAccept.tsx` | Invitation acceptance |
| `/src/components/layouts/Layout.tsx` | Main app layout with navigation |

### Admin Portals
| File | Purpose |
|------|---------|
| `/src/components/admin/AdminPanel.tsx` | Super admin dashboard |
| `/src/components/admin/Members.tsx` | Organization member management |
| `/src/components/admin/Settings.tsx` | User settings |

### Data Management
| File | Purpose |
|------|---------|
| `/src/components/investors/Investors.tsx` | Investor CRUD (org-scoped) |
| `/src/components/projects/Projects.tsx` | Project management |
| `/src/components/subscriptions/Subscriptions.tsx` | Bond subscriptions |
| `/src/components/payments/Payments.tsx` | Payment tracking |
| `/src/components/coupons/Coupons.tsx` | Coupon schedules |
| `/src/components/dashboard/Dashboard.tsx` | Main dashboard |

### Database Migrations
| Pattern | File Count | Purpose |
|---------|-----------|---------|
| `20251010*.sql` | 2 | Initial schema (organizations, memberships) |
| `20251012*.sql` | 3 | Projects, payments, policies |
| `20251105*.sql` | 1 | Profiles table |
| `20251108*.sql` | 6 | RLS policy refinements |
| `20251109*.sql` | 4 | RLS security hardening |
| `20251110*.sql` | 3 | Performance optimization |

---

## Role Hierarchy

```
Unauthenticated User
    ↓ (login/signup)
Organization Member (role='member')
    ↓ (promoted by org admin)
Organization Admin (role='admin')
    ↓ (only via database)
Super Admin (role='super_admin', org_id=NULL)
```

### Role Permissions Matrix

| Action | Member | Org Admin | Super Admin |
|--------|--------|-----------|------------|
| View org data | ✓ | ✓ | ✓ (all) |
| Edit org data | ✓ | ✓ | ✓ (all) |
| Invite users | ✗ | ✓ | ✓ (all) |
| Manage members | ✗ | ✓ | ✓ (all) |
| Manage orgs | ✗ | ✗ | ✓ |
| View admin panel | ✗ | ✗ | ✓ |

---

## Data Model Overview

```
Organization (parent tenant)
├── Users/Memberships (org_id)
├── Projects (org_id)
│   ├── Tranches
│   └── Investors → Subscriptions
└── Investors (org_id)
    └── Subscriptions
        ├── Coupons (schedule)
        └── Payments (coupon/principal)
```

### Critical Relationships
- **org_id**: Every major data table has org_id for multi-tenancy
- **user_id**: Links to auth.users via memberships
- **Foreign Keys**: Maintain referential integrity and cascade deletes

---

## Authentication Flow

### Login/Signup
```
1. User → Login Component
2. Submit email + password to Supabase Auth
3. Supabase returns session token
4. Check memberships table for org_id
5. Set organization context
6. Redirect to dashboard
```

### Route Protection
```
App.tsx Routes:
├── /login (public)
├── /invitation/accept (public)
└── /* (protected)
    ├── Requires auth.user
    ├── Requires isAdmin OR organization membership
    └── Layout + child routes
```

### Session Check
```typescript
// In useAuth.ts
- On mount: get current session
- Setup listener: onAuthStateChange
- Check admin status: RPC call to check_super_admin_status()
- Get organization: fetch memberships
```

---

## Authorization Pattern

### Frontend (Route-level)
```typescript
// In App.tsx
const { user, isAdmin, isOrgAdmin } = useAuth();
const { organization } = useOrganization(user?.id);

if (user && (isAdmin || organization)) {
  // User is authenticated and authorized
}
```

### Backend (RLS Policies)
```sql
-- SECURITY DEFINER functions
is_super_admin() → boolean
user_org_ids() → UUID[]
is_org_admin(org_id) → boolean

-- Uses email check for super admin
WHERE email = 'zrig.ayman@gmail.com'
```

---

## Multi-Tenant Data Isolation

### Query Pattern (Frontend)
```typescript
// Should filter for org admins
const { data } = await supabase
  .from('investisseurs')
  .select('*')
  .eq('org_id', organization.id)  // ← Filter for org admin
  .limit(1000);

// Super admin sees all (no filter)
```

### RLS Policy Pattern (Backend)
```sql
CREATE POLICY "org_data_select"
  ON table_name FOR SELECT
  TO authenticated
  USING (
    is_super_admin()  -- See all
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );
```

---

## Caching Strategy

### Application Cache
```typescript
// localStorage-based
const CACHE_KEY = `dashboard_${org_id}`;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Check before fetch
const cached = localStorage.getItem(CACHE_KEY);
if (cached && !expired) return JSON.parse(cached);
```

### Query Cache (In-Memory)
```typescript
// /src/utils/queryOptimization.ts
queryCache.set('key', data, ttl);
queryCache.get('key');
queryCache.invalidate('key');
```

---

## Common Development Tasks

### Adding a New Feature
1. Create data table (with org_id if multi-tenant)
2. Add RLS policies in migration
3. Create React component in /src/components/
4. Add useAuth & useOrganization hooks
5. Filter queries by org_id for org-scoped features
6. Protect route in App.tsx if needed

### Adding New Organization Admin Feature
1. Add component in /src/components/admin/
2. Check `isOrgAdmin` in component
3. Conditionally render in Layout.tsx navigation
4. Filter data by organization.id
5. Test with non-admin user (should be hidden)

### Adding Super Admin Feature
1. Add component in /src/components/admin/AdminPanel.tsx
2. Check `isAdmin` (super admin) in component
3. Show in admin menu only
4. Load global data (no org filter)
5. Test with super admin account

---

## Important Constants

### Super Admin Email
```typescript
// From RLS policy: is_super_admin()
email = 'zrig.ayman@gmail.com'
```

### Cache Durations
```typescript
DASHBOARD_CACHE = 5 * 60 * 1000    // 5 minutes
PROJECTS_CACHE = 10 * 60 * 1000    // 10 minutes
QUERY_CACHE_TTL = 5 * 60 * 1000    // 5 minutes default
```

### Investor Types
```typescript
type: 'physique' | 'morale'
// physique = individual
// morale = corporate/legal entity
```

### Coupon Frequencies
```typescript
frequence: 'annuel' | 'semestriel' | 'trimestriel'
// annuel = annual
// semestriel = semi-annual
// trimestriel = quarterly
```

---

## Database Tables at a Glance

| Table | Org-Scoped | RLS | Purpose |
|-------|-----------|-----|---------|
| organizations | No | ✓ | Tenant container |
| memberships | Yes | ✓ | User→Org mapping |
| profiles | No | ✓ | User profile data |
| invitations | Yes | ✓ | Pending invites |
| projets | Yes | ? | Bond projects |
| tranches | Yes | ? | Bond tranches |
| investisseurs | Yes | ? | Investor records |
| souscriptions | Yes | ? | Subscriptions |
| paiements | Yes | ? | Payments |
| coupons_echeances | Yes | ? | Coupon schedule |
| payment_proofs | Yes | ? | Payment evidence |

**Note**: ? indicates RLS policies may not be fully enforced in recent migrations

---

## Security Checklist

- [ ] Verify RLS policies on projets, investisseurs, souscriptions
- [ ] Confirm org_id filtering in all queries
- [ ] Test unauthorized access attempts
- [ ] Review super admin email hardcoding
- [ ] Implement audit logging for admin actions
- [ ] Add backup admin mechanism
- [ ] Encrypt sensitive fields (SIREN, email, bank info)
- [ ] Implement rate limiting on API calls

---

## Debugging Tips

### Check User Authorization
```typescript
const { user, isAdmin, isSuperAdmin, isOrgAdmin } = useAuth();
const { organization } = useOrganization(user?.id);

console.log({ user, isAdmin, isSuperAdmin, isOrgAdmin, organization });
```

### Inspect RLS Issues
```sql
-- Check what user can see
SELECT * FROM projets WHERE id IN (
  SELECT org_id FROM user_org_ids(auth.uid())
);
```

### Test Organization Filtering
```typescript
// In console, check if data is org-specific
const investors = await supabase.from('investisseurs').select('*');
console.log(investors.data.map(i => i.org_id)); // Should be consistent
```

---

## Document References
- Full Architecture: `/CODEBASE_ARCHITECTURE_OVERVIEW.md`
- Database Indexes: `/DATABASE_INDEXES.md`
- Features: `/FEATURES.md`
- RLS Configuration: `/SUPABASE_AUTH_CONFIG.md`

