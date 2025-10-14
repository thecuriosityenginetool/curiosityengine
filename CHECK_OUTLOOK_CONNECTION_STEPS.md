# Debug Outlook Connection Issue

The OAuth flow redirects with success, but the connection check returns false. Here's how to diagnose:

## Step 1: Check Vercel Deployment Status

1. Go to your Vercel dashboard: https://vercel.com
2. Find your `curiosityengine` project
3. Check if the latest deployment (commit `86b25e5`) is live
   - Should show: "Fix Outlook OAuth callback - use maybeSingle()"
4. Wait for deployment to complete if still building

## Step 2: Check Vercel Server Logs

1. In Vercel dashboard, go to your project
2. Click on "Logs" tab (or Deployments → Latest → Logs)
3. Try connecting Outlook again
4. Filter logs for `/api/outlook/user-callback`
5. Look for these logs (from our fix):
   ```
   🔵 Outlook callback received
   🔵 Parsed state: { userId: '...', organizationId: '...' }
   🔵 Exchanging code for tokens...
   ✅ Tokens received
   🔵 Existing integration: Found/Not found
   ✅ Integration created/updated successfully
   ```

**If you see errors**, copy them and we'll fix them.

## Step 3: Check Database State

1. Go to your Supabase dashboard
2. Open SQL Editor
3. Run the diagnostic script: `DIAGNOSE_OUTLOOK_CONNECTION.sql`
4. Update the email at the top: `v_user_email TEXT := 'your-email@example.com';`
5. Check the output:
   - Does it find your user?
   - Does it find an integration record?
   - Does your user ID have tokens in the configuration?

## Step 4: Common Issues & Solutions

### Issue A: RLS Policy Blocking INSERT
**Symptom:** No integration record found in database
**Fix:** Update RLS policy to allow service role to insert

```sql
-- Check if service role can insert
CREATE POLICY "Service role can manage integrations" 
ON organization_integrations 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
```

### Issue B: User ID Mismatch
**Symptom:** Integration exists but different user ID in config
**Fix:** The state parameter has mismatched userId and organizationId

Check logs for:
```
🔵 Parsed state: { userId: '...', organizationId: '...' }
```

### Issue C: Microsoft OAuth Not Completing
**Symptom:** Callback never receives code
**Possible causes:**
- Redirect URI mismatch in Azure AD app
- User denied permissions
- Session expired

### Issue D: Token Exchange Failing
**Symptom:** Error in "Exchanging code for tokens"
**Possible causes:**
- Invalid Microsoft client credentials
- Redirect URI doesn't match Azure AD config

## Current State Analysis

From your console logs:
- ✅ Auth URL generated correctly
- ✅ Redirect to Microsoft successful
- ✅ Redirect back with success message
- ❌ Status check returns `{connected: false}`

This suggests **the tokens are being saved but not retrieved**, or **RLS is blocking the read**.

## Next: Get Server Logs

The most important step is **Step 2** - we need to see the server-side logs to know:
1. Did the callback receive the authorization code?
2. Did token exchange succeed?
3. Did database insert/update succeed?
4. Were there any RLS errors?

Once you check the Vercel logs and run the diagnostic SQL, share the results and we'll fix the exact issue!

