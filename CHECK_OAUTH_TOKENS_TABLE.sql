-- Check if user_oauth_tokens table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_oauth_tokens'
) as table_exists;

-- If it exists, show its structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_oauth_tokens'
ORDER BY ordinal_position;

-- Check if there's any data
SELECT COUNT(*) as row_count 
FROM user_oauth_tokens
WHERE true; -- This will fail if table doesn't exist

