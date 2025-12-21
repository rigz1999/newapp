-- Add org_id column to paiements table and backfill data
-- This fixes RLS policy violations when inserting payments

-- Step 1: Add org_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE paiements ADD COLUMN org_id uuid REFERENCES organizations(id);
    RAISE NOTICE 'Added org_id column to paiements table';
  ELSE
    RAISE NOTICE 'org_id column already exists in paiements table';
  END IF;
END $$;

-- Step 2: Backfill org_id for existing paiements records
-- Get org_id from tranches -> projets relationship
UPDATE paiements p
SET org_id = proj.org_id
FROM tranches t
JOIN projets proj ON t.projet_id = proj.id
WHERE p.tranche_id = t.id
AND p.org_id IS NULL;

-- Step 3: Verify the helper functions exist (create if missing)
CREATE OR REPLACE FUNCTION user_can_access_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_is_super boolean;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check superadmin first
  SELECT COALESCE(is_superadmin, false)
  INTO v_is_super
  FROM profiles
  WHERE id = v_user_id;

  IF v_is_super THEN
    RETURN true;
  END IF;

  -- Check membership
  RETURN EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = v_user_id
    AND org_id = check_org_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION user_can_access_org(uuid) TO authenticated, anon;

CREATE OR REPLACE FUNCTION user_is_admin_of_org(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_is_super boolean;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check superadmin first
  SELECT COALESCE(is_superadmin, false)
  INTO v_is_super
  FROM profiles
  WHERE id = v_user_id;

  IF v_is_super THEN
    RETURN true;
  END IF;

  -- Check if user has admin role in org
  RETURN EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = v_user_id
    AND org_id = check_org_id
    AND role IN ('admin', 'superadmin')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION user_is_admin_of_org(uuid) TO authenticated, anon;

-- Step 4: Ensure RLS policies are correct for paiements
DROP POLICY IF EXISTS paiements_select ON paiements;
CREATE POLICY paiements_select ON paiements FOR SELECT
  USING (user_can_access_org(org_id));

DROP POLICY IF EXISTS paiements_insert ON paiements;
CREATE POLICY paiements_insert ON paiements FOR INSERT
  WITH CHECK (user_can_access_org(org_id));

DROP POLICY IF EXISTS paiements_update ON paiements;
CREATE POLICY paiements_update ON paiements FOR UPDATE
  USING (user_is_admin_of_org(org_id));

DROP POLICY IF EXISTS paiements_delete ON paiements;
CREATE POLICY paiements_delete ON paiements FOR DELETE
  USING (user_is_admin_of_org(org_id));

-- Step 5: Ensure RLS is enabled
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

-- Verify the changes
DO $$
DECLARE
  column_exists boolean;
  null_count integer;
  total_count integer;
BEGIN
  -- Check if org_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'org_id'
  ) INTO column_exists;

  IF column_exists THEN
    -- Count records
    SELECT COUNT(*) INTO total_count FROM paiements;
    SELECT COUNT(*) INTO null_count FROM paiements WHERE org_id IS NULL;

    RAISE NOTICE '✅ Migration completed successfully';
    RAISE NOTICE 'Total paiements records: %', total_count;
    RAISE NOTICE 'Records with NULL org_id: %', null_count;

    IF null_count > 0 THEN
      RAISE WARNING 'Warning: % records still have NULL org_id - these may need manual review', null_count;
    END IF;
  ELSE
    RAISE EXCEPTION 'Migration failed: org_id column not found';
  END IF;
END $$;
