# OAuth Setup Checklist ✅

Print this out or check off as you go!

---

## □ 1. SUPABASE (5 min)

- [ ] Go to https://app.supabase.com
- [ ] Open SQL Editor
- [ ] Run `supabase-add-oauth-tokens.sql`
- [ ] Verify `user_oauth_tokens` table exists

**Save these for later:**
- Your Supabase URL: `_______________________`
- Your Service Role Key: `_______________________`

---

## □ 2. GOOGLE CLOUD (10 min)

- [ ] Go to https://console.cloud.google.com
- [ ] Create new project: "Curiosity Engine"
- [ ] Enable Gmail API
- [ ] Configure OAuth consent screen
- [ ] Create OAuth Client ID (Web application)
- [ ] Add redirect URIs:
  - [ ] `http://localhost:3000/api/auth/callback/google`
  - [ ] `https://www.curiosityengine.io/api/auth/callback/google`
  - [ ] Your Vercel URL + `/api/auth/callback/google`

**Save these:**
- Google Client ID: `_______________________`
- Google Client Secret: `_______________________`

---

## □ 3. MICROSOFT AZURE (10 min)

- [ ] Go to https://portal.azure.com
- [ ] Create App Registration: "Curiosity Engine"
- [ ] Set account type to "Multitenant + personal accounts"
- [ ] Add redirect URIs:
  - [ ] `http://localhost:3000/api/auth/callback/microsoft`
  - [ ] `https://www.curiosityengine.io/api/auth/callback/microsoft`
  - [ ] Your Vercel URL + `/api/auth/callback/microsoft`
- [ ] Create client secret
- [ ] Add API permissions:
  - [ ] openid
  - [ ] email
  - [ ] profile
  - [ ] offline_access
  - [ ] Mail.Send
  - [ ] Mail.ReadWrite

**Save these:**
- Microsoft Client ID: `_______________________`
- Microsoft Client Secret: `_______________________`

---

## □ 4. LOCAL ENVIRONMENT (5 min)

- [ ] Create/update `.env.local` file
- [ ] Add NEXTAUTH_SECRET (generate with `openssl rand -base64 32`)
- [ ] Add NEXTAUTH_URL=http://localhost:3000
- [ ] Add GOOGLE_CLIENT_ID
- [ ] Add GOOGLE_CLIENT_SECRET
- [ ] Add MICROSOFT_CLIENT_ID
- [ ] Add MICROSOFT_CLIENT_SECRET
- [ ] Add existing Supabase credentials
- [ ] Run `npm run dev`
- [ ] Test at http://localhost:3000/login

---

## □ 5. VERCEL (5 min)

- [ ] Go to https://vercel.com
- [ ] Open your project settings
- [ ] Add environment variables (all environments):
  - [ ] NEXTAUTH_SECRET
  - [ ] NEXTAUTH_URL (set to production URL)
  - [ ] GOOGLE_CLIENT_ID
  - [ ] GOOGLE_CLIENT_SECRET
  - [ ] MICROSOFT_CLIENT_ID
  - [ ] MICROSOFT_CLIENT_SECRET
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] Redeploy application
- [ ] Test at your production URL

---

## □ 6. TESTING (5 min)

- [ ] Test Google login locally
- [ ] Test Microsoft login locally
- [ ] Check Supabase `users` table (user created)
- [ ] Check Supabase `user_oauth_tokens` table (tokens stored)
- [ ] Test Google login in production
- [ ] Test Microsoft login in production
- [ ] Test extension authentication

---

## 🎯 Quick Reference URLs

| Platform | URL |
|----------|-----|
| Supabase | https://app.supabase.com |
| Google Cloud | https://console.cloud.google.com |
| Azure Portal | https://portal.azure.com |
| Vercel | https://vercel.com |
| Your Local Dev | http://localhost:3000/login |
| Your Production | https://www.curiosityengine.io/login |

---

## 🚨 Important Notes

1. **Copy secrets immediately!** Some can't be viewed again
2. **Redirect URIs must match exactly** (no trailing slashes)
3. **Redeploy Vercel after adding env vars**
4. **Test both Google and Microsoft** before going live

---

## ⏱️ Estimated Time

- Supabase: 5 minutes
- Google Cloud: 10 minutes  
- Microsoft Azure: 10 minutes
- Local Setup: 5 minutes
- Vercel: 5 minutes
- Testing: 5 minutes

**Total: ~40 minutes**

---

## ✅ Done?

If all boxes are checked, you're ready to go! 🎉

Users can now:
- ✅ Sign in with Google
- ✅ Sign in with Microsoft
- ✅ Send emails from the extension
- ✅ Create drafts from the extension

---

**See `SETUP_INSTRUCTIONS.md` for detailed step-by-step guide**

