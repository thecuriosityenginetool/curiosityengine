# 🔍 Debug Salesforce Org OAuth Issue

## Error Seen

```
Navigated to https://www.curiosityengine.io/dashboard?error=Invalid%20callback%20data
❌ OAuth Error: Invalid callback data
```

## 🎯 Quick Diagnosis

The error "Invalid callback data" comes from the callback route when it can't decode the state parameter or when organizationId/userId is missing.

---

## ✅ IMMEDIATE FIX

### Issue: Wrong Callback URL in Salesforce

**The problem:** Your Salesforce Connected App might only have the user-callback URL configured, not the org callback URL.

### Fix in Salesforce:

1. **Go to Salesforce Setup:**
   - Click gear icon ⚙️ → Setup
   - Search for "App Manager"
   - Find "Sales Curiosity Engine" app
   - Click ▼ → Edit

2. **Check Callback URLs section:**
   
   You need **BOTH** of these:
   ```
   https://www.curiosityengine.io/api/salesforce/callback
   https://www.curiosityengine.io/api/salesforce/user-callback
   ```

3. **If only user-callback is there:**
   - Add the org callback URL: `https://www.curiosityengine.io/api/salesforce/callback`
   - Click Save

4. **Try connecting org Salesforce again**

---

## 🔍 Check Vercel Logs

To see the actual error:

1. Go to **Vercel Dashboard**
2. Click **Logs** or **Functions**
3. Filter for "Salesforce Callback"
4. Look for errors around the time you clicked "Allow"

You might see something like:
```
❌ [Salesforce Callback] Missing required state data
❌ [Salesforce Callback] Invalid state parameter
```

---

## 📋 Callback URL Requirements

### User-Level OAuth:
- **Callback:** `/api/salesforce/user-callback`
- **Used when:** Individual users connect their Salesforce
- **Working:** ✅ Yes

### Org-Level OAuth:
- **Callback:** `/api/salesforce/callback`
- **Used when:** Admins connect organization Salesforce
- **Working:** ❌ Needs callback URL in Salesforce app

---

## ⚡ Quick Check

Run this in browser console when on the Salesforce allow page:

```javascript
// Check the callback URL Salesforce will use
const urlParams = new URLSearchParams(window.location.search);
console.log('Redirect URI:', urlParams.get('redirect_uri'));
```

**Expected for org-level:** `https://www.curiosityengine.io/api/salesforce/callback`

**If you see:** `/api/salesforce/user-callback` → That's the problem!

---

## 🚀 Solution Steps

1. **Add org callback URL to Salesforce Connected App**
   ```
   https://www.curiosityengine.io/api/salesforce/callback
   ```

2. **Ensure you have both URLs:**
   - User: `/api/salesforce/user-callback` ✅
   - Org: `/api/salesforce/callback` ← Add this!

3. **Save Salesforce app settings**

4. **Try connecting org Salesforce again**

---

## 🔍 Alternative: Check Environment Variables

Make sure Vercel has:

```bash
SALESFORCE_CLIENT_ID=your_consumer_key
SALESFORCE_CLIENT_SECRET=your_consumer_secret
SALESFORCE_REDIRECT_URI=https://www.curiosityengine.io/api/salesforce/callback
```

**Note:** `SALESFORCE_REDIRECT_URI` should point to `/callback` (org-level), not `/user-callback`

---

## 📊 What to Check

- [ ] Salesforce Connected App has `/api/salesforce/callback` URL
- [ ] Salesforce Connected App has `/api/salesforce/user-callback` URL
- [ ] Vercel has `SALESFORCE_REDIRECT_URI` set correctly
- [ ] Vercel has `SALESFORCE_CLIENT_ID` and `SALESFORCE_CLIENT_SECRET`
- [ ] Check Vercel logs for actual error details

---

**Most likely fix:** Add `/api/salesforce/callback` to your Salesforce Connected App callback URLs!

Let me know what you find!

