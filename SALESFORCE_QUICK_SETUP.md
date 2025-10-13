# ⚡ Salesforce Integration - Quick Setup (20 minutes)

## 📋 What You'll Need

- [ ] Email address for Salesforce Developer signup
- [ ] Access to Vercel dashboard
- [ ] 20 minutes of time

---

## Step 1: Create Salesforce Developer Account (5 min)

1. Go to: **https://developer.salesforce.com/signup**
2. Fill out the form (use a unique username like `yourname@yourcompany.dev`)
3. Verify email
4. Set password
5. ✅ Log in at **https://login.salesforce.com**

---

## Step 2: Create Connected App (10 min)

1. In Salesforce, click ⚙️ **Setup**
2. Search: **App Manager**
3. Click: **New Connected App**

**Fill in:**
```
Connected App Name: Sales Curiosity Engine
API Name: Sales_Curiosity_Engine
Contact Email: [your email]

☑️ Enable OAuth Settings

Callback URLs:
https://www.curiosityengine.io/api/salesforce/user-callback
http://localhost:3000/api/salesforce/user-callback

Selected OAuth Scopes:
- Access and manage your data (api)
- Perform requests on your behalf at any time (refresh_token, offline_access)  
- Full access (full)
```

4. Click **Save** → **Continue**
5. Copy **Consumer Key** → Save it!
6. Click **Manage Consumer Details** → Copy **Consumer Secret** → Save it!

---

## Step 3: Configure App Policies

1. Back in **App Manager**, find your app
2. Click ▼ → **Manage**
3. Click **Edit Policies**

**Set:**
```
Permitted Users: All users may self-authorize
IP Relaxation: Relax IP restrictions
Refresh Token Policy: Refresh token is valid until revoked
```

4. Click **Save**

---

## Step 4: Add to Vercel (5 min)

1. Go to **https://vercel.com** → Your project
2. **Settings** → **Environment Variables**

**Add these 3 variables (all environments):**

| Name | Value |
|------|-------|
| `SALESFORCE_CLIENT_ID` | [Consumer Key from Step 2] |
| `SALESFORCE_CLIENT_SECRET` | [Consumer Secret from Step 2] |
| `SALESFORCE_REDIRECT_URI` | `https://www.curiosityengine.io/api/salesforce/user-callback` |

3. Go to **Deployments** → Latest deployment → **...** → **Redeploy**
4. Wait for deployment to complete (1-2 min)

---

## Step 5: Test It! ✅

1. Go to: **https://www.curiosityengine.io**
2. Log in
3. Go to **Settings** or **Integrations**
4. Click **Connect Salesforce**
5. Authorize
6. See "Connected" status ✅

---

## ✅ Success Checklist

- [ ] Salesforce Developer account created
- [ ] Connected App created in Salesforce
- [ ] Consumer Key and Secret copied
- [ ] Both added to Vercel
- [ ] Application redeployed
- [ ] Tested connection - shows "Connected"

---

## 🎯 What Users Can Now Do

✅ Connect their own Salesforce (web app or extension)
✅ Check if LinkedIn profiles exist in their CRM
✅ Get AI emails tailored as "follow-up" or "cold outreach"
✅ Auto-create contacts in Salesforce

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "OAuth error" | Check callback URL matches exactly (no trailing slash) |
| "Invalid client" | Double-check Client Secret in Vercel |
| "Unauthorized" | Make sure app redeployed after adding env vars |
| "Not found" | Person will be auto-created on first email draft |

---

## 📞 Reference Values

**Salesforce Connected App Settings:**
- Name: `Sales Curiosity Engine`
- Callback: `https://www.curiosityengine.io/api/salesforce/user-callback`
- Scopes: `api`, `refresh_token`, `offline_access`, `full`

**Vercel Environment Variables:**
- `SALESFORCE_CLIENT_ID` = Consumer Key
- `SALESFORCE_CLIENT_SECRET` = Consumer Secret
- `SALESFORCE_REDIRECT_URI` = Your domain + `/api/salesforce/user-callback`

---

## 🚀 Done!

Your Salesforce integration is now live! Each user can connect their own Salesforce account and get CRM-aware AI email generation.

**See `SALESFORCE_SETUP_COMPLETE_GUIDE.md` for detailed explanations and troubleshooting.**

