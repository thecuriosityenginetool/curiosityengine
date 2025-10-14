# 🚨 Fix Outlook Connection - Action Plan

Based on your logs, OAuth flow starts but tokens aren't saving. Here's the exact fix:

## 🎯 Root Cause Analysis

From your console logs:
```
redirect_uri=https%3A%2F%2Fwww.curiosityengine.io%2Fapi%2Foutlook%2Fuser-callback
Navigated to https://www.curiosityengine.io/dashboard?success=Outlook%20connected%20successfully
```

The redirect shows **success** but then:
```
🔍 Outlook connection check: {connected: false, message: 'Outlook not connected'}
```

## 🔍 Most Likely Issues (In Order)

### 1. Azure AD Redirect URI Not Configured (90% Likely)
### 2. RLS Policy Blocking Token Save (8% Likely)  
### 3. Environment Variable Mismatch (2% Likely)

---

## ✅ Fix #1: Azure AD Configuration (DO THIS FIRST)

### Step 1: Verify Azure AD Redirect URI

1. Go to: https://portal.azure.com
2. Navigate to: **Azure Active Directory** → **App registrations**
3. Find your app: **Sales Curiosity** (or whatever you named it)
4. Click on **Authentication** in left menu

### Step 2: Check Redirect URIs

You MUST have **BOTH** of these URIs configured:

```
https://www.curiosityengine.io/api/auth/callback/azure-ad
https://www.curiosityengine.io/api/outlook/user-callback
```

**Common Mistakes:**
- ❌ Using `http://` instead of `https://`
- ❌ Adding a trailing slash `/`
- ❌ Typo in path (e.g., `user-callbacks` with an 's')
- ❌ Only having the first one, not the second

### Step 3: Verify API Permissions

In the same Azure app, go to **API Permissions**. You need:

**Microsoft Graph** permissions:
- ✅ `openid` (Type: Delegated)
- ✅ `offline_access` (Type: Delegated) ← **CRITICAL**
- ✅ `Mail.Send` (Type: Delegated)
- ✅ `Mail.ReadWrite` (Type: Delegated)
- ✅ `User.Read` (Type: Delegated)
- ✅ `Calendars.Read` (Type: Delegated)
- ✅ `Calendars.ReadWrite` (Type: Delegated)

If any are missing, click "Add a permission" → Microsoft Graph → Delegated permissions

**IMPORTANT:** After adding, click **"Grant admin consent"** button!

---

## ✅ Fix #2: Check Vercel Environment Variables

1. Go to: https://vercel.com/[your-team]/[your-project]/settings/environment-variables

2. Verify these are set correctly:

```bash
MICROSOFT_CLIENT_ID=<your-azure-app-id>
MICROSOFT_CLIENT_SECRET=<your-azure-client-secret-VALUE>
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=https://www.curiosityengine.io/api/outlook/user-callback
NEXT_PUBLIC_APP_URL=https://www.curiosityengine.io
NEXTAUTH_URL=https://www.curiosityengine.io
```

**Common Mistakes:**
- ❌ Using `http://` instead of `https://`
- ❌ Having extra spaces before/after values
- ❌ Using Client Secret **ID** instead of **VALUE**
- ❌ Not applying to all environments (Production, Preview, Development)

3. If you changed any values, **redeploy**:
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

---

## ✅ Fix #3: Check Vercel Logs (RIGHT NOW)

Since I added detailed logging, let's see what's actually happening:

1. Go to Vercel Dashboard → Your Project → **Logs**
2. Try connecting Outlook again
3. In logs, filter for: `outlook/user-callback`
4. Look for these messages:

**Success path:**
```
🔵 Outlook callback received
🔵 Parsed state: { userId: '...', organizationId: '...' }
🔵 Exchanging code for tokens...
✅ Tokens received: { hasAccessToken: true, hasRefreshToken: true, expiresIn: 3600 }
🔵 Existing integration: Not found
🔵 Creating new integration...
✅ Integration created successfully
✅ Outlook connection successful, redirecting to dashboard
```

**Error paths to watch for:**
- ❌ Missing code or state → Azure redirect URI problem
- ❌ Invalid userId or organizationId → State parsing problem
- ❌ Error fetching existing integration → Database/RLS problem
- ❌ Error inserting integration → RLS policy blocking

**Copy any errors you see and we'll fix them!**

---

## ✅ Fix #4: Check Database (If Logs Show Success)

If Vercel logs show ✅ Integration created successfully but dashboard still shows Not Connected:

1. Go to Supabase Dashboard → SQL Editor
2. Run this query (update the email):

```sql
-- Replace with your email
SELECT 
  u.id as user_id,
  u.email,
  u.organization_id,
  oi.id as integration_id,
  oi.is_enabled,
  oi.configuration ? u.id::text as user_has_tokens,
  oi.configuration->u.id::text ? 'access_token' as has_access_token,
  oi.created_at,
  oi.updated_at
FROM users u
LEFT JOIN organization_integrations oi 
  ON oi.organization_id = COALESCE(u.organization_id, u.id)
  AND oi.integration_type = 'outlook_user'
WHERE u.email = 'matt@antimatterai.com'  -- YOUR EMAIL HERE
;
```

**What to look for:**
- ✅ `integration_id` is NOT NULL → Integration record exists
- ✅ `is_enabled` is `true`
- ✅ `user_has_tokens` is `true` → Your user ID is in config
- ✅ `has_access_token` is `true` → Access token exists

If any are false, copy the results and we'll debug.

---

## 🚀 Quick Test

After fixing Azure AD config:

1. **Clear browser cache** or use **Incognito mode**
2. Go to https://www.curiosityengine.io/dashboard
3. Click **Integrations** tab
4. Click **Connect** on Outlook
5. Authorize Microsoft account
6. You should see "Outlook connected successfully" message
7. Check **Integrations** tab → Outlook should show "Connected"

---

## 📊 Expected Timeline

- Azure AD config change: **Immediate** (no wait)
- Vercel env var change: **~2-3 minutes** (redeploy time)
- Testing: **~1 minute**

Total: **5 minutes max**

---

## 🆘 If Still Not Working

Share these with me:

1. **Vercel logs** (screenshot or copy/paste) from `/api/outlook/user-callback`
2. **Database query results** from above
3. **Azure redirect URIs** (screenshot of the list)

We'll fix it immediately!

---

## 📝 Why This Happens

Microsoft OAuth is **extremely strict** about redirect URIs. If there's even a tiny mismatch:
- Wrong protocol (http vs https)
- Trailing slash
- Typo in path
- Different subdomain

Microsoft will **silently fail** and redirect with an error, but the error might not be visible in your browser.

The fact that you're getting redirected back with `?success=` means the **OAuth flow is completing**, but something is failing on the **token save** or **token retrieval** side.

That's why we need the Vercel logs - they'll tell us exactly where it's failing!

