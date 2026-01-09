-- Create calendar_exports table to track Outlook calendar exports
CREATE TABLE calendar_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES projets(id) ON DELETE CASCADE,
  tranche_id uuid REFERENCES tranches(id) ON DELETE CASCADE,
  exported_at timestamptz DEFAULT now() NOT NULL,

  -- Snapshot of exported echeances for smart diff
  -- Structure: [{ id: "uuid", date_echeance: "2026-03-15", outlook_event_id: "AAMk..." }]
  echeances_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Flag to indicate if the export is outdated due to echeancier regeneration
  is_outdated boolean DEFAULT false NOT NULL,

  -- Export settings used (for reference)
  export_settings jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Constraints
  CONSTRAINT calendar_exports_project_or_tranche_check
    CHECK (project_id IS NOT NULL OR tranche_id IS NOT NULL)
);

-- Add indexes for performance
CREATE INDEX idx_calendar_exports_user_id ON calendar_exports(user_id);
CREATE INDEX idx_calendar_exports_project_id ON calendar_exports(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_calendar_exports_tranche_id ON calendar_exports(tranche_id) WHERE tranche_id IS NOT NULL;
CREATE INDEX idx_calendar_exports_is_outdated ON calendar_exports(is_outdated) WHERE is_outdated = true;

-- Enable Row Level Security
ALTER TABLE calendar_exports ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own exports
CREATE POLICY "Users can view their own calendar exports"
  ON calendar_exports
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar exports"
  ON calendar_exports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar exports"
  ON calendar_exports
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar exports"
  ON calendar_exports
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE calendar_exports IS 'Tracks Outlook calendar exports for echeances with smart diff support';
