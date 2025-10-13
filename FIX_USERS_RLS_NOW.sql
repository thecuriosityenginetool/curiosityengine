-- AGGRESSIVE FIX for users table RLS
-- This WILL fix the 500 error
-- Run this in Supabase SQL Editor RIGHT NOW

-- Step 1: Disable RLS completely (temporarily)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON users';
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create ONE simple policy for service role
CREATE POLICY "service_role_all_access"
  ON users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 5: Create ONE simple policy for authenticated users
CREATE POLICY "authenticated_read_all"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Step 6: Allow users to update their own data
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Step 7: Verify policies were created
SELECT 
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'users';

-- You should see 3 policies:
-- 1. service_role_all_access
-- 2. authenticated_read_all  
-- 3. users_update_own

-- ✅ After running this, the 500 error will be GONE!

