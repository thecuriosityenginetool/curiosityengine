# 🚨 Critical Issues & Fixes

## The Real Problem

Looking at your screenshots, **you're still using the OLD extension version!** 

The extension in your screenshot shows:
- ❌ Email/password login fields
- ❌ Old blue branding
- ❌ Old authentication system

But the NEW version has:
- ✅ Google/Microsoft OAuth buttons
- ✅ Orange branding (#F95B14)
- ✅ Auth bridge

**You need to reload the extension with the latest build!**

---

## 🔧 Fix Everything (10 Minutes)

### Fix 1: Clear Old Salesforce Data (2 min)

1. Go to your **Supabase Dashboard**: https://app.supabase.com
2. Go to **SQL Editor**
3. Run this query:
   ```sql
   DELETE FROM organization_integrations 
   WHERE integration_type IN ('salesforce', 'salesforce_user');
   ```
4. Click "Run"
5. ✅ Old Salesforce connection cleared

### Fix 2: Reload Extension with NEW Version (3 min)

**IMPORTANT:** You must reload the extension!

1. Go to: `chrome://extensions/`
2. Find "Sales Curiosity"
3. Click **Remove** (yes, remove it completely)
4. Click **Load unpacked**
5. Navigate to: `/Users/paulwallace/Desktop/sales-curiosity-engine/apps/sales-curiosity-extension/dist`
6. Select the **dist** folder (not the ZIP!)
7. ✅ Extension reloaded with new code

### Fix 3: Verify New Version Loaded (1 min)

1. Click the extension icon
2. **You should see:**
   - ✨ Google button with logo
   - ✨ Microsoft button with logo
   - ✨ Purple gradient background
   - ✨ NO email/password fields

3. **If you still see old version:**
   - Hard refresh: Ctrl+Shift+R or Cmd+Shift+R
   - Or try: Remove extension → Reload Chrome → Add extension again

### Fix 4: Test OAuth Login (5 min)

1. Click "Sign in with Microsoft"
2. Complete OAuth
3. See success page with green "✅ Token saved"
4. Press **Cmd+W** to close tab
5. Go to LinkedIn
6. Click extension icon
7. ✅ Should show authenticated dashboard!

**Check console:**
- Right-click extension → Inspect → Console
- Should see: "✅ Token valid, user authenticated"

---

## 🎯 Why Extension "Disappears"

**This is NORMAL Chrome behavior!**

Extension popups ALWAYS close when:
- You click outside them
- You switch tabs
- You click on the webpage

**But the LOGIN STATE PERSISTS!**

Every time you click the extension icon, it should:
1. Check chrome.storage for token
2. If token exists → Show dashboard
3. If no token → Show login

---

## 🐛 Debugging Token Persistence

If extension still doesn't stay logged in:

### Check Storage:

1. After logging in via OAuth
2. Go to the success page
3. Open browser console (F12)
4. Type:
   ```javascript
   chrome.storage.local.get(['authToken', 'user'], (result) => {
     console.log('Storage check:', result);
   });
   ```
5. Should show: `{ authToken: "eyJ...", user: {...} }`

If storage is empty, the auth bridge isn't working.

### Check Extension Console:

1. Go to LinkedIn
2. Click extension icon
3. Right-click popup → Inspect
4. Console tab
5. Should see logs:
   - "🔵 Checking authentication..."
   - "🔵 Storage check: { hasToken: true, hasUser: true }"
   - "✅ Token valid, user authenticated"

If you see "⚠️ No token found in storage", the token wasn't saved.

---

## 🎨 Logo/Branding Issue

The Logo component is already updated with your SC logo. But you're seeing the old version because you haven't reloaded the extension with the new build.

After reloading (Fix 2 above), you should see:
- ✅ SC logo (blue circle with "SC" letters)
- ✅ Orange primary color (#F95B14)
- ✅ Modern gradient design

---

## ⚠️ About OAuth Opening Web App

**This is CORRECT and NECESSARY!**

OAuth **cannot** be done inside a popup extension because:
- OAuth providers (Google, Microsoft, Salesforce) **block iframe embedding**
- Extension popups are too small for OAuth consent screens
- Security requirements mandate full browser window

**The flow is:**
1. Extension opens full browser tab
2. User completes OAuth in that tab
3. User closes tab
4. Extension retrieves token
5. User clicks extension icon again → Sees dashboard

**This is how ALL extensions with OAuth work!** (Gmail, Notion, Slack, etc.)

---

## 🔧 Quick Fix Script

Run this to completely reset and test fresh:

```bash
# 1. Clear old Salesforce data (run in Supabase SQL Editor)
DELETE FROM organization_integrations WHERE integration_type IN ('salesforce', 'salesforce_user');

# 2. Reload extension
# Go to chrome://extensions/
# Remove "Sales Curiosity"
# Load unpacked from: apps/sales-curiosity-extension/dist

# 3. Test
# Click extension
# Should see NEW OAuth buttons (not email/password)
```

---

## ✅ Success Criteria

After reloading extension, you should see:

**Login Screen (If Not Logged In):**
```
┌─────────────────────────────────┐
│       [SC Logo]                 │
│    Sales Curiosity              │
│ AI-Powered LinkedIn Intelligence│
│                                 │
│  [G] Sign in with Google        │ ← White button with Google logo
│  [M] Sign in with Microsoft     │ ← White button with Microsoft logo
│                                 │
│  Note: After signing in on the  │
│  web page, close that tab and   │
│  return here...                 │
└─────────────────────────────────┘
```

**NOT this:**
```
❌ Email field
❌ Password field
❌ Sign in / Sign up buttons
```

---

## 🎯 The Core Issue

**You're testing the OLD version of the extension!**

The latest build has:
- ✅ OAuth-only (built 10 minutes ago)
- ✅ Auth bridge (built 10 minutes ago)
- ✅ New branding (built 10 minutes ago)

But your Chrome is still running the old version from memory!

---

## 🚀 Do This Now:

1. **Remove extension completely** from chrome://extensions/
2. **Load the dist folder** (not ZIP, the actual dist folder)
3. **Click extension** - should see OAuth buttons
4. **Sign in with Microsoft** - tab opens (correct!)
5. **Complete OAuth** - see success page
6. **Press Cmd+W** to close
7. **Click extension again** - should be logged in!

---

**The token persistence issue will be fixed once you load the NEW version with the auth bridge!**

Want me to create a step-by-step video script showing exactly what to do?
