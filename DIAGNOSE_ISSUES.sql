-- ================================================
-- DIAGNOSTIC SCRIPT - Run this to check your system
-- ================================================

-- 1. Check if Salesforce is actually connected
-- ================================================
SELECT 
    'Salesforce Status' as check_type,
    organization_id,
    integration_type,
    is_enabled,
    enabled_at,
    CASE 
        WHEN configuration IS NOT NULL THEN 'Has tokens ✅'
        ELSE 'No tokens ❌'
    END as token_status
FROM organization_integrations
WHERE integration_type IN ('salesforce', 'salesforce_user');

-- If no results, then Salesforce is NOT connected

-- 2. Check users table and RLS policies
-- ================================================
-- Check if users table exists and has data
SELECT 'Users Table Check' as check_type, COUNT(*) as user_count
FROM users;

-- 3. Check RLS policies on users table
-- ================================================
SELECT 
    'Users Table RLS' as check_type,
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'users';

-- 4. FIX: Update RLS policies for users table
-- ================================================

-- Drop all existing restrictive policies on users
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Service role has full access" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable all for service role" ON users;

-- Create proper policies
CREATE POLICY "Service role full access to users"
  ON users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 5. Check chats and activity_logs tables
-- ================================================
SELECT 'Chats Table Check' as check_type, COUNT(*) as count FROM chats;
SELECT 'Chat Messages Check' as check_type, COUNT(*) as count FROM chat_messages;
SELECT 'Activity Logs Check' as check_type, COUNT(*) as count FROM activity_logs;

-- 6. Check organization_integrations table
-- ================================================
SELECT 
    'All Integrations' as check_type,
    organization_id,
    integration_type,
    is_enabled,
    enabled_at
FROM organization_integrations;

-- ================================================
-- RESULTS INTERPRETATION
-- ================================================

-- If "Salesforce Status" shows no results:
--   → Salesforce is NOT connected (need to connect via dashboard)

-- If "Users Table RLS" shows no policies or wrong policies:
--   → RLS was blocking queries (now fixed by this script)

-- If any table shows "does not exist":
--   → Run verify-database-setup.sql first

-- After running this script:
--   1. Refresh your dashboard
--   2. Try logging in again
--   3. The 500 error should be gone

