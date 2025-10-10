# 🚀 Complete Migration Guide: GitHub + Vercel + Supabase

This guide walks you through migrating the Sales Curiosity Engine to new accounts.

---

## 📋 **Prerequisites**

Before starting, have ready:
- [ ] New GitHub account credentials
- [ ] New Vercel account credentials  
- [ ] New Supabase account credentials
- [ ] Salesforce Consumer Key & Secret (from previous setup)
- [ ] OpenAI API Key

---

## **Step 1: Create New GitHub Repository**

### 1.1 Create the Repo

1. Go to **https://github.com/new** (on your new account)
2. **Repository name:** `sales-curiosity-engine` (or your choice)
3. **Description:** "AI-powered LinkedIn sales intelligence tool with Salesforce integration"
4. **Privacy:** Private (recommended) or Public
5. **DON'T** initialize with README, .gitignore, or license (we already have these)
6. Click **"Create repository"**

### 1.2 Update Git Remote

```bash
cd /Users/paulwallace/Desktop/sales-curiosity-engine

# Remove old remote
git remote remove origin

# Add new remote (replace YOUR_USERNAME and YOUR_REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Verify
git remote -v

# Push to new repo
git push -u origin main
```

---

## **Step 2: Create New Supabase Project**

### 2.1 Create Project

1. Go to **https://supabase.com**
2. Sign in to your **new account**
3. Click **"New project"**
4. **Organization:** Create new or select existing
5. **Project name:** `sales-curiosity`
6. **Database password:** Create a strong password (save it!)
7. **Region:** Choose closest to your users
8. **Pricing plan:** Free tier is fine to start
9. Click **"Create new project"** (takes ~2 minutes)

### 2.2 Set Up Database Schema

1. Once project is ready, go to **SQL Editor**
2. Click **"+ New query"**
3. Open the file `supabase-schema-organizations.sql` from your project
4. **Copy all contents** of that file
5. **Paste into Supabase SQL Editor**
6. Click **"Run"** (bottom right)
7. Wait for success message ✅

### 2.3 Get Your Credentials

Go to **Settings → API**:

Save these values:
- **Project URL:** `https://xxx.supabase.co`
- **anon/public key:** `eyJhbGc...` (the anon public key)
- **service_role key:** `eyJhbGc...` (the service_role key - keep secret!)

### 2.4 Configure Auth Settings

Go to **Authentication → Providers → Email**:
- ✅ Enable Email provider
- ✅ Confirm email: OFF (for testing, enable later)
- ✅ Secure email change: ON
- **Save**

Go to **Authentication → URL Configuration**:
- **Site URL:** `https://your-new-vercel-url.vercel.app` (update after Vercel setup)
- **Redirect URLs:** Add these:
  ```
  https://your-new-vercel-url.vercel.app/**
  http://localhost:3000/**
  chrome-extension://*
  ```

---

## **Step 3: Deploy to New Vercel Account**

### 3.1 Import from GitHub

1. Go to **https://vercel.com**
2. Sign in to your **new account**
3. Click **"Add New..." → "Project"**
4. Click **"Import Git Repository"**
5. Select **GitHub** and authorize Vercel
6. Find your **new GitHub repo** and click **"Import"**

### 3.2 Configure Build Settings

Before clicking "Deploy":

**Framework Preset:** Next.js ✅ (should auto-detect)

**Root Directory:** `apps/sales-curiosity-web` ⚠️ **IMPORTANT**

**Build Command:** `npm run build` (default is fine)

**Output Directory:** `.next` (default is fine)

**Install Command:** `npm install` (default is fine)

### 3.3 Add Environment Variables

Click **"Environment Variables"** section and add ALL of these:

```bash
# Supabase (from Step 2.3)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# App URL (update after first deploy)
NEXT_PUBLIC_APP_URL=https://your-project-name.vercel.app

# NextAuth
NEXTAUTH_URL=https://your-project-name.vercel.app
NEXTAUTH_SECRET=generate_random_secret_here

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Salesforce (use YOUR credentials from Salesforce setup)
SALESFORCE_CLIENT_ID=your_salesforce_consumer_key_here
SALESFORCE_CLIENT_SECRET=your_salesforce_consumer_secret_here
SALESFORCE_REDIRECT_URI=https://your-project-name.vercel.app/api/salesforce/callback

# Optional
USE_MOCK_AI=0
```

**For each variable:**
- Name: (exact name as shown)
- Value: (paste your value)
- Environment: Check ALL (Production, Preview, Development)

### 3.4 Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Copy the output and use it as `NEXTAUTH_SECRET`

### 3.5 Deploy!

Click **"Deploy"**

Wait 2-3 minutes for deployment to complete.

### 3.6 Get Your Vercel URL

After deployment:
1. Copy your Vercel URL (e.g., `your-project-name.vercel.app`)
2. Go back to **Environment Variables**
3. Update these variables with your actual URL:
   - `NEXT_PUBLIC_APP_URL`
   - `NEXTAUTH_URL`
   - `SALESFORCE_REDIRECT_URI`
4. Click **"Redeploy"** to apply changes

### 3.7 Update Supabase Auth URLs

Go back to **Supabase → Authentication → URL Configuration**:
- **Site URL:** `https://your-project-name.vercel.app`
- **Redirect URLs:** 
  ```
  https://your-project-name.vercel.app/**
  http://localhost:3000/**
  chrome-extension://*
  ```
- **Save**

---

## **Step 4: Update Salesforce Callback URLs**

Go back to **Salesforce → Setup → External Client Apps → Sales Curiosity Engine → Settings**

Update the **Callback URLs** to your new Vercel URL:

```
https://your-new-vercel-url.vercel.app/api/salesforce/callback
https://your-new-vercel-url.vercel.app/api/salesforce/user-callback
```

**Save!**

---

## **Step 5: Update Chrome Extension**

The extension needs to know your new API URL.

### 5.1 Update Default API URL

Edit `apps/sales-curiosity-extension/src/popup.tsx`:

Find this line (around line 16-18):
```typescript
const [apiBase, setApiBase] = useState<string>(
  (typeof localStorage !== "undefined" && localStorage.getItem("apiBase")) ||
    "https://curiosityengine-sales-curiosity-web.vercel.app"  // ← UPDATE THIS
);
```

Change it to your new URL:
```typescript
const [apiBase, setApiBase] = useState<string>(
  (typeof localStorage !== "undefined" && localStorage.getItem("apiBase")) ||
    "https://your-new-project.vercel.app"  // ← YOUR NEW URL
);
```

### 5.2 Rebuild Extension

```bash
cd apps/sales-curiosity-extension
npm run build
```

### 5.3 Reload in Chrome

1. Go to `chrome://extensions/`
2. Find your extension
3. Click the **reload icon** (circular arrow)

---

## **Step 6: Test Everything**

### 6.1 Test Web App

1. Go to `https://your-new-vercel-url.vercel.app`
2. Click **"Sign up"**
3. Create a test account
4. Verify you can log in

### 6.2 Test Extension

1. Open Chrome extension
2. Log in with the account you just created
3. Verify it connects to your new backend

### 6.3 Test Salesforce Integration

1. In extension, go to **Integrations** tab
2. Click **"Connect Salesforce"**
3. Authorize in Salesforce
4. Verify connection shows "Connected"

### 6.4 Test Full Flow

1. Go to a LinkedIn profile
2. Open extension
3. Click **"Draft Email"**
4. Verify:
   - Email is generated
   - Salesforce status appears
   - New contact is created in Salesforce (if applicable)

---

## **Step 7: Optional - Set Up Custom Domain**

### On Vercel:

1. Go to your project → **Settings → Domains**
2. Add your custom domain
3. Follow DNS setup instructions
4. Update all environment variables with new domain
5. Update Salesforce and Supabase URLs

---

## 📝 **Quick Reference: All Services**

| Service | What to Update |
|---------|----------------|
| **GitHub** | Push code to new repo |
| **Supabase** | Create project, run SQL schema, get API keys |
| **Vercel** | Deploy from GitHub, add env vars, get URL |
| **Salesforce** | Update callback URLs with new Vercel URL |
| **Extension** | Update API URL in popup.tsx, rebuild |

---

## 🔐 **Security Checklist**

After migration:
- [ ] All environment variables are set in Vercel
- [ ] `NEXTAUTH_SECRET` is unique and secure
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is kept private
- [ ] Supabase RLS policies are enabled (they should be from SQL script)
- [ ] Salesforce callback URLs match exactly
- [ ] GitHub repo is private (if desired)

---

## 🐛 **Common Issues**

### "Authentication failed" in extension
- **Fix:** Update `apiBase` in popup.tsx to new Vercel URL

### "Supabase connection error"
- **Fix:** Verify environment variables in Vercel are correct
- **Fix:** Check Supabase project is not paused (free tier pauses after 7 days inactivity)

### "Salesforce OAuth error"
- **Fix:** Verify callback URLs in Salesforce match Vercel URL exactly
- **Fix:** Check Salesforce env vars are set correctly

### "502 Bad Gateway" on Vercel
- **Fix:** Check build logs in Vercel
- **Fix:** Verify root directory is set to `apps/sales-curiosity-web`

---

## 📊 **Environment Variables Checklist**

Copy this checklist to make sure you have everything:

```bash
# ✅ Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ✅ App Configuration
NEXT_PUBLIC_APP_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# ✅ OpenAI
OPENAI_API_KEY=

# ✅ Salesforce
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
SALESFORCE_REDIRECT_URI=

# ✅ Optional
USE_MOCK_AI=0
```

---

## 🎉 **You're Done!**

Your Sales Curiosity Engine is now running on:
- ✅ New GitHub repository
- ✅ New Vercel deployment
- ✅ New Supabase database
- ✅ Connected to Salesforce

---

## 📚 **Additional Resources**

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Salesforce OAuth Guide](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm)

---

**Questions?** Check the documentation files:
- `SALESFORCE_INTEGRATION_SETUP.md`
- `SALESFORCE_INTEGRATION_COMPLETE.md`
- `SALESFORCE_USER_LEVEL_INTEGRATION.md`
