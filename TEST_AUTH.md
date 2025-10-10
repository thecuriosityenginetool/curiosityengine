# Auth Debugging Steps

## 🔍 Check These After Login

### 1. Open Browser Console (F12)
After logging in, you should see logs like:

```
🔍 Checking auth...
Session: EXISTS your@email.com
Fetching user role from API...
✅ User data received: {...}
✅ Authenticated! Role: member Type: individual
```

**What do you actually see?**

### 2. Check Supabase Session Manually

Open console and run:
```javascript
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_ANON_KEY'
);
const { data } = await supabase.auth.getSession();
console.log('Session:', data.session);
```

### 3. Check If User Exists

Run this SQL in Supabase:
```sql
SELECT * FROM auth.users WHERE email = 'your@email.com';
SELECT * FROM public.users WHERE email = 'your@email.com';
```

**Both should return 1 row each!**

---

## Quick Test Plan

1. **Clear everything:**
   ```sql
   DELETE FROM public.users;
   DELETE FROM public.organizations;
   DELETE FROM auth.users;
   ```

2. **Sign up fresh:**
   - Go to /signup
   - Individual account
   - test@example.com / password123 / Test User
   - Create account

3. **Login:**
   - test@example.com / password123
   - Watch console for logs

4. **What happens?**
   - Shows landing page? → Session not detected
   - Shows tabs? → ✅ Working!

---

Send me the console logs!

