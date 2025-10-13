# 🚀 Complete Salesforce Integration Setup Guide

## Overview

This guide will walk you through creating a Salesforce Developer account and configuring your Sales Curiosity Engine to allow **every user to connect their own Salesforce account**.

### What Users Will Be Able to Do:
1. ✅ Connect their personal Salesforce account via OAuth
2. ✅ Automatically check if LinkedIn prospects exist in their CRM
3. ✅ Get AI-tailored emails (follow-up vs cold outreach)
4. ✅ Auto-create new contacts in their Salesforce when drafting emails

---

## Part 1: Create Salesforce Developer Account (5 minutes)

### Step 1: Sign Up for Free Developer Account

1. Go to: **https://developer.salesforce.com/signup**

2. Fill in the form:
   - First Name: Your first name
   - Last Name: Your last name
   - Email: Your email (you'll use this to log in)
   - Role: Developer
   - Company: Sales Curiosity Engine (or your company name)
   - Country: Your country
   - Postal Code: Your postal code
   - Username: Must be in email format but doesn't need to be a real email
     - Example: `paul.wallace@salescuriositydev.com`
     - **Note:** This is your login username, separate from your email

3. Check the agreement box and click **Sign me up**

4. Check your email for verification link and click to verify

5. Set your password and security question

6. You now have a Salesforce Developer Edition org! 🎉

### Step 2: Access Your Developer Org

1. Go to: **https://login.salesforce.com**
2. Log in with:
   - **Username:** The username you created (e.g., `paul.wallace@salescuriositydev.com`)
   - **Password:** Your password

You're now in your Salesforce Developer org!

---

## Part 2: Create Connected App in Salesforce (10 minutes)

### Step 1: Navigate to App Manager

1. In Salesforce, click the **⚙️ gear icon** in the top right
2. Click **Setup**
3. In the Quick Find box (left sidebar), type: `App Manager`
4. Click **App Manager**

### Step 2: Create New Connected App

1. Click **New Connected App** (top right)

2. **Basic Information:**
   - Connected App Name: `Sales Curiosity Engine`
   - API Name: `Sales_Curiosity_Engine` (auto-fills)
   - Contact Email: Your email

3. **API (Enable OAuth Settings):**
   
   ✅ Check **"Enable OAuth Settings"**

4. **Callback URL** - Add BOTH of these:
   ```
   https://www.curiosityengine.io/api/salesforce/user-callback
   http://localhost:3000/api/salesforce/user-callback
   ```
   
   **Important:** 
   - First URL is for production (deployed app)
   - Second URL is for local testing
   - If you have a different production domain, use that instead
   - NO trailing slashes!

5. **Selected OAuth Scopes** - Add these scopes (select and click "Add" arrow):
   - ✅ `Access and manage your data (api)`
   - ✅ `Perform requests on your behalf at any time (refresh_token, offline_access)`
   - ✅ `Full access (full)`

6. **Additional Settings:**
   - ✅ Check **"Require Secret for Web Server Flow"**
   - ✅ Check **"Require Secret for Refresh Token Flow"**
   - ✅ Check **"Enable Client Credentials Flow"** (optional but recommended)

7. Click **Save**

8. Click **Continue**

### Step 3: Get Your Consumer Key and Secret

After saving, you'll see the Connected App details page.

1. **Consumer Key (Client ID):**
   - You'll see it immediately on the page
   - Copy this entire string (it's long!)
   - Save it somewhere safe

2. **Consumer Secret (Client Secret):**
   - Click **"Manage Consumer Details"** button
   - You may need to verify your identity (email code)
   - Copy the **Consumer Secret**
   - **⚠️ IMPORTANT:** Save this immediately - you may not be able to see it again!

**Save these values - you'll need them for environment variables:**

```
Consumer Key (Client ID): [COPY THIS]
Consumer Secret (Client Secret): [COPY THIS]
```

### Step 4: Configure Connected App Settings (Important!)

1. Go back to **Setup** → **App Manager**
2. Find your **Sales Curiosity Engine** app
3. Click the dropdown arrow (▼) and select **Manage**
4. Click **Edit Policies**

**OAuth Policies:**
- Permitted Users: **All users may self-authorize**
- IP Relaxation: **Relax IP restrictions**
- Refresh Token Policy: **Refresh token is valid until revoked**

5. Click **Save**

---

## Part 3: Add Environment Variables to Vercel (5 minutes)

### Step 1: Log into Vercel

1. Go to: **https://vercel.com**
2. Select your **sales-curiosity-web** project

### Step 2: Add Environment Variables

1. Click **Settings** tab
2. Click **Environment Variables** in left sidebar
3. Add these variables:

**Variable 1: SALESFORCE_CLIENT_ID**
- Name: `SALESFORCE_CLIENT_ID`
- Value: [Paste your Consumer Key from Part 2]
- Environment: Select all (Production, Preview, Development)
- Click **Save**

**Variable 2: SALESFORCE_CLIENT_SECRET**
- Name: `SALESFORCE_CLIENT_SECRET`
- Value: [Paste your Consumer Secret from Part 2]
- Environment: Select all (Production, Preview, Development)
- Click **Save**

**Variable 3: SALESFORCE_REDIRECT_URI** (if not already set)
- Name: `SALESFORCE_REDIRECT_URI`
- Value: `https://www.curiosityengine.io/api/salesforce/user-callback`
  - (or your production domain + `/api/salesforce/user-callback`)
- Environment: Production and Preview
- Click **Save**

### Step 3: Redeploy

After adding environment variables, you need to redeploy:

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **...** menu
4. Click **Redeploy**
5. Confirm

Wait for deployment to complete (usually 1-2 minutes).

---

## Part 4: Local Development Setup (Optional)

If you want to test locally:

### Create `.env.local` file

In `apps/sales-curiosity-web/.env.local`:

```bash
# Salesforce OAuth
SALESFORCE_CLIENT_ID=your_consumer_key_here
SALESFORCE_CLIENT_SECRET=your_consumer_secret_here
SALESFORCE_REDIRECT_URI=http://localhost:3000/api/salesforce/user-callback

# Your other existing env vars
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
# ... etc
```

### Run locally:

```bash
cd apps/sales-curiosity-web
npm run dev
```

Visit: `http://localhost:3000`

---

## Part 5: Testing the Integration (5 minutes)

### Test 1: Connect Salesforce from Web App

1. Go to your deployed app: `https://www.curiosityengine.io`
2. Log in as a user
3. Go to **Settings** or **Integrations** page
4. Find **Salesforce** section
5. Click **"Connect Salesforce"**
6. You should be redirected to Salesforce login
7. Log in with any Salesforce account
8. Click **Allow** to grant permissions
9. You should be redirected back with success message
10. Salesforce should now show as "Connected" ✅

### Test 2: Connect from Chrome Extension

1. Open your Chrome extension
2. Go to **Settings** tab
3. Find **Salesforce** card
4. Click **"Connect Salesforce"**
5. New tab opens with Salesforce OAuth
6. Log in and authorize
7. Close the tab
8. Extension should show "Salesforce Connected" ✅

### Test 3: Use in Real Scenario

1. Go to a LinkedIn profile
2. Click your extension icon
3. Click **"Generate Email"** (or similar)
4. **Behind the scenes:**
   - Extension checks if this person exists in your Salesforce
   - If found → AI generates "follow-up" style email
   - If not found → AI generates "cold outreach" email + auto-creates contact
5. You'll see Salesforce status in the response

---

## Part 6: Database Schema (Already Done!)

✅ Your database already has the required schema in the `organization_integrations` table.

The integration stores:
- `access_token` - OAuth access token
- `refresh_token` - For automatic token refresh
- `instance_url` - User's Salesforce instance URL
- `user_id` - Which user connected this account

**No additional database setup needed!**

---

## 🎯 How It Works for Users

### User Flow:

1. **User clicks "Connect Salesforce"** (in web app or extension)
   ↓
2. **Redirected to Salesforce login**
   - User logs in with THEIR Salesforce credentials
   - User grants permissions to Sales Curiosity Engine
   ↓
3. **OAuth callback saves tokens** to database
   - Tokens are encrypted and stored per-user
   - Refresh token allows automatic renewal
   ↓
4. **User's Salesforce is now connected!**
   - They can search their CRM
   - Auto-create contacts in their Salesforce
   - AI tailors emails based on their CRM data

### Technical Flow:

```
Extension/Web App
      ↓
GET /api/salesforce/auth-user (authenticated)
      ↓
Returns: { authUrl: "https://login.salesforce.com/..." }
      ↓
User logs into their Salesforce
      ↓
Salesforce redirects to: /api/salesforce/user-callback?code=xxx
      ↓
Backend exchanges code for tokens
      ↓
Tokens saved to organization_integrations table
      ↓
User sees "Connected" status
```

When user drafts email:

```
User generates email for LinkedIn profile
      ↓
POST /api/prospects (with LinkedIn data)
      ↓
Backend calls searchPersonInSalesforce(userId, organizationId, email, name)
      ↓
Searches user's Salesforce: Contacts → Leads
      ↓
If FOUND: AI prompt includes "this is a follow-up"
If NOT FOUND: AI prompt says "this is first contact" + createSalesforceContact()
      ↓
AI generates contextually appropriate email
      ↓
User gets perfect email + CRM stays synced
```

---

## 🔒 Security & Privacy

✅ **Each user connects their own Salesforce**
- OAuth tokens are stored per-user
- Users can disconnect anytime
- No shared credentials

✅ **Secure token storage**
- Tokens encrypted in Supabase
- Automatic token refresh
- Row Level Security (RLS) policies

✅ **Minimal permissions**
- Only requests necessary OAuth scopes
- Read/write to Contacts and Leads only
- No admin access required

---

## 🐛 Troubleshooting

### Issue: "Failed to initiate OAuth flow"

**Fix:**
- Check Vercel environment variables are set correctly
- Ensure `SALESFORCE_CLIENT_ID` is present
- Redeploy after adding env vars

### Issue: "Redirect URI mismatch"

**Fix:**
1. Go to Salesforce Setup → App Manager
2. Edit your Connected App
3. Verify callback URL matches EXACTLY:
   - `https://www.curiosityengine.io/api/salesforce/user-callback`
   - NO trailing slash
   - NO extra parameters
4. Save and try again

### Issue: "Invalid client credentials"

**Fix:**
- Double-check `SALESFORCE_CLIENT_SECRET` is correct
- Make sure you copied the entire secret (no spaces)
- Try regenerating the secret in Salesforce

### Issue: "User not found in Salesforce"

**Possible reasons:**
- Email doesn't match exactly (check spelling)
- Person is using a different email in Salesforce
- Search is case-sensitive for names

**The integration will auto-create them on first email draft!**

### Issue: "Token expired"

**Fix:**
- The system should auto-refresh tokens
- If it fails, user needs to disconnect and reconnect
- Check refresh token is being stored correctly

---

## 📊 Monitoring & Logs

### Check if integration is working:

**In Supabase:**
1. Go to Table Editor
2. Open `organization_integrations` table
3. Look for rows where `integration_type = 'salesforce_user'`
4. `is_enabled` should be `true`
5. `configuration` should contain tokens

**In Vercel:**
1. Go to your project
2. Click **Logs** tab
3. Filter for: `salesforce`
4. Look for successful OAuth callbacks

**In Application:**
- Users see "Connected" badge
- Extension shows Salesforce status
- Email drafts include CRM context

---

## 🎉 Success Checklist

- [ ] ✅ Created Salesforce Developer account
- [ ] ✅ Created Connected App in Salesforce
- [ ] ✅ Got Consumer Key and Secret
- [ ] ✅ Added `SALESFORCE_CLIENT_ID` to Vercel
- [ ] ✅ Added `SALESFORCE_CLIENT_SECRET` to Vercel
- [ ] ✅ Added callback URL to Connected App
- [ ] ✅ Redeployed application
- [ ] ✅ Tested connection from web app
- [ ] ✅ Tested connection from extension
- [ ] ✅ Tested CRM search with real LinkedIn profile
- [ ] ✅ Verified new contact auto-creation works

---

## 📚 Additional Resources

- [Salesforce Developer Signup](https://developer.salesforce.com/signup)
- [Salesforce Connected Apps Guide](https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm)
- [Salesforce OAuth 2.0 Flow](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm)
- [Salesforce REST API Docs](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/)

---

## 🚀 Next Steps

After setup is complete:

1. **Announce to users** that Salesforce integration is available
2. **Create a help doc** showing users how to connect their Salesforce
3. **Monitor usage** to see how many users connect
4. **Gather feedback** on CRM matching accuracy
5. **Consider adding more features:**
   - Sync LinkedIn activities to Salesforce as tasks
   - Update existing contact info from LinkedIn
   - Search Salesforce accounts (companies)
   - Create opportunities from prospects

---

## 💡 Pro Tips

1. **Multiple Salesforce Orgs:** Each user can only connect one Salesforce account at a time

2. **Salesforce Sandboxes:** To use a Salesforce Sandbox instead of production:
   - Change OAuth URL from `https://login.salesforce.com` to `https://test.salesforce.com`
   - Update in `apps/sales-curiosity-web/src/lib/salesforce.ts` line 78

3. **Custom Fields:** If your Salesforce has custom fields you want to populate:
   - Edit `createSalesforceContact()` function in `salesforce.ts`
   - Add custom field mappings

4. **Rate Limits:** Salesforce has API rate limits
   - Developer Edition: 5,000 API calls per 24 hours
   - Consider caching search results

5. **Lead vs Contact:** The integration creates Contacts by default
   - To create Leads instead, modify the `createSalesforceContact` call
   - Or add logic to choose based on company size/type

---

## ❓ Need Help?

- Check the existing Salesforce integration docs in your project
- Review code in `apps/sales-curiosity-web/src/lib/salesforce.ts`
- Check Vercel logs for error messages
- Verify Salesforce Connected App settings

---

**You're all set! Users can now connect their Salesforce and get CRM-aware AI email generation! 🎉**

