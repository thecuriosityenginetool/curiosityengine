# 🌐 Custom Domain Setup & Final Configuration

## Step 1: Add Custom Domain to Vercel

1. **Go to Vercel Dashboard**
2. Select your project: **curiosityengine-sales-curiosity-web**
3. Click **Settings** → **Domains**
4. Click **"Add"** button
5. Enter your domain (e.g., `app.yourdomain.com` or `yourdomain.com`)
6. Follow Vercel's DNS instructions to add:
   - **A Record** or **CNAME Record** in your domain registrar
7. Wait for DNS propagation (~5-60 minutes)

---

## Step 2: Update Environment Variables with Custom Domain

Once your domain is active, update these 3 variables in Vercel:

**Settings → Environment Variables**

| Variable | New Value |
|----------|-----------|
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` |
| `NEXTAUTH_URL` | `https://yourdomain.com` |
| `SALESFORCE_REDIRECT_URI` | `https://yourdomain.com/api/salesforce/callback` |

**Then: Deployments → ... → Redeploy**

---

## Step 3: Update Salesforce Callback URLs

**Salesforce Setup → External Client Apps → Sales Curiosity Engine → Settings**

In the **"Callback URL"** field, update to:
```
https://yourdomain.com/api/salesforce/callback
https://yourdomain.com/api/salesforce/user-callback
```

**Save!**

---

## Step 4: Update Supabase Auth URLs

**Supabase → Authentication → URL Configuration**

- **Site URL:** `https://yourdomain.com`
- **Redirect URLs:**
  ```
  https://yourdomain.com/**
  http://localhost:3000/**
  chrome-extension://*
  ```

**Save!**

---

## Step 5: Update Chrome Extension

```bash
cd /Users/paulwallace/Desktop/sales-curiosity-engine
./UPDATE_EXTENSION_URL.sh
# Enter: yourdomain.com
```

Then:
- Rebuild extension
- Reload in `chrome://extensions/`

---

## 🎯 After Custom Domain is Set Up:

Everything will work at your custom domain and you'll never have to update callback URLs again!

---

## 📋 Quick Reference:

**Your Custom Domain:** `_________________` (fill in)

**URLs to Update:**
- [ ] Vercel env vars (3 variables)
- [ ] Salesforce callbacks (2 URLs)
- [ ] Supabase auth URLs
- [ ] Chrome extension API URL

**Total Time:** ~15 minutes (after DNS propagation)

---

**Let me know your custom domain and I can give you the exact values to use!**
