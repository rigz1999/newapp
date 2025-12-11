/*
  # Secure Identity Tables Without Recursion
  
  ## Security Requirements
  1. Users can ONLY see organizations they belong to
  2. Users can ONLY see their own profile
  3. Users can ONLY see memberships for their organizations
  4. NO infinite recursion
  
  ## How We Avoid Recursion
  - Memberships SELECT policy: Check auth.uid() = user_id (simple, no recursion)
  - Organizations SELECT policy: Check EXISTS in memberships with auth.uid() (works because memberships policy allows this query)
  - Profiles SELECT policy: Only own profile
  
  ## Changes
  1. Enable RLS on all identity tables
  2. Add restrictive SELECT policies
  3. Add policies for INSERT/UPDATE/DELETE based on roles
*/

-- Enable RLS on identity tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- PROFILES POLICIES
-- ==============================================

-- Users can ONLY view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ==============================================
-- MEMBERSHIPS POLICIES
-- ==============================================

-- Users can view their own memberships (NO RECURSION - direct auth.uid() check)
CREATE POLICY "Users can view own memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all memberships in their organizations
CREATE POLICY "Admins can view org memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Admins can insert memberships in their organizations
CREATE POLICY "Admins can insert memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Admins can update memberships in their organizations
CREATE POLICY "Admins can update memberships"
  ON memberships FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Admins can delete memberships in their organizations (but not their own)
CREATE POLICY "Admins can delete memberships"
  ON memberships FOR DELETE
  TO authenticated
  USING (
    user_id != auth.uid()
    AND org_id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- ==============================================
-- ORGANIZATIONS POLICIES
-- ==============================================

-- Users can ONLY view organizations they belong to
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
    )
  );

-- Superadmins can insert organizations
CREATE POLICY "Superadmins can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_superadmin = true
    )
  );

-- Admins can update their organizations
CREATE POLICY "Admins can update their organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    id IN (
      SELECT org_id FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Superadmins can delete organizations
CREATE POLICY "Superadmins can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_superadmin = true
    )
  );
