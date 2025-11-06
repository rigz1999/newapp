-- Migration: Create user_reminder_settings table
-- Created: 2025-11-06
-- Purpose: Store user preferences for automatic email reminders about upcoming coupon payments

-- Create user_reminder_settings table
CREATE TABLE IF NOT EXISTS user_reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  remind_7_days BOOLEAN NOT NULL DEFAULT false,
  remind_14_days BOOLEAN NOT NULL DEFAULT false,
  remind_30_days BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one settings record per user
  UNIQUE(user_id)
);

-- Add index on user_id for fast lookups
CREATE INDEX idx_user_reminder_settings_user_id ON user_reminder_settings(user_id);

-- Add index on enabled users for the cron job
CREATE INDEX idx_user_reminder_settings_enabled ON user_reminder_settings(enabled) WHERE enabled = true;

-- Enable RLS
ALTER TABLE user_reminder_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and modify their own settings
CREATE POLICY "Users can view their own reminder settings"
  ON user_reminder_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminder settings"
  ON user_reminder_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminder settings"
  ON user_reminder_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminder settings"
  ON user_reminder_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_reminder_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on every update
CREATE TRIGGER update_user_reminder_settings_timestamp
  BEFORE UPDATE ON user_reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_reminder_settings_updated_at();

-- Comment on table
COMMENT ON TABLE user_reminder_settings IS 'Stores user preferences for automatic email reminders about upcoming coupon payments';
COMMENT ON COLUMN user_reminder_settings.enabled IS 'Master switch for all email reminders';
COMMENT ON COLUMN user_reminder_settings.remind_7_days IS 'Send reminder 7 days before coupon due date';
COMMENT ON COLUMN user_reminder_settings.remind_14_days IS 'Send reminder 14 days before coupon due date';
COMMENT ON COLUMN user_reminder_settings.remind_30_days IS 'Send reminder 30 days before coupon due date';
