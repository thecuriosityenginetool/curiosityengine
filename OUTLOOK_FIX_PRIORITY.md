# 🎯 Fix Outlook Connection - DO THIS IN ORDER

## Priority 1: Check Vercel Logs (5 minutes)

**Why:** The logs will tell us EXACTLY what's failing

1. Go to https://vercel.com → Your Project → **Logs** tab
2. Try connecting Outlook ONE more time
3. In logs search box, type: `outlook`
4. Look for these specific messages:

### ✅ If you see SUCCESS:
```
🔵 Outlook callback received
✅ Tokens received
✅ Integration created successfully
```
→ **Skip to Priority 3 (Database Check)**

### ❌ If you see ERROR:
```
❌ Error inserting integration: new row violates row-level security
```
→ **Go to Priority 2 (Fix RLS)**

### ❌ If you see NOTHING:
- No logs for `/api/outlook/user-callback` appear
→ **Go to Priority 4 (Azure AD Config)**

---

## Priority 2: Fix RLS Policies (2 minutes)

**Only if** Vercel logs show RLS error

1. Go to Supabase Dashboard → **SQL Editor**
2. Run the file: `FIX_OUTLOOK_RLS_NOW.sql`
3. Verify you see: `✅ RLS policies fixed`
4. Try connecting Outlook again
5. Check Vercel logs again - should now see ✅ success

---

## Priority 3: Check Database (3 minutes)

**Only if** Vercel logs show success but dashboard shows "Not Connected"

1. Go to Supabase Dashboard → **SQL Editor**
2. Run the file: `DIAGNOSE_OUTLOOK_CONNECTION.sql`
3. Update the email at line 8 to YOUR email
4. Look at the output:
   - ✅ User found?
   - ✅ Integration record found?
   - ✅ User has tokens?

**If NO integration record:**
- Tokens aren't being saved
- Check Vercel env vars (Priority 4)

**If integration exists BUT no tokens for your user:**
- User ID mismatch
- Check the state parameter in Vercel logs

---

## Priority 4: Check Azure AD Config (5 minutes)

**Only if** logs show OAuth errors OR callback never fires

### Quick Check:
1. Go to https://portal.azure.com
2. **Azure Active Directory** → **App registrations** → Your app
3. Click **Authentication**
4. Verify BOTH redirect URIs exist:
   ```
   https://www.curiosityengine.io/api/auth/callback/azure-ad
   https://www.curiosityengine.io/api/outlook/user-callback
   ```
5. Click **API permissions**
6. Verify you have all 7 permissions (see `FIX_OUTLOOK_NOW.md`)
7. Click **"Grant admin consent"** if not already granted

---

## Priority 5: Check Environment Variables (3 minutes)

**Only if** Azure config is correct but still failing

1. Go to Vercel → Settings → Environment Variables
2. Verify these exist:
   ```
   MICROSOFT_CLIENT_ID
   MICROSOFT_CLIENT_SECRET
   MICROSOFT_REDIRECT_URI=https://www.curiosityengine.io/api/outlook/user-callback
   NEXT_PUBLIC_APP_URL=https://www.curiosityengine.io
   ```
3. If you change anything, **Redeploy**:
   - Deployments tab → "..." → "Redeploy"

---

## 🎯 Expected Results After Fix

1. Click "Connect" on Outlook card
2. Microsoft login page opens
3. Authorize permissions
4. Redirect back to dashboard
5. **Vercel logs show:**
   ```
   ✅ Integration created successfully
   ✅ Outlook connection successful
   ```
6. Return to Integrations tab
7. **Outlook card shows "Connected"** ✅
8. Can draft emails and see calendar events

---

## 🆘 Still Not Working?

Share with me:
1. **Vercel logs** (copy/paste or screenshot)
2. **Database query results** from `DIAGNOSE_OUTLOOK_CONNECTION.sql`
3. **Any error messages** you see

I'll identify the exact issue immediately!

---

## 📊 Time Budget

- Check logs: 5 min
- Fix RLS: 2 min
- Verify database: 3 min
- Total: **~10 minutes max**

Let's do this! Start with Priority 1 (Vercel logs) 🚀

