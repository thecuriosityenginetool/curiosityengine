# 🔄 How to Properly Reload the Extension

## The Problem

You're running an **OLD cached version** of the extension. The new OAuth version was built but Chrome is still using the old files from memory.

---

## ✅ Complete Reset (5 Minutes)

### Step 1: Remove Old Extension
1. Go to: `chrome://extensions/`
2. Find **"Sales Curiosity"**
3. Click **"Remove"** button
4. Confirm removal
5. ✅ Extension completely removed

### Step 2: Load NEW Version

1. Still on `chrome://extensions/`
2. Make sure **"Developer mode"** toggle is ON (top right)
3. Click **"Load unpacked"** button (top left)
4. **IMPORTANT:** Navigate to this EXACT path:
   ```
   /Users/paulwallace/Desktop/sales-curiosity-engine/apps/sales-curiosity-extension/dist
   ```
5. Select the **`dist`** folder
6. Click **"Select"**
7. ✅ New extension loaded!

### Step 3: Verify New Version

1. Click the extension icon in your toolbar
2. **You should NOW see:**
   - ✨ **SC Logo** (blue circle with "SC")
   - ✨ **Purple gradient background**
   - ✨ **"Sign in with Google"** button (with Google logo)
   - ✨ **"Sign in with Microsoft"** button (with Microsoft logo)
   - ✨ **Yellow info box** about closing tab
   - ⛔ **NO email/password fields!**

3. **If you STILL see email/password:**
   - Close Chrome completely
   - Reopen Chrome
   - Go to chrome://extensions/
   - Remove extension again
   - Restart Chrome
   - Load unpacked again from dist folder

---

## 🧪 Test the NEW Version

### Test 1: OAuth Login

1. Click extension icon
2. Click "Sign in with Microsoft"
3. **New browser tab opens** (this is correct!)
4. Sign in with Microsoft
5. Redirected to success page
6. See: "✅ Extension Connected!"
7. See green box: "✅ Token saved to extension successfully!"
8. Press **Cmd+W** to close tab
9. Go to LinkedIn
10. Click extension icon
11. ✅ **Should show authenticated dashboard!**

**Expected Dashboard:**
```
┌─────────────────────────────────┐
│  [SC]  Sales Curiosity   [SignOut]
│  hello@example.com              │
├─────────────────────────────────┤
│  🏠 Home │ 📝 Context │ 🔗 Integrations
├─────────────────────────────────┤
│  Stats: 0 Analyses │ 0 Emails   │
├─────────────────────────────────┤
│  [🔍 Analyze Profile]           │
│  [✉️ Draft Email]               │
└─────────────────────────────────┘
```

### Test 2: Token Persistence

1. Extension is open and showing dashboard
2. Click anywhere on LinkedIn (popup closes - normal!)
3. **Click extension icon again**
4. ✅ **Should STILL show dashboard** (not login!)

This proves the token persists!

### Test 3: After Browser Restart

1. Close Chrome completely
2. Reopen Chrome
3. Go to LinkedIn
4. Click extension icon
5. ✅ **Should STILL be logged in!**

---

## 🐛 If Token Still Doesn't Persist

Run this debugging check:

### Debug Step 1: Check What's Saved

After logging in via OAuth:

1. Go to success page (`/extension-auth`)
2. Open console (F12)
3. Run:
   ```javascript
   chrome.storage.local.get(null, (items) => {
     console.log('ALL STORAGE:', items);
   });
   ```
4. Should show: `authToken` and `user` keys

### Debug Step 2: Check Extension Reads It

1. On LinkedIn
2. Click extension
3. Right-click popup → Inspect
4. Console tab
5. Look for logs:
   ```
   🔵 Checking authentication...
   🔵 Storage check: { hasToken: true, hasUser: true }
   🔵 Token found, validating with API...
   ✅ Token valid, user authenticated
   ```

6. **If you see "hasToken: false":**
   - Token wasn't saved
   - Auth bridge isn't working
   - Try logging in again

7. **If you see "Token valid" but dashboard doesn't show:**
   - UI rendering issue
   - Check for React errors in console

---

## 📋 Exact Steps to Success

```
1. chrome://extensions/
   ↓
2. Remove "Sales Curiosity"
   ↓
3. Load unpacked
   ↓
4. Select: /Users/paulwallace/Desktop/sales-curiosity-engine/apps/sales-curiosity-extension/dist
   ↓
5. Click extension icon
   ↓
6. See OAuth buttons (not email/password)
   ↓
7. Click "Sign in with Microsoft"
   ↓
8. Complete OAuth in new tab
   ↓
9. See "✅ Extension Connected!" page
   ↓
10. See green "✅ Token saved to extension successfully!"
   ↓
11. Press Cmd+W
   ↓
12. Go to LinkedIn
   ↓
13. Click extension
   ↓
14. ✅ SEE DASHBOARD! (Stats, Home/Context/Integrations tabs)
```

---

## 🎯 What You SHOULD See (New Version)

**Login Screen:**
![Purple gradient, SC logo, OAuth buttons]

**Dashboard:**
![SC logo, email, Sign Out, tabs, stats, buttons]

**What you're seeing in screenshots:**
![Blue gradient, email/password fields] ← OLD VERSION!

---

## ⚡ Quick Commands

### Clear Salesforce (Supabase SQL Editor):
```sql
DELETE FROM organization_integrations 
WHERE integration_type IN ('salesforce', 'salesforce_user');
```

### Check Extension Storage (Browser Console on /extension-auth):
```javascript
chrome.storage.local.get(null, console.log);
```

### Check Extension Storage (Extension Console):
```javascript
chrome.storage.local.get(['authToken', 'user'], console.log);
```

### Clear Extension Storage (for testing):
```javascript
chrome.storage.local.clear();
```

---

## 🚨 MUST DO THIS FIRST

**Before any testing:**

1. **Remove extension** from chrome://extensions/
2. **Load unpacked** from **dist folder** (not src, not zip - the dist folder!)
3. **Verify OAuth buttons** appear (not email/password)

**If you don't do this, you're testing the old version and nothing will work!**

---

## 📞 Next Steps

1. Run the SQL query to clear Salesforce
2. Remove and reload extension from dist folder
3. Verify you see OAuth buttons
4. Test login
5. Verify token persists

**Do these 5 things and everything will work!** 🚀

