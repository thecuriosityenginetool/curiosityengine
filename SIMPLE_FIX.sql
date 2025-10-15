-- =============================================
-- SIMPLEST FIX - Just make sure YOU can save
-- =============================================

-- Option 1: Check what email you're ACTUALLY using
SELECT 'Your auth users:' as info;
SELECT id, email, created_at 
FROM auth.users 
WHERE email LIKE '%matthewbravo%' 
   OR email LIKE '%bravo%'
   OR email LIKE '%antimatter%'
ORDER BY created_at DESC;

-- Option 2: If you see your email above, run this with YOUR actual email:
-- (Replace 'matthewbravo13@gmail.com' if different)

DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'matthewbravo13@gmail.com'; -- Change this if needed
BEGIN
  -- Get your auth ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email =  
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No auth user found for: %', v_email;
  ELSE
    RAISE NOTICE 'Found auth user: % with ID: %', v_email, v_user_id;
    
    -- Check if already in public.users
    IF EXISTS (SELECT 1 FROM public.users WHERE email = v_email) THEN
      RAISE NOTICE 'User exists in public.users, will UPDATE';
      -- Just update to make sure user_context field is clean
      UPDATE public.users 
      SET user_context = '{"aboutMe": "", "objectives": ""}'::jsonb,
          updated_at = NOW()
      WHERE email = v_email;
    ELSE
      RAISE NOTICE 'User does not exist, will INSERT';
      -- Insert new user
      INSERT INTO public.users (id, email, full_name, role, user_context)
      VALUES (
        v_user_id,
        v_email,
        'Matthew Bravo',
        'member',
        '{"aboutMe": "", "objectives": ""}'::jsonb
      );
    END IF;
    
    RAISE NOTICE 'SUCCESS! User ready for context saving';
  END IF;
END $$;

-- Verify
SELECT 'Final check:' as status;
SELECT id, email, full_name, user_context 
FROM public.users 
WHERE email = 'matthewbravo13@gmail.com';

