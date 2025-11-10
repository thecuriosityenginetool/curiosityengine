# 🚀 Monday.com Integration - Corrected Setup Guide

## ✅ What We Learned from Salesforce

You're absolutely right! Based on the Salesforce OAuth fix, we need:
- ✅ **TWO callback URLs** (org-level and user-level)
- ✅ **NO localhost** (production only)
- ✅ **Correct environment variable names** (REDIRECT_URI vs USER_REDIRECT_URI)

---

## 📋 Monday.com Developer Account Setup (15 minutes)

### Step 1: Create Monday.com Account

1. Go to: **https://monday.com/**
2. Sign up for free account or log in
3. Create a workspace if needed

---

### Step 2: Create Developer App

1. Go to: **https://monday.com/developers/apps**
2. Click **"Create App"**

**Fill in:**
```
App Name: Sales Curiosity Engine
Short Description: AI-powered sales intelligence for LinkedIn
```

---

### Step 3: Configure OAuth (CRITICAL - Get This Right!)

1. **Click "OAuth" in left sidebar**

2. **Add BOTH Redirect URLs:**

```
https://www.curiosityengine.io/api/monday/callback
https://www.curiosityengine.io/api/monday/user-callback
```

**Why you need BOTH:**
- **First URL (`/callback`):** For organization-level connections
  - Admins connecting Monday.com for whole team
  - Same pattern as Salesforce org OAuth
  
- **Second URL (`/user-callback`):** For individual user connections
  - Each user connecting their own Monday.com account
  - Same pattern as Salesforce user OAuth

**DO NOT add:**
- ❌ `http://localhost:3000/...` (not needed for production)

---

### Step 4: Set Permissions/Scopes

Select these scopes:
- ✅ `boards:read` - Read board data
- ✅ `boards:write` - Create and update items
- ✅ `users:read` - Read user information
- ✅ `me:read` - Read current user data

---

### Step 5: Get Client Credentials

1. Go to **"OAuth"** section in your app
2. Copy **Client ID** → Save this
3. Copy **Client Secret** → Click "Show" and save this

---

## 🌐 Vercel Environment Variables

### Add to Vercel (Settings → Environment Variables):

Add these **4 variables** (all environments):

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `MONDAY_CLIENT_ID` | [Your Client ID] | From Step 5 |
| `MONDAY_CLIENT_SECRET` | [Your Client Secret] | From Step 5 |
| `MONDAY_REDIRECT_URI` | `https://www.curiosityengine.io/api/monday/callback` | ⚠️ Use `/callback` NOT `/user-callback` |
| `MONDAY_USER_REDIRECT_URI` | `https://www.curiosityengine.io/api/monday/user-callback` | For individual users |

**CRITICAL:** Make sure `MONDAY_REDIRECT_URI` ends with `/callback` (not `/user-callback`)!

This was the exact issue we had with Salesforce - getting these mixed up prevents org-level OAuth from working.

---

## ✅ Checklist

Before proceeding to code files:

- [ ] Monday.com developer account created
- [ ] Monday.com app created
- [ ] BOTH callback URLs added (`/callback` and `/user-callback`)
- [ ] All 4 scopes selected
- [ ] Client ID copied and saved
- [ ] Client Secret copied and saved
- [ ] All 4 environment variables added to Vercel
- [ ] `MONDAY_REDIRECT_URI` uses `/callback` (not `/user-callback`)
- [ ] Applied to Production, Preview, and Development

---

## 🎯 Key Differences from Old Guide

| What | Old (Wrong) | New (Correct) |
|------|-------------|---------------|
| Callback URLs | Only `/user-callback` + localhost | BOTH `/callback` and `/user-callback` |
| Localhost | Included | ❌ Removed (not needed) |
| Redirect URI | Might use wrong URL | ✅ Explicitly `/callback` for org |

---

## 📝 Next Steps

After completing this setup:

1. ✅ **OAuth configured** in Monday.com
2. ✅ **Environment variables** in Vercel
3. ⏭️ **Create code files** (3 files - see main guide)
4. ⏭️ **Update prospects API** to check Monday.com
5. ⏭️ **Deploy and test**

---

## 🔗 Quick Links

- Monday.com Developers: https://monday.com/developers/apps
- Full Guide: `MONDAY_HUBSPOT_INTEGRATION_GUIDE.md`
- Quick Reference: `MONDAY_HUBSPOT_QUICK_REFERENCE.md`
- Implementation Checklist: `CRM_IMPLEMENTATION_CHECKLIST.md`

---

**Good catch on the callback URLs! This will save you from the same OAuth issues we had with Salesforce.** 🎯

Ready to start? Follow this guide for the Monday.com setup, then move to the code files!

