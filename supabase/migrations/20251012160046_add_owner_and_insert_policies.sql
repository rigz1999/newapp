/*
  # Add owner column and INSERT policies for signup

  1. Changes
    - Add owner_id column to organizations table
    - Add INSERT policy for organizations table to allow new users to create their organization
    - Add INSERT policy for memberships table to allow new users to create their own membership
  
  2. Security
    - Organizations: Users can insert when they are the owner
    - Memberships: Users can insert when they are adding themselves as a member
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE organizations ADD COLUMN owner_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

CREATE POLICY "Users can create their own organization"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can create their own membership"
  ON memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
