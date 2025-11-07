# Critical Improvements TODO

## ✅ COMPLETED

### 1. Sentry Error Tracking Integration
- ✅ Installed and configured Sentry
- ✅ Updated logger.ts with Sentry integration
- ✅ Enhanced ErrorBoundary with Sentry
- ✅ Added error feedback in Payments.tsx
- ✅ Added error logging in Members.tsx

### 2. Database Performance Indexes
- ✅ Created comprehensive migration with 30+ indexes
- ✅ Documented in DATABASE_INDEXES.md
- ⏳ **ACTION REQUIRED**: Apply migration in Supabase dashboard

### 3. Configuration Consolidation
- ✅ Removed duplicate src/config/index.ts
- ✅ Kept src/config/env.ts as single source of truth

### 4. Input Validation - STARTED
- ✅ Added email validation to Members.tsx invitation form
- ⏳ Remaining validation tasks below

---

## 🔴 PRIORITY #1: Complete Input Validation (2-3 hours)

### A. PaymentWizard.tsx - Amount Validation
**File:** `src/components/payments/PaymentWizard.tsx`

**What to add:**
```typescript
// At top of file
import { isValidNumber } from '../../utils/validators';

// In payment submission function (around line 300)
if (!montant || montant <= 0) {
  setError('Le montant doit être supérieur à 0');
  return;
}

if (!isValidNumber(montant.toString())) {
  setError('Le montant doit être un nombre valide');
  return;
}
```

**Why:** Prevents invalid amounts from being submitted (negative, zero, non-numeric)

---

### B. Investors.tsx - SIREN Validation
**File:** `src/components/investors/Investors.tsx`

**What to add:**
```typescript
// At top
import { isValidSIREN } from '../../utils/validators';

// In form submission (search for "handleCreateInvestor" or similar)
if (sirenInput && !isValidSIREN(sirenInput)) {
  setAlertModalConfig({
    title: 'SIREN invalide',
    message: 'Le SIREN doit contenir 9 chiffres et être valide',
    type: 'error'
  });
  setShowAlertModal(true);
  return;
}
```

**Why:** SIREN numbers have specific format + checksum validation

---

### C. Projects.tsx - Date Validation
**File:** `src/components/projects/Projects.tsx`

**What to add:**
```typescript
// In project creation form validation
if (dateDebut && dateFin && new Date(dateDebut) > new Date(dateFin)) {
  setError('La date de début doit être antérieure à la date de fin');
  return;
}

if (dateFin && new Date(dateFin) < new Date()) {
  setError('La date de fin ne peut pas être dans le passé');
  return;
}
```

**Why:** Prevents illogical date ranges

---

## 🔴 PRIORITY #2: Add Pagination (4-5 hours)

### A. useRealtimePayments.ts
**File:** `src/hooks/useRealtimePayments.ts`

**Current Problem:** Line 41-48 loads ALL payments without limit

**Fix:**
```typescript
// Add pagination parameters
const [page, setPage] = useState(1);
const [limit, setLimit] = useState(50);
const [hasMore, setHasMore] = useState(true);

// Update query
const { data: payments, error: fetchError } = await supabase
  .from('paiements')
  .select(`...`)
  .range((page - 1) * limit, page * limit - 1)
  .order('date_paiement', { ascending: false });

setHasMore(payments?.length === limit);
```

**Export:**
```typescript
return {
  payments,
  loading,
  error,
  page,
  setPage,
  hasMore,
  limit,
  setLimit,
};
```

---

### B. useRealtimeSubscriptions.ts
**File:** `src/hooks/useRealtimeSubscriptions.ts`

**Same fix as above:** Add `.range()` to limit results

---

### C. Investors.tsx
**File:** `src/components/investors/Investors.tsx`

**Current Problem:** Loads all investors at once

**Fix:**
```typescript
// In fetchInvestors function
const { data, error, count } = await supabase
  .from('investisseurs')
  .select('*', { count: 'exact' })
  .eq('org_id', organization.id)
  .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1)
  .order('created_at', { ascending: false });

setTotalCount(count || 0);
```

**Add UI:**
```typescript
<Pagination
  currentPage={currentPage}
  totalItems={totalCount}
  itemsPerPage={itemsPerPage}
  onPageChange={setCurrentPage}
/>
```

---

## 🔴 PRIORITY #3: Remove Unsafe Type Casting (3-4 hours)

### Strategy: Use Supabase Generated Types

**Current Problem:** 266 `as any` casts throughout codebase

**Solution:** Use Database types from `src/lib/database.types.ts`

### A. Members.tsx - Line 147
**Before:**
```typescript
const { error } = await (supabase
  .from('memberships')
  .update({ role: newRole })
  .eq('id', selectedMember.id) as any);
```

**After:**
```typescript
const { error } = await supabase
  .from('memberships')
  .update({ role: newRole })
  .eq('id', selectedMember.id);
```

**Why it works:** Supabase client already typed with Database types

---

### B. PaymentWizard.tsx - Multiple Locations
**Pattern to fix:**
```typescript
// Before
const { data } = await (supabase.from('table').select('*') as any);

// After
const { data } = await supabase.from('table').select('*');
```

---

### C. EcheancierCard.tsx - 15+ locations
**File:** `src/components/coupons/EcheancierCard.tsx`

**Batch fix all:** Remove all `as any` casts from Supabase queries

**Script to help:**
```bash
# Find all as any in file
grep -n "as any" src/components/coupons/EcheancierCard.tsx

# Most can be safely removed
```

---

### D. ProjectDetail.tsx - Multiple Locations
**Same approach:** Remove `as any` from all Supabase queries

---

## 📊 TESTING CHECKLIST

After completing above tasks:

- [ ] Run `npm run lint` - should have 0 errors
- [ ] Run `npm run build` - should succeed
- [ ] Run `npm test` - all tests should pass
- [ ] Test email validation in Members page
- [ ] Test amount validation in Payment wizard
- [ ] Test SIREN validation in Investors
- [ ] Test date validation in Projects
- [ ] Test pagination in Payments list (load page 2)
- [ ] Test pagination in Investors list
- [ ] Verify no TypeScript errors from removing `as any`

---

## 📈 EXPECTED IMPACT

### Input Validation
- ❌ Before: Invalid data can be submitted
- ✅ After: All data validated before submission

### Pagination
- ❌ Before: Loading 10,000+ rows crashes browser
- ✅ After: Load 50 rows at a time, smooth performance

### Type Safety
- ❌ Before: 266 type safety bypasses
- ✅ After: Full TypeScript protection

---

## 🚀 IMPLEMENTATION ORDER

**Day 1 (2-3 hours):**
1. Complete input validation (PaymentWizard, Investors, Projects)
2. Test validation edge cases

**Day 2 (4-5 hours):**
3. Add pagination to useRealtimePayments
4. Add pagination to useRealtimeSubscriptions
5. Add pagination to Investors
6. Test with large datasets

**Day 3 (3-4 hours):**
7. Remove `as any` from Members.tsx
8. Remove `as any` from PaymentWizard.tsx
9. Remove `as any` from EcheancierCard.tsx
10. Remove `as any` from ProjectDetail.tsx
11. Fix any TypeScript errors
12. Final testing

---

## 💡 QUICK REFERENCE

### Validation Functions Available
```typescript
import {
  isValidEmail,
  isValidSIREN,
  isValidNumber,
} from '../../utils/validators';
```

### Supabase Pagination Pattern
```typescript
.range(start, end)
// Example: .range(0, 49) for first 50 items
// Example: .range(50, 99) for next 50 items
```

### Remove as any Pattern
```typescript
// Just delete the entire cast
(query as any) → query
```

---

## 📞 NEED HELP?

Each section above has:
- Exact file paths
- Line numbers where possible
- Code examples
- Why it matters

Start with Priority #1 (validation) as it's quickest and prevents bad data NOW.
