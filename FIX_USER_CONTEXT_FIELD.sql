-- Fix User Context Field Issue
-- This script adds the missing user_context field to the users table
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/mrdqdgztzwboglkrtaui/sql

-- Check if user_context column exists
DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'user_context'
    ) THEN
        -- Add the user_context column
        ALTER TABLE public.users 
        ADD COLUMN user_context JSONB DEFAULT '{}'::jsonb;
        
        RAISE NOTICE 'Added user_context column to users table';
    ELSE
        RAISE NOTICE 'user_context column already exists in users table';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users' 
AND column_name = 'user_context';

-- Test the context saving functionality
-- This should work after running the above migration
SELECT 
    'Migration completed successfully' as status,
    'user_context field added to users table' as details;
