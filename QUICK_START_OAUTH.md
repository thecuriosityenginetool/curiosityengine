# Quick Start: OAuth Integration

## ✅ What's Already Done

All backend code is complete and ready to use:

- ✅ NextAuth configured with Google & Microsoft OAuth
- ✅ Database migration created (`supabase-add-oauth-tokens.sql`)
- ✅ Email sending API (`/api/email/send`)
- ✅ Email draft API (`/api/email/draft`)
- ✅ Login page with OAuth buttons
- ✅ Signup page with OAuth buttons
- ✅ Extension OAuth helper functions added
- ✅ TypeScript types updated
- ✅ No linter errors

---

## 🚀 3 Steps to Get It Working

### Step 1: Run Database Migration (2 minutes)

```bash
# Copy the SQL file content and run in Supabase SQL Editor
# Or use psql:
psql <your-connection-string> < supabase-add-oauth-tokens.sql
```

### Step 2: Get OAuth Credentials (15 minutes)

**Google (Gmail):**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create OAuth 2.0 Client ID
3. Add redirect URI: `https://www.curiosityengine.io/api/auth/callback/google`
4. Enable Gmail API
5. Add scopes: `gmail.send`, `gmail.compose`
6. Copy Client ID and Secret

**Microsoft (Outlook):**
1. Go to [portal.azure.com](https://portal.azure.com)
2. Register new app in Azure AD
3. Add redirect URI: `https://www.curiosityengine.io/api/auth/callback/microsoft`
4. Create client secret
5. Add API permissions: `Mail.Send`, `Mail.ReadWrite`
6. Copy Application ID and Secret

### Step 3: Add Environment Variables (1 minute)

Add to `.env.local` and Vercel:

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret

MICROSOFT_CLIENT_ID=your-microsoft-app-id
MICROSOFT_CLIENT_SECRET=your-microsoft-secret
```

---

## 🎯 That's It!

Your OAuth integration is ready. Users can now:

1. Sign in with Google or Microsoft
2. Grant email permissions
3. Send emails from Chrome extension
4. Create drafts from Chrome extension

---

## 🧪 Test It

1. Start dev server: `npm run dev`
2. Visit `http://localhost:3000/login`
3. Click "Sign in with Google"
4. Complete OAuth flow
5. Check Supabase `user_oauth_tokens` table - should have tokens
6. Try sending test email via API

---

## 📖 Full Documentation

- **Complete Setup Guide:** `OAUTH_SETUP_GUIDE.md` (if you need detailed instructions)
- **Implementation Details:** `OAUTH_IMPLEMENTATION_SUMMARY.md` (technical details)

---

## ⚠️ One Manual Step (Optional)

The Chrome extension UI needs a small update. Replace the email/password form in `apps/sales-curiosity-extension/src/popup.tsx` with the OAuth button code provided in `OAUTH_SETUP_GUIDE.md` (Section "Step 5").

Or you can keep the old form - the OAuth login functions are already wired up, you just need to add a button that calls `handleOAuthLogin()`.

---

## 🆘 Quick Troubleshooting

**"Redirect URI mismatch"**
→ Make sure URIs in OAuth console match exactly (no trailing slash)

**"No email provider connected"**
→ User needs to sign in via OAuth (not email/password)

**"Token expired"**
→ Should auto-refresh, but user may need to sign in again

---

**Need Help?** Check `OAUTH_SETUP_GUIDE.md` for detailed instructions.

