-- Proper RLS Fix for Users Table
-- This fixes the 500 errors while maintaining security

-- First, check what's causing the 500 error
-- The issue is likely that the service role policy doesn't exist or isn't working

-- Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable all for service role" ON users;
DROP POLICY IF EXISTS "Enable read for authenticated" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Service role has full access" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Enable insert for service role" ON users;
DROP POLICY IF EXISTS "Enable update for service role" ON users;

-- Create proper policies
-- Policy 1: Service role can do EVERYTHING (for OAuth user creation)
CREATE POLICY "service_role_all_access"
ON users
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Users can read their own data
CREATE POLICY "users_select_own"
ON users
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid()::text = id::text);

-- Policy 3: Users can update their own data
CREATE POLICY "users_update_own"
ON users
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- Verify RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Check that policies were created
SELECT 
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- This should show 3 policies:
-- 1. service_role_all_access (service_role, ALL)
-- 2. users_select_own (authenticated, SELECT)
-- 3. users_update_own (authenticated, UPDATE)

