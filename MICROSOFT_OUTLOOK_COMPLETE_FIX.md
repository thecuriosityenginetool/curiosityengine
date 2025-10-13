# Microsoft OAuth & Outlook Calendar - Complete Fix Guide

## 🎯 Current Status

**Google Sign-In:** ✅ Working  
**Microsoft Sign-In:** ❌ CallbackRouteError (invalid_grant or token exchange failure)  
**Salesforce:** ✅ Connected  
**Outlook Calendar:** ❌ Not connected (returns dummy data)

---

## 📋 Step-by-Step Fix Process

### Step 1: Verify & Fix Database Setup

Run this in Supabase SQL Editor:
```sql
-- Run VERIFY_OUTLOOK_SETUP.sql
```

This will:
- Check if `organization_integrations` table exists
- Verify user has an organization
- Create organization if missing
- Show current integration status

### Step 2: Fix Microsoft Azure App Configuration

#### A. Redirect URIs
Go to Azure Portal → Your App → Authentication → Web

Add these EXACT URIs:
```
https://www.curiosityengine.io/api/auth/callback/azure-ad
https://www.curiosityengine.io/api/outlook/user-callback
```

#### B. Implicit Grant
Go to Azure Portal → Your App → Authentication → Implicit grant and hybrid flows

✅ Check: **"ID tokens (used for implicit and hybrid flows)"**

#### C. API Permissions
Go to Azure Portal → Your App → API permissions

Ensure you have:
- `openid`
- `email`
- `profile`
- `offline_access`
- `Mail.Send`
- `Mail.ReadWrite`
- `Calendars.Read`
- `Calendars.ReadWrite`
- `User.Read`

#### D. Supported Account Types
Go to Azure Portal → Your App → Authentication

Set to: **"Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts"**

### Step 3: Verify Environment Variables in Vercel

Go to Vercel → Settings → Environment Variables

**Required Variables:**
```
NEXTAUTH_URL=https://www.curiosityengine.io
NEXTAUTH_SECRET=[32+ character secret]
MICROSOFT_CLIENT_ID=[Azure App Client ID]
MICROSOFT_CLIENT_SECRET=[Azure App Client Secret VALUE]
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=https://www.curiosityengine.io/api/outlook/user-callback
AZURE_AD_TENANT_ID=common
NEXT_PUBLIC_APP_URL=https://www.curiosityengine.io
```

**Important:**
- `MICROSOFT_TENANT_ID` and `AZURE_AD_TENANT_ID` MUST match
- Client secret is the VALUE, not the Secret ID
- Redeploy after adding/changing any variable

### Step 4: Test Microsoft Sign-In

1. Clear browser cookies for curiosityengine.io
2. Go to https://www.curiosityengine.io/login
3. Click "Sign in with Microsoft"
4. Check Vercel logs for detailed error
5. Look for: `NextAuth Error Cause Details:`

**Expected Errors & Fixes:**
- `invalid_client` → Wrong client secret or expired
- `invalid_grant` → Authorization code expired or redirect URI mismatch
- `unauthorized_client` → App not approved or wrong account type setting
- `access_denied` → User denied or tenant admin needs to approve

### Step 5: Test Outlook Integration (Independent of Sign-In)

1. **Sign in with Google** (this works!)
2. Go to Dashboard → Integrations tab
3. Click **"Connect" for Outlook**
4. Watch browser console for:
   ```
   🔵 Connecting to Outlook...
   🔵 Outlook auth response status: 200
   🔵 Redirecting to: https://login.microsoftonline.com/...
   ```
5. Grant calendar permissions
6. Should redirect back to dashboard with Outlook connected

### Step 6: Verify Calendar Sync

After connecting Outlook:
1. Go to Dashboard
2. Click "Sync" button in calendar section
3. Open browser console and run:
   ```javascript
   fetch('/api/calendar').then(r => r.json()).then(console.log)
   ```
4. Should see real Outlook events, not 3 dummy events

---

## 🔧 Troubleshooting

### Microsoft Sign-In Still Failing

**Option A: Generate New Client Secret**
1. Azure Portal → Your App → Certificates & secrets
2. Create new client secret
3. Copy the VALUE immediately
4. Update `MICROSOFT_CLIENT_SECRET` in Vercel
5. Redeploy

**Option B: Try Different Tenant ID**
If you have a specific Azure AD tenant:
1. Get your Tenant ID from Azure Portal → Azure Active Directory → Overview
2. Update both `MICROSOFT_TENANT_ID` and `AZURE_AD_TENANT_ID` to your tenant GUID
3. Update in Azure App → Authentication → Supported account types to "Single tenant"
4. Redeploy

### Outlook Connection Not Redirecting

Check browser console for error messages. Common issues:
- API endpoint returning 401 → Session expired, sign in again
- API endpoint returning 500 → Check Vercel function logs
- No redirect happening → Check if `authUrl` is in API response

### Calendar Still Showing Dummy Data

1. Run in Supabase:
   ```sql
   -- Check if Outlook is connected
   SELECT * FROM organization_integrations 
   WHERE integration_type = 'outlook_user' 
   AND is_enabled = true;
   ```
2. If no results, Outlook isn't connected - reconnect from dashboard
3. If results exist, check `configuration` field has tokens
4. Test `/api/calendar` endpoint directly in browser console

---

## 📊 Diagnostic Endpoints

Test these URLs to verify configuration:
- `/api/test-ms-oauth` - Check all Microsoft env vars
- `/api/test-ms-token` - Check well-known endpoint
- `/api/debug-oauth` - Get common error explanations

---

## ✅ Success Criteria

- [ ] Microsoft sign-in works without errors
- [ ] Outlook connect button redirects to Microsoft OAuth
- [ ] Calendar shows real Outlook events (not 3 dummy events)
- [ ] Sync button refreshes calendar with latest events
- [ ] Email draft generation works through AI chat
- [ ] Both Microsoft login AND Outlook integration work independently

---

## 🚀 Priority Actions

1. **Run VERIFY_OUTLOOK_SETUP.sql in Supabase** (fixes database)
2. **Verify Azure redirect URIs** (most common issue)
3. **Generate new Azure client secret** (if current one is invalid)
4. **Test Outlook connection while signed in with Google** (proves integration works)
5. **Then debug Microsoft sign-in separately** (can work on this after Outlook works)

---

## 📝 Notes

- Google sign-in and Outlook integration are **completely separate**
- You can use Google to log in and still get Outlook calendar/email
- Microsoft sign-in is for authentication only
- Outlook integration is for calendar/email data
- Both should work independently once configured correctly

