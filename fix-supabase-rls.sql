-- Fix Supabase RLS policies for user creation and access
-- Run this in your Supabase SQL Editor

-- 1. Allow service role to bypass RLS completely
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Then re-enable with proper policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Service role has full access" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- 3. Create new policies that work with OAuth
CREATE POLICY "Enable read access for authenticated users"
ON users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for service role"
ON users FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Enable update for service role"
ON users FOR UPDATE
TO service_role
USING (true);

CREATE POLICY "Enable all for service role"
ON users FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Verify policies
SELECT schemaname, tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'users';

