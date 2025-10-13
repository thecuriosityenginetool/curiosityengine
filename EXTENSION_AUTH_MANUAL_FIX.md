# Extension OAuth - Manual Workaround

## The Problem

The extension OAuth flow has a technical limitation:
- Web pages can't directly write to `chrome.storage.local`
- Extension can't read web app's cookies/session
- They're isolated security contexts

## Quick Manual Workaround (For Testing Now)

### Option 1: Use Browser Dev Tools

1. **Log in to web app:**
   - Go to https://www.curiosityengine.io/login
   - Sign in with Microsoft/Google

2. **Get your auth token:**
   - Open browser dev tools (F12)
   - Go to Console tab
   - Paste and run:
   ```javascript
   fetch('/api/extension/oauth-auth', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email: 'YOUR_EMAIL_HERE' })
   })
   .then(r => r.json())
   .then(data => {
     console.log('Your auth token:', data.authToken);
     console.log('Copy the command below and run in extension console:');
     console.log(`chrome.storage.local.set({ authToken: '${data.authToken}', user: ${JSON.stringify(data.user)} })`);
   });
   ```
   - Replace `YOUR_EMAIL_HERE` with your actual email

3. **Store in extension:**
   - Open extension popup
   - Right-click → Inspect
   - Go to Console tab
   - Paste the command from step 2 and run it

4. **Reload extension:**
   - Close and reopen extension popup
   - Should now be logged in!

---

## Proper Solution (Needs Implementation)

### Option A: Content Script Bridge

1. Add content script for curiosityengine.io domain
2. Content script reads token from localStorage
3. Sends to extension background via message passing
4. Extension stores in chrome.storage.local

### Option B: Polling

1. Extension opens login page
2. User logs in
3. Extension polls web app API every 2 seconds
4. API checks session cookie
5. When logged in, returns token
6. Extension stores token

### Option C: One-Time Code

1. Web app generates one-time code after OAuth
2. Shows code to user
3. User enters code in extension
4. Extension exchanges code for token

---

## For Now (Simple Test)

Just use the manual dev tools method above to test the extension UI with OAuth authentication.

Once it works, we can implement the proper automated flow.

---

**Current Status:**
- ✅ Extension UI updated with OAuth buttons
- ✅ Web app OAuth working
- ✅ /extension-auth page created
- ⏳ Need: Automated token transfer mechanism
- ✅ Workaround: Manual dev tools method (above)

