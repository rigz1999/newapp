-- Add archived column to investisseurs for soft delete
ALTER TABLE investisseurs ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE investisseurs ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Index for fast filtering of active investors
CREATE INDEX IF NOT EXISTS idx_investisseurs_archived ON investisseurs (org_id, archived);
