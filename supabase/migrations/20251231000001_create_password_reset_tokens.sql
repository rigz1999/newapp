-- ============================================
-- Create Password Reset Tokens Table
-- Created: 2025-12-31
-- Purpose: Store password reset tokens for custom email flow via Resend
-- ============================================

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow anonymous token lookup" ON password_reset_tokens;

-- Policy for anonymous users to check token validity (needed for reset page)
CREATE POLICY "Allow anonymous token lookup"
  ON password_reset_tokens
  FOR SELECT
  TO anon
  USING (
    status = 'pending' AND expires_at > NOW()
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_status ON password_reset_tokens(status);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Comments
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens sent via Resend email service';
COMMENT ON POLICY "Allow anonymous token lookup" ON password_reset_tokens IS
  'Allows anonymous users to verify valid reset tokens';
