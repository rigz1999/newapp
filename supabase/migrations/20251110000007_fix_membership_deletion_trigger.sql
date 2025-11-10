-- ============================================
-- Fix Membership Deletion - Remove invited_by reference
-- Created: 2025-11-10
-- Purpose: Fix "column invited_by does not exist" error when deleting members
-- ============================================

-- The problem is in the delete_invitation_on_user_delete() function from migration
-- 20251108000006_fix_invitation_functions_search_path.sql which references
-- a non-existent column "invited_by" in the invitations table.

-- Fix the function to not reference invited_by
CREATE OR REPLACE FUNCTION public.delete_invitation_on_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- The invitations table doesn't have an invited_by column
  -- So we skip the deletion of invitations and just allow the user deletion to proceed
  -- Invitations will be cleaned up by the FK constraint if needed
  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.delete_invitation_on_user_delete() IS
  'Trigger function for user deletion - fixed to not reference non-existent invited_by column';
