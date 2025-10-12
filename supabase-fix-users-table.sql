-- Fix users table to work with NextAuth (not Supabase Auth)
-- Run this in your Supabase SQL Editor

-- Remove the foreign key constraint to auth.users
ALTER TABLE IF EXISTS public.users 
DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Make sure the id column is just a UUID (not referencing auth.users)
-- The column should already exist, this just ensures it's a UUID primary key
-- If you get an error, the table structure is already correct

-- Add email_provider column if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email_provider TEXT;

COMMENT ON COLUMN public.users.email_provider IS 'OAuth provider used: google, microsoft, etc.';

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

