-- Add OAuth tokens table for storing user email access tokens
-- This allows the application to send emails on behalf of users

CREATE TABLE IF NOT EXISTS user_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_user_id ON user_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_provider ON user_oauth_tokens(provider);

-- Add RLS policies
ALTER TABLE user_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only read their own tokens
CREATE POLICY "Users can view own oauth tokens"
  ON user_oauth_tokens
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Service role can do everything (for NextAuth callbacks)
CREATE POLICY "Service role has full access to oauth tokens"
  ON user_oauth_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_oauth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_oauth_tokens_updated_at
  BEFORE UPDATE ON user_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_tokens_updated_at();

-- Add email_provider column to users table to track their auth method
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_provider TEXT CHECK (email_provider IN ('google', 'microsoft'));

COMMENT ON TABLE user_oauth_tokens IS 'Stores OAuth access tokens for email sending on behalf of users';
COMMENT ON COLUMN user_oauth_tokens.provider IS 'OAuth provider: google or microsoft';
COMMENT ON COLUMN user_oauth_tokens.access_token IS 'OAuth access token for API calls';
COMMENT ON COLUMN user_oauth_tokens.refresh_token IS 'OAuth refresh token for renewing access';
COMMENT ON COLUMN user_oauth_tokens.token_expiry IS 'When the access token expires';
COMMENT ON COLUMN users.email_provider IS 'Which OAuth provider the user signed in with';

