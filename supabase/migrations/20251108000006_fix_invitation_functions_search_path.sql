-- ============================================
-- Fix Invitation Functions Search Path
-- Created: 2025-11-08
-- Purpose: Add search_path to invitation functions to fix security warnings
-- ============================================

-- Function to mark an invitation as accepted
-- This function is called when a user accepts an invitation
CREATE OR REPLACE FUNCTION public.mark_invitation_accepted(invitation_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.invitations
  SET
    status = 'accepted',
    accepted_at = NOW()
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > NOW();
END;
$$;

-- Trigger function to delete invitations when a user is deleted
-- This ensures cleanup of pending invitations for deleted users
CREATE OR REPLACE FUNCTION public.delete_invitation_on_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Delete any invitations that were sent by this user
  DELETE FROM public.invitations
  WHERE invited_by = OLD.id;

  RETURN OLD;
END;
$$;

-- Create trigger on auth.users table if it doesn't exist
DROP TRIGGER IF EXISTS on_user_delete_cleanup_invitations ON auth.users;
CREATE TRIGGER on_user_delete_cleanup_invitations
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_invitation_on_user_delete();

-- Add comments for documentation
COMMENT ON FUNCTION public.mark_invitation_accepted(TEXT) IS
  'Marks an invitation as accepted and sets the accepted_at timestamp. Only updates pending, non-expired invitations.';

COMMENT ON FUNCTION public.delete_invitation_on_user_delete() IS
  'Trigger function that deletes invitations when the user who sent them is deleted. Maintains referential integrity.';
