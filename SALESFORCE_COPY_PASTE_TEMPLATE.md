# Salesforce Setup - Copy/Paste Template

Use this document while setting up. Fill in the blanks as you go!

---

## 📝 Step 1: Salesforce Developer Account

### Sign up at: https://developer.salesforce.com/signup

**Save these credentials:**
```
Salesforce Username: _________________________________
(example: paul.wallace@salescuriositydev.com)

Salesforce Password: _________________________________

Security Question Answer: _________________________________
```

---

## 🔧 Step 2: Salesforce Connected App Settings

### Go to: Salesforce → Setup → App Manager → New Connected App

Copy and paste these values:

#### Basic Information:
```
Connected App Name: Sales Curiosity Engine
API Name: Sales_Curiosity_Engine
Contact Email: [YOUR EMAIL HERE]
```

#### Enable OAuth Settings:
```
☑️ Enable OAuth Settings

Callback URLs (add both):
https://www.curiosityengine.io/api/salesforce/user-callback
http://localhost:3000/api/salesforce/user-callback

Selected OAuth Scopes (add all 3):
☑️ Access and manage your data (api)
☑️ Perform requests on your behalf at any time (refresh_token, offline_access)
☑️ Full access (full)

☑️ Require Secret for Web Server Flow
☑️ Require Secret for Refresh Token Flow
```

#### After Saving:
```
Consumer Key (Client ID): 
_____________________________________________________
_____________________________________________________
(copy this entire long string)

Consumer Secret (Client Secret):
_____________________________________________________
(click "Manage Consumer Details" to reveal)
```

#### Edit Policies (after creation):
```
App Manager → Your App → Manage → Edit Policies

Permitted Users: All users may self-authorize
IP Relaxation: Relax IP restrictions
Refresh Token Policy: Refresh token is valid until revoked
```

---

## 🚀 Step 3: Vercel Environment Variables

### Go to: https://vercel.com → Your Project → Settings → Environment Variables

Add these 3 variables (copy values from above):

#### Variable 1:
```
Name: SALESFORCE_CLIENT_ID
Value: [PASTE YOUR CONSUMER KEY HERE]
Environments: ☑️ Production ☑️ Preview ☑️ Development
```

#### Variable 2:
```
Name: SALESFORCE_CLIENT_SECRET
Value: [PASTE YOUR CONSUMER SECRET HERE]
Environments: ☑️ Production ☑️ Preview ☑️ Development
```

#### Variable 3:
```
Name: SALESFORCE_REDIRECT_URI
Value: https://www.curiosityengine.io/api/salesforce/user-callback
Environments: ☑️ Production ☑️ Preview
```

---

## 🔄 Step 4: Redeploy

### In Vercel:
```
→ Go to Deployments tab
→ Find latest deployment
→ Click "..." menu
→ Click "Redeploy"
→ Wait 1-2 minutes
```

---

## ✅ Step 5: Test

### Test URL (should redirect to Salesforce login):
```
https://www.curiosityengine.io/settings
→ Click "Connect Salesforce"
→ Should open Salesforce OAuth
```

### Or test from extension:
```
→ Open Chrome extension
→ Settings tab
→ Integrations section
→ Click "Connect Salesforce"
```

---

## 📋 Quick Reference

### Important URLs:
```
Salesforce Login: https://login.salesforce.com
Salesforce Setup: https://login.salesforce.com/setup
Your Vercel Dashboard: https://vercel.com
Your Production App: https://www.curiosityengine.io
```

### OAuth Callback URLs (for reference):
```
Production: https://www.curiosityengine.io/api/salesforce/user-callback
Local Dev: http://localhost:3000/api/salesforce/user-callback
```

### Environment Variable Names:
```
SALESFORCE_CLIENT_ID
SALESFORCE_CLIENT_SECRET
SALESFORCE_REDIRECT_URI
```

---

## 🐛 If Something Goes Wrong

### "OAuth error" or "Redirect URI mismatch"
→ Check callback URL in Salesforce Connected App matches EXACTLY:
```
https://www.curiosityengine.io/api/salesforce/user-callback
```
(no trailing slash, no extra characters)

### "Invalid client credentials"
→ Double-check you copied the entire Consumer Secret
→ Try regenerating secret in Salesforce and updating in Vercel

### "Failed to initiate OAuth"
→ Make sure you redeployed Vercel after adding env vars
→ Check env vars are in "Production" environment

---

## ✅ Success Checklist

Once setup is complete:

- [ ] Salesforce Developer account created
- [ ] Can log in to https://login.salesforce.com
- [ ] Connected App created in Salesforce
- [ ] OAuth settings configured
- [ ] Callback URLs added (both)
- [ ] Consumer Key copied
- [ ] Consumer Secret copied
- [ ] `SALESFORCE_CLIENT_ID` added to Vercel
- [ ] `SALESFORCE_CLIENT_SECRET` added to Vercel
- [ ] `SALESFORCE_REDIRECT_URI` added to Vercel
- [ ] Vercel redeployed
- [ ] Tested connection from web app
- [ ] Tested connection from extension
- [ ] Generated email with Salesforce context
- [ ] Verified new contact created in Salesforce

---

## 📞 Keep This Handy

Save your credentials somewhere safe:

```
=================================
SALESFORCE OAUTH CREDENTIALS
=================================

Salesforce Login Username: ___________________________

Consumer Key (SALESFORCE_CLIENT_ID): 
_____________________________________________________

Consumer Secret (SALESFORCE_CLIENT_SECRET):
_____________________________________________________

Callback URL: https://www.curiosityengine.io/api/salesforce/user-callback

Date Setup: _______________
=================================
```

---

**Now go to `SALESFORCE_QUICK_SETUP.md` and follow the steps!**

**Or jump straight to:**
1. https://developer.salesforce.com/signup
2. Create account
3. Go to Setup → App Manager → New Connected App
4. Follow values above
5. Add to Vercel
6. Done! 🎉

