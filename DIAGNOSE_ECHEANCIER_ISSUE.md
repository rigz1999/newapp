# Diagnose Écheancier Generation Issue

## Problem
When adding a new tranche, the écheancier (payment schedule) is not being generated automatically, and no logs appear in the edge function.

## Root Cause Analysis

The écheancier generation flow works like this:
1. **Creating new tranche with CSV**: TrancheWizard → `import-registre` edge function → calls `regenerate-echeancier` internally
2. **Editing existing tranche**: TrancheWizard → calls `regenerate-echeancier` directly

If no logs appear, the edge function is either:
- Not being called at all
- Failing before logging starts
- Not deployed properly in Paris

## Diagnostic Steps

### Step 1: Check Edge Function Deployment

1. Go to Paris Edge Functions: https://supabase.com/dashboard/project/nyyneivgrwksesgsmpjm/functions
2. Verify these functions are listed:
   - ✅ `regenerate-echeancier`
   - ✅ `import-registre`
3. Click on each function and check:
   - Status: Should show "Active" or "Deployed"
   - Last deployment date
   - Any error messages

### Step 2: Check Edge Function Logs

1. Go to https://supabase.com/dashboard/project/nyyneivgrwksesgsmpjm/logs/edge-functions
2. Filter by function:
   - Select `import-registre` (if you created a new tranche)
   - Select `regenerate-echeancier` (if you edited an existing tranche)
3. Look for recent logs (within last 10 minutes)
4. Check for:
   - ✅ Function invocation logs
   - ❌ Error messages
   - ⚠️ Missing parameters warnings

**What to look for:**
- If NO logs appear → function is not being called (network issue or deployment issue)
- If logs show errors → check the error message for missing parameters
- If logs show "Missing required parameters" → tranche is missing taux_nominal, periodicite_coupons, date_emission, or duree_mois

### Step 3: Verify Tranche Has Required Parameters

Run this SQL in Paris SQL Editor (https://supabase.com/dashboard/project/nyyneivgrwksesgsmpjm/sql):

```sql
-- Check the tranche you just created
SELECT
  t.id,
  t.tranche_name,
  t.taux_nominal,
  t.date_emission,
  t.duree_mois,
  p.periodicite_coupons,
  p.taux_nominal as project_taux_nominal,
  p.duree_mois as project_duree_mois,
  p.base_interet,
  -- Check what values will be used (tranche overrides project)
  COALESCE(t.taux_nominal, p.taux_nominal) as effective_taux,
  p.periodicite_coupons as effective_periodicite,
  t.date_emission as effective_date_emission,
  COALESCE(t.duree_mois, p.duree_mois) as effective_duree
FROM tranches t
JOIN projets p ON t.projet_id = p.id
ORDER BY t.created_at DESC
LIMIT 5;
```

**Required for écheancier generation:**
- ✅ `effective_taux` must NOT be NULL
- ✅ `effective_periodicite` must NOT be NULL
- ✅ `effective_date_emission` must NOT be NULL (this MUST come from tranche)
- ✅ `effective_duree` must NOT be NULL

**If any are NULL:**
- The regenerate-echeancier function will return an error with missing_params
- You need to edit the tranche and fill in the missing fields

### Step 4: Check Souscriptions Exist

The écheancier is generated for souscriptions. If no souscriptions exist, no coupons will be created.

```sql
-- Check souscriptions for your recent tranche
SELECT
  s.id,
  s.tranche_id,
  t.tranche_name,
  s.montant_investi,
  s.coupon_brut,
  s.coupon_net,
  i.nom as investor_name
FROM souscriptions s
JOIN tranches t ON s.tranche_id = t.id
JOIN investisseurs i ON s.investisseur_id = i.id
WHERE t.id = 'YOUR_TRANCHE_ID_HERE'
ORDER BY s.created_at DESC;
```

**Expected:**
- At least 1 souscription should exist
- `coupon_brut` and `coupon_net` should be calculated

**If no souscriptions:**
- The import-registre function may have failed to create them
- Check import-registre logs for CSV parsing errors

### Step 5: Test Edge Function Manually

You can test the regenerate-echeancier function directly to see if it works.

**Option A: Use curl (requires ANON key)**

Get your ANON key from: https://supabase.com/dashboard/project/nyyneivgrwksesgsmpjm/settings/api

```bash
# Replace YOUR_TRANCHE_ID with the actual tranche ID
# Replace YOUR_ANON_KEY with your Supabase ANON key

curl -X POST \
  https://nyyneivgrwksesgsmpjm.supabase.co/functions/v1/regenerate-echeancier \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"tranche_id": "YOUR_TRANCHE_ID"}'
```

**Option B: Use Browser Console**

1. Open your app: https://finixar.com
2. Log in as superadmin
3. Open browser DevTools (F12)
4. Go to Console tab
5. Paste and run this code (replace YOUR_TRANCHE_ID):

```javascript
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(
  'https://nyyneivgrwksesgsmpjm.supabase.co/functions/v1/regenerate-echeancier',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ tranche_id: 'YOUR_TRANCHE_ID' })
  }
);

const result = await response.json();
console.log('Result:', result);
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Echeancier regenerated successfully for Tranche A",
  "tranche_name": "Tranche A",
  "updated_souscriptions": 5,
  "deleted_coupons": 0,
  "created_coupons": 27,
  "final_maturity_date": "2027-01-15"
}
```

**Error Response (missing params):**
```json
{
  "success": false,
  "error": "Missing required parameters: date_emission",
  "missing_params": ["date_emission"]
}
```

### Step 6: Check Network Connectivity

If the edge function is deployed but not being called:

1. **Check browser console for network errors:**
   - Open DevTools (F12) → Network tab
   - Create or edit a tranche
   - Look for requests to `/functions/v1/import-registre` or `/functions/v1/regenerate-echeancier`
   - Check if they return 200 OK or errors (404, 401, 500)

2. **Common issues:**
   - **404 Not Found**: Edge function not deployed
   - **401 Unauthorized**: Auth token invalid
   - **500 Internal Server Error**: Function crashed (check logs)
   - **CORS error**: Supabase project URL mismatch

### Step 7: Verify Environment Variables

Check that your frontend is pointing to Paris:

```bash
# In your project root
cat .env | grep VITE_SUPABASE
```

**Expected:**
```
VITE_SUPABASE_URL=https://nyyneivgrwksesgsmpjm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**If it's pointing to US (wmgukeonxszbfdrrmkhy):**
- Update `.env` to point to Paris
- Restart your dev server

## Quick Fix Checklist

Based on the diagnostic steps above, here's what to check:

- [ ] Edge function `regenerate-echeancier` is deployed in Paris
- [ ] Edge function `import-registre` is deployed in Paris
- [ ] Tranche has `date_emission` set (REQUIRED, cannot be null)
- [ ] Project has `periodicite_coupons` set
- [ ] Project or tranche has `taux_nominal` set
- [ ] Project or tranche has `duree_mois` set
- [ ] Souscriptions exist for the tranche
- [ ] Frontend `.env` points to Paris Supabase
- [ ] Edge function logs show invocation

## Most Likely Issues

### Issue 1: Missing date_emission
**Symptom:** Écheancier not generated, logs show "Missing required parameters: date_emission"

**Fix:** Edit the tranche and set the `date_emission`:
1. Go to your app
2. Click on the tranche
3. Edit tranche details
4. Fill in "Date d'émission"
5. Save

### Issue 2: Edge function not deployed
**Symptom:** No logs appear, network requests fail with 404

**Fix:** Deploy edge functions via GitHub Actions:
1. Follow `DEPLOY_EDGE_FUNCTIONS_GUIDE.md`
2. Run deployment workflow
3. Verify functions appear in Supabase dashboard

### Issue 3: No souscriptions
**Symptom:** Success response but 0 coupons created

**Fix:** Import souscriptions via CSV:
1. Create or edit tranche
2. Upload CSV with investor subscriptions
3. Submit

## Next Steps

After running the diagnostics:
1. Share the results from Step 3 (tranche parameters query)
2. Share any error messages from edge function logs (Step 2)
3. Share the result of manual test (Step 5)

This will help identify the exact issue and fix it.
