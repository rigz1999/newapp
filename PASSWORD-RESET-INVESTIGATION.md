# Password Reset Email Investigation Guide

## 🔍 Problem
User clicks "Mot de passe oublié", enters email, sees success message "Un email de réinitialisation a été envoyé", but **NO email is received**.

## ✅ What's Working
1. ✅ Frontend successfully calls the edge function
2. ✅ Edge function returns HTTP 200 success response
3. ✅ No JavaScript errors in browser console
4. ✅ Resend API is properly configured (other functions work)

## ❓ Root Cause Analysis

### The Function ALWAYS Returns Success
The `send-password-reset` edge function is designed to ALWAYS return success for **security reasons** - it never reveals whether a user exists or not. This means:

```typescript
// Even if user doesn't exist, it returns:
{
  success: true,
  message: "Si un compte existe avec cet email, vous recevrez un lien..."
}
```

### Possible Causes

#### 1. ⚠️ **User doesn't exist in auth.users** (MOST LIKELY)
If the email address is not registered in Supabase Auth, the function returns success but **doesn't send any email**.

**How to check:**
```sql
-- Run in Supabase SQL Editor
SELECT id, email, created_at, confirmed_at
FROM auth.users
WHERE email = 'test@example.com';  -- Replace with actual email
```

If this returns **no rows**, the user doesn't exist in auth system, so no email is sent.

#### 2. ⚠️ **Edge function not deployed to production**
If the function wasn't deployed, old code might be running.

**How to check:**
- Go to Supabase Dashboard > Edge Functions
- Look for `send-password-reset` in the list
- Check "Last deployed" timestamp

**How to fix:**
```bash
supabase functions deploy send-password-reset --no-verify-jwt
```

#### 3. ⚠️ **Resend domain not verified or in sandbox mode**
Resend might be in sandbox mode, which only sends emails to verified addresses.

**How to check:**
- Go to Resend Dashboard > Domains
- Check if `finixar.com` shows "Verified" status
- Check Settings > Sending for sandbox mode status

#### 4. ⚠️ **Wrong "from" email address**
The function uses `Finixar <support@finixar.com>`. This domain must be verified in Resend.

**Current code:**
```typescript
from: 'Finixar <support@finixar.com>',
```

**How to check:**
- Verify `support@finixar.com` or entire `finixar.com` domain is verified in Resend
- Check Resend > Domains for verification status

#### 5. ⚠️ **Email going to spam**
The email might be delivered but filtered as spam.

**How to check:**
- Check spam/junk folder
- Check "All Mail" in Gmail
- Try with different email provider (Gmail, Outlook, etc.)

## 🔬 Step-by-Step Investigation

### Step 1: Check Supabase Edge Function Logs

1. Go to: **Supabase Dashboard > Edge Functions > send-password-reset**
2. Click on **"Logs"** tab
3. Try the password reset flow
4. Look for these log messages:

**If you see:**
```
"=== Password reset function invoked ==="
"Processing password reset request for: user@example.com"
"User lookup result: { userFound: false }"
"Password reset requested for non-existent user: user@example.com"
```
✅ **DIAGNOSIS:** User doesn't exist in auth.users table

**If you see:**
```
"Password reset email sent successfully: { emailId: 're_...' }"
```
✅ **DIAGNOSIS:** Email was sent successfully by Resend. Check Resend logs and spam folder.

**If you see:**
```
"Resend API error: ..."
"Failed to send email"
```
✅ **DIAGNOSIS:** Resend API issue. Check error details.

**If you see NO LOGS at all:**
✅ **DIAGNOSIS:** Function not deployed or not being invoked

### Step 2: Check Browser Console

1. Open your app in browser
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Try the password reset flow
5. Look for these messages:

```
🔐 [Password Reset] Starting request for: user@example.com
⏱️ [Password Reset] Request completed in XXXms
📦 [Password Reset] Full response: { data: {...}, error: null }
✅ [Password Reset] Request successful
```

If you see errors here, note the exact error message.

### Step 3: Verify User Exists in Auth

Run in **Supabase SQL Editor**:

```sql
-- Check if the specific user exists
SELECT
  id,
  email,
  created_at,
  confirmed_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'user@example.com';  -- Replace with test email

-- List ALL auth users
SELECT email, created_at, confirmed_at
FROM auth.users
ORDER BY created_at DESC;
```

### Step 4: Check Resend Dashboard

1. Go to: **Resend Dashboard > Logs**
2. Filter by time range when you tested
3. Look for email to your test address
4. Check status:
   - ✅ **Delivered** = Email was sent successfully
   - ⏳ **Queued** = Email is being processed
   - ❌ **Failed** = Check error details

### Step 5: Use Diagnostic Tool

Open `diagnostic-password-reset.html` in browser:

1. Enter your Supabase URL and Anon Key
2. Click "Initialize Client"
3. Enter test email
4. Click "Test Password Reset"
5. Review detailed logs

## 🛠️ Solutions

### Solution 1: User Doesn't Exist
**Problem:** Email address not in auth.users table

**Fix:** User needs to be created via:
- Admin invitation system (send-invitation function)
- Manual creation in Supabase Dashboard
- Sign-up flow (if enabled)

### Solution 2: Edge Function Not Deployed
**Problem:** Old version of function running

**Fix:**
```bash
cd /home/user/newapp
supabase functions deploy send-password-reset --no-verify-jwt
```

### Solution 3: Resend Domain Not Verified
**Problem:** finixar.com not verified in Resend

**Fix:**
1. Go to Resend Dashboard > Domains
2. Add `finixar.com` domain
3. Add DNS records as shown
4. Wait for verification
5. OR use a verified domain in the meantime

### Solution 4: Wrong Environment Variable
**Problem:** RESEND_API_KEY not set or incorrect

**Fix:**
```bash
# Check if secret exists
supabase secrets list

# Set the secret
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

## 📊 Expected Behavior

### When User EXISTS:
1. Edge function receives request
2. Looks up user in auth.users ✅ Found
3. Creates password_reset_token in database
4. Calls Resend API to send email
5. Logs: "Password reset email sent successfully"
6. Returns success to frontend
7. User receives email within 1-2 minutes

### When User DOESN'T EXIST:
1. Edge function receives request
2. Looks up user in auth.users ❌ Not found
3. Logs: "Password reset requested for non-existent user"
4. **Does NOT send email** (intentional - security)
5. Returns success to frontend anyway (don't reveal user doesn't exist)
6. User sees success message but receives no email

## 🎯 Quick Checklist

Run through this checklist:

- [ ] User exists in auth.users table (check with SQL)
- [ ] Edge function is deployed (check Supabase Dashboard)
- [ ] RESEND_API_KEY secret is set (check `supabase secrets list`)
- [ ] finixar.com domain is verified in Resend
- [ ] Resend is not in sandbox mode
- [ ] Checked spam/junk folder
- [ ] Checked Supabase Edge Function logs
- [ ] Checked Resend Dashboard logs
- [ ] Tested with diagnostic tool

## 📝 Next Steps

Based on your investigation, the most likely cause is **#1: User doesn't exist in auth.users**.

**To confirm:**
1. Check Supabase Edge Function logs - look for "Password reset requested for non-existent user"
2. Run SQL query to verify user exists
3. If user doesn't exist, create them via admin invitation

**If user DOES exist and logs show "Password reset email sent successfully":**
1. Check Resend Dashboard > Logs for delivery status
2. Check spam folder
3. Try different email address
4. Verify domain in Resend
