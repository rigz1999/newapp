/*
  # Fix user_org_ids Function - Security Settings

  ## Problem
  The function is marked as STABLE SECURITY DEFINER, but:
  1. It uses auth.uid() which can change, so it should be VOLATILE
  2. SECURITY DEFINER context might not work properly with RLS

  ## Changes
  1. Update function to be VOLATILE (instead of STABLE)
  2. Keep SECURITY DEFINER to access memberships table
  3. Add explicit SET search_path for security
*/

CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS TABLE(org_id uuid)
LANGUAGE sql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.org_id
  FROM memberships m
  WHERE m.user_id = auth.uid();
$$;
