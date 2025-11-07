# Google Workspace Integration Setup Guide

## ✅ Current Status

**Code:** Deployed and ready (commits: 6b388ac, 76d1b99, 941a6c7)
**Google Cloud Project:** Curiosity Engine (project-474904)
**OAuth Client ID:** 847809834061-1qnb...

---

## 🔧 Setup Steps

### Step 1: Get Your Client Secret

1. Go to: https://console.cloud.google.com/apis/credentials?project=curiosity-engine-474904
2. Click on **"Curiosity Engine"** in the OAuth 2.0 Client IDs table
3. A panel will appear on the right showing:
   - **Client ID:** `847809834061-1qnb...` (you already have this)
   - **Client secret:** `[copy this value]`
4. Copy both values for the next step

### Step 2: Add Redirect URI

While in the OAuth client details:

1. Click **"Edit OAuth client"** or find **"Authorized redirect URIs"** section
2. Click **"+ ADD URI"**
3. Add these URIs:

**Production:**
```
https://www.curiosityengine.io/api/gmail/user-callback
```

**Local Development (optional):**
```
http://localhost:3000/api/gmail/user-callback
```

4. Click **Save**

### Step 3: Add Environment Variables to Vercel

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings → Environment Variables**
4. Add these three variables:

```bash
GOOGLE_CLIENT_ID=847809834061-1qnb...[paste full client ID]
GOOGLE_CLIENT_SECRET=[paste the secret from Step 1]
GOOGLE_REDIRECT_URI=https://www.curiosityengine.io/api/gmail/user-callback
```

5. Set environment to: **Production, Preview, Development** (all)
6. Click **Save**

### Step 4: Redeploy (if needed)

After adding environment variables:
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click **...** (three dots) → **Redeploy**

Or just push a small change to trigger rebuild (env vars will be picked up automatically on next deploy)

---

## 📋 Required OAuth Scopes

Your code is configured to request these scopes (all are already enabled in your Google Cloud Console ✅):

### Gmail Scopes:
- ✅ `https://www.googleapis.com/auth/gmail.compose` (Restricted)
- ✅ `https://www.googleapis.com/auth/gmail.send` (Sensitive)

### Calendar Scopes:
- ✅ `https://www.googleapis.com/auth/calendar` (Sensitive - includes event creation)

### User Info:
- ✅ `https://www.googleapis.com/auth/userinfo.email` (Non-sensitive)

**All scopes are already enabled in your OAuth consent screen!** ✅

---

## 🎯 Testing After Setup

Once environment variables are added and deployed:

### 1. Test Connection
1. Go to: https://www.curiosityengine.io/dashboard
2. Click **Connectors** tab
3. Find **Google Workspace** card
4. Click **Connect** button
5. You should see Google's permission screen requesting:
   - Read, compose, and send Gmail emails
   - Manage your Google Calendar
   - See your email address

### 2. Test Calendar Sync
1. After connecting, check the calendar panel on Agent tab
2. Click the **Sync** button
3. Should fetch your real Google Calendar events

### 3. Test AI Chat Tools
Try these prompts:
- "Create an email draft to test@example.com about our meeting"
- "Schedule a meeting with John tomorrow at 2pm"
- "Send an email to jane@example.com with project update"

---

## 🔍 Troubleshooting

### Error: "redirect_uri_mismatch"
- Make sure you added the exact redirect URI from Step 2
- Check for typos or extra spaces
- Wait 5-10 minutes for Google's systems to propagate the change

### Error: "access_denied" 
- User declined permissions
- Try again and accept all requested permissions

### Error: "invalid_client"
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` match your OAuth client exactly
- Make sure there are no extra spaces in the environment variables

### Calendar events not showing
- Verify you have events in your Google Calendar
- Check browser console for API errors
- Ensure `calendar` scope was granted during OAuth

---

## 🚀 What Works After Setup

✅ **Calendar Sync:** Fetch Google Calendar events  
✅ **Email Drafts:** AI creates drafts in Gmail  
✅ **Send Emails:** AI sends emails via Gmail  
✅ **Calendar Events:** AI creates events in Google Calendar  
✅ **Exclusive Provider:** Outlook greys out when Google is connected  
✅ **AI Chat Tools:** Gmail/Calendar tools available in chat

---

## 📝 Quick Reference

**Auth Flow:**
1. User clicks "Connect" on Google Workspace card
2. Redirects to `/api/gmail/auth-user`
3. Generates OAuth URL and redirects to Google
4. User grants permissions
5. Google redirects to `/api/gmail/user-callback`
6. Tokens stored in `organization_integrations` table
7. User redirected back to dashboard

**Integration Type:** `gmail_user` (handles both Gmail AND Calendar)

**Token Storage:** User-level tokens in `organization_integrations.configuration[userId]`

---

Ready to test! Let me know if you need help with any of these steps. 🎊

