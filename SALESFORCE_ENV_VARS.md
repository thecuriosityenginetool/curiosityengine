# Salesforce Integration - Environment Variables

Add these environment variables to your deployment (Vercel, Railway, etc.) or `.env.local` for local development.

## Required Salesforce Variables

```bash
# Salesforce OAuth Configuration
# Get these from your Salesforce Connected App
SALESFORCE_CLIENT_ID=your_salesforce_consumer_key_here
SALESFORCE_CLIENT_SECRET=your_salesforce_consumer_secret_here

# Callback URL - must match exactly what's in Salesforce Connected App
# Production:
SALESFORCE_REDIRECT_URI=https://yourapp.vercel.app/api/salesforce/callback

# Local Development:
# SALESFORCE_REDIRECT_URI=http://localhost:3000/api/salesforce/callback
```

## How to Get These Values

1. **Log into Salesforce**

2. **Go to Setup** (gear icon → Setup)

3. **Search for "App Manager"** in Quick Find

4. **Create New Connected App** (or edit existing)

5. **Enable OAuth Settings:**
   - Callback URL: `https://yourapp.vercel.app/api/salesforce/callback`
   - OAuth Scopes:
     - Access and manage your data (api)
     - Perform requests on your behalf at any time (refresh_token, offline_access)
     - Full access (full)

6. **Save and Get Credentials:**
   - **Consumer Key** = `SALESFORCE_CLIENT_ID`
   - **Consumer Secret** = `SALESFORCE_CLIENT_SECRET` (click "Manage Consumer Details")

## Complete .env.local Example

```bash
# ========================================
# SALESFORCE INTEGRATION
# ========================================
SALESFORCE_CLIENT_ID=3MVG9example_consumer_key_here
SALESFORCE_CLIENT_SECRET=0123456789ABCDEF
SALESFORCE_REDIRECT_URI=http://localhost:3000/api/salesforce/callback

# ========================================
# APP CONFIGURATION
# ========================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_here

# ========================================
# SUPABASE
# ========================================
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# ========================================
# OPENAI
# ========================================
OPENAI_API_KEY=sk-proj-...

# ========================================
# OPTIONAL: TESTING
# ========================================
# Set to 1 to use mock AI responses (no OpenAI calls)
USE_MOCK_AI=0
```

## Deployment to Vercel

### Option 1: Vercel Dashboard

1. Go to your Vercel project
2. Settings → Environment Variables
3. Add each variable:
   - Name: `SALESFORCE_CLIENT_ID`
   - Value: (paste your consumer key)
   - Environment: Production, Preview, Development

### Option 2: Vercel CLI

```bash
vercel env add SALESFORCE_CLIENT_ID
# Paste value when prompted
# Select: Production, Preview, Development

vercel env add SALESFORCE_CLIENT_SECRET
# Paste value when prompted

vercel env add SALESFORCE_REDIRECT_URI
# Enter: https://yourapp.vercel.app/api/salesforce/callback
```

### Option 3: .env File (then push)

```bash
# Create .env.production.local
echo "SALESFORCE_CLIENT_ID=your_key" >> .env.production.local
echo "SALESFORCE_CLIENT_SECRET=your_secret" >> .env.production.local
echo "SALESFORCE_REDIRECT_URI=https://yourapp.vercel.app/api/salesforce/callback" >> .env.production.local

# Deploy
git add .
git commit -m "Add Salesforce env vars"
git push
```

## Important Notes

### Security
- **NEVER** commit `.env.local` or `.env.production.local` to git
- ✅ They're already in `.gitignore`
- Store secrets in Vercel dashboard or secure vault

### Callback URL
- **MUST MATCH EXACTLY** between:
  1. Salesforce Connected App settings
  2. `SALESFORCE_REDIRECT_URI` environment variable
- Include protocol (`https://` or `http://`)
- Include full path (`/api/salesforce/callback`)
- No trailing slash

### Multiple Environments

For different environments (dev, staging, prod):

```bash
# .env.local (development)
SALESFORCE_REDIRECT_URI=http://localhost:3000/api/salesforce/callback

# .env.production (Vercel)
SALESFORCE_REDIRECT_URI=https://yourapp.vercel.app/api/salesforce/callback

# .env.staging (staging)
SALESFORCE_REDIRECT_URI=https://staging.yourapp.vercel.app/api/salesforce/callback
```

**Add all callback URLs** to Salesforce Connected App (comma-separated).

## Verification

### Test Environment Variables Are Set

Create a test page or API route:

```typescript
// app/api/test-env/route.ts
export async function GET() {
  return Response.json({
    salesforceConfigured: !!(
      process.env.SALESFORCE_CLIENT_ID &&
      process.env.SALESFORCE_CLIENT_SECRET &&
      process.env.SALESFORCE_REDIRECT_URI
    ),
    redirectUri: process.env.SALESFORCE_REDIRECT_URI,
  });
}
```

Visit: `https://yourapp.vercel.app/api/test-env`

Should return:
```json
{
  "salesforceConfigured": true,
  "redirectUri": "https://yourapp.vercel.app/api/salesforce/callback"
}
```

## Troubleshooting

### "OAuth callback error"
- ❌ Callback URL mismatch
- ✅ Check Salesforce Connected App
- ✅ Check `SALESFORCE_REDIRECT_URI` env var
- ✅ Both must match exactly

### "Failed to get OAuth URL"
- ❌ Missing `SALESFORCE_CLIENT_ID`
- ✅ Add env var and redeploy

### "Invalid client credentials"
- ❌ Wrong `SALESFORCE_CLIENT_SECRET`
- ✅ Regenerate secret in Salesforce
- ✅ Update env var

### "Environment variable not found"
- ❌ Variable not set in Vercel
- ✅ Add in Vercel dashboard
- ✅ Redeploy after adding

---

**Need more help?** See [SALESFORCE_INTEGRATION_SETUP.md](./SALESFORCE_INTEGRATION_SETUP.md) for complete setup guide.
