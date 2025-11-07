# Integration Connection Debug Guide

## 🔍 Comprehensive Logging Added

All OAuth flows now have detailed logging to diagnose connection issues.

---

## 📊 What's Being Logged

### Gmail OAuth Flow

**Token Exchange (`/lib/gmail.ts`):**
```
🟩 [Gmail] Starting token exchange...
🟩 [Gmail] Config check: { hasClientId, hasClientSecret, hasRedirectUri, redirectUri }
🟩 [Gmail] Making token request to Google...
🟩 [Gmail] Token response status: 200
✅ [Gmail] Tokens received successfully: { hasAccessToken, hasRefreshToken, expiresIn, scope }
```

**User Token Retrieval:**
```
🟩 [Gmail] Getting user tokens: { userId, organizationId }
🟩 [Gmail] Token check result: { hasConfig, hasUserTokens, configKeys }
```

**Gmail Callback (`/api/gmail/user-callback`):**
```
🟩 [Gmail Callback] Starting callback handler
🟩 [Gmail Callback] Params: { hasCode, codeLength, state }
🟩 [Gmail Callback] Parsed state: { userId, organizationId }
🟩 [Gmail Callback] Exchanging code for tokens...
🟩 [Gmail Callback] Tokens received: { hasAccessToken, hasRefreshToken, expiresIn }
🟩 [Gmail Callback] Checking for existing integration...
🟩 [Gmail Callback] Existing integration: { found, error }
🟩 [Gmail Callback] Creating new integration... (or Updating existing)
✅ [Gmail Callback] Integration created/updated successfully
🟩 [Gmail Callback] Logging activity...
✅ [Gmail Callback] Activity logged
```

### Outlook OAuth Flow

**Outlook Auth (`/api/outlook/auth-user`):**
```
🟦 [Outlook Auth-User] API called
🟦 [Outlook Auth-User] Session: ✓ Valid
🟦 [Outlook Auth-User] User email: user@example.com
🟦 [Outlook Auth-User] User data: { id, organization_id }
🟦 [Outlook Auth-User] Generated state: userId:orgId
🟦 [Outlook Auth-User] Generated authUrl: https://...
```

### Salesforce OAuth Flow

Similar pattern with `🔴 [Salesforce]` prefix.

### Dashboard Connection Checks

**New Comprehensive Status (`/api/integrations/status`):**
```
🔍 [Integration Status] API called
🔍 [Integration Status] Checking for user: email
🔍 [Integration Status] User info: { userId, organizationId, role }
🔍 [Integration Status] Found integrations: ['gmail_user', 'outlook', 'salesforce_user']
✅ [Integration Status] Status: { gmail: {...}, outlook: {...}, salesforce: {...} }
```

**Dashboard Connection Flow:**
```
🔍 [Dashboard] Checking all integrations...
✅ [Dashboard] Integration status received: {...}
🔍 [Dashboard] Gmail: { connected, enabled, hasTokens }
🔍 [Dashboard] Outlook: { connected, enabled, hasTokens }
🔍 [Dashboard] Salesforce: { connected, enabled, hasTokens }
🔍 [Dashboard] Email provider: google|microsoft|null
```

**Connect Button Click:**
```
🟩 [Connect Google] Step 1: Starting connection flow...
🟩 [Connect Google] Step 2: Fetching /api/gmail/auth-user...
🟩 [Connect Google] Step 3: Response received. Status: 200
🟩 [Connect Google] Step 4: Response data: {...}
🟩 [Connect Google] Step 5: Got authUrl, redirecting...
🟩 [Connect Google] Step 6: Setting window.location.href...
```

---

## 🎯 How to Debug Connection Issues

### 1. Check Browser Console

When you click **Connect** on Google Workspace, you should see:

**Success Path:**
1. `🟩 [Connect Google] Step 1-7` (all green checkmarks)
2. Browser redirects to Google
3. After granting permissions, redirects back
4. URL shows `?success=Google Workspace connected...`
5. `🟩 [Gmail Callback]` logs appear
6. `✅ [Gmail Callback] Integration created successfully`

**Failure Path - Look For:**
- `❌ [Connect Google]` - Check what step failed
- `❌ [Gmail] Config check` - Missing environment variables
- `❌ [Gmail] Token exchange failed` - Google API error
- `❌ [Gmail Callback] Insert error` - Database issue

### 2. Check Vercel Function Logs

1. Go to Vercel → Your Project → **Deployments**
2. Click on latest deployment → **Functions** tab
3. Look for logs with `🟩 [Gmail Callback]` prefix
4. Check for errors during token exchange

### 3. Check Database

```sql
-- See all integrations
SELECT integration_type, is_enabled, configuration, updated_at
FROM organization_integrations
WHERE organization_id = (
  SELECT COALESCE(organization_id, id)
  FROM users 
  WHERE email = 'matthewbravo13@gmail.com'
);

-- Check if gmail_user exists with tokens
SELECT 
  integration_type,
  is_enabled,
  configuration->(SELECT id::text FROM users WHERE email = 'matthewbravo13@gmail.com') as user_tokens
FROM organization_integrations
WHERE integration_type = 'gmail_user';
```

---

## 🚨 Common Issues & Solutions

### Issue: "No authUrl in response"
**Cause:** `/api/gmail/auth-user` endpoint erroring
**Check Logs For:** `❌ [Gmail Auth-User]` messages
**Solution:** Check environment variables in Vercel

### Issue: Connection succeeds but status shows disconnected  
**Cause:** Tokens not saved to database
**Check Logs For:** `❌ [Gmail Callback] Insert error`
**Solution:** Check organization_id is valid

### Issue: "Gmail token exchange failed"
**Cause:** Missing/wrong GOOGLE_CLIENT_SECRET
**Check Logs For:** `❌ [Gmail] Token exchange failed: {error from Google}`
**Solution:** Verify GOOGLE_CLIENT_SECRET in Vercel matches Google Cloud Console

### Issue: Connection button doesn't redirect
**Cause:** JavaScript error or API timeout
**Check Logs For:** `❌ [Connect Google] Fatal exception`
**Solution:** Check browser console for errors

---

## 📋 Required Environment Variables Checklist

Make sure ALL of these are in Vercel:

### Supabase (Required for Build):
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

### Google OAuth:
- ✅ `GOOGLE_CLIENT_ID`
- ✅ `GOOGLE_CLIENT_SECRET`
- ✅ `GOOGLE_REDIRECT_URI=https://www.curiosityengine.io/api/gmail/user-callback`

### Microsoft OAuth:
- ✅ `MICROSOFT_CLIENT_ID`
- ✅ `MICROSOFT_CLIENT_SECRET`
- ✅ `MICROSOFT_REDIRECT_URI`
- ✅ `AZURE_AD_TENANT_ID=common`

### Salesforce OAuth:
- ✅ `SALESFORCE_CLIENT_ID`
- ✅ `SALESFORCE_CLIENT_SECRET`
- ✅ `SALESFORCE_REDIRECT_URI`

### General:
- ✅ `NEXTAUTH_URL=https://www.curiosityengine.io`
- ✅ `NEXTAUTH_SECRET`
- ✅ `NEXT_PUBLIC_APP_URL=https://www.curiosityengine.io`

---

## 🧪 Testing Steps

### Test 1: Check Current Status
1. Open dashboard
2. Open browser console
3. Look for: `✅ [Dashboard] Integration status received`
4. Should show status of all 3 integrations

### Test 2: Connect Google Workspace
1. Go to Connectors tab
2. Click **Connect** on Google Workspace
3. Watch console for `🟩 [Connect Google] Step 1-7`
4. Grant permissions on Google
5. Watch for `🟩 [Gmail Callback]` logs
6. Verify success redirect

### Test 3: Verify Connection Saved
1. Refresh page
2. Check console: `🔍 [Dashboard] Gmail: { connected: true, ... }`
3. Google Workspace card should show "✓ Connected"
4. Outlook card should be greyed out

### Test 4: Test Calendar Sync
1. Click calendar icon
2. Click Sync button
3. Should fetch Google Calendar events
4. Check console for: `📅 Fetching calendar events from Google Calendar...`

### Test 5: Test AI Tools
Try prompt: "Create an email draft to test@example.com"
Check console for: `create_gmail_draft` tool execution

---

## 📝 All Logging Prefixes

- `🟩 [Gmail]` - Gmail library functions
- `🟩 [Gmail Callback]` - OAuth callback processing
- `🟩 [Gmail Auth-User]` - Auth initiation
- `🟦 [Outlook]` - Outlook library functions  
- `🟦 [Outlook Auth-User]` - Outlook auth initiation
- `🔴 [Salesforce]` - Salesforce operations
- `🔍 [Integration Status]` - Comprehensive status check
- `🔍 [Dashboard]` - Dashboard connection checks
- `🟩 [Connect Google]` - Google connection flow

All errors start with `❌`
All success messages start with `✅`
All warnings start with `⚠️`

---

**With this logging, you can track exactly where the OAuth flow succeeds or fails!**

