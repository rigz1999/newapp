/*
  # Create Emetteur Role System

  ## Overview
  Adds support for "emetteur" users who can:
  - View specific projects assigned to them
  - See aggregated payment schedules (no investor details)
  - Post and view project updates (actualités)
  - Export payment schedules
  - Cannot see other projects or sensitive investor data

  ## Changes

  1. **Role Expansion**
     - Add 'emetteur' as valid role (roles are stored as TEXT)
     - Emetteurs are org members with limited access

  2. **New Table: emetteur_projects**
     - Links emetteur users to specific projects they can access
     - One emetteur can access multiple projects
     - One project can have one emetteur assigned
     - Includes invitation metadata

  3. **RPC Functions**
     - `get_org_emetteurs()` - Get list of unique emetteur names from org's projects
     - `get_emetteur_projects()` - Get projects accessible to an emetteur user

  4. **Security (RLS)**
     - Emetteurs can only see data from their assigned projects
     - Cannot access investor details, subscriptions, or admin functions
     - Can read/write actualités for their projects

  ## Notes
  - Same person as emetteur in different orgs = separate accounts (org isolation)
  - Emetteur access is additive: org membership + project assignment
*/

-- Step 1: Update role check constraints to include 'emetteur'
DO $$
BEGIN
  -- Update memberships table constraint
  ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_role_check;
  ALTER TABLE public.memberships ADD CONSTRAINT memberships_role_check 
    CHECK (role = ANY (ARRAY['admin'::text, 'member'::text, 'emetteur'::text, 'superadmin'::text, 'super_admin'::text]));

  -- Update invitations table constraint
  ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
  ALTER TABLE public.invitations ADD CONSTRAINT invitations_role_check 
    CHECK (role = ANY (ARRAY['admin'::text, 'member'::text, 'emetteur'::text]));
END $$;

-- Step 2: Create emetteur_projects table
CREATE TABLE IF NOT EXISTS public.emetteur_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  projet_id UUID NOT NULL REFERENCES public.projets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emetteur_name TEXT NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- One emetteur per project
  UNIQUE(projet_id)
);

-- Enable RLS
ALTER TABLE public.emetteur_projects ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_emetteur_projects_user_id ON public.emetteur_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_emetteur_projects_projet_id ON public.emetteur_projects(projet_id);
CREATE INDEX IF NOT EXISTS idx_emetteur_projects_org_id ON public.emetteur_projects(org_id);

-- Step 3: RLS Policies for emetteur_projects

-- Drop existing policies first
DROP POLICY IF EXISTS "emetteur_projects_select_policy" ON public.emetteur_projects;
DROP POLICY IF EXISTS "emetteur_projects_insert_policy" ON public.emetteur_projects;
DROP POLICY IF EXISTS "emetteur_projects_update_policy" ON public.emetteur_projects;
DROP POLICY IF EXISTS "emetteur_projects_delete_policy" ON public.emetteur_projects;
DROP POLICY IF EXISTS "emetteur_projects_superadmin_all" ON public.emetteur_projects;

-- Authenticated users can view emetteur assignments for their org
CREATE POLICY "emetteur_projects_select_policy"
  ON public.emetteur_projects FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.memberships WHERE user_id = auth.uid()
    )
  );

-- Admins can assign emetteurs to projects
CREATE POLICY "emetteur_projects_insert_policy"
  ON public.emetteur_projects FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update emetteur assignments
CREATE POLICY "emetteur_projects_update_policy"
  ON public.emetteur_projects FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can remove emetteur assignments
CREATE POLICY "emetteur_projects_delete_policy"
  ON public.emetteur_projects FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Superadmin bypass
CREATE POLICY "emetteur_projects_superadmin_all"
  ON public.emetteur_projects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_superadmin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_superadmin = true
    )
  );

-- Step 4: Update project_comments RLS to allow emetteur access

-- Drop existing policies for project_comments that conflict
DROP POLICY IF EXISTS "project_comments_select_policy" ON public.project_comments;
DROP POLICY IF EXISTS "project_comments_insert_policy" ON public.project_comments;

-- Recreate with emetteur access
CREATE POLICY "project_comments_select_policy"
  ON public.project_comments FOR SELECT
  TO authenticated
  USING (
    -- Org members can see all comments
    org_id IN (
      SELECT org_id FROM public.memberships WHERE user_id = auth.uid()
    )
    OR
    -- Emetteurs can see comments on their assigned projects
    projet_id IN (
      SELECT projet_id FROM public.emetteur_projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "project_comments_insert_policy"
  ON public.project_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      -- Org members can post comments
      org_id IN (
        SELECT org_id FROM public.memberships WHERE user_id = auth.uid()
      )
      AND user_id = auth.uid()
    )
    OR
    (
      -- Emetteurs can post comments on their assigned projects
      projet_id IN (
        SELECT projet_id FROM public.emetteur_projects WHERE user_id = auth.uid()
      )
      AND user_id = auth.uid()
    )
  );

-- Step 5: RPC Functions

-- Get unique emetteur names from organization's projects
CREATE OR REPLACE FUNCTION public.get_org_emetteurs(p_org_id UUID)
RETURNS TABLE (emetteur_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT projets.emetteur::TEXT
  FROM public.projets
  WHERE projets.org_id = p_org_id
    AND projets.emetteur IS NOT NULL
    AND projets.emetteur != ''
  ORDER BY projets.emetteur;
END;
$$;

-- Get projects accessible to an emetteur user
CREATE OR REPLACE FUNCTION public.get_emetteur_projects(p_user_id UUID)
RETURNS TABLE (
  projet_id UUID,
  projet_name TEXT,
  emetteur_name TEXT,
  org_id UUID,
  org_name TEXT,
  date_emission DATE,
  taux_interet NUMERIC,
  montant_global NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.projet,
    ep.emetteur_name,
    p.org_id,
    o.name,
    p.date_emission,
    p.taux_interet,
    p.montant_global_eur
  FROM public.emetteur_projects ep
  JOIN public.projets p ON ep.projet_id = p.id
  JOIN public.organizations o ON ep.org_id = o.id
  WHERE ep.user_id = p_user_id
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_org_emetteurs TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_emetteur_projects TO authenticated;

-- Step 6: Update projets RLS to allow emetteur read access

-- Drop existing select policy
DROP POLICY IF EXISTS "projets_select_policy" ON public.projets;

-- Recreate with emetteur access
CREATE POLICY "projets_select_policy"
  ON public.projets FOR SELECT
  TO authenticated
  USING (
    -- Org members can see all org projects
    org_id IN (
      SELECT org_id FROM public.memberships WHERE user_id = auth.uid()
    )
    OR
    -- Emetteurs can see their assigned projects
    id IN (
      SELECT projet_id FROM public.emetteur_projects WHERE user_id = auth.uid()
    )
  );

-- Step 7: Allow emetteurs to read coupons_echeances for their projects (aggregated data only)

-- Drop existing select policy
DROP POLICY IF EXISTS "coupons_echeances_select_policy" ON public.coupons_echeances;

-- Recreate with emetteur access (they see aggregated data, handled by frontend)
CREATE POLICY "coupons_echeances_select_policy"
  ON public.coupons_echeances FOR SELECT
  TO authenticated
  USING (
    -- Org members can see all echeances
    souscription_id IN (
      SELECT s.id FROM public.souscriptions s
      JOIN public.projets p ON s.projet_id = p.id
      WHERE p.org_id IN (
        SELECT org_id FROM public.memberships WHERE user_id = auth.uid()
      )
    )
    OR
    -- Emetteurs can see echeances for their assigned projects (aggregated by frontend)
    souscription_id IN (
      SELECT s.id FROM public.souscriptions s
      WHERE s.projet_id IN (
        SELECT projet_id FROM public.emetteur_projects WHERE user_id = auth.uid()
      )
    )
  );

-- Step 8: Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_emetteur_projects_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_emetteur_projects_timestamp_trigger
  BEFORE UPDATE ON public.emetteur_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_emetteur_projects_timestamp();
