-- Complete RLS Fix for All Tables
-- Run this to fix 500 errors across the board

-- =====================================================
-- USERS TABLE
-- =====================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable all for service role" ON users;
DROP POLICY IF EXISTS "Enable read for authenticated" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Service role has full access" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Enable insert for service role" ON users;
DROP POLICY IF EXISTS "Enable update for service role" ON users;
DROP POLICY IF EXISTS "service_role_all_access" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Create new policies
CREATE POLICY "service_role_full_access"
ON users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "users_read_own"
ON users
FOR SELECT
TO authenticated
USING (auth.uid()::text = id::text);

CREATE POLICY "users_update_own"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ORGANIZATION_INTEGRATIONS TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own organization integrations" ON organization_integrations;
DROP POLICY IF EXISTS "Service role has full access to integrations" ON organization_integrations;
DROP POLICY IF EXISTS "Admins can manage integrations" ON organization_integrations;

-- Create new policies
CREATE POLICY "service_role_integrations_full"
ON organization_integrations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "users_view_own_org_integrations"
ON organization_integrations
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id::text = auth.uid()::text
  )
);

CREATE POLICY "admins_manage_integrations"
ON organization_integrations
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users 
    WHERE id::text = auth.uid()::text 
    AND (role = 'org_admin' OR role = 'super_admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users 
    WHERE id::text = auth.uid()::text 
    AND (role = 'org_admin' OR role = 'super_admin')
  )
);

-- Enable RLS
ALTER TABLE organization_integrations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USER_OAUTH_TOKENS TABLE (if exists)
-- =====================================================

-- Drop existing
DROP POLICY IF EXISTS "Users can view own oauth tokens" ON user_oauth_tokens;
DROP POLICY IF EXISTS "Service role has full access to oauth tokens" ON user_oauth_tokens;

-- Create new
CREATE POLICY "service_role_oauth_full"
ON user_oauth_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "users_own_oauth_tokens"
ON user_oauth_tokens
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Enable RLS
ALTER TABLE user_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check all policies
SELECT 
  tablename,
  policyname,
  roles::text,
  cmd::text
FROM pg_policies 
WHERE tablename IN ('users', 'organization_integrations', 'user_oauth_tokens')
ORDER BY tablename, policyname;

-- This should show proper policies for all 3 tables

