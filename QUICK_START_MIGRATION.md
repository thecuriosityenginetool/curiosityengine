# ⚡ Quick Start: Migration to New Accounts

**Time Required:** ~30 minutes

---

## 📝 **What You'll Need:**

Before starting, gather these:
- [ ] New GitHub account
- [ ] New Vercel account  
- [ ] New Supabase account
- [ ] OpenAI API Key
- [ ] Salesforce Consumer Key (from Salesforce Connected App)
- [ ] Salesforce Consumer Secret (from Salesforce Connected App)

---

## 🚀 **5-Step Migration:**

### **1. GitHub** (2 min)

```bash
# Create new repo at: https://github.com/new
# Name: sales-curiosity-engine
# Then:

cd /Users/paulwallace/Desktop/sales-curiosity-engine
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/sales-curiosity-engine.git
git push -u origin main
```

---

### **2. Supabase** (5 min)

1. **https://supabase.com** → New project
   - Name: `sales-curiosity`
   - Create password (save it!)
   - Wait ~2 min for creation

2. **SQL Editor** → New query
   - Open: `supabase-schema-organizations.sql`
   - Copy all → Paste → Run ✅

3. **Settings → API** → Save these:
   - Project URL: `https://xxx.supabase.co`
   - anon key: `eyJhbGc...`
   - service_role key: `eyJhbGc...`

4. **Authentication → URL Configuration:**
   - Site URL: `https://your-app.vercel.app` (update after Vercel)
   - Redirect URLs: `https://your-app.vercel.app/**, http://localhost:3000/**, chrome-extension://*`

---

### **3. Vercel** (10 min)

1. **https://vercel.com** → Add New → Project
2. Import from GitHub (select your new repo)
3. **⚠️ Root Directory:** `apps/sales-curiosity-web`
4. **Add Environment Variables:**

```bash
# Generate secret first:
# Run: openssl rand -base64 32

NEXT_PUBLIC_SUPABASE_URL=<from_supabase_step_3>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from_supabase_step_3>
SUPABASE_SERVICE_ROLE_KEY=<from_supabase_step_3>
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=<generated_secret>
OPENAI_API_KEY=sk-proj-...
SALESFORCE_CLIENT_ID=<your_salesforce_consumer_key>
SALESFORCE_CLIENT_SECRET=<your_salesforce_consumer_secret>
SALESFORCE_REDIRECT_URI=https://your-project.vercel.app/api/salesforce/callback
USE_MOCK_AI=0
```

5. Click **"Deploy"** (wait ~3 min)
6. Copy your Vercel URL: `your-project.vercel.app`
7. **Go back to Environment Variables**
8. Update these 3 with your real URL:
   - `NEXT_PUBLIC_APP_URL`
   - `NEXTAUTH_URL`
   - `SALESFORCE_REDIRECT_URI`
9. **Deployments** → ... → **"Redeploy"**

---

### **4. Salesforce** (2 min)

Salesforce Setup → External Client Apps → Sales Curiosity Engine → Settings

**Update Callback URLs to:**
```
https://your-new-vercel-url.vercel.app/api/salesforce/callback
https://your-new-vercel-url.vercel.app/api/salesforce/user-callback
```

**Save!**

---

### **5. Extension** (5 min)

Run this helper script:

```bash
cd /Users/paulwallace/Desktop/sales-curiosity-engine
./UPDATE_EXTENSION_URL.sh
# Enter your Vercel URL when prompted
```

Or manually:
1. Edit `apps/sales-curiosity-extension/src/popup.tsx`
2. Line 18: Change URL to your new Vercel URL
3. Run: `cd apps/sales-curiosity-extension && npm run build`
4. Chrome: `chrome://extensions/` → Reload extension

---

## ✅ **Testing (5 min)**

### Test 1: Web App
1. Go to: `https://your-new-vercel-url.vercel.app`
2. Sign up with test account
3. Verify login works ✅

### Test 2: Extension
1. Open Chrome extension
2. Log in (use account from Test 1)
3. Verify connection ✅

### Test 3: Salesforce
1. Extension → Integrations tab
2. Click "Connect Salesforce"
3. Authorize in Salesforce
4. Verify "Connected" badge ✅

### Test 4: Full Flow
1. Go to LinkedIn profile
2. Extension → Draft Email
3. Verify Salesforce status appears
4. Check Salesforce - new contact added! ✅

---

## 🎯 **Summary:**

| Step | Service | Time | Status |
|------|---------|------|--------|
| 1 | GitHub | 2 min | ⬜ |
| 2 | Supabase | 5 min | ⬜ |
| 3 | Vercel | 10 min | ⬜ |
| 4 | Salesforce | 2 min | ⬜ |
| 5 | Extension | 5 min | ⬜ |
| 6 | Testing | 5 min | ⬜ |

**Total: ~30 minutes**

---

## 🆘 **Need Help?**

See detailed guide: **MIGRATION_GUIDE.md**

---

## 🚦 **Start Here:**

1. Create GitHub repo: https://github.com/new
2. Then run: `git remote remove origin && git remote add origin <your-new-repo-url>`
3. Continue with Supabase...

**Let's do this! 🚀**
