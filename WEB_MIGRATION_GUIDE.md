# Complete Supabase Migration Guide - Web Interface Only
## US to Paris Migration - Step by Step

---

## ✅ COMPLETED
- [x] Paris project created
- [x] Base schema created (all tables)

---

## 📋 STEP 1: Export & Apply RLS Policies (15 mins)

### 1.1 Export RLS from US

Go to **US SQL Editor**: https://supabase.com/dashboard/project/wmgukeonxszbfdrrmkhy/sql/new

**Paste and run this query:**

```sql
SELECT
  'CREATE POLICY ' || quote_ident(policyname) ||
  ' ON ' || schemaname || '.' || tablename ||
  ' FOR ' || cmd ||
  ' TO ' || array_to_string(roles, ', ') ||
  CASE WHEN qual IS NOT NULL THEN E'\n  USING (' || qual || ')' ELSE '' END ||
  CASE WHEN with_check IS NOT NULL THEN E'\n  WITH CHECK (' || with_check || ')' ELSE '' END ||
  ';' || E'\n' as policy_sql
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Copy all the results** (will be CREATE POLICY statements)

### 1.2 Apply RLS to Paris

Go to **Paris SQL Editor**: https://supabase.com/dashboard/project/nyyneivgrwksesgsmpjm/sql/new

**Paste all the CREATE POLICY statements and run**

---

## ⚙️ STEP 2: Export & Apply Functions (10 mins)

### 2.1 Export Functions from US

In **US SQL Editor**, run:

```sql
SELECT pg_get_functiondef(p.oid) || ';' || E'\n\n' as function_sql
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
ORDER BY p.proname;
```

**Copy all the results**

### 2.2 Apply Functions to Paris

In **Paris SQL Editor**, paste and run all the function definitions

---

## 🔗 STEP 3: Export & Apply Triggers (5 mins)

### 3.1 Export Triggers from US

In **US SQL Editor**, run:

```sql
SELECT pg_get_triggerdef(t.oid) || ';' || E'\n' as trigger_sql
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relnamespace = 'public'::regnamespace
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;
```

**Copy all the results**

### 3.2 Apply Triggers to Paris

In **Paris SQL Editor**, paste and run

---

## 📊 STEP 4: Migrate Data (30 mins)

**Tables in dependency order:**

1. profiles
2. organizations
3. memberships
4. invitations
5. projets
6. investisseurs
7. tranches
8. souscriptions
9. coupons_echeances
10. paiements
11. payment_proofs
12. user_reminder_settings

### 4.1 For EACH Table:

**In US SQL Editor:**
```sql
SELECT * FROM [table_name];
```
- Click **Download** → **CSV**
- Save the file

**In Paris Table Editor:**
- Go to: https://supabase.com/dashboard/project/nyyneivgrwksesgsmpjm/editor
- Click the table name
- Click **Insert** → **Import data from CSV**
- Upload the CSV file

**Repeat for all 12 tables in order**

---

## 📁 STEP 5: Migrate Storage Buckets (20 mins)

### 5.1 Create Buckets in Paris

Go to **Paris Storage**: https://supabase.com/dashboard/project/nyyneivgrwksesgsmpjm/storage/buckets

Create these buckets:
- `payment-proofs` (private)
- `payment-proofs-temp` (private)
- `ribs` (private)

### 5.2 Download Files from US

Go to **US Storage**: https://supabase.com/dashboard/project/wmgukeonxszbfdrrmkhy/storage/buckets

For each bucket:
- Click bucket name
- Select all files
- Download to your computer

### 5.3 Upload to Paris

Go to **Paris Storage** buckets

For each bucket:
- Click bucket name
- Click **Upload files**
- Upload the files you downloaded

---

## 🔧 STEP 6: Deploy Edge Functions (15 mins)

### 6.1 List Your Edge Functions

You have 9 edge functions in `supabase/functions/`:
1. send-invitation
2. send-coupon-reminders
3. analyze-payment
4. analyze-payment-batch
5. accept-invitation
6. create-admin
7. delete-pending-user
8. import-registre
9. regenerate-echeancier

### 6.2 Deploy via Dashboard

Go to **Paris Edge Functions**: https://supabase.com/dashboard/project/nyyneivgrwksesgsmpjm/functions

For each function:
- Click **Create function**
- Name it (e.g., `send-invitation`)
- Paste the code from `supabase/functions/[function-name]/index.ts`
- Click **Deploy**

### 6.3 Set Environment Variables

Go to **Paris Settings → Edge Functions**: https://supabase.com/dashboard/project/nyyneivgrwksesgsmpjm/settings/functions

Add these secrets:
```
SUPABASE_URL=https://nyyneivgrwksesgsmpjm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[from .migration-credentials.txt]
SUPABASE_ANON_KEY=[from .migration-credentials.txt]
RESEND_API_KEY=[get from US project settings or your Resend account]
```

---

## 🚀 STEP 7: Update Your Application (5 mins)

### 7.1 Update Environment Variables

In your `.env` or deployment platform (Vercel/Netlify):

```bash
VITE_SUPABASE_URL=https://nyyneivgrwksesgsmpjm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eW5laXZncndrc2VzZ3NtcGptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNzY0NjksImV4cCI6MjA4MTk1MjQ2OX0.98H1orPG5aT1aWYPTqyXqs5FZ4WAstx6rI8Vzd2r8hQ
```

### 7.2 Deploy

Deploy your application with the new environment variables

---

## ✅ STEP 8: Verification

### 8.1 Check Data

Go to **Paris Table Editor** and verify:
- All tables have data
- Row counts match US database

### 8.2 Test Functionality

- Sign in to your app
- Create a test record
- Upload a file
- Test edge functions

---

## 📝 Quick Summary

**Time estimate:** 90-120 minutes total

**Order:**
1. ✅ RLS Policies (15 min)
2. ✅ Functions (10 min)
3. ✅ Triggers (5 min)
4. ✅ Data migration (30 min)
5. ✅ Storage files (20 min)
6. ✅ Edge functions (15 min)
7. ✅ Update env vars (5 min)
8. ✅ Test (10 min)

---

## 🆘 If You Get Stuck

Let me know which step failed and I'll help debug it!
