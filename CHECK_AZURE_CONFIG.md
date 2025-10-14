# 🔍 Azure AD Configuration Checker

## Quick Visual Checklist

Use this to verify your Azure AD app is configured correctly. Open Azure Portal side-by-side with this doc.

---

## ✅ Section 1: Overview

**Go to:** Azure Portal → App registrations → Your App → **Overview**

Check these values:

```
Application (client) ID:  ______-____-____-____-____________
(Copy this - you need it as MICROSOFT_CLIENT_ID)

Display name: Curiosity Engine (or your app name)

Supported account types: 
  ☑ Accounts in any organizational directory 
      (Any Azure AD directory - Multitenant) 
      and personal Microsoft accounts
```

**❌ If it says "Single tenant" → You must change this**

---

## ✅ Section 2: Authentication

**Go to:** Azure Portal → Your App → **Authentication**

### Redirect URIs (Web)

**Must have EXACTLY these two:**

```
✓ https://www.curiosityengine.io/api/auth/callback/azure-ad
✓ https://www.curiosityengine.io/api/outlook/user-callback
```

**Common mistakes to check:**
- [ ] No extra spaces before or after
- [ ] HTTPS (not http)
- [ ] No trailing slash (/)
- [ ] Correct spelling: "azure-ad" not "azuread"
- [ ] Correct spelling: "outlook" not "microsoft"

### Implicit grant and hybrid flows

**Must have this checked:**

```
☑ ID tokens (used for implicit and hybrid flows)
```

### Advanced settings

**Should show:**
```
Allow public client flows: No (default is fine)
```

---

## ✅ Section 3: Certificates & secrets

**Go to:** Azure Portal → Your App → **Certificates & secrets**

### Client secrets

**Should have at least one active secret:**

| Description | Expires | Status |
|-------------|---------|--------|
| Curiosity Engine | (future date) | ✓ Active |

**Check:**
- [ ] Secret is not expired
- [ ] You have the SECRET VALUE saved (not the Secret ID)
- [ ] If expired or lost, generate new one

**To generate new secret:**
1. Click **+ New client secret**
2. Description: "Curiosity Engine 2024"
3. Expires: **24 months**
4. Click **Add**
5. **Copy the VALUE immediately** (looks like: `abc123~def456...`)

---

## ✅ Section 4: API Permissions

**Go to:** Azure Portal → Your App → **API permissions**

### Required Microsoft Graph Delegated Permissions

**Must have ALL of these 9 permissions:**

```
✓ Calendars.Read
✓ Calendars.ReadWrite  
✓ email
✓ Mail.ReadWrite
✓ Mail.Send
✓ offline_access
✓ openid
✓ profile
✓ User.Read
```

**Status column should show:**
```
✓ Granted for [Your Organization]
```

**If any are missing:**
1. Click **+ Add a permission**
2. Click **Microsoft Graph**
3. Click **Delegated permissions**
4. Search for the missing permission
5. Check the box
6. Click **Add permissions**
7. Click **Grant admin consent for [Your Organization]**

**If you're not an admin:**
- Users will see consent screen on first login (that's OK)
- Make sure "User consent" is not blocked

---

## ✅ Section 5: Expose an API

**Go to:** Azure Portal → Your App → **Expose an API**

**Can be empty - not required for this integration**

```
Application ID URI: (optional - can be blank)
```

---

## ✅ Section 6: Token configuration

**Go to:** Azure Portal → Your App → **Token configuration**

**Should have these optional claims (if you set them up):**

```
ID token:
  - email
  - name
  - preferred_username
```

**If empty → It's OK, not critical**

---

## 🎯 Quick Validation

After checking all sections above, verify:

### Minimum Required:
- [ ] 2 redirect URIs (exact match)
- [ ] ID tokens enabled
- [ ] 9 Microsoft Graph permissions
- [ ] Active client secret (not expired)
- [ ] Multi-tenant account type

### Copy These Values:

**For Vercel Environment Variables:**

```bash
# From Overview section:
MICROSOFT_CLIENT_ID=<Application (client) ID>

# From Certificates & secrets:
MICROSOFT_CLIENT_SECRET=<Secret VALUE you copied>

# Always use these:
MICROSOFT_TENANT_ID=common
AZURE_AD_TENANT_ID=common

# For Outlook integration:
MICROSOFT_REDIRECT_URI=https://www.curiosityengine.io/api/outlook/user-callback

# Base URL:
NEXTAUTH_URL=https://www.curiosityengine.io
NEXT_PUBLIC_APP_URL=https://www.curiosityengine.io
```

---

## 🚨 Common Misconfigurations

### Issue: Redirect URI Mismatch

**Symptoms:**
- Error: `AADSTS50011: The reply URL specified in the request does not match`
- User redirected to Microsoft but immediately bounced back

**Fix:**
- Copy the exact URL from error message
- Add it EXACTLY to Authentication → Redirect URIs
- No extra spaces, no trailing slash

---

### Issue: Missing Calendar Permissions

**Symptoms:**
- Connection works
- Calendar sync shows mock data instead of real events
- Console shows "permission denied" for calendar

**Fix:**
- Add `Calendars.Read` and `Calendars.ReadWrite` in API permissions
- Grant admin consent
- Disconnect and reconnect Outlook from dashboard

---

### Issue: Expired Client Secret

**Symptoms:**
- Error: `invalid_client`
- Error: `AADSTS7000215: Invalid client secret`

**Fix:**
- Generate new client secret
- Update `MICROSOFT_CLIENT_SECRET` in Vercel
- Redeploy

---

### Issue: Single Tenant Restriction

**Symptoms:**
- Works for some users, not others
- Error: `AADSTS50020: User account from identity provider does not exist`

**Fix:**
- Change "Supported account types" to multi-tenant
- You may need to recreate the app if this option is locked

---

## 📸 Screenshot Verification

Take screenshots of these 4 sections and compare:

1. **Authentication → Redirect URIs**
   - Should show 2 URIs for curiosityengine.io

2. **Authentication → Implicit grant**
   - ID tokens should be checked

3. **API permissions**
   - Should show 9 Microsoft Graph permissions
   - All should be granted

4. **Certificates & secrets**
   - Should show at least 1 active secret
   - Check expiration date

---

## ✅ Final Validation Test

After fixing any issues, test this URL:

```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=https://www.curiosityengine.io/api/outlook/user-callback&scope=openid%20offline_access%20Mail.Send%20Mail.ReadWrite%20User.Read%20Calendars.Read%20Calendars.ReadWrite
```

**Replace `YOUR_CLIENT_ID` with your actual client ID**

**Expected behavior:**
- Should show Microsoft login page
- Should show your app name
- Should list all permissions

**If you get an error:**
- Read the error code
- Check the corresponding section above

---

## 🔄 After Making Changes

**Remember:**
1. Click **Save** in Azure after every change
2. Update environment variables in Vercel
3. **Redeploy** in Vercel
4. Clear browser cache or use incognito mode to test
5. Check Vercel logs for any errors

---

**Use this checklist every time you troubleshoot Outlook integration issues.**


