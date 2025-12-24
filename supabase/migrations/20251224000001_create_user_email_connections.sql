-- Create user_email_connections table for OAuth email integration
-- This stores OAuth tokens for Microsoft/Google to create draft emails

CREATE TABLE IF NOT EXISTS public.user_email_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Provider: 'microsoft' or 'google'
  provider TEXT NOT NULL CHECK (provider IN ('microsoft', 'google')),

  -- Email address used for sending
  email_address TEXT NOT NULL,

  -- OAuth tokens (encrypted at rest by Supabase)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Additional OAuth metadata
  scope TEXT, -- Granted permissions
  token_type TEXT DEFAULT 'Bearer',

  -- Metadata
  connected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One email connection per user (can reconnect to replace)
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_email_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own email connection
CREATE POLICY "Users can view own email connection"
  ON public.user_email_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own email connection
CREATE POLICY "Users can insert own email connection"
  ON public.user_email_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own email connection
CREATE POLICY "Users can update own email connection"
  ON public.user_email_connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own email connection
CREATE POLICY "Users can delete own email connection"
  ON public.user_email_connections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_email_connections_user_id ON public.user_email_connections(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_email_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS user_email_connections_updated_at ON public.user_email_connections;
CREATE TRIGGER user_email_connections_updated_at
  BEFORE UPDATE ON public.user_email_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_email_connections_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.user_email_connections IS
  'Stores OAuth tokens for users to connect their email accounts (Microsoft/Google) for creating draft reminder emails';
