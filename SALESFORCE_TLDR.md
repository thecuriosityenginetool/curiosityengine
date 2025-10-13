# Salesforce Integration - TL;DR

## 🎉 Already Built!

Your Salesforce integration is **100% complete**. Users can connect their own Salesforce accounts and get CRM-aware AI emails. You just need to add OAuth credentials.

---

## ⚡ Setup (20 minutes)

### 1. Create Salesforce Developer Account
→ https://developer.salesforce.com/signup

### 2. Create Connected App
```
Salesforce → Setup → App Manager → New Connected App

Name: Sales Curiosity Engine
Enable OAuth: ✅
Callback URLs:
  - https://www.curiosityengine.io/api/salesforce/user-callback
  - http://localhost:3000/api/salesforce/user-callback
Scopes: api, refresh_token, offline_access, full
```

### 3. Get Credentials
```
Consumer Key = SALESFORCE_CLIENT_ID
Consumer Secret = SALESFORCE_CLIENT_SECRET
```

### 4. Add to Vercel
```
Vercel → Project → Settings → Environment Variables

SALESFORCE_CLIENT_ID = [paste Consumer Key]
SALESFORCE_CLIENT_SECRET = [paste Consumer Secret]
SALESFORCE_REDIRECT_URI = https://www.curiosityengine.io/api/salesforce/user-callback

→ Redeploy
```

---

## ✅ Done!

Users can now:
1. Open Chrome extension → Settings → Integrations
2. Click "Connect Salesforce"
3. Log in with their Salesforce
4. Get CRM-aware emails automatically

---

## 📖 Full Guides

- **For you:** `SALESFORCE_QUICK_SETUP.md` (setup checklist)
- **For you:** `SALESFORCE_SETUP_COMPLETE_GUIDE.md` (detailed guide)
- **For users:** `USER_GUIDE_SALESFORCE.md` (how to connect)
- **Overview:** `SALESFORCE_IMPLEMENTATION_READY.md` (what's built)

---

## 🎯 What It Does

**Without Salesforce:**
```
Generate email → Generic cold email
```

**With Salesforce:**
```
Generate email
   ↓
✅ Check user's Salesforce CRM
   ↓
IF found: "Following up on our conversation..." (follow-up style)
IF new: "I came across your profile..." (cold style) + auto-creates contact
   ↓
Perfect email + CRM stays synced!
```

---

## 🔗 Key Links

- Salesforce Developer: https://developer.salesforce.com/signup
- Your Vercel: https://vercel.com
- Your App: https://www.curiosityengine.io

---

**Need more info? See `SALESFORCE_QUICK_SETUP.md` →**

