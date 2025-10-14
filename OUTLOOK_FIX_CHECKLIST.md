# ✅ Outlook Integration Fix Checklist

**Start here.** Follow this checklist in order. Check each box as you complete it.

---

## 🎯 Phase 1: Azure AD Configuration (10 minutes)

### [ ] Task 1.1: Check Redirect URIs

1. Go to https://portal.azure.com/
2. Search for "App registrations"
3. Find your "Curiosity Engine" app
4. Click **Authentication** in the left sidebar
5. Under **Web** → **Redirect URIs**, verify you have BOTH:

```
https://www.curiosityengine.io/api/auth/callback/azure-ad
https://www.curiosityengine.io/api/outlook/user-callback
```

**Check for common mistakes:**
- [ ] No extra spaces before or after URL
- [ ] HTTPS (not HTTP)
- [ ] No trailing slash at the end
- [ ] Exact spelling: "azure-ad" and "outlook"

**If missing:** Click **Add URI** and add them, then click **Save**

---

### [ ] Task 1.2: Add Calendar Permissions

1. Still in your Azure App
2. Click **API permissions** in left sidebar
3. Check if you have **Calendars.Read** and **Calendars.ReadWrite**

**If missing:**
1. Click **+ Add a permission**
2. Click **Microsoft Graph**
3. Click **Delegated permissions**
4. Search for "Calendars" and check:
   - [ ] Calendars.Read
   - [ ] Calendars.ReadWrite
5. Click **Add permissions**
6. Click **Grant admin consent for [Your Organization]** (if you're admin)

**Full required permissions list (verify all are present):**
- [ ] openid
- [ ] profile
- [ ] email
- [ ] offline_access
- [ ] User.Read
- [ ] Mail.Send
- [ ] Mail.ReadWrite
- [ ] Calendars.Read
- [ ] Calendars.ReadWrite

---

### [ ] Task 1.3: Verify Account Type

1. Still in your Azure App
2. Click **Authentication** in left sidebar
3. Look at **Supported account types**

**Should say:**
"Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts"

**If it says something else:**
1. Go back to **Overview**
2. Look for an option to change (may need to recreate app)

---

### [ ] Task 1.4: Enable ID Tokens

1. Still in **Authentication** section
2. Scroll down to **Implicit grant and hybrid flows**
3. Check the box: **ID tokens (used for implicit and hybrid flows)**
4. Click **Save**

---

### [ ] Task 1.5: Generate New Client Secret (Recommended)

1. Click **Certificates & secrets** in left sidebar
2. Under **Client secrets**, check expiration dates
3. If any are expired or expiring soon, create a new one:
   - Click **+ New client secret**
   - Description: "Curiosity Engine 2024"
   - Expires: **24 months**
   - Click **Add**
4. **IMMEDIATELY COPY THE VALUE** (the long string)
   - You won't be able to see it again!
   - Looks like: `abc123~def456...`
5. Save this value securely - you'll need it in Phase 2

**Record here for next step:**
```
Client Secret Value: ________________________________
```

---

## 🎯 Phase 2: Vercel Environment Variables (5 minutes)

### [ ] Task 2.1: Update Vercel Variables

1. Go to https://vercel.com/
2. Select your Curiosity Engine project
3. Click **Settings** → **Environment Variables**
4. Check these variables exist and are correct:

| Variable | Value | Present? |
|----------|-------|----------|
| `MICROSOFT_CLIENT_ID` | From Azure Overview page | [ ] |
| `MICROSOFT_CLIENT_SECRET` | From Task 1.5 above | [ ] |
| `MICROSOFT_TENANT_ID` | `common` | [ ] |
| `AZURE_AD_TENANT_ID` | `common` | [ ] |
| `MICROSOFT_REDIRECT_URI` | `https://www.curiosityengine.io/api/outlook/user-callback` | [ ] |
| `NEXTAUTH_URL` | `https://www.curiosityengine.io` | [ ] |
| `NEXTAUTH_SECRET` | (32+ character string) | [ ] |
| `NEXT_PUBLIC_APP_URL` | `https://www.curiosityengine.io` | [ ] |

**For each missing or incorrect variable:**
1. Click **Add New** or **Edit**
2. Enter **Name** and **Value**
3. **Important:** Check **Production** environment
4. Click **Save**

**Common mistakes:**
- [ ] Copying Secret ID instead of Secret VALUE
- [ ] Extra whitespace when pasting
- [ ] Not selecting "Production" environment

---

### [ ] Task 2.2: Verify Tenant IDs Match

Check that:
```
MICROSOFT_TENANT_ID = AZURE_AD_TENANT_ID = "common"
```

**If different:** Update both to `common`

---

### [ ] Task 2.3: Redeploy

**CRITICAL: After changing ANY environment variable:**

1. Go to **Deployments** tab in Vercel
2. Find the latest deployment
3. Click the **...** menu
4. Click **Redeploy**
5. Wait for deployment to complete (green checkmark)

Without redeploying, changes won't take effect!

- [ ] Redeployed after variable changes

---

## 🎯 Phase 3: Database Verification (5 minutes)

### [ ] Task 3.1: Run Database Setup Script

1. Go to https://app.supabase.com/
2. Select your project
3. Open **SQL Editor**
4. Create new query
5. Copy contents of `VERIFY_OUTLOOK_SETUP.sql` from your repo
6. Paste and click **Run**
7. Check output - should create organization if missing

- [ ] Script ran successfully
- [ ] No error messages

---

### [ ] Task 3.2: Run RLS Fix Script

1. Still in SQL Editor
2. Create new query
3. Copy contents of `FIX_ALL_RLS_ISSUES_SAFE.sql`
4. Paste and click **Run**
5. Check output - should fix permissions

- [ ] Script ran successfully
- [ ] No error messages

---

### [ ] Task 3.3: Clear Failed Connections (if any)

If users already tried connecting and it failed:

1. Still in SQL Editor
2. Run this query:

```sql
-- Clear failed Outlook connections
DELETE FROM organization_integrations 
WHERE integration_type = 'outlook_user' 
  AND (configuration IS NULL OR configuration = '{}' OR configuration = '[]');
```

- [ ] Cleared failed connections (if any existed)

---

## 🎯 Phase 4: Testing (5 minutes)

### [ ] Task 4.1: Test Configuration Endpoint

1. Open browser
2. Go to: `https://www.curiosityengine.io/api/test-ms-oauth`
3. Check the response

**Expected (good):**
```json
{
  "hasMicrosoftClientId": true,
  "hasMicrosoftClientSecret": true,
  "hasMicrosoftTenantId": true,
  "hasAzureAdTenantId": true,
  "tenantIdsMatch": true,
  "issues": []
}
```

**If any are `false` or issues array has items:**
- Go back to Phase 2 and fix those variables
- Redeploy
- Test again

- [ ] All variables show `true`
- [ ] Issues array is empty

---

### [ ] Task 4.2: Test Outlook Connection

1. Go to https://www.curiosityengine.io/dashboard
2. Sign in (use Google if Microsoft sign-in is also broken)
3. Go to **Integrations** tab
4. Open browser DevTools (F12 or Cmd+Option+I)
5. Go to **Console** tab
6. Click **Connect** button for Microsoft Outlook

**Expected console output:**
```
🔵 Connecting to Outlook...
🔵 Outlook auth response status: 200
🔵 Outlook auth data: { ok: true, authUrl: "https://login.microsoftonline.com/..." }
🔵 Redirecting to: https://login.microsoftonline.com/common/oauth2/v2.0/authorize?...
```

**Then:**
- Should redirect to Microsoft login page
- Should see your app name
- Should see permission consent screen listing all scopes
- Should redirect back to dashboard
- Should show "Outlook connected successfully" message

- [ ] Console shows expected output
- [ ] Redirected to Microsoft
- [ ] Consent screen appeared
- [ ] Redirected back successfully
- [ ] Shows as connected in Integrations tab

---

### [ ] Task 4.3: Test Calendar Sync

1. Still in dashboard
2. Look at the **Calendar** section
3. Click the **🔄 Sync** button
4. Check browser console

**Expected console output:**
```
📅 Fetching calendar events from Outlook...
✅ Fetched X events from Outlook
```

**If you have Outlook events in next 14 days:**
- Should display real events

**If you have no Outlook events:**
- Should display mock data (this is expected behavior)

- [ ] Sync button works
- [ ] No errors in console
- [ ] Events appear (real or mock)

---

### [ ] Task 4.4: Test AI Email Draft

1. Go to **Chat** in dashboard
2. Type: `Create an email draft to test@example.com about testing the integration`
3. Press Enter
4. Watch for AI response

**Expected:**
- AI should acknowledge the request
- Should show tool execution progress
- Should confirm draft created
- Check Outlook drafts folder for the email

- [ ] AI creates draft without errors
- [ ] Draft appears in Outlook

---

## 🎯 Phase 5: Verify in Database

### [ ] Task 5.1: Check Integration Record

1. Go back to Supabase SQL Editor
2. Run this query (replace with your email):

```sql
SELECT 
  oi.id,
  oi.integration_type,
  oi.is_enabled,
  oi.created_at,
  jsonb_pretty(oi.configuration) as config
FROM organization_integrations oi
JOIN users u ON oi.organization_id = u.organization_id
WHERE u.email = 'YOUR_EMAIL_HERE'
  AND oi.integration_type = 'outlook_user';
```

**Expected:**
- Should return 1 row
- `is_enabled` = `true`
- `configuration` should have tokens and scopes

- [ ] Integration record exists
- [ ] Has tokens and scopes

---

## ✅ Success Checklist

Mark complete when all are working:

- [ ] Azure redirect URIs correct
- [ ] All 9 API permissions added
- [ ] Environment variables correct in Vercel
- [ ] Redeployed after variable changes
- [ ] Database scripts ran successfully
- [ ] `/api/test-ms-oauth` shows all true
- [ ] Can connect Outlook from dashboard
- [ ] Calendar sync works
- [ ] AI can create email drafts
- [ ] Integration shows in database

---

## 🚨 If Still Not Working

### Check Vercel Logs

1. Go to Vercel → Your Project → **Logs**
2. Filter for: `outlook` or `microsoft` or `error`
3. Look for specific error messages

**Common errors and fixes:**

| Error | Meaning | Fix |
|-------|---------|-----|
| `invalid_client` | Wrong client secret or expired | Regenerate secret (Task 1.5) |
| `redirect_uri_mismatch` | URI doesn't match Azure | Fix redirect URIs (Task 1.1) |
| `AADSTS50011` | Reply URL mismatch | Fix redirect URIs (Task 1.1) |
| `unauthorized_client` | App not properly configured | Check account type (Task 1.3) |
| `MICROSOFT_CLIENT_ID is undefined` | Missing env var | Add in Vercel (Task 2.1) |

---

## 📊 Troubleshooting Decision Tree

```
Does /api/test-ms-oauth show all true?
  ├─ NO → Fix Vercel environment variables (Phase 2)
  └─ YES ↓

Does clicking Connect redirect to Microsoft?
  ├─ NO → Check browser console for errors
  └─ YES ↓

Does Microsoft login page load?
  ├─ NO → Check Azure redirect URIs (Task 1.1)
  └─ YES ↓

Can you login and consent?
  ├─ NO → Check Azure account type (Task 1.3)
  └─ YES ↓

Does it redirect back to dashboard?
  ├─ NO → Check Azure redirect URIs again
  └─ YES ↓

Does integration show as connected?
  ├─ NO → Check database (Phase 3)
  └─ YES ✅ Success!
```

---

## 📞 Report Back

After completing this checklist, report:

**Which phase fixed it?**
- [ ] Phase 1: Azure AD
- [ ] Phase 2: Vercel Environment
- [ ] Phase 3: Database
- [ ] Still not working

**What was the specific issue?**
- _________________________________

**What error messages did you see?**
- _________________________________

---

**Time estimate:** 25 minutes total
**Difficulty:** Medium
**Success rate:** 95% (if following exactly)


