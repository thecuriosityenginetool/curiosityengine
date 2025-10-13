-- COMPREHENSIVE RLS FIX - Safe Version (Handles Existing Policies)
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL existing RLS policies to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on users table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', r.policyname);
    END LOOP;
    
    -- Drop all policies on organization_integrations table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organization_integrations') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organization_integrations', r.policyname);
    END LOOP;
    
    -- Drop all policies on chats table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chats') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON chats', r.policyname);
    END LOOP;
    
    -- Drop all policies on chat_messages table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_messages') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON chat_messages', r.policyname);
    END LOOP;
    
    -- Drop all policies on activity_logs table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'activity_logs') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON activity_logs', r.policyname);
    END LOOP;
    
    RAISE NOTICE '✅ All existing policies dropped';
END $$;

-- Step 2: Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Step 3: Create fresh RLS policies

-- ==================== USERS TABLE ====================
-- Service role has full access
CREATE POLICY "service_role_full_users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read their own data by email
CREATE POLICY "users_read_own_by_email"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.jwt()->>'email' = email);

-- Authenticated users can read their own data by ID
CREATE POLICY "users_read_own_by_id"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Authenticated users can update their own data
CREATE POLICY "users_update_own"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ==================== ORGANIZATION_INTEGRATIONS TABLE ====================
-- Service role has full access
CREATE POLICY "service_role_full_integrations"
  ON organization_integrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can read integrations for their organization
CREATE POLICY "users_read_org_integrations"
  ON organization_integrations
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can insert integrations for their organization
CREATE POLICY "users_insert_org_integrations"
  ON organization_integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update integrations for their organization
CREATE POLICY "users_update_org_integrations"
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

-- Users can delete integrations for their organization
CREATE POLICY "users_delete_org_integrations"
  ON organization_integrations
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- ==================== CHATS TABLE ====================
-- Service role has full access
CREATE POLICY "service_role_full_chats"
  ON chats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can manage their own chats
CREATE POLICY "users_manage_own_chats"
  ON chats
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ==================== CHAT_MESSAGES TABLE ====================
-- Service role has full access
CREATE POLICY "service_role_full_messages"
  ON chat_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can manage messages in their own chats
CREATE POLICY "users_manage_own_messages"
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

-- ==================== ACTIVITY_LOGS TABLE ====================
-- Service role has full access
CREATE POLICY "service_role_full_logs"
  ON activity_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can read their own logs
CREATE POLICY "users_read_own_logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own logs
CREATE POLICY "users_insert_own_logs"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Step 4: Summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS POLICIES FIXED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Policies created:';
  RAISE NOTICE '  - users: 4 policies (service + authenticated)';
  RAISE NOTICE '  - organization_integrations: 5 policies (service + CRUD)';
  RAISE NOTICE '  - chats: 2 policies (service + user ownership)';
  RAISE NOTICE '  - chat_messages: 2 policies (service + ownership)';
  RAISE NOTICE '  - activity_logs: 3 policies (service + read/insert)';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Next steps:';
  RAISE NOTICE '  1. Refresh your dashboard';
  RAISE NOTICE '  2. Check console - 406 errors should be gone';
  RAISE NOTICE '  3. Run DISCONNECT_OUTLOOK.sql';
  RAISE NOTICE '  4. Reconnect Outlook from dashboard';
  RAISE NOTICE '';
END $$;

-- Step 5: Verify policies
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('users', 'organization_integrations', 'chats', 'chat_messages', 'activity_logs')
GROUP BY tablename
ORDER BY tablename;

