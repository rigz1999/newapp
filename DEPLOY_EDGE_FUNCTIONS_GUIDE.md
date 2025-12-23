# Deploy Edge Functions via GitHub Actions (Web Interface Only)

## Step 1: Get Your Supabase Access Token

1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Name it: `Paris Migration Token`
4. Copy the token (you'll need it in Step 2)

## Step 2: Set Up GitHub Secrets

1. Go to your GitHub repo: https://github.com/rigz1999/newapp
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Add these 2 secrets:

### Secret 1: SUPABASE_ACCESS_TOKEN
- Name: `SUPABASE_ACCESS_TOKEN`
- Value: (paste the token from Step 1)

### Secret 2: SUPABASE_PARIS_PROJECT_REF
- Name: `SUPABASE_PARIS_PROJECT_REF`
- Value: `nyyneivgrwksesgsmpjm`

## Step 3: Push the Updated Workflow

This is already done - the workflow is committed to your branch.

Merge this branch to main:
```
git checkout main
git merge claude/migrate-supabase-paris-twwhg
git push origin main
```

## Step 4: Trigger Deployment

### Option A: Manual Trigger (Recommended)
1. Go to https://github.com/rigz1999/newapp/actions
2. Click "Deploy Supabase Edge Functions" workflow
3. Click "Run workflow" button
4. Select branch: `main`
5. Click green "Run workflow" button

### Option B: Automatic Trigger
The workflow auto-runs when you push to main and change files in `supabase/functions/`

## Step 5: Monitor Deployment

1. Go to https://github.com/rigz1999/newapp/actions
2. Click on the running workflow
3. Watch the deployment progress
4. Should see all 9 functions deploy successfully

## Step 6: Configure Resend API Key in Paris

After functions are deployed, set the email API key:

1. Go to Paris Edge Functions: https://nyyneivgrwksesgsmpjm.supabase.co/project/_/functions
2. Click on any function (e.g., `send-invitation`)
3. Go to "Settings" or "Secrets" tab
4. Add secret:
   - Name: `RESEND_API_KEY`
   - Value: (your Resend API key)

This secret applies to all edge functions.

## Expected Result

All 9 functions deployed:
- ✅ accept-invitation
- ✅ analyze-payment
- ✅ analyze-payment-batch
- ✅ change-password
- ✅ delete-pending-user
- ✅ import-registre
- ✅ regenerate-echeancier
- ✅ send-coupon-reminders
- ✅ send-invitation

## Troubleshooting

**If deployment fails:**
- Check GitHub Actions logs for error messages
- Verify `SUPABASE_ACCESS_TOKEN` is valid
- Verify `SUPABASE_PARIS_PROJECT_REF` is exactly: `nyyneivgrwksesgsmpjm`
- Ensure you have permissions on the Paris Supabase project

**If functions don't appear:**
- Wait 1-2 minutes for Supabase to update
- Refresh the Edge Functions page
- Check deployment logs in GitHub Actions
