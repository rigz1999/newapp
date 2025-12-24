# Email OAuth Integration Setup Guide

This guide will help you set up OAuth integration for Microsoft (Outlook/Office 365) and Google (Gmail/Workspace) so users can send payment reminder emails directly from their email accounts.

## Prerequisites

- Azure Portal access (for Microsoft OAuth)
- Google Cloud Console access (for Google OAuth)
- Supabase project access
- Domain: `app.finixar.com` (or your production domain)

---

## Part 1: Microsoft (Outlook) OAuth Setup

### Step 1: Register Application in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations** → **New registration**

3. Fill in the application details:
   - **Name**: `Finixar Email Integration` (or your preferred name)
   - **Supported account types**: Select "Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts"
   - **Redirect URI**:
     - Type: `Web`
     - URL: `https://app.finixar.com/auth/callback/microsoft`
   - Click **Register**

### Step 2: Configure API Permissions

1. In your app's page, go to **API permissions** → **Add a permission**
2. Select **Microsoft Graph**
3. Choose **Delegated permissions**
4. Add these permissions:
   - `Mail.ReadWrite` - Read and write access to user mail
   - `offline_access` - Maintain access to data you have given it access to
   - `User.Read` - Sign in and read user profile
5. Click **Add permissions**
6. Click **Grant admin consent** (if you have admin rights)

### Step 3: Create Client Secret

1. Go to **Certificates & secrets** → **New client secret**
2. Add a description: `Finixar Production Secret`
3. Choose expiration: **24 months** (recommended)
4. Click **Add**
5. **IMPORTANT**: Copy the **Value** immediately - it won't be shown again!

### Step 4: Get Your Credentials

From the **Overview** page, copy:
- **Application (client) ID** - This is your `MICROSOFT_CLIENT_ID`
- **Directory (tenant) ID** - This is your `MICROSOFT_TENANT_ID`
- **Client secret value** (from previous step) - This is your `MICROSOFT_CLIENT_SECRET`

---

## Part 2: Google (Gmail) OAuth Setup

### Step 1: Create Project in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project** → **New Project**
3. Project name: `Finixar Email Integration`
4. Click **Create**

### Step 2: Enable Gmail API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click on it and click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type → Click **Create**
3. Fill in the application information:
   - **App name**: `Finixar`
   - **User support email**: Your email
   - **Developer contact email**: Your email
   - **App logo** (optional): Upload your logo
4. Click **Save and Continue**

5. Add scopes:
   - Click **Add or Remove Scopes**
   - Add these scopes:
     - `https://www.googleapis.com/auth/gmail.compose` - Create draft emails
     - `https://www.googleapis.com/auth/userinfo.email` - See your email address
   - Click **Update** → **Save and Continue**

6. Test users (during development):
   - Add email addresses of users who will test
   - Click **Save and Continue**

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Name: `Finixar Web Client`
4. **Authorized JavaScript origins**:
   - `https://app.finixar.com`
5. **Authorized redirect URIs**:
   - `https://app.finixar.com/auth/callback/google`
6. Click **Create**

### Step 5: Get Your Credentials

Copy from the popup:
- **Client ID** - This is your `GOOGLE_CLIENT_ID`
- **Client secret** - This is your `GOOGLE_CLIENT_SECRET`

---

## Part 3: Environment Variables Configuration

### For Local Development (.env.local)

Create or update your `.env.local` file:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Microsoft OAuth
VITE_MICROSOFT_CLIENT_ID=your-microsoft-client-id
VITE_MICROSOFT_TENANT_ID=common  # Use 'common' for multi-tenant, or your specific tenant ID
VITE_MICROSOFT_REDIRECT_URI=http://localhost:5173/auth/callback/microsoft

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback/google
```

### For Supabase Edge Functions

Set these secrets in your Supabase project:

```bash
# Navigate to your project directory
cd /home/user/newapp

# Set Microsoft secrets
npx supabase secrets set MICROSOFT_CLIENT_ID=your-microsoft-client-id
npx supabase secrets set MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
npx supabase secrets set MICROSOFT_TENANT_ID=common
npx supabase secrets set MICROSOFT_REDIRECT_URI=https://app.finixar.com/auth/callback/microsoft

# Set Google secrets
npx supabase secrets set GOOGLE_CLIENT_ID=your-google-client-id
npx supabase secrets set GOOGLE_CLIENT_SECRET=your-google-client-secret
npx supabase secrets set GOOGLE_REDIRECT_URI=https://app.finixar.com/auth/callback/google
```

Alternatively, set them via Supabase Dashboard:
1. Go to your Supabase project
2. Navigate to **Settings** → **Edge Functions**
3. Add each secret manually

### For Production Deployment

Update your production environment variables:

```bash
# Frontend (Vercel/Netlify/etc.)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MICROSOFT_CLIENT_ID=your-microsoft-client-id
VITE_MICROSOFT_TENANT_ID=common
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## Part 4: Database Migration

Run the migration to create the `user_email_connections` table:

```bash
# Apply the migration
npx supabase db push

# Or if using Supabase CLI
npx supabase migration up
```

---

## Part 5: Deploy Edge Functions

Deploy the OAuth exchange and email draft creation functions:

```bash
# Deploy all functions
npx supabase functions deploy exchange-oauth-code
npx supabase functions deploy create-invoice-email-draft

# Or deploy all at once
npx supabase functions deploy
```

---

## Part 6: Testing

### Test Microsoft OAuth Flow

1. Go to `https://app.finixar.com/parametres` (Settings)
2. Scroll to "Connexion Email" section
3. Select "Outlook / Office 365"
4. Click "Connecter mon Outlook"
5. You should be redirected to Microsoft login
6. Sign in and grant permissions
7. You should be redirected back to Settings with "Email connecté" status

### Test Google OAuth Flow

1. Go to `https://app.finixar.com/parametres` (Settings)
2. Scroll to "Connexion Email" section
3. Select "Gmail / Google Workspace"
4. Click "Connecter mon Gmail"
5. You should be redirected to Google login
6. Sign in and grant permissions
7. You should be redirected back to Settings with "Email connecté" status

### Test Email Draft Creation

1. Go to a project's Écheancier page
2. Find an unpaid écheance (status "À venir" or "En retard")
3. Click the "Rappel" button in the Actions column
4. Check your email client (Outlook or Gmail)
5. You should see a draft email with:
   - Pre-filled recipient (project's email_representant)
   - Subject with project name and due date
   - Formatted HTML body with payment details

---

## Troubleshooting

### Microsoft OAuth Issues

**Error: "AADSTS50011: The reply URL specified in the request does not match"**
- Solution: Verify the redirect URI in Azure Portal exactly matches `https://app.finixar.com/auth/callback/microsoft`

**Error: "AADSTS65001: The user or administrator has not consented"**
- Solution: In Azure Portal, go to API permissions and click "Grant admin consent"

**Error: "invalid_grant" when refreshing token**
- Solution: User needs to reconnect their email. The refresh token may have expired or been revoked.

### Google OAuth Issues

**Error: "redirect_uri_mismatch"**
- Solution: Verify the redirect URI in Google Cloud Console exactly matches `https://app.finixar.com/auth/callback/google`

**Error: "Access blocked: This app's request is invalid"**
- Solution: Make sure you've enabled the Gmail API and added the correct scopes in the OAuth consent screen

**Error: "invalid_grant" when refreshing token**
- Solution: User needs to reconnect their email. They may have revoked access or the refresh token expired.

### General Issues

**Email draft not appearing**
- Check browser console for errors
- Verify edge function secrets are set correctly
- Check edge function logs in Supabase Dashboard
- Ensure the project has `email_representant` set

**Token refresh failing**
- Check that `refresh_token` is stored in the database
- Verify client secrets are correct
- Check edge function logs for specific error messages

---

## Security Considerations

✅ **What we do:**
- Use OAuth 2.0 (industry standard)
- Store tokens encrypted in Supabase (encrypted at rest)
- Use HTTPS for all communications
- Request minimal scopes (only draft creation)
- Implement automatic token refresh
- Support token revocation

✅ **What users can do:**
- Revoke access anytime from their Microsoft/Google account settings
- Disconnect email from Finixar settings
- See clearly what permissions are requested

❌ **What we don't do:**
- Store user passwords
- Read existing emails
- Send emails without user review
- Access other user data

---

## Production Checklist

Before going to production:

- [ ] Microsoft app registered in Azure Portal
- [ ] Microsoft API permissions granted
- [ ] Microsoft client secret created and stored
- [ ] Google project created in Cloud Console
- [ ] Gmail API enabled
- [ ] Google OAuth consent screen configured
- [ ] Google OAuth credentials created
- [ ] All environment variables set in Supabase
- [ ] All environment variables set in frontend hosting
- [ ] Database migration applied
- [ ] Edge functions deployed
- [ ] Microsoft OAuth flow tested
- [ ] Google OAuth flow tested
- [ ] Email draft creation tested
- [ ] Token refresh tested
- [ ] Error handling tested
- [ ] Disconnect flow tested

---

## Support

If you encounter issues:

1. Check Supabase Edge Function logs
2. Check browser console for frontend errors
3. Verify all environment variables are set
4. Test OAuth flows in incognito/private mode
5. Check Microsoft/Google admin consoles for app status

For additional help, contact the development team.
