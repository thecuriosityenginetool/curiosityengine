# 🔍 Salesforce Connection Diagnostic

## The Problem:
When clicking "Connect Salesforce" in extension, it opens `https://www.curiosityengine.io/login` instead of Salesforce OAuth.

## Possible Causes:

### 1. API is returning error/redirect
The `/api/salesforce/auth-user` might be returning an error that causes fallback to login.

### 2. Extension popup console has the answer
Need to inspect the POPUP (not the webpage) to see console logs.

### 3. apiBase might be wrong
The extension might still have old URL cached in localStorage.

---

## 🧪 Manual Test Steps:

### Test 1: Check Extension's apiBase

1. Open extension popup
2. Press F12 on the POPUP (or right-click extension icon → "Inspect popup")
3. In console, type:
   ```javascript
   localStorage.getItem("apiBase")
   ```
4. Should show: `"https://www.curiosityengine.io"`

If it shows something else, clear it:
```javascript
localStorage.setItem("apiBase", "https://www.curiosityengine.io")
```

Then close and reopen extension.

---

### Test 2: Manually Call the API

With popup console open:

```javascript
// Get auth token
chrome.storage.local.get(['authToken'], async (result) => {
  const token = result.authToken;
  console.log('Token:', !!token);
  
  // Call API
  const response = await fetch('https://www.curiosityengine.io/api/salesforce/auth-user', {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });
  
  const data = await response.json();
  console.log('Response:', data);
});
```

This will show EXACTLY what the API returns.

---

### Test 3: Check for Hidden Errors

The button might be triggering but failing silently. Check popup console for:
- Any red errors
- The blue circle logs (🔵)
- Any alerts that appear

---

## Quick Fix Option:

If the above doesn't work, let's try a DIRECT approach - skip the extension button and just test the OAuth flow directly:

1. Get your user ID from Supabase
2. Manually construct the OAuth URL
3. Test it directly in browser

Would you like me to create this direct test?
