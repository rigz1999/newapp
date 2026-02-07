-- ============================================
-- Preserve actualités when an emetteur account is deleted
-- Changes project_comments.user_id from ON DELETE CASCADE to ON DELETE SET NULL
-- so comments remain visible even after the author's account is removed.
-- ============================================

-- 1. Make user_id nullable (required for SET NULL)
ALTER TABLE public.project_comments
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Replace the FK constraint: CASCADE → SET NULL
ALTER TABLE public.project_comments
  DROP CONSTRAINT IF EXISTS project_comments_user_id_fkey;

ALTER TABLE public.project_comments
  ADD CONSTRAINT project_comments_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;

-- 3. Update the delete RLS policy so org admins can also delete orphaned comments
DROP POLICY IF EXISTS "project_comments_delete_policy" ON public.project_comments;

CREATE POLICY "project_comments_delete_policy"
  ON public.project_comments FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
