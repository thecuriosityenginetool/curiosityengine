-- =============================================
-- ADD TIM TO PUBLIC.USERS
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Create Tim's user record
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'tim@dspgen.ai';
BEGIN
  -- Get Tim's auth ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = v_email
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No auth user found for: %', v_email;
  ELSE
    RAISE NOTICE 'Found auth user: % with ID: %', v_email, v_user_id;
    
    -- Insert into public.users (or update if exists)
    INSERT INTO public.users (id, email, full_name, role, user_context)
    VALUES (
      v_user_id,
      v_email,
      'Tim',
      'member',
      '{"aboutMe": "", "objectives": ""}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      user_context = EXCLUDED.user_context,
      updated_at = NOW();
    
    RAISE NOTICE 'User record created for Tim!';
  END IF;
END $$;

-- Step 2: Verify Tim's record
SELECT 'Tim record:' as status;
SELECT id, email, full_name, user_context 
FROM public.users 
WHERE email = 'tim@dspgen.ai';

-- Step 3: Sync ALL remaining auth users (catches everyone)
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
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 4: Final verification
SELECT 'All users after sync:' as status;
SELECT email, full_name FROM public.users ORDER BY email;

