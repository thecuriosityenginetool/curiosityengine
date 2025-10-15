-- =============================================
-- FIX CONTEXT SAVING FOR YOUR USER
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Check current state
SELECT 'Checking auth.users...' as step;
SELECT id, email, created_at FROM auth.users WHERE email LIKE '%matthewbravo%' OR email LIKE '%bravo%';

SELECT 'Checking public.users...' as step;
SELECT id, email, user_context FROM public.users WHERE email LIKE '%matthewbravo%' OR email LIKE '%bravo%';

-- Step 2: Find your actual auth user ID
SELECT 'Your auth user ID:' as info, id, email FROM auth.users 
WHERE email = 'matthewbravo13@gmail.com' 
OR raw_user_meta_data->>'email' = 'matthewbravo13@gmail.com';

-- Step 3: Clean up any duplicate/orphaned records
DELETE FROM public.users WHERE email = 'matthewbravo13@gmail.com';

-- Step 4: Get your correct auth ID and create public.users record
-- Replace YOUR_AUTH_ID with the ID from Step 2
DO $$
DECLARE
  v_auth_id UUID;
BEGIN
  -- Get your auth ID dynamically
  SELECT id INTO v_auth_id 
  FROM auth.users 
  WHERE email = 'matthewbravo13@gmail.com'
  LIMIT 1;
  
  IF v_auth_id IS NULL THEN
    RAISE NOTICE 'No auth.users record found for matthewbravo13@gmail.com';
    RAISE NOTICE 'You might be logged in with a different email';
  ELSE
    -- Insert your user record
    INSERT INTO public.users (id, email, full_name, role, user_context)
    VALUES (
      v_auth_id,
      'matthewbravo13@gmail.com',
      'Matthew Bravo',
      'member',
      '{"aboutMe": "", "objectives": ""}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      user_context = EXCLUDED.user_context;
    
    RAISE NOTICE 'User record created/updated for: %', v_auth_id;
  END IF;
END $$;

-- Step 5: Verify it worked
SELECT 'Verification:' as status;
SELECT id, email, full_name, user_context 
FROM public.users 
WHERE email = 'matthewbravo13@gmail.com';

-- =============================================
-- ALTERNATIVE: If you're logged in with different email
-- =============================================

-- Check what email NextAuth has for you:
-- Look at browser console when you click Save Context
-- It should show: "🔑 Using NextAuth session for: [your-actual-email]"

-- Then run this with YOUR actual email:
-- DELETE FROM public.users WHERE email = 'YOUR_ACTUAL_EMAIL_HERE';
-- 
-- And the trigger will auto-recreate it on next login/save

-- =============================================
-- NUCLEAR OPTION: Sync ALL auth users to public
-- =============================================

INSERT INTO public.users (id, email, full_name, role, user_context)
SELECT 
  id,
  email,
  COALESCE(
    raw_user_meta_data->>'full_name', 
    raw_user_meta_data->>'name', 
    split_part(email, '@', 1)
  ) as full_name,
  'member' as role,
  '{"aboutMe": "", "objectives": ""}'::jsonb as user_context
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

SELECT 'All users synced!' as status;
SELECT COUNT(*) as total_users FROM public.users;

