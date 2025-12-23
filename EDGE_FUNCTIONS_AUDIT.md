# Edge Functions Audit

## ✅ ACTIVELY USED (9 functions - Deploy These)

### 1. **accept-invitation**
- **Used in**: `src/components/auth/InvitationAccept.tsx:159`
- **Purpose**: Process invitation acceptances when users click invitation links
- **Status**: ✅ ACTIVE

### 2. **analyze-payment**
- **Used in**: `src/components/payments/PaymentProofUpload.tsx:259`
- **Purpose**: Analyze single payment proof with OCR
- **Status**: ✅ ACTIVE

### 3. **analyze-payment-batch**
- **Used in**:
  - `src/components/payments/PaymentProofUpload.tsx:238`
  - `src/components/payments/PaymentWizard.tsx:707`
- **Purpose**: Analyze multiple payment proofs in batch
- **Status**: ✅ ACTIVE

### 4. **change-password**
- **Used in**: `src/components/admin/Settings.tsx:191`
- **Purpose**: Allow users to change their password
- **Status**: ✅ ACTIVE

### 5. **delete-pending-user**
- **Used in**: `src/components/admin/AdminPanel.tsx:315`
- **Purpose**: Delete pending user invitations
- **Status**: ✅ ACTIVE

### 6. **import-registre**
- **Used in**:
  - `src/components/tranches/TrancheWizard.tsx:257`
  - Calls `regenerate-echeancier` internally
- **Purpose**: Bulk import investor registry from Excel/CSV
- **Status**: ✅ ACTIVE

### 7. **regenerate-echeancier**
- **Used in**:
  - `src/components/projects/ProjectDetail.tsx:438`
  - `src/components/tranches/TrancheWizard.tsx:177`
  - Called by `import-registre` function
- **Purpose**: Rebuild coupon payment schedules
- **Status**: ✅ ACTIVE

### 8. **send-coupon-reminders**
- **Used in**:
  - `src/components/admin/Settings.tsx:289`
  - `src/components/coupons/PaymentRemindersModal.tsx:144`
- **Purpose**: Send email reminders for upcoming coupon payments
- **Status**: ✅ ACTIVE

### 9. **send-invitation**
- **Used in**:
  - `src/components/admin/AdminPanel.tsx:1208`
  - `src/components/admin/Members.tsx:575`
- **Purpose**: Send invitation emails via Resend
- **Status**: ✅ ACTIVE
- **⚠️ REQUIRES UPDATE**: Contains hardcoded URL that needs Paris project URL

---

## ❌ NOT USED (1 function - Skip or Delete)

### 10. **create-admin**
- **Used in**: ❌ No usage found in codebase
- **Purpose**: Create super administrator (unclear)
- **Status**: ⚠️ UNUSED - Consider deleting

---

## 📋 Deployment Summary

**Deploy these 9 functions:**
1. ✅ accept-invitation
2. ✅ analyze-payment
3. ✅ analyze-payment-batch
4. ✅ change-password
5. ✅ delete-pending-user
6. ✅ import-registre
7. ✅ regenerate-echeancier
8. ✅ send-coupon-reminders
9. ✅ send-invitation (needs URL update first)

**Skip:**
- ❌ create-admin (not used)

---

## ⚠️ Important: Update send-invitation Before Deploying

The `send-invitation` function has a hardcoded URL that needs to be updated to Paris:

**File**: `supabase/functions/send-invitation/index.ts`

Search for the hardcoded URL and replace with:
```
https://nyyneivgrwksesgsmpjm.supabase.co
```

---

## Deployment Priority

**High Priority (Core Features):**
- send-invitation
- accept-invitation
- send-coupon-reminders
- regenerate-echeancier

**Medium Priority (Payment Features):**
- analyze-payment
- analyze-payment-batch
- import-registre

**Low Priority (Admin):**
- change-password
- delete-pending-user
