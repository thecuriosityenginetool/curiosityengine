-- Check if user_oauth_tokens table exists and has correct structure
-- Run this in Supabase SQL Editor

-- Check if table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_oauth_tokens') 
    THEN '✅ Table exists'
    ELSE '❌ Table does not exist'
  END as table_status;

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_oauth_tokens'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_oauth_tokens';

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'user_oauth_tokens';

-- Test insert (this will show if there are any constraint issues)
DO $$
BEGIN
  -- Try to insert a test record
  INSERT INTO user_oauth_tokens (
    user_id, 
    provider, 
    access_token, 
    refresh_token, 
    token_expiry
  ) VALUES (
    gen_random_uuid(),
    'test',
    'test_token',
    'test_refresh',
    NOW() + INTERVAL '1 hour'
  );
  
  RAISE NOTICE '✅ Test insert successful - table is working';
  
  -- Clean up test record
  DELETE FROM user_oauth_tokens WHERE provider = 'test';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Test insert failed: %', SQLERRM;
END $$;
