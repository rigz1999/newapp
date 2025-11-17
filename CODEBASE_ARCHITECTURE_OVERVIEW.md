# Finixar Codebase - Authentication, Authorization & Data Architecture Overview

## 1. AUTHENTICATION & AUTHORIZATION SYSTEM

### 1.1 Authentication Stack
- **Provider**: Supabase Auth
- **Session Management**: 
  - Uses Supabase's built-in authentication
  - Session stored in browser via Supabase client
  - Auth state listened via `onAuthStateChange()` subscription in `useAuth()` hook
  - Located: `/src/lib/supabase.ts`

### 1.2 Authorization Layer
**Three-Tier Role System**:
1. **Super Admin**: Global administrator (verified via email match)
   - Can manage all organizations
   - Can manage all users
   - Can create/modify all projects, investors, etc.
   - Verified via RPC function `check_super_admin_status()`
   
2. **Organization Admin**: Organization-level admin
   - Can manage members in their organization
   - Can manage projects/data for their organization
   - Role stored as 'admin' in `memberships.role`
   
3. **Organization Member**: Regular member
   - Can view/edit organization data
   - Role stored as 'member' in `memberships.role`

**Key Authorization Hook**:
```typescript
// File: /src/hooks/useAuth.ts
- useAuth() hook manages:
  - user: Current authenticated user
  - isAdmin: Legacy super admin flag
  - isSuperAdmin: Proper super admin check (via RPC)
  - isOrgAdmin: Organization admin check
  - userRole: User's role in their organization
```

**Authorization Checks**:
- Frontend route protection in `App.tsx` (lines 155-186)
- Organization admin access requires `isOrgAdmin` OR `isAdmin`
- Super admin access requires `isAdmin` (super admin check)
- Members route protected: only org admins and super admins
- Admin panel protected: only super admins

---

## 2. USER ROLES & PERMISSIONS STRUCTURE

### 2.1 Membership Model
**Table**: `memberships`
```typescript
{
  id: uuid
  org_id: uuid | null (null = super admin)
  user_id: uuid
  role: 'member' | 'admin' | 'super_admin'
  created_at: timestamp
}
```

**Unique Constraint**: One membership per user+org combination

### 2.2 User Profile Data
**Table**: `profiles`
```typescript
{
  id: uuid (links to auth.users)
  email: string
  full_name: string | null
  created_at: timestamp
  updated_at: timestamp
}
```

### 2.3 Organization Structure
**Table**: `organizations`
```typescript
{
  id: uuid
  name: string
  created_at: timestamp
}
```

### 2.4 Invitations System
**Table**: `invitations`
```typescript
{
  id: uuid
  email: string
  first_name: string
  last_name: string
  org_id: uuid
  role: 'member' | 'admin'
  invited_by: uuid
  token: string
  status: 'pending' | 'accepted' | 'expired'
  expires_at: timestamp
  accepted_at: timestamp | null
  created_at: timestamp
}
```

---

## 3. DATA MODELS & CLIENT DATA RELATIONSHIPS

### 3.1 Project Model
**Table**: `projets`
```typescript
{
  id: uuid
  org_id: uuid | null (organization ownership)
  projet: string (project name)
  emetteur: string (issuer)
  siren_emetteur: number | null
  type: 'obligations_simples' | 'obligations_convertibles'
  taux_interet: number | null
  montant_global_eur: number | null
  maturite_mois: number | null
  taux_nominal: number | null
  periodicite_coupons: string | null
  date_emission: timestamp | null
  duree_mois: number | null
  created_at: timestamp
}
```

### 3.2 Investor Model
**Table**: `investisseurs`
```typescript
{
  id: uuid
  org_id: uuid (organization ownership)
  type: 'physique' | 'morale' (individual or corporate)
  nom_raison_sociale: string
  email: string | null
  telephone: string | null
  residence_fiscale: string | null
  
  // Corporate investor fields
  siren: string | null
  representant_legal: string | null
  
  // Advisor information
  cgp_nom: string | null (wealth advisor name)
  cgp_email: string | null (wealth advisor email)
  
  // RIB (Bank details)
  rib_file_path: string | null
  rib_uploaded_at: timestamp | null
  rib_status: string | null
  
  created_at: timestamp
}
```

### 3.3 Tranche (Bond Tranche) Model
**Table**: `tranches`
```typescript
{
  id: uuid
  projet_id: uuid (links to projets)
  tranche_name: string
  frequence: 'annuel' | 'semestriel' | 'trimestriel'
  taux_nominal: number | null
  taux_interet: number
  maturite_mois: number
  date_emission: timestamp | null
  date_echeance_finale: timestamp | null
  cgp_nom: string | null
  cgp_email: string | null
  transfert_fonds_date: timestamp | null
  created_at: timestamp
}
```

### 3.4 Subscription (Souscription) Model
**Table**: `souscriptions`
```typescript
{
  id: uuid
  tranche_id: uuid (links to tranches)
  investisseur_id: uuid (links to investisseurs)
  date_souscription: date
  nombre_obligations: number
  montant_investi: number
  coupon_brut: number
  coupon_net: number
  prochaine_date_coupon: timestamp | null
  created_at: timestamp
}
```

### 3.5 Payment Model
**Table**: `paiements`
```typescript
{
  id: uuid
  id_paiement: string
  type: string
  projet_id: uuid
  tranche_id: uuid
  investisseur_id: uuid
  souscription_id: uuid
  montant: number
  date_paiement: date
  statut_paiement: string | null
  created_at: timestamp
}
```

### 3.6 Coupon Schedule
**Table**: `coupons_echeances`
```typescript
{
  id: uuid
  souscription_id: uuid
  date_echeance: date
  montant_coupon: number
  statut: string
  date_paiement: date | null
  montant_paye: number | null
  paiement_id: uuid | null
  created_at: timestamp
  updated_at: timestamp
}
```

### 3.7 Payment Proof
**Table**: `payment_proofs`
```typescript
{
  id: uuid
  paiement_id: uuid
  file_url: string
  file_name: string
  file_size: number | null
  extracted_data: JSON | null
  confidence: number | null
  validated_at: timestamp | null
  created_at: timestamp
}
```

### 3.8 Data Relationships Diagram
```
organizations (parent)
  ├── memberships (users in org)
  ├── projets (org's projects)
  │   └── tranches (bond tranches)
  │       └── souscriptions (investor subscriptions)
  │           └── coupons_echeances (coupon schedule)
  │           └── paiements (payments)
  └── investisseurs (org's investors)
      └── souscriptions (their subscriptions)
```

---

## 4. DATA FILTERING & ACCESS CONTROL

### 4.1 Organization-Based Data Filtering

**Frontend Pattern** (exemplified in Investors component):
```typescript
// Data is filtered by org_id before display
// Files: /src/components/investors/Investors.tsx (line 339-397)

const fetchInvestors = async () => {
  // Fetches ALL investors (no org filter on Supabase side)
  const { data: investorsRes } = await supabase
    .from('investisseurs')
    .select('*')
    .order('nom_raison_sociale')
    .limit(1000);
  
  // Frontend filtering would be needed here for org separation
};
```

**Issue Identified**: Currently, the frontend loads ALL investors without filtering by `org_id`. This suggests either:
1. RLS policies are not enforced on these tables
2. Super admin users are expected to see all data
3. Frontend filtering is missing

### 4.2 Query Filtering Patterns

**Organization Admin Filtering**:
```typescript
// From Members.tsx (lines 76-114)
let query = supabase
  .from('memberships')
  .select(...)
  
if (!isSuperAdmin) {
  query = query.eq('org_id', organization.id);  // Org filter
}

const { data } = await query;
```

**Super Admin Pattern**:
```typescript
// Super admins fetch all records
// Org admins fetch only their org's records
if (!isSuperAdmin) {
  query = query.eq('org_id', organization.id);
}
```

### 4.3 RLS Policies (Row Level Security)

**Helper Functions** (20251110000002_fix_all_rls_performance_issues.sql):
```sql
-- Check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'zrig.ayman@gmail.com'
  );
$$;

-- Get user's organization IDs
CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS TABLE(org_id UUID)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT m.org_id
  FROM memberships m
  WHERE m.user_id = auth.uid();
$$;

-- Check if user is org admin
CREATE OR REPLACE FUNCTION is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
    AND org_id = p_org_id
    AND role = 'admin'
  );
$$;
```

**Organizations RLS**:
```sql
-- Members view organizations
CREATE POLICY "Members view organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR id IN (SELECT org_id FROM user_org_ids())
  );

-- Updates allowed for super admin and org admins
CREATE POLICY "Super admin and org admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    is_super_admin()
    OR is_org_admin(id)
  );
```

**Memberships RLS**:
```sql
-- Super admin or own memberships
CREATE POLICY "Superadmin or own memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    OR user_id = auth.uid()
    OR org_id IN (SELECT org_id FROM user_org_ids())
  );
```

**Important Note**: RLS policies on `projets`, `investisseurs`, `souscriptions`, `paiements`, `tranches` are NOT explicitly defined in recent migrations, suggesting:
- These tables may not have RLS enabled
- Or policies are minimal/permissive for authenticated users
- Frontend bears responsibility for org-based filtering

---

## 5. FRONTEND ROUTING STRUCTURE

### 5.1 Route Protection (App.tsx)

**Login Route** (public):
```typescript
Route path="/login"
- Redirects to "/" if already authenticated AND has org OR is admin
```

**Invitation Acceptance Route** (public):
```typescript
Route path="/invitation/accept"
- Public route for accepting invitations
- No authentication required initially
```

**Protected Routes** (require authentication):
```typescript
Route path="/*" (catch-all)
  - Requires `user` to be authenticated
  - Requires either `isAdmin` (super admin) OR `organization` membership
  - Redirects to login if not authenticated
```

### 5.2 Application Routes

**Dashboard Routes**:
| Route | Component | Access | Protection |
|-------|-----------|--------|-----------|
| `/` | Dashboard | Everyone | Authenticated + Membership |
| `/projets` | Projects | Everyone | Authenticated + Membership |
| `/projets/:projectId` | ProjectDetail | Everyone | Authenticated + Membership |
| `/coupons` | Coupons | Everyone | Authenticated + Membership |
| `/investisseurs` | Investors | Everyone | Authenticated + Membership |
| `/souscriptions` | Subscriptions | Everyone | Authenticated + Membership |
| `/paiements` | Payments | Everyone | Authenticated + Membership |
| `/parametres` | Settings | Everyone | Authenticated + Membership |

**Admin Routes**:
| Route | Component | Access | Protection |
|-------|-----------|--------|-----------|
| `/membres` | Members | Org Admins | `isOrgAdmin` OR `isAdmin` |
| `/admin` | AdminPanel | Super Admin | `isAdmin` only |

### 5.3 Navigation Rendering Logic

**Members Link** (Layout.tsx):
```typescript
{isOrgAdmin && !isSuperAdminUser && (
  <Link to="/membres">Gestion Membres</Link>
)}
```

**Admin Panel Link**:
```typescript
{isSuperAdminUser && (
  <Link to="/admin">Admin Panel</Link>
)}
```

**User Role Indicator**:
```typescript
{isSuperAdminUser ? 'Super Admin' : isOrgAdmin ? 'Admin' : 'Membre'}
```

---

## 6. MULTI-TENANT & ROLE-BASED ACCESS PATTERNS

### 6.1 Multi-Tenant Architecture

**Organization as Tenant**:
- Each organization is an isolated tenant
- Users belong to organizations via `memberships` table
- Data is owned by organizations (`org_id` foreign key)
- Isolation is enforced at:
  - Database level (RLS policies)
  - Frontend level (org_id filtering)

**Super Admin Special Case**:
- Not bound to any organization (`org_id = NULL` in memberships)
- Can see all organizations and data
- Has special `role = 'super_admin'` in memberships

### 6.2 Organization Admin Privileges

**Members Management** (Members.tsx):
```typescript
// Org admins can:
- View all members in their organization
- Create invitations
- Manage member roles
- Remove members

// Super admins can:
- View members across all organizations
- Manage organizations
- Create admins
```

### 6.3 Data Isolation Pattern

**Organization-Based Queries**:
```typescript
// Example from projects/Projects.tsx
// Fetch projects (currently no org filter in query)
const { data: projects } = await supabase
  .from('projets')
  .select('*')
  .order('created_at');

// In theory should be:
// .eq('org_id', organization.id) for org admins
// No filter for super admins
```

### 6.4 Portal/Dashboard Structure

**Main Dashboard** (Dashboard.tsx):
- Displays organization's statistics
- Shows projects, investors, coupons
- Displays payment alerts
- Calculates metrics specific to organization
- Key metrics:
  - Total invested amount
  - Coupons paid this month
  - Active projects count
  - Upcoming coupons

**Admin Portal** (AdminPanel.tsx):
- Super admin only
- Manages all organizations
- Creates/edits organizations
- Manages users globally
- Invites super admins
- Views pending invitations

**Member Management Portal** (Members.tsx):
- Org admin only
- Invite new members
- Manage member roles
- View organization members
- Send invitations

---

## 7. KEY SECURITY CONSIDERATIONS

### 7.1 Current Security Measures
1. **Row Level Security (RLS)**: Enabled on all tables
2. **Helper Functions**: SECURITY DEFINER functions for access checks
3. **Auth Context**: Uses Supabase Auth for session management
4. **Frontend Route Guards**: Protected routes require authentication

### 7.2 Identified Gaps

1. **Missing org_id Filter in Some Queries**:
   - Investors, Projects, Tranches queries don't filter by org_id
   - Relies on RLS but RLS policies may not be enforced
   - Risk: Unauthorized data access if RLS is misconfigured

2. **Super Admin Email Check**:
   - Super admin status determined by hardcoded email check
   - Email: `zrig.ayman@gmail.com`
   - Located: RLS policy `is_super_admin()` function
   - Risk: Single point of failure, no backup admin mechanism

3. **Frontend-Only Access Control**:
   - Some access decisions made in frontend (e.g., route protection)
   - Should always be backed by backend RLS

### 7.3 Data Encryption
- No explicit encryption mentioned in migrations
- Relies on Supabase's built-in database encryption

---

## 8. CACHING & PERFORMANCE OPTIMIZATION

### 8.1 Query Cache
**File**: `/src/utils/queryOptimization.ts`

```typescript
class QueryCache {
  - Simple TTL-based cache (5 minutes default)
  - Cache key: string pattern
  - Methods:
    - set(key, data, ttl?)
    - get(key)
    - clear(pattern?)
    - invalidate(key)
}

// Usage:
const { data, error, fromCache } = await cachedQuery(
  'projects_' + orgId,
  () => supabase.from('projets').select('*'),
  10 * 60 * 1000 // 10 minutes
);
```

### 8.2 Dashboard Caching
**File**: `/src/components/dashboard/Dashboard.tsx`

```typescript
// Cache key per organization
const CACHE_KEY = getDashboardCacheKey(organization.id);
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Checks cache before fetching
const checkCachedData = (): unknown => {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      return null;
    }
    return data;
  }
  return null;
};
```

### 8.3 Preloading Critical Data
```typescript
// From queryOptimization.ts
async function preloadCriticalData(orgId: string) {
  // Preload projects
  const projectsQuery = supabase
    .from('projets')
    .select('id, projet, emetteur')
    .eq('org_id', orgId)
    .limit(20);
  
  // Preload memberships
  const membershipsQuery = supabase
    .from('memberships')
    .select('user_id, role')
    .eq('org_id', orgId);
  
  // Cache results
}
```

---

## 9. FILE PATHS & KEY FILES SUMMARY

### Authentication & Authorization
- `/src/hooks/useAuth.ts` - Main auth hook
- `/src/hooks/useOrganization.ts` - Organization context
- `/src/components/auth/Login.tsx` - Login component
- `/src/components/auth/InvitationAccept.tsx` - Invitation handling

### Layouts & Navigation
- `/src/components/layouts/Layout.tsx` - Main app layout with sidebar
- `/src/App.tsx` - Route configuration and protection

### Admin Components
- `/src/components/admin/AdminPanel.tsx` - Super admin dashboard
- `/src/components/admin/Members.tsx` - Organization member management
- `/src/components/admin/Settings.tsx` - User settings

### Data Management Components
- `/src/components/investors/Investors.tsx` - Investor management
- `/src/components/projects/Projects.tsx` - Project management
- `/src/components/subscriptions/Subscriptions.tsx` - Subscription management
- `/src/components/payments/Payments.tsx` - Payment tracking
- `/src/components/coupons/Coupons.tsx` - Coupon management
- `/src/components/dashboard/Dashboard.tsx` - Main dashboard
- `/src/components/dashboard/GlobalSearch.tsx` - Global search

### Database & Types
- `/src/lib/supabase.ts` - Supabase client initialization
- `/src/lib/database.types.ts` - TypeScript type definitions
- `/supabase/migrations/` - Database schema and RLS policies

### Utilities
- `/src/utils/queryOptimization.ts` - Query caching and optimization
- `/src/utils/toast.ts` - Notification system
- `/src/utils/validators.ts` - Input validation (SIREN, email, etc.)
- `/src/utils/formatters.ts` - Number/date formatting

---

## 10. RECOMMENDATIONS & OBSERVATIONS

### Current State
✓ Well-structured multi-tenant architecture
✓ Comprehensive RLS policies defined
✓ Super admin system implemented
✓ Organization isolation enforced
✓ Frontend route protection in place

### Areas for Improvement
1. **Explicit org_id filtering** in all data queries (projets, investisseurs, souscriptions)
2. **Verify RLS policies** are actually enforced on data tables
3. **Backup admin mechanism** for super admin access
4. **Audit logging** for admin actions
5. **Frontend access control** should be redundant to RLS, not primary
6. **Error handling** for unauthorized access attempts
7. **Data encryption at rest** for sensitive fields (SIREN, email, etc.)

