-- ============================================
-- Create audit_logs table for traceability
-- Tracks who did what, when, on which entity
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  user_email text,
  user_name text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON public.audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_entity_id ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert audit logs
CREATE POLICY "audit_logs_insert_authenticated"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can read audit logs for their organization
CREATE POLICY "audit_logs_select_org_members"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT m.org_id FROM public.memberships m WHERE m.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_superadmin = true
    )
  );

-- Audit logs are immutable - no update or delete policies
-- This ensures the audit trail cannot be tampered with
