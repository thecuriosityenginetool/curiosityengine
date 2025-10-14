-- Fix: Create missing user_oauth_tokens table
-- Run this in Supabase SQL Editor

-- Create the missing table
CREATE TABLE IF NOT EXISTS user_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL, -- 'google' or 'microsoft'
  access_token text NOT NULL,
  refresh_token text,
  token_expiry timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE user_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Service role full access"
  ON user_oauth_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users manage own tokens"
  ON user_oauth_tokens
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Verify table was created
SELECT 'user_oauth_tokens table created successfully' as status;
