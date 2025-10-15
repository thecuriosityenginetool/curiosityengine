-- =============================================
-- SAFE FIX FOR CONTEXT SAVING
-- No deletes, just updates and inserts
-- =============================================

-- Step 1: Show all current users
SELECT 'Current users in public.users:' as info;
SELECT id, email, full_name FROM public.users ORDER BY email;

-- Step 2: Show all auth users
SELECT 'All auth users:' as info;
SELECT id, email FROM auth.users ORDER BY email;

-- Step 3: Sync new auth users to public.users (NO DELETE, just insert missing)
INSERT INTO public.users (id, email, full_name, role, user_context)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name', 
    au.raw_user_meta_data->>'name', 
    split_part(au.email, '@', 1)
  ) as full_name,
  'member' as role,
  '{"aboutMe": "", "objectives": ""}'::jsonb as user_context
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;  -- Only insert users that don't exist

-- Step 4: Verify sync
SELECT 'After sync:' as status;
SELECT COUNT(*) as auth_users FROM auth.users;
SELECT COUNT(*) as public_users FROM public.users;

-- Step 5: Check if matthewbravo13@gmail.com now exists
SELECT 'Your user record:' as status;
SELECT id, email, full_name, user_context 
FROM public.users 
WHERE email = 'matthewbravo13@gmail.com';

-- =============================================
-- If you see your record above, context saving will work!
-- If not, check browser console for actual email being used
-- =============================================

