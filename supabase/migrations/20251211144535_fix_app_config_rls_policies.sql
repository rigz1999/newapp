/*
  # Fix app_config RLS policies
  
  The issue: app_config table has RLS enabled but no policies, blocking
  all access including from SECURITY DEFINER functions.
  
  Solution: Add a policy to allow authenticated users to read app_config.
  This is safe because app_config only contains non-sensitive configuration.
*/

-- Allow all authenticated users to read app_config
CREATE POLICY "Allow authenticated users to read app_config"
  ON app_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Only super admins can modify app_config
CREATE POLICY "Only super admins can insert app_config"
  ON app_config
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Only super admins can update app_config"
  ON app_config
  FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Only super admins can delete app_config"
  ON app_config
  FOR DELETE
  TO authenticated
  USING (is_super_admin());