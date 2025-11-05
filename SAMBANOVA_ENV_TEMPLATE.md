# SambaNova Environment Variables Template

Copy these environment variables to your `.env.local` file (for local development) or add them to your Vercel project settings (for production).

## Required SambaNova Variables

```bash
# SambaNova Cloud API Configuration
SAMBANOVA_API_KEY=your-api-key-here
SAMBANOVA_BASE_URL=https://api.sambanova.ai/v1
```

## How to Get Your API Key

1. Visit [https://cloud.sambanova.ai/apis](https://cloud.sambanova.ai/apis)
2. Sign up or log in to your account
3. Click "Create API Key"
4. Copy the key immediately (you won't be able to see it again!)
5. Paste it as the value for `SAMBANOVA_API_KEY`

## Local Development Setup

Create or update your `.env.local` file in the project root:

```bash
# In your terminal
cd /Users/matthewbravo/Downloads/curiosityengine-3/apps/sales-curiosity-web

# Create .env.local if it doesn't exist
touch .env.local

# Add your SambaNova configuration
echo "SAMBANOVA_API_KEY=your-api-key-here" >> .env.local
echo "SAMBANOVA_BASE_URL=https://api.sambanova.ai/v1" >> .env.local

# Restart your dev server
npm run dev
```

## Vercel Production Setup

1. Go to your Vercel project: [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

| Variable Name | Value |
|--------------|-------|
| `SAMBANOVA_API_KEY` | `your-api-key-here` |
| `SAMBANOVA_BASE_URL` | `https://api.sambanova.ai/v1` |

5. Redeploy your application for changes to take effect

## Testing Your Configuration

After setting up your environment variables, test the API:

```bash
# Local testing
curl http://localhost:3000/api/test-openai

# Should return:
{
  "success": true,
  "message": "SambaNova API is working!",
  "model": "DeepSeek-R1-0528"
}
```

## What You Can Remove

These old OpenAI variables are **no longer needed**:
- ~~`OPENAI_API_KEY`~~
- ~~`OPENAI_ORG_ID`~~

You can safely delete them from your environment.

## Troubleshooting

**"SAMBANOVA_API_KEY is not set"**
- Check your `.env.local` file exists in the correct directory
- Verify the variable name is spelled exactly as shown
- Restart your development server: `npm run dev`

**"401 Unauthorized"**
- Your API key may be invalid or expired
- Generate a new key at [https://cloud.sambanova.ai/apis](https://cloud.sambanova.ai/apis)
- Update your environment variables

**"Connection refused"**
- Verify `SAMBANOVA_BASE_URL=https://api.sambanova.ai/v1`
- Check your internet connection
- Verify SambaNova services are operational

## Complete .env.local Example

Here's what your complete `.env.local` should look like:

```bash
# ============================================
# SambaNova Cloud (NEW - REQUIRED)
# ============================================
SAMBANOVA_API_KEY=your-sambanova-api-key-here
SAMBANOVA_BASE_URL=https://api.sambanova.ai/v1

# ============================================
# Supabase (Keep your existing values)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ============================================
# NextAuth (Keep your existing values)
# ============================================
AUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# ============================================
# Other integrations (Keep if using)
# ============================================
AZURE_AD_CLIENT_ID=your-azure-id
AZURE_AD_CLIENT_SECRET=your-azure-secret
SALESFORCE_CLIENT_ID=your-sf-id
SALESFORCE_CLIENT_SECRET=your-sf-secret

# ============================================
# App Config
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

For more detailed information, see [SAMBANOVA_SETUP.md](./SAMBANOVA_SETUP.md)

