/*
  # Fix Projets RLS Policies Only
  
  ## Problem
  The projets table is giving 403 errors on SELECT operations.
  The user_has_org_access function needs to be fixed without breaking other tables.
  
  ## Solution
  1. Drop and recreate only projets policies
  2. Replace user_has_org_access with a plpgsql version that properly handles RLS
  
  ## Changes
  - Drop all projets policies
  - Recreate user_has_org_access function (keep user_org_ids intact)
  - Recreate projets policies
*/

-- Step 1: Drop all existing projets policies
DROP POLICY IF EXISTS "Users view org projets" ON projets;
DROP POLICY IF EXISTS "Users can insert their org projets" ON projets;
DROP POLICY IF EXISTS "Users can update their org projets" ON projets;
DROP POLICY IF EXISTS "Users can delete their org projets" ON projets;

-- Step 2: Replace user_has_org_access function
DROP FUNCTION IF EXISTS user_has_org_access(uuid);

CREATE OR REPLACE FUNCTION public.user_has_org_access(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  is_super boolean;
  has_membership boolean;
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if super admin first (direct check, no function call)
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = current_user_id
    AND email = 'zrig.ayman@gmail.com'
  ) INTO is_super;
  
  IF is_super THEN
    RETURN true;
  END IF;
  
  -- Check membership directly
  -- SECURITY DEFINER allows this function to read memberships
  -- even if the calling user doesn't have direct SELECT permission
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE org_id = check_org_id
    AND user_id = current_user_id
  ) INTO has_membership;
  
  RETURN has_membership;
END;
$$;

-- Grant execute permission to both authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.user_has_org_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_org_access(uuid) TO anon;

-- Step 3: Recreate all projets policies with the fixed function
CREATE POLICY "Users view org projets"
  ON projets
  FOR SELECT
  TO authenticated
  USING (user_has_org_access(org_id));

CREATE POLICY "Users can insert their org projets"
  ON projets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_has_org_access(org_id));

CREATE POLICY "Users can update their org projets"
  ON projets
  FOR UPDATE
  TO authenticated
  USING (user_has_org_access(org_id))
  WITH CHECK (user_has_org_access(org_id));

CREATE POLICY "Users can delete their org projets"
  ON projets
  FOR DELETE
  TO authenticated
  USING (user_has_org_access(org_id));
