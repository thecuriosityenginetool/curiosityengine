# Integration Environment Variables

Copy these variables to your `.env.local` file in the `apps/sales-curiosity-web` directory and fill in your credentials.

## Required Environment Variables

### Salesforce (Already Configured)
```bash
SALESFORCE_CLIENT_ID=your_salesforce_client_id_here
SALESFORCE_CLIENT_SECRET=your_salesforce_client_secret_here
SALESFORCE_REDIRECT_URI=https://www.curiosityengine.io/api/salesforce/user-callback
```

### HubSpot CRM
```bash
HUBSPOT_CLIENT_ID=your_hubspot_client_id_here
HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret_here
HUBSPOT_REDIRECT_URI=https://www.curiosityengine.io/api/hubspot/user-callback
```

**Setup Instructions:**
1. Go to [HubSpot Developers](https://developers.hubspot.com/)
2. Create a new app
3. Add redirect URI: `https://www.curiosityengine.io/api/hubspot/user-callback`
4. Required scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.companies.read`

### Gmail (Google)
```bash
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://www.curiosityengine.io/api/gmail/user-callback
```

**Setup Instructions:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://www.curiosityengine.io/api/gmail/user-callback`
6. Required scopes:
   - `https://www.googleapis.com/auth/gmail.compose`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`

### Outlook (Microsoft)
```bash
MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret_here
MICROSOFT_REDIRECT_URI=https://www.curiosityengine.io/api/outlook/user-callback
MICROSOFT_TENANT_ID=common
```

**Setup Instructions:**
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "App registrations"
3. Create a new registration
4. Add redirect URI: `https://www.curiosityengine.io/api/outlook/user-callback`
5. Create a client secret
6. Add API permissions:
   - `Mail.Send`
   - `Mail.ReadWrite`
   - `User.Read`
   - `offline_access`

### Monday.com
```bash
MONDAY_CLIENT_ID=your_monday_client_id_here
MONDAY_CLIENT_SECRET=your_monday_client_secret_here
MONDAY_REDIRECT_URI=https://www.curiosityengine.io/api/monday/user-callback
```

**Setup Instructions:**
1. Go to [Monday.com Developers](https://monday.com/developers/)
2. Create a new app
3. Add redirect URI: `https://www.curiosityengine.io/api/monday/user-callback`
4. Required scopes:
   - `boards:read`
   - `boards:write`

---

## Local Development

For local development, replace production URLs with:
```bash
# Example for HubSpot
HUBSPOT_REDIRECT_URI=http://localhost:3000/api/hubspot/user-callback
```

Do this for all integrations when testing locally.

---

## Deployment to Vercel

After getting your credentials:

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add all variables listed above
4. Redeploy your application

---

## Security Notes

- ⚠️ Never commit `.env.local` to git
- ✅ Keep credentials secure
- ✅ Rotate secrets periodically
- ✅ Use different credentials for development and production
- ✅ Restart development server after adding new variables

