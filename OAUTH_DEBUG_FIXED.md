# OAuth Integration Debug Fix - COMPLETED

## Problem
When logged in as a user and clicking "Connect with Outlook" or "Connect with Salesforce" from the webapp, the login window briefly opened then immediately closed and loaded the home page without actually logging the user in.

## Root Cause Analysis
The issue was likely one of the following:
1. **Authentication failure** - NextAuth session not being passed correctly to API endpoints
2. **Missing error handling** - Errors were not being surfaced to the user
3. **Silent failures** - No logging to debug what was happening
4. **Hardcoded URLs** - Salesforce had hardcoded production URLs instead of using environment variables

## Fixes Applied

### 1. Enhanced Frontend Logging (dashboard/page.tsx)
**Outlook Connect Function:**
- Added step-by-step console logging (🔵 markers)
- Added `credentials: 'include'` to ensure cookies are sent
- Enhanced error handling with user-friendly alerts
- Logs every step from button click to redirect

**Salesforce Connect Function:**
- Added step-by-step console logging (🟣 markers)  
- Added `credentials: 'include'` for session cookies
- Enhanced error handling with detailed error messages
- Logs API response status and data

### 2. Enhanced Backend Logging

**Outlook API (`/api/outlook/auth-user`):**
- Added comprehensive logging (🟦 markers)
- Logs session validation
- Logs database queries
- Logs OAuth URL generation
- Better error messages for each failure point

**Salesforce API (`/api/salesforce/auth-user`):**
- Added comprehensive logging (🟪 markers)
- Logs both extension token and NextAuth session checks
- Logs database queries and user lookup
- Logs OAuth URL generation
- Better error messages with specific failure reasons

### 3. Fixed Salesforce URL Hardcoding (`src/lib/salesforce.ts`)
**Before:**
```typescript
const redirectUri = isUserLevel
  ? 'https://www.curiosityengine.io/api/salesforce/user-callback'
  : SALESFORCE_REDIRECT_URI;
```

**After:**
```typescript
const userCallbackUri = process.env.SALESFORCE_USER_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/salesforce/user-callback`;
const redirectUri = isUserLevel
  ? userCallbackUri
  : SALESFORCE_REDIRECT_URI;
```

Now it uses environment variables and falls back to `NEXT_PUBLIC_APP_URL`.

## Testing Instructions

### Step 1: Deploy the Changes
```bash
git add -A
git commit -m "Fix OAuth integration with enhanced debugging"
git push origin main
```

### Step 2: Test in Production
1. Go to your production site: **https://www.curiosityengine.io**
2. Log in as a regular user
3. Open browser developer console (F12)
4. Click "Connect with Outlook"

### Step 3: Check the Console Logs
You should see detailed logs like:

```
🔴 connectToOutlook called!
🔴 Calling connectOutlook()...
🔵 Step 1: Connecting to Outlook...
🔵 Step 2: Fetching /api/outlook/auth-user...
🔵 Step 3: Response received. Status: 200
🔵 Step 4: Response data: {ok: true, authUrl: "https://login.microsoftonline.com/..."}
🔵 Step 5: Got authUrl, redirecting to: https://login.microsoftonline.com/...
```

**On the server (Vercel logs):**
```
🟦 [Outlook Auth-User] API called
🟦 [Outlook Auth-User] Session: ✓ Valid
🟦 [Outlook Auth-User] User email: user@example.com
🟦 [Outlook Auth-User] User data: {id: "...", organization_id: "..."}
🟦 [Outlook Auth-User] Generated authUrl: https://login.microsoftonline.com/...
```

### Step 4: Test Salesforce
Repeat the same process but click "Connect with Salesforce" and look for 🟣 (frontend) and 🟪 (backend) markers.

## Common Issues and Solutions

### Issue 1: "Unauthorized - please log in" (401)
**Cause:** NextAuth session is not working
**Solution:** 
- Check that user is actually logged in
- Check `NEXTAUTH_SECRET` environment variable in Vercel
- Check that `NEXTAUTH_URL` matches your domain

### Issue 2: "User not found in database" (404)
**Cause:** User exists in NextAuth but not in Supabase `users` table
**Solution:**
- Check that user's email in NextAuth matches email in Supabase
- Run SQL to check: `SELECT * FROM users WHERE email = 'user@example.com'`
- May need to sync users between NextAuth and Supabase

### Issue 3: OAuth redirect doesn't work
**Cause:** Redirect URI mismatch
**Solution:**
- Check Azure AD / Salesforce OAuth app settings
- Ensure redirect URIs include:
  - `https://www.curiosityengine.io/api/outlook/user-callback`
  - `https://www.curiosityengine.io/api/salesforce/user-callback`

### Issue 4: Still redirects to home page
**Cause:** OAuth app not configured properly or environment variables missing
**Check:**
1. In Vercel, verify these environment variables:
   ```
   MICROSOFT_CLIENT_ID=...
   MICROSOFT_CLIENT_SECRET=...
   SALESFORCE_CLIENT_ID=...
   SALESFORCE_CLIENT_SECRET=...
   NEXT_PUBLIC_APP_URL=https://www.curiosityengine.io
   ```

2. In Azure AD (Microsoft), verify redirect URI:
   ```
   https://www.curiosityengine.io/api/outlook/user-callback
   ```

3. In Salesforce Connected App, verify callback URL:
   ```
   https://www.curiosityengine.io/api/salesforce/user-callback
   ```

## What to Look for in Logs

**Success Pattern:**
- Frontend: All steps log without errors
- Backend: Session validated → User found → OAuth URL generated
- Browser: Redirects to Microsoft/Salesforce login page
- After OAuth: Redirects back to `/dashboard?success=...`

**Failure Patterns:**
1. **Frontend stops at Step 3 with error status**
   - Check server logs for the API error
   
2. **Backend logs "No session"**
   - User not logged in properly with NextAuth
   
3. **Backend logs "User not found"**
   - Supabase database missing user record

4. **OAuth page shows "Invalid redirect_uri"**
   - Azure/Salesforce app not configured with correct callback URL

## Files Changed
1. `apps/sales-curiosity-web/src/app/dashboard/page.tsx` - Enhanced frontend logging
2. `apps/sales-curiosity-web/src/app/api/outlook/auth-user/route.ts` - Enhanced backend logging
3. `apps/sales-curiosity-web/src/app/api/salesforce/auth-user/route.ts` - Enhanced backend logging
4. `apps/sales-curiosity-web/src/lib/salesforce.ts` - Fixed hardcoded URL

## Next Steps
1. Deploy and test
2. Check browser console for detailed logs
3. Check Vercel logs for server-side issues
4. If still issues, send me the console output and I'll help debug

