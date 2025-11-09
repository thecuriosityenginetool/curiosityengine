# Vercel Environment Variables Setup Guide

## 🎯 Quick Start: Adding TAVILY_API_KEY to Vercel

### Step 1: Get Your Tavily API Key
1. Go to https://tavily.com
2. Sign up for free account (1000 searches/month free tier)
3. Navigate to Dashboard → API Keys
4. Copy your API key (starts with `tvly-...`)

### Step 2: Add to Vercel Project

#### Method A: Via Vercel Dashboard (Recommended)
1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Select your project (e.g., `curiosityengine-3`)

2. **Navigate to Settings**
   - Click **Settings** tab at the top
   - Click **Environment Variables** in the left sidebar

3. **Add New Variable**
   - Click **"Add New"** button
   - **Key:** `TAVILY_API_KEY`
   - **Value:** `tvly-xxxxxxxxxxxxxxxxxxxxxxxxxx` (your actual API key)
   - **Environment:** Select all: ✅ Production ✅ Preview ✅ Development
   - Click **Save**

4. **Redeploy (CRITICAL!)**
   - Go to **Deployments** tab
   - Click ⋯ menu on latest deployment
   - Click **"Redeploy"**
   - Or push a new commit to trigger automatic deployment

#### Method B: Via Vercel CLI
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variable
vercel env add TAVILY_API_KEY

# When prompted:
# - Enter your API key
# - Select: Production, Preview, Development (space to select, enter to confirm)

# Pull environment variables to local
vercel env pull .env.local

# Redeploy
vercel --prod
```

---

## 🔧 Troubleshooting

### Issue 1: "TAVILY_API_KEY is not defined"

**Symptoms:**
- Search returns fallback message: "Please ensure TAVILY_API_KEY is configured"
- Console shows: `⚠️ [Tavily] API key not configured`

**Solutions:**
1. ✅ **Check env variable is added** in Vercel Settings → Environment Variables
2. ✅ **Verify correct key name:** Must be exactly `TAVILY_API_KEY` (case-sensitive)
3. ✅ **Confirm all environments checked:** Production, Preview, Development
4. ✅ **REDEPLOY:** Changes only take effect after redeployment
5. ✅ **Clear Vercel cache:** Settings → Advanced → Clear Cache, then redeploy

### Issue 2: "Tavily API error: 401 Unauthorized"

**Symptoms:**
- Console shows: `❌ [Tavily] API error: 401`
- Search fails with authentication error

**Solutions:**
1. ✅ **Verify API key is valid:** Copy-paste from Tavily dashboard (no extra spaces)
2. ✅ **Check API key format:** Should start with `tvly-`
3. ✅ **Regenerate key:** In Tavily dashboard, delete old key and create new one
4. ✅ **Update in Vercel:** Replace old value with new key, then redeploy

### Issue 3: "Tavily API error: 429 Too Many Requests"

**Symptoms:**
- Console shows: `❌ [Tavily] API error: 429`
- Search fails after working previously

**Solutions:**
1. ✅ **Check usage limits:** Free tier = 1000 searches/month
2. ✅ **Upgrade plan:** Visit https://tavily.com/pricing for higher limits
3. ✅ **Implement caching:** Cache frequent searches to reduce API calls
4. ✅ **Rate limiting:** Add delay between searches in high-traffic scenarios

### Issue 4: Changes Not Taking Effect

**Symptoms:**
- Added env variable but still seeing old behavior
- Search still returns fallback results

**Solutions:**
1. ✅ **ALWAYS redeploy after adding env variables**
   ```bash
   # Via Dashboard: Deployments → ⋯ → Redeploy
   # Via CLI: vercel --prod
   # Via Git: git commit --allow-empty -m "redeploy" && git push
   ```

2. ✅ **Check deployment logs:**
   - Go to Deployment in Vercel
   - Click **"View Function Logs"**
   - Look for `[Tavily Search]` logs
   - Verify API key is being loaded

3. ✅ **Hard refresh browser:** Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

4. ✅ **Verify build completed:** Check Vercel deployment status shows "Ready"

---

## 📋 Complete Environment Variables Checklist

### Required for Full Functionality

```bash
# Tavily Search (Web Research)
TAVILY_API_KEY=tvly-xxxxxx

# Supabase (Database)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# SambaNova (LLM)
SAMBANOVA_API_KEY=xxxxxx

# Google OAuth (Gmail/Calendar)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# Microsoft OAuth (Outlook/Calendar)
MICROSOFT_CLIENT_ID=xxxxxx
MICROSOFT_CLIENT_SECRET=xxx
MICROSOFT_TENANT_ID=common

# Salesforce (Optional CRM)
SALESFORCE_CLIENT_ID=xxx
SALESFORCE_CLIENT_SECRET=xxx
```

### Verification Steps

1. **In Vercel Dashboard:**
   - Settings → Environment Variables
   - Count: Should see ~13 variables
   - All should have green ✓ for Production

2. **In Production Logs:**
   ```
   ✅ [Tavily Search] Searching for: latest AI news
   ✅ [Tavily Search] Found 5 results
   ```

3. **Test Search:**
   - Open your deployed app
   - Ask: "Search for latest AI news"
   - Should see: Real search results with relevance scores
   - Should NOT see: "Please ensure TAVILY_API_KEY is configured"

---

## 🚀 Best Practices

### 1. Never Commit API Keys to Git
```bash
# ✅ GOOD: Store in Vercel environment variables
# ❌ BAD: Add to .env.local and commit to Git
```

### 2. Use Different Keys for Development vs Production
```bash
# Development (local)
TAVILY_API_KEY=tvly-dev-xxxxxx

# Production (Vercel)
TAVILY_API_KEY=tvly-prod-xxxxxx
```

### 3. Rotate API Keys Periodically
- Regenerate every 90 days
- Update in Vercel immediately
- Redeploy to activate

### 4. Monitor Usage
- Check Tavily dashboard weekly
- Set up alerts for 80% usage
- Upgrade plan before hitting limits

---

## 📞 Support Resources

- **Tavily Docs:** https://docs.tavily.com
- **Tavily Support:** support@tavily.com
- **Vercel Docs:** https://vercel.com/docs/concepts/projects/environment-variables
- **Vercel Support:** https://vercel.com/support

---

## ✅ Success Checklist

- [ ] Signed up for Tavily account
- [ ] Got API key from Tavily dashboard
- [ ] Added `TAVILY_API_KEY` to Vercel (Production, Preview, Development)
- [ ] Redeployed Vercel project
- [ ] Verified deployment shows "Ready"
- [ ] Tested search in production app
- [ ] Confirmed search returns real results (not fallback message)
- [ ] Checked Function Logs show "✅ [Tavily Search] Found X results"

---

**Last Updated:** November 2025  
**Tavily Free Tier:** 1000 searches/month  
**Next Tier:** $100/month = 10,000 searches

