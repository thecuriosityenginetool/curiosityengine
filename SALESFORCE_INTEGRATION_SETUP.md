# Salesforce Integration Setup Guide

This guide will walk you through setting up the Salesforce integration for Sales Curiosity Engine.

## 🎯 What This Integration Does

The Salesforce integration provides intelligent CRM-aware email drafting:

1. **Automatic CRM Check**: When drafting an email, automatically searches Salesforce for the prospect
2. **Smart Email Tailoring**: 
   - If person exists in CRM → Generates follow-up/re-engagement email
   - If person is new → Generates first contact cold outreach email
3. **Auto-Sync**: Automatically adds new contacts to Salesforce after first email draft
4. **Relationship Context**: Emails reference previous interactions when applicable

## 📋 Prerequisites

- Salesforce account (Professional, Enterprise, or Developer Edition)
- Admin access to Salesforce to create Connected Apps
- Sales Curiosity web app deployed (or running locally)

## 🔧 Step 1: Create Salesforce Connected App

1. **Log into Salesforce**
   - Go to your Salesforce instance

2. **Navigate to Setup**
   - Click the gear icon ⚙️ in top right
   - Select "Setup"

3. **Create Connected App**
   - In Quick Find, search for "App Manager"
   - Click "New Connected App"
   
4. **Basic Information**
   - Connected App Name: `Sales Curiosity Engine`
   - API Name: `Sales_Curiosity_Engine`
   - Contact Email: Your email

5. **API (Enable OAuth Settings)**
   - ✅ Check "Enable OAuth Settings"
   - **Callback URL**: 
     - Production: `https://yourapp.vercel.app/api/salesforce/callback`
     - Local dev: `http://localhost:3000/api/salesforce/callback`
   - **Selected OAuth Scopes**: Add these scopes:
     - `Access and manage your data (api)`
     - `Perform requests on your behalf at any time (refresh_token, offline_access)`
     - `Full access (full)`

6. **Save and Continue**
   - Click "Save"
   - Click "Continue"

7. **Get Consumer Key and Secret**
   - After saving, you'll see your **Consumer Key** (Client ID)
   - Click "Manage Consumer Details" to reveal **Consumer Secret** (Client Secret)
   - **⚠️ SAVE THESE VALUES** - you'll need them for environment variables

## 🔐 Step 2: Configure Environment Variables

Add these to your `.env.local` file (or Vercel environment variables):

```bash
# Salesforce OAuth
SALESFORCE_CLIENT_ID=your_consumer_key_from_step_1
SALESFORCE_CLIENT_SECRET=your_consumer_secret_from_step_1
SALESFORCE_REDIRECT_URI=https://yourapp.vercel.app/api/salesforce/callback

# Other required env vars (if not already set)
NEXT_PUBLIC_APP_URL=https://yourapp.vercel.app
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
```

## 🗄️ Step 3: Database Schema

The integration uses the existing `organization_integrations` table. No additional schema changes needed!

The `configuration` JSONB field stores:
- `access_token`: Current OAuth access token
- `refresh_token`: Refresh token for re-authentication
- `instance_url`: Salesforce instance URL
- Other OAuth metadata

## 🚀 Step 4: Connect Salesforce (Organization Admin)

1. **Log into Sales Curiosity** as an Organization Admin
2. Navigate to **Admin Dashboard** → **Organization** tab
3. Go to **Integrations** section
4. Find the **Salesforce** card
5. Click **"🔗 Connect with Salesforce"**
6. You'll be redirected to Salesforce OAuth page
7. **Log in to Salesforce** and **Allow** access
8. You'll be redirected back with success message
9. ✅ Salesforce is now connected for your entire organization!

## 📱 Step 5: Use in Chrome Extension

Once Salesforce is connected by an org admin:

1. **Extension users** will see a badge showing Salesforce is connected
2. When **drafting emails** on LinkedIn:
   - Extension checks if person exists in Salesforce
   - Email is automatically tailored as follow-up OR cold outreach
   - New contacts are auto-added to Salesforce CRM
3. **Salesforce status** is shown in the response

## 🔍 How It Works

### Email Drafting Flow

```
1. User clicks "Draft Email" on LinkedIn profile
2. Extension extracts profile data (name, headline, etc.)
3. Backend searches Salesforce:
   - First checks Contacts by email/name
   - Then checks Leads if not found
4. AI receives context:
   - If FOUND: "This is a follow-up email, reference existing relationship"
   - If NOT FOUND: "This is first contact, introduce yourself"
5. AI generates contextually appropriate email
6. If NOT FOUND: Contact is auto-created in Salesforce
7. User gets perfectly tailored email + CRM stays in sync
```

### API Endpoints

- `GET /api/salesforce/auth` - Initiate OAuth flow
- `GET /api/salesforce/callback` - OAuth callback handler
- `POST /api/salesforce/disconnect` - Disconnect integration
- `POST /api/salesforce` - Search/create contacts (used by prospects API)

## 🧪 Testing

### Test with Real Salesforce Account

1. Connect Salesforce using steps above
2. Find a LinkedIn profile of someone in your Salesforce
3. Draft email → Should generate "follow-up" style
4. Find someone NOT in Salesforce
5. Draft email → Should generate "cold outreach" style
6. Check Salesforce → New contact should appear

### Test Locally

```bash
cd apps/sales-curiosity-web
npm run dev
```

Visit: `http://localhost:3000/admin/organization`
Connect Salesforce using local callback URL

## 🔒 Security Notes

- OAuth tokens are encrypted and stored in Supabase
- Only org admins can connect/disconnect Salesforce
- Tokens auto-refresh when expired
- Rate limiting recommended for production

## 🐛 Troubleshooting

### "Failed to get Salesforce OAuth URL"
- Check `SALESFORCE_CLIENT_ID` is set correctly
- Verify environment variables are deployed

### "OAuth callback error"
- Ensure callback URL in Salesforce Connected App matches exactly
- Check `SALESFORCE_REDIRECT_URI` environment variable
- Verify Connected App is approved in Salesforce

### "Salesforce authentication failed"
- Token may have expired and refresh failed
- Disconnect and reconnect Salesforce
- Check Salesforce Connected App is still active

### "Person not found in Salesforce but should be"
- Email might not match exactly
- Try searching by name (first + last name)
- Check Salesforce API access permissions

## 📊 Monitoring

Check these logs:
- Console logs show Salesforce search results
- Audit logs table tracks integration enable/disable events
- Email generations table shows which emails were generated

## 🎉 Success Indicators

- ✅ "CONNECTED" badge on Salesforce card in admin dashboard
- ✅ Extension shows "Salesforce Connected" message
- ✅ Emails show "🔗 Salesforce Status" in results
- ✅ New contacts appear in Salesforce after email drafts

## 🔄 Updating OAuth Credentials

If you need to rotate credentials:

1. Generate new credentials in Salesforce Connected App
2. Update environment variables with new values
3. Redeploy application
4. Each org admin must disconnect and reconnect

## 📚 Additional Resources

- [Salesforce Connected App Docs](https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm)
- [Salesforce OAuth 2.0 Flow](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm)
- [Salesforce API Docs](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/)

---

**Need help?** Check the [main README](./README.md) or create an issue on GitHub.
