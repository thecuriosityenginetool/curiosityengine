# Fix Tim's Signup Issue

## Problem:
- Tim tries to sign up with Tim@dspgen.ai
- NextAuth OAuth might be succeeding
- But no public.users record created
- Gets OAuth error

## Fixes Applied:

### 1. Database Fix (Done)
- Removed wrong email (hello@curiosityengine.io)
- Created record for tim@dspgen.ai
- Email matching is case-insensitive

### 2. Code Fix (Already deployed)
- NextAuth signIn callback auto-creates users
- Works for Google and Microsoft OAuth

## If Tim Still Can't Sign Up:

### Check OAuth Configuration:

**Google OAuth:**
- Client ID configured?
- Client secret set?
- Redirect URI: https://www.curiosityengine.io/api/auth/callback/google

**Microsoft OAuth:**
- Client ID configured?
- Client secret set?
- Tenant ID set?
- Redirect URI: https://www.curiosityengine.io/api/auth/callback/azure-ad

### What To Tell Tim:

1. **Try logging in again** (not signup - LOGIN)
2. **Use the same email** (tim@dspgen.ai or Tim@dspgen.ai)
3. **Choose Google OR Microsoft**
4. **If error: take screenshot** of exact error message
5. **Check browser console** for detailed error

### Next Steps:

If Tim still gets error after this:
1. Check Vercel environment variables
2. Verify OAuth app credentials
3. Check OAuth app redirect URIs match production URL
4. May need to re-create OAuth apps in Google/Microsoft console

