# Debug Context Saving Issue

## Problem:
Getting "duplicate key value violates unique constraint users_email_key" but:
- matthewbravo13@gmail.com NOT in public.users
- matthewbravo13@gmail.com NOT in auth.users
- Only 5 old OWASP users exist

## Possible Causes:

1. **Wrong Supabase Project**
   - Code might be hitting different Supabase instance
   - Check NEXT_PUBLIC_SUPABASE_URL in .env

2. **NextAuth Not Synced with Supabase**
   - You're logged in via NextAuth (Google OAuth)
   - Supabase doesn't know about you
   - Need to create Supabase user on NextAuth login

3. **Cached Error**
   - Old failed API call cached
   - Try hard refresh

## Temporary Workaround:

**Option 1: Manual Insert**
Run this in Supabase SQL Editor:
```sql
INSERT INTO public.users (id, email, full_name, user_context)
VALUES (
  gen_random_uuid(),
  'matthewbravo13@gmail.com',
  'Matthew Bravo',
  '{"aboutMe": "cmo of antimatter", "objectives": ""}'::jsonb
);
```

**Option 2: Check Logs**
In browser console, check what email the API actually receives.

## Next Steps:

1. Verify Supabase project URL
2. Check if NextAuth creates Supabase users
3. May need to sync NextAuth signups with Supabase

