-- =============================================
-- EMERGENCY FIX: Sync ALL auth users to public
-- This fixes the "User not found" 404 errors
-- =============================================

-- STEP 1: See who's in auth.users
SELECT 'All auth users:' as info, email FROM auth.users ORDER BY email;

-- STEP 2: See who's in public.users  
SELECT 'All public users:' as info, email FROM public.users ORDER BY email;

-- STEP 3: Create missing records
-- This catches EVERYONE including Tim, Matthew, etc.
INSERT INTO public.users (id, email, full_name, role, user_context)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name', 
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full name',
    split_part(au.email, '@', 1)
  ) as full_name,
  'member' as role,
  '{"aboutMe": "", "objectives": ""}'::jsonb as user_context
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.email = au.email
)
ON CONFLICT (email) DO NOTHING;

-- STEP 4: Verify everyone is synced
SELECT 'After sync - all users:' as status;
SELECT email, full_name, role FROM public.users ORDER BY email;

-- STEP 5: Check specifically for Tim
SELECT 'Tim check:' as status;
SELECT * FROM public.users WHERE email LIKE '%tim%' OR email LIKE '%dspgen%';

-- =============================================
-- THIS SHOULD FIX EVERYONE!
-- Run this, then have Tim refresh his dashboard
-- =============================================

