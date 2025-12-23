# Export RLS Policies, Functions, and Views from US Database

Since we cannot directly access the database via REST API, follow these steps:

## STEP 1: Export from US Database

Go to your US Supabase Dashboard:
**👉 https://supabase.com/dashboard/project/wmgukeonxszbfdrrmkhy/sql/new**

Run these SQL queries **one by one** and save the results:

### Query 1: Export RLS Policies

```sql
SELECT
  'CREATE POLICY "' || policyname || '"' ||
  ' ON ' || schemaname || '.' || tablename ||
  ' FOR ' || cmd ||
  ' TO ' || array_to_string(roles, ', ') ||
  CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END ||
  CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END ||
  ';' as create_statement
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Save the output as:** `rls-policies.sql`

### Query 2: Export Functions

```sql
SELECT pg_get_functiondef(oid) || E';\n\n' as function_definition
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND prokind = 'f'
ORDER BY proname;
```

**Save the output as:** `functions.sql`

### Query 3: Export Triggers

```sql
SELECT
  pg_get_triggerdef(oid) || ';' as trigger_definition
FROM pg_trigger
WHERE tgrelid IN (
  SELECT oid FROM pg_class
  WHERE relnamespace = 'public'::regnamespace
)
AND NOT tgisinternal
ORDER BY tgname;
```

**Save the output as:** `triggers.sql`

### Query 4: Export Views

```sql
SELECT
  'CREATE OR REPLACE VIEW ' || schemaname || '.' || viewname || ' AS ' || E'\n' || definition || ';' || E'\n\n' as view_definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;
```

**Save the output as:** `views.sql`

---

## STEP 2: Combine and Clean

Create a file called `paris-rls-and-objects.sql` and combine the files in this order:

```sql
-- ============================================
-- RLS POLICIES, FUNCTIONS, VIEWS, TRIGGERS
-- Exported from US, applying to Paris
-- ============================================

-- FUNCTIONS FIRST (triggers depend on them)
[paste functions.sql content here]

-- VIEWS SECOND
[paste views.sql content here]

-- TRIGGERS THIRD
[paste triggers.sql content here]

-- RLS POLICIES LAST
[paste rls-policies.sql content here]
```

---

## STEP 3: Apply to Paris Database

1. Go to Paris Supabase Dashboard:
   **👉 https://supabase.com/dashboard/project/nyyneivgrwksesgsmpjm/sql/new**

2. Paste the entire `paris-rls-and-objects.sql` content

3. Click **Run**

---

## ALTERNATIVE: Use Supabase CLI (Recommended if CLI works)

If you can get Supabase CLI working:

```bash
# Export from US
supabase db dump --db-url "postgresql://postgres:[US_PASSWORD]@db.wmgukeonxszbfdrrmkhy.supabase.co:5432/postgres" --schema public > us-full-dump.sql

# Apply to Paris
psql "postgresql://postgres:[PARIS_PASSWORD]@db.nyyneivgrwksesgsmpjm.supabase.co:5432/postgres" -f us-full-dump.sql
```

Get passwords from:
- **US:** Settings → Database → Connection string
- **Paris:** Settings → Database → Connection string

---

## What This Exports

✅ All RLS policies (access control)
✅ All functions (business logic)
✅ All triggers (automatic actions)
✅ All views (computed queries)
✅ All indexes (already in base schema)

❌ No data (we'll migrate that separately)

---

## Need Help?

If you get errors, let me know which step failed and I'll help debug it.
