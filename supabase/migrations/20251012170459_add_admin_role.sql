/*
  # Add admin role support

  1. Changes
    - Add is_admin column to auth.users metadata
    - Update useOrganization hook logic to allow admins to bypass organization checks
  
  2. Notes
    - Admins can log in without being linked to any organization
    - Admin status is stored in user metadata for easy access
*/

-- No schema changes needed - we'll use auth metadata