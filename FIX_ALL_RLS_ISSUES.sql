-- COMPREHENSIVE RLS FIX - Run this in Supabase SQL Editor
-- This will fix ALL RLS policy issues causing 406 and 500 errors

-- Step 1: Drop all existing problematic RLS policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Service role full access" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Users read own integrations" ON organization_integrations;
DROP POLICY IF EXISTS "Users manage own integrations" ON organization_integrations;
DROP POLICY IF EXISTS "Service role can read all" ON organization_integrations;

-- Step 2: Disable RLS temporarily to fix issues
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_integrations DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS with proper policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_integrations ENABLE ROW LEVEL SECURITY;

-- Step 4: Create comprehensive RLS policies for users table
-- Allow service role complete access (for API routes using service role key)
CREATE POLICY "Service role has full access to users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read their own data by email
CREATE POLICY "Users can read own data by email"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.jwt()->>'email' = email);

-- Allow authenticated users to read their own data by ID
CREATE POLICY "Users can read own data by id"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow authenticated users to update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 5: Create comprehensive RLS policies for organization_integrations
-- Allow service role complete access
CREATE POLICY "Service role has full access to integrations"
  ON organization_integrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow users to read integrations for their organization
CREATE POLICY "Users can read org integrations"
  ON organization_integrations
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Allow users to insert integrations for their organization
CREATE POLICY "Users can insert org integrations"
  ON organization_integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Allow users to update integrations for their organization
CREATE POLICY "Users can update org integrations"
  ON organization_integrations
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Step 6: Fix other common tables
-- Chats table
DROP POLICY IF EXISTS "Users can manage own chats" ON chats;
ALTER TABLE IF EXISTS chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to chats"
  ON chats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own chats"
  ON chats
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Chat messages table
DROP POLICY IF EXISTS "Users can manage own messages" ON chat_messages;
ALTER TABLE IF EXISTS chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to messages"
  ON chat_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage own messages"
  ON chat_messages
  FOR ALL
  TO authenticated
  USING (
    chat_id IN (
      SELECT id FROM chats WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    chat_id IN (
      SELECT id FROM chats WHERE user_id = auth.uid()
    )
  );

-- Activity logs table
DROP POLICY IF EXISTS "Users can read own logs" ON activity_logs;
ALTER TABLE IF EXISTS activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to logs"
  ON activity_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read own logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own logs"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Step 7: Verify policies are working
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies updated successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Summary of changes:';
  RAISE NOTICE '- users: Service role + authenticated user access';
  RAISE NOTICE '- organization_integrations: Service role + org member access';
  RAISE NOTICE '- chats: Service role + user ownership access';
  RAISE NOTICE '- chat_messages: Service role + chat ownership access';
  RAISE NOTICE '- activity_logs: Service role + user read access';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Please refresh your dashboard to test!';
END $$;

-- Step 8: Show current policies for verification
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('users', 'organization_integrations', 'chats', 'chat_messages', 'activity_logs')
ORDER BY tablename, policyname;

