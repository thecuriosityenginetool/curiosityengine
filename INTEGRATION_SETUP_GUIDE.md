# 🚀 Multi-Platform Integration Setup Guide

This guide walks you through setting up **HubSpot**, **Gmail**, **Outlook**, and **Monday.com** integrations for Sales Curiosity Engine.

---

## 📋 Overview

You now have complete integration infrastructure for:
- ✅ **Salesforce CRM** (already configured)
- ✅ **HubSpot CRM** (ready to configure)
- ✅ **Gmail** (ready to configure)
- ✅ **Outlook** (ready to configure)
- ✅ **Monday.com** (ready to configure)

All code is implemented. You just need to add API credentials!

---

## 🗄️ Step 1: Update Database Schema

Run this SQL in your Supabase SQL Editor:

```sql
-- File: supabase-add-all-integrations.sql
-- This adds support for all new integration types

ALTER TABLE organization_integrations DROP CONSTRAINT IF EXISTS organization_integrations_integration_type_check;

ALTER TABLE organization_integrations ADD CONSTRAINT organization_integrations_integration_type_check 
  CHECK (integration_type IN (
    'salesforce', 
    'salesforce_user', 
    'hubspot', 
    'hubspot_user', 
    'gmail', 
    'gmail_user', 
    'outlook', 
    'outlook_user', 
    'monday', 
    'monday_user',
    'calendar',
    'slack',
    'teams'
  ));
```

---

## 🔧 Step 2: Set Up Each Integration

### HubSpot CRM

**1. Create HubSpot App:**
- Go to [HubSpot Developers](https://developers.hubspot.com/)
- Click "Create app"
- Fill in basic info (name, description)

**2. Configure OAuth:**
- In "Auth" tab, add redirect URL:
  ```
  https://www.curiosityengine.io/api/hubspot/user-callback
  ```
- Required scopes:
  - `crm.objects.contacts.read`
  - `crm.objects.contacts.write`
  - `crm.objects.companies.read`

**3. Get Credentials:**
- Copy "Client ID" and "Client Secret"

**4. Add to Environment Variables:**
```bash
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
HUBSPOT_REDIRECT_URI=https://www.curiosityengine.io/api/hubspot/user-callback
```

---

### Gmail (Google)

**1. Create Google Cloud Project:**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select existing
- Name it "Sales Curiosity Engine"

**2. Enable Gmail API:**
- In sidebar, go to "APIs & Services" → "Library"
- Search for "Gmail API"
- Click "Enable"

**3. Create OAuth Credentials:**
- Go to "APIs & Services" → "Credentials"
- Click "Create Credentials" → "OAuth client ID"
- Application type: "Web application"
- Name: "Sales Curiosity Gmail"
- Add authorized redirect URI:
  ```
  https://www.curiosityengine.io/api/gmail/user-callback
  ```

**4. Configure OAuth Consent Screen:**
- Go to "OAuth consent screen"
- User Type: "External"
- Add scopes:
  - `https://www.googleapis.com/auth/gmail.compose`
  - `https://www.googleapis.com/auth/gmail.send`
  - `https://www.googleapis.com/auth/userinfo.email`

**5. Get Credentials:**
- Copy "Client ID" and "Client secret"

**6. Add to Environment Variables:**
```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://www.curiosityengine.io/api/gmail/user-callback
```

---

### Outlook (Microsoft)

**1. Register Azure AD App:**
- Go to [Azure Portal](https://portal.azure.com/)
- Navigate to "Azure Active Directory" → "App registrations"
- Click "New registration"
- Name: "Sales Curiosity Outlook"
- Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"

**2. Add Redirect URI:**
- In "Authentication" → "Platform configurations"
- Add "Web" platform
- Redirect URI:
  ```
  https://www.curiosityengine.io/api/outlook/user-callback
  ```

**3. Create Client Secret:**
- Go to "Certificates & secrets"
- Click "New client secret"
- Description: "Sales Curiosity"
- Copy the secret value (you won't be able to see it again!)

**4. Add API Permissions:**
- Go to "API permissions"
- Click "Add a permission" → "Microsoft Graph"
- Add these **Delegated permissions**:
  - `Mail.Send`
  - `Mail.ReadWrite`
  - `User.Read`
  - `offline_access`
  - `openid`
- Click "Grant admin consent" (if you have admin access)

**5. Get Credentials:**
- Application (client) ID is on the Overview page
- Client secret is what you created above
- Directory (tenant) ID is on Overview (use "common" for multi-tenant)

**6. Add to Environment Variables:**
```bash
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_REDIRECT_URI=https://www.curiosityengine.io/api/outlook/user-callback
MICROSOFT_TENANT_ID=common
```

---

### Monday.com

**1. Create Monday.com App:**
- Go to [Monday.com Developers](https://monday.com/developers/)
- Click "Create app"
- Fill in basic information

**2. Configure OAuth:**
- In "OAuth" section
- Add redirect URL:
  ```
  https://www.curiosityengine.io/api/monday/user-callback
  ```
- Required scopes:
  - `boards:read`
  - `boards:write`

**3. Get Credentials:**
- Copy "Client ID" and "Client Secret"

**4. Add to Environment Variables:**
```bash
MONDAY_CLIENT_ID=your_client_id
MONDAY_CLIENT_SECRET=your_client_secret
MONDAY_REDIRECT_URI=https://www.curiosityengine.io/api/monday/user-callback
```

---

## 🌐 Step 3: Add Environment Variables to Vercel

**Method 1: Vercel Dashboard**
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add each variable listed above
4. Set environment: Production (and Preview if needed)

**Method 2: Vercel CLI**
```bash
vercel env add HUBSPOT_CLIENT_ID
vercel env add HUBSPOT_CLIENT_SECRET
# ... repeat for all variables
```

---

## 🚀 Step 4: Deploy

```bash
# Commit changes
git add .
git commit -m "Add multi-platform integrations: HubSpot, Gmail, Outlook, Monday.com"
git push origin main

# Vercel will auto-deploy, or manually:
vercel --prod
```

---

## ✅ Step 5: Test Each Integration

### Test in Chrome Extension:

1. **Reload Extension:**
   - Go to `chrome://extensions/`
   - Click reload on "Sales Curiosity"

2. **Open Extension:**
   - Click extension icon
   - Go to "Integrations" tab

3. **Test Each Integration:**
   - Click "Connect HubSpot" → Should open OAuth flow
   - Authorize the connection
   - Should redirect back with success message
   - Extension should show "Connected" badge

4. **Repeat for:**
   - Gmail
   - Outlook
   - Monday.com

---

## 🔍 Troubleshooting

### "Failed to connect. Make sure API keys are configured."
- ❌ Environment variables not set in Vercel
- ✅ Add variables and redeploy

### "Redirect URI mismatch"
- ❌ Redirect URI in provider doesn't match your config
- ✅ Ensure exact match (including https://)
- ✅ Check for trailing slashes

### "Invalid client"
- ❌ Client ID or secret incorrect
- ✅ Double-check credentials from provider

### Extension shows "Not Connected" after OAuth
- ❌ Callback route not deployed
- ✅ Redeploy app after adding routes
- ✅ Check Vercel deployment logs

---

## 📊 How Integrations Work

### User Flow:
```
User clicks "Connect HubSpot"
          ↓
Extension calls: /api/hubspot/auth-user
          ↓
Backend generates OAuth URL
          ↓
Opens OAuth page in new tab
          ↓
User authorizes
          ↓
Provider redirects to: /api/hubspot/user-callback
          ↓
Backend stores tokens for this user
          ↓
Redirects to dashboard with success
          ↓
Extension shows "Connected" ✅
```

### When Generating Emails:
```
User drafts email
          ↓
Backend checks enabled integrations
          ↓
If HubSpot connected → Search for contact
          ↓
If found → "Follow-up" email style
If not found → "Cold outreach" + auto-create contact
```

---

## 🎯 Feature Matrix

| Integration | Search Contacts | Create Contacts | Send Emails | Draft Emails |
|------------|----------------|-----------------|-------------|--------------|
| Salesforce  | ✅ | ✅ | ❌ | ❌ |
| HubSpot     | ✅ | ✅ | ❌ | ❌ |
| Gmail       | ❌ | ❌ | ✅ | ✅ |
| Outlook     | ❌ | ❌ | ✅ | ✅ |
| Monday.com  | ✅ | ✅ | ❌ | ❌ |

---

## 📁 Files Created

### Service Libraries:
- `apps/sales-curiosity-web/src/lib/hubspot.ts`
- `apps/sales-curiosity-web/src/lib/gmail.ts`
- `apps/sales-curiosity-web/src/lib/outlook.ts`
- `apps/sales-curiosity-web/src/lib/monday.ts`

### API Routes (per integration):
- `/api/{service}/auth-user/route.ts` - OAuth initiation
- `/api/{service}/user-callback/route.ts` - OAuth callback
- `/api/{service}/disconnect/route.ts` - Disconnect integration

### Database:
- `supabase-add-all-integrations.sql` - Schema update

### UI:
- Updated `apps/sales-curiosity-extension/src/popup.tsx` with integration cards

---

## 🎉 What's Next?

1. **Add API credentials** for the integrations you want to use
2. **Deploy to Vercel** with environment variables
3. **Test connections** in the Chrome extension
4. **Start using** multi-CRM functionality!

Each user can now connect their own accounts, and the system will automatically:
- ✅ Check multiple CRMs for contact history
- ✅ Tailor email tone (cold vs follow-up)
- ✅ Auto-create contacts in their preferred CRM
- ✅ Send emails directly from Gmail/Outlook

---

## 💡 Tips

- Start with **one integration** at a time (e.g., HubSpot)
- Test thoroughly before moving to the next
- Users can connect **multiple integrations** simultaneously
- Each integration works independently - no conflicts!

**Need help?** Check the provider's documentation:
- [HubSpot API Docs](https://developers.hubspot.com/docs/api/overview)
- [Gmail API Docs](https://developers.google.com/gmail/api)
- [Microsoft Graph Docs](https://docs.microsoft.com/en-us/graph/)
- [Monday.com API Docs](https://developer.monday.com/api-reference/docs)

