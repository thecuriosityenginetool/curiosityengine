# Complete OAuth Setup Instructions

Follow these steps IN ORDER to get everything working.

---

## 1️⃣ SUPABASE SETUP (5 minutes)

### Step 1.1: Run the Database Migration

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of `supabase-add-oauth-tokens.sql` (shown above)
6. Paste into the query editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. You should see "Success. No rows returned"

### Step 1.2: Verify the Table Was Created

1. In Supabase, click **Table Editor** in left sidebar
2. You should see a new table called `user_oauth_tokens`
3. It should have these columns:
   - `id` (uuid)
   - `user_id` (uuid)
   - `provider` (text)
   - `access_token` (text)
   - `refresh_token` (text)
   - `token_expiry` (timestamp)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

✅ **Supabase setup complete!**

---

## 2️⃣ GOOGLE CLOUD SETUP (10 minutes)

### Step 2.1: Create a Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Click **Select a project** dropdown at the top
3. Click **NEW PROJECT**
4. Enter project name: `Curiosity Engine`
5. Click **CREATE**
6. Wait for project to be created (30 seconds)

### Step 2.2: Enable Required APIs

1. In the left sidebar, go to **APIs & Services** > **Library**
2. Search for "Gmail API"
3. Click **Gmail API**, then click **ENABLE**
4. Go back to Library
5. Search for "Google+ API" (for profile info)
6. Click **Google+ API**, then click **ENABLE**

### Step 2.3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** (unless you have a Google Workspace)
3. Click **CREATE**
4. Fill in the form:
   - **App name:** `Curiosity Engine`
   - **User support email:** your email
   - **Developer contact email:** your email
5. Click **SAVE AND CONTINUE**
6. On "Scopes" page:
   - Click **ADD OR REMOVE SCOPES**
   - Add these scopes (search for them):
     - `openid`
     - `email`
     - `profile`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.compose`
   - Click **UPDATE**
   - Click **SAVE AND CONTINUE**
7. On "Test users" page, click **SAVE AND CONTINUE**
8. Review and click **BACK TO DASHBOARD**

### Step 2.4: Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **CREATE CREDENTIALS** > **OAuth client ID**
3. Application type: **Web application**
4. Name: `Curiosity Engine Web`
5. Under **Authorized redirect URIs**, click **ADD URI** and add:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://www.curiosityengine.io/api/auth/callback/google`
   - Add your Vercel URL: `https://your-app.vercel.app/api/auth/callback/google`
6. Click **CREATE**
7. **IMPORTANT:** Copy and save these values:
   - **Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)
   - **Client secret** (looks like: `GOCSPX-abc123xyz789`)

✅ **Google Cloud setup complete!**

---

## 3️⃣ MICROSOFT AZURE SETUP (10 minutes)

### Step 3.1: Create Azure AD App Registration

1. Go to https://portal.azure.com/
2. Search for "Azure Active Directory" in the top search bar
3. Click **Azure Active Directory**
4. In the left sidebar, click **App registrations**
5. Click **+ New registration**
6. Fill in the form:
   - **Name:** `Curiosity Engine`
   - **Supported account types:** Select "Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts"
   - **Redirect URI:** 
     - Platform: **Web**
     - URI: `http://localhost:3000/api/auth/callback/microsoft`
7. Click **Register**
8. **IMPORTANT:** Copy and save the **Application (client) ID** from the Overview page

### Step 3.2: Add Additional Redirect URIs

1. In your app, click **Authentication** in the left sidebar
2. Under **Web** > **Redirect URIs**, click **Add URI**
3. Add these URIs:
   - `https://www.curiosityengine.io/api/auth/callback/microsoft`
   - `https://your-app.vercel.app/api/auth/callback/microsoft`
4. Click **Save** at the bottom

### Step 3.3: Create Client Secret

1. Click **Certificates & secrets** in the left sidebar
2. Under **Client secrets**, click **+ New client secret**
3. Description: `Curiosity Engine Secret`
4. Expires: **24 months** (or never, if available)
5. Click **Add**
6. **IMPORTANT:** Copy the **Value** immediately (you can't see it again!)
   - Looks like: `abc123~def456.ghi789`

### Step 3.4: Add API Permissions

1. Click **API permissions** in the left sidebar
2. You should see `User.Read` already there
3. Click **+ Add a permission**
4. Click **Microsoft Graph**
5. Click **Delegated permissions**
6. Search for and add these permissions (check the box for each):
   - `openid`
   - `email`
   - `profile`
   - `offline_access`
   - `Mail.Send`
   - `Mail.ReadWrite`
7. Click **Add permissions**
8. If you're an admin, click **Grant admin consent for [Your Organization]**
   - If not admin, users will see consent screen on first login (which is fine)

✅ **Microsoft Azure setup complete!**

---

## 4️⃣ ENVIRONMENT VARIABLES SETUP (5 minutes)

### Step 4.1: Create/Update .env.local

In your project root, create or edit `.env.local`:

```bash
# NextAuth
NEXTAUTH_SECRET=your-random-secret-here-change-this
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (from Step 2.4)
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz789

# Microsoft OAuth (from Step 3.1 and 3.3)
MICROSOFT_CLIENT_ID=your-azure-app-id
MICROSOFT_CLIENT_SECRET=abc123~def456.ghi789

# Supabase (keep your existing values)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Generate NEXTAUTH_SECRET** if you don't have one:
```bash
openssl rand -base64 32
```

### Step 4.2: Test Locally

```bash
cd apps/sales-curiosity-web
npm run dev
```

Visit http://localhost:3000/login and test OAuth buttons.

✅ **Local environment complete!**

---

## 5️⃣ VERCEL SETUP (5 minutes)

### Step 5.1: Add Environment Variables to Vercel

1. Go to https://vercel.com/
2. Select your project
3. Go to **Settings** > **Environment Variables**
4. Add each variable:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXTAUTH_SECRET` | (from .env.local) | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://www.curiosityengine.io` | Production |
| `NEXTAUTH_URL` | `https://your-preview.vercel.app` | Preview |
| `GOOGLE_CLIENT_ID` | (from Google) | Production, Preview, Development |
| `GOOGLE_CLIENT_SECRET` | (from Google) | Production, Preview, Development |
| `MICROSOFT_CLIENT_ID` | (from Azure) | Production, Preview, Development |
| `MICROSOFT_CLIENT_SECRET` | (from Azure) | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_URL` | (existing) | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | (existing) | Production, Preview, Development |

5. Click **Save** for each

### Step 5.2: Redeploy

After adding variables:
1. Go to **Deployments** tab
2. Click the ︙ menu on latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (~2 min)

### Step 5.3: Test Production

1. Visit your production URL: `https://www.curiosityengine.io/login`
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Should redirect to dashboard
5. Test "Sign in with Microsoft" too

✅ **Vercel setup complete!**

---

## 6️⃣ CHROME EXTENSION SETUP (Optional - 5 minutes)

### Step 6.1: Update Extension API Base URL

If your extension is pointing to localhost, update it to production:

1. Open `apps/sales-curiosity-extension/src/popup.tsx`
2. Find line ~16-18 where apiBase is set
3. Change default to your production URL:

```typescript
const [apiBase, setApiBase] = useState<string>(
  (typeof localStorage !== "undefined" && localStorage.getItem("apiBase")) ||
    "https://www.curiosityengine.io"  // ← Change this
);
```

### Step 6.2: Rebuild Extension

```bash
cd apps/sales-curiosity-extension
npm run build
```

### Step 6.3: Test Extension OAuth Flow

1. Open Chrome
2. Go to chrome://extensions/
3. Click "Load unpacked"
4. Select `apps/sales-curiosity-extension/dist` folder
5. Click extension icon
6. Click "Sign in" button
7. Should open your web app in new tab
8. Complete OAuth flow
9. Close tab, return to extension
10. Extension should now be authenticated

✅ **Extension setup complete!**

---

## 🎉 ALL DONE! Test Everything

### Test Checklist

- [ ] Login page shows Google and Microsoft buttons
- [ ] Google OAuth works (creates user, stores tokens)
- [ ] Microsoft OAuth works (creates user, stores tokens)
- [ ] Check Supabase `users` table - new user created
- [ ] Check Supabase `user_oauth_tokens` table - tokens stored
- [ ] Extension opens web app for login
- [ ] Extension recognizes authenticated user
- [ ] Can send test email from extension (if UI is updated)

---

## 🐛 Troubleshooting

### "Redirect URI mismatch" error

**Problem:** OAuth redirect URI doesn't match what's in Google/Azure console

**Solution:**
1. Check the error message for the exact URI being used
2. Go back to Google/Azure console
3. Add that exact URI to authorized redirect URIs
4. Make sure there are no trailing slashes

### "Invalid client" error

**Problem:** Client ID or Secret is wrong

**Solution:**
1. Double-check you copied the full Client ID and Secret
2. No extra spaces at beginning or end
3. In Vercel, make sure variables are set for correct environment
4. Redeploy after changing variables

### Tokens not being stored

**Problem:** user_oauth_tokens table is empty after login

**Solution:**
1. Check Supabase logs (Dashboard > Logs)
2. Make sure the SQL migration ran successfully
3. Verify RLS policies are set correctly
4. Check that SUPABASE_SERVICE_ROLE_KEY is set in environment variables

### Extension can't authenticate

**Problem:** Extension shows "Unauthorized" error

**Solution:**
1. Make sure apiBase points to correct URL
2. User must complete OAuth flow in web app first
3. Check browser console for errors
4. Clear extension storage: chrome://extensions/ > Extension details > Clear storage

---

## 📞 Need Help?

1. Check error messages in browser console (F12)
2. Check Supabase logs
3. Check Vercel function logs
4. Review `OAUTH_SETUP_GUIDE.md` for more details

---

**Last Updated:** October 12, 2025  
**Setup Time:** ~35 minutes total

