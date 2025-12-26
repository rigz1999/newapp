-- ============================================
-- Project Comments Feature
-- Allows organization members to comment on projects
-- ============================================

-- Create project_comments table
CREATE TABLE IF NOT EXISTS public.project_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projet_id UUID NOT NULL REFERENCES public.projets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE NOT NULL
);

-- Enable RLS
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_comments_projet_id ON public.project_comments(projet_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_org_id ON public.project_comments(org_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_created_at ON public.project_comments(created_at DESC);

-- RLS Policies
-- Users can view comments from projects in their organization
CREATE POLICY "project_comments_select_policy"
  ON public.project_comments FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM public.memberships WHERE user_id = auth.uid()
    )
  );

-- Users can insert comments for projects in their organization
CREATE POLICY "project_comments_insert_policy"
  ON public.project_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Users can update their own comments
CREATE POLICY "project_comments_update_policy"
  ON public.project_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "project_comments_delete_policy"
  ON public.project_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Superadmin bypass policies
CREATE POLICY "project_comments_superadmin_all"
  ON public.project_comments FOR ALL
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

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.is_edited = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_comment_timestamp_trigger
  BEFORE UPDATE ON public.project_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_project_comment_timestamp();
