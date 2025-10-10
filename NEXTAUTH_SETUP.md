# NextAuth Setup - Critical Environment Variable

## 🔴 IMPORTANT: Add Environment Variable to Vercel

NextAuth requires a `NEXTAUTH_SECRET` environment variable.

### **Add to Vercel Dashboard:**

1. Go to: https://vercel.com/your-project/settings/environment-variables

2. Add:
   - **Name:** `NEXTAUTH_SECRET`
   - **Value:** Generate one with this command:
     ```bash
     openssl rand -base64 32
     ```
   - **Or use:** `your-long-random-secret-key-min-32-chars-change-in-production`

3. **Add to all environments:** Production, Preview, Development

4. **Redeploy** after adding

---

## 🔍 Also Check Server Logs

The authorize function runs on the server, so logs appear in Vercel Function Logs, not browser console.

To see them:
1. Go to Vercel dashboard
2. Click on your deployment
3. Go to "Functions" tab
4. Look for `/api/auth/[...nextauth]` function
5. Check logs for [AUTH-X] messages

This will show the exact error!

---

## ⚡ Quick Test Without Logs

Try creating a BRAND NEW user:

```
1. Go to /signup
2. Create fresh account: newtest@example.com / password123 / New Test
3. Try logging in with that
4. If it works → existing users have password mismatch
5. If it fails → NextAuth config issue
```

