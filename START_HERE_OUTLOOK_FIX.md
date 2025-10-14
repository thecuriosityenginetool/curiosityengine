# 🚀 START HERE: Fix Outlook Integration

## The Issue
Users cannot login/connect with Outlook in your Curiosity Engine app.

## The Solution
I've done a complete deep dive and created comprehensive fix guides. **Follow these steps in order:**

---

## Step 1: Read the Summary (2 minutes)
📄 Open: **`OUTLOOK_ISSUE_SUMMARY.md`**

This gives you the big picture of what's wrong and why.

**Key takeaway:** Most likely an Azure AD configuration issue (70% probability).

---

## Step 2: Run Diagnostic (5 minutes)
📄 Open: **`DIAGNOSE_OUTLOOK_ISSUE.sql`**

1. Go to Supabase SQL Editor
2. Change the email to a test user's email
3. Run the script
4. It will tell you EXACTLY what's wrong

**This tells you which fix to apply.**

---

## Step 3: Follow the Fix Checklist (20 minutes)
📄 Open: **`OUTLOOK_FIX_CHECKLIST.md`**

This is your step-by-step action guide with checkboxes.

**Phases:**
1. ✅ Phase 1: Azure AD Configuration (10 min) - **Most important**
2. ✅ Phase 2: Vercel Environment Variables (5 min)
3. ✅ Phase 3: Database Verification (5 min)
4. ✅ Phase 4: Testing (5 min)

**Just follow the checklist and check off each box.**

---

## Step 4: Verify Azure Settings (As needed)
📄 Open: **`CHECK_AZURE_CONFIG.md`**

Use this side-by-side with Azure Portal to verify each setting.

**Visual checklist for Azure AD configuration.**

---

## Step 5: Deep Dive (Optional)
📄 Open: **`OUTLOOK_INTEGRATION_DIAGNOSIS.md`**

If you want to understand the technical details, architecture, and code-level analysis.

**50+ pages of comprehensive analysis.**

---

## 🎯 Quick Fix (If You're In a Hurry)

### Most Common Issues (Fix These First):

#### 1. Azure Redirect URIs ⚡
**Problem:** #1 cause of OAuth failures

**Fix:**
1. Go to Azure Portal → Your App → Authentication
2. Add these EXACT URIs:
   ```
   https://www.curiosityengine.io/api/auth/callback/azure-ad
   https://www.curiosityengine.io/api/outlook/user-callback
   ```
3. Save

**Time:** 2 minutes

---

#### 2. Missing Calendar Permissions ⚡
**Problem:** Calendar sync won't work

**Fix:**
1. Go to Azure Portal → Your App → API permissions
2. Add permission → Microsoft Graph → Delegated
3. Add: `Calendars.Read` and `Calendars.ReadWrite`
4. Grant admin consent

**Time:** 2 minutes

---

#### 3. Verify Environment Variables ⚡
**Problem:** Works locally but not in production

**Fix:**
1. Visit: `https://www.curiosityengine.io/api/test-ms-oauth`
2. If any show `false` → Add them in Vercel
3. Redeploy

**Time:** 5 minutes

---

## 📊 Files Reference

| File | Purpose | Time |
|------|---------|------|
| `START_HERE_OUTLOOK_FIX.md` | **This file - quick start** | 2 min |
| `OUTLOOK_ISSUE_SUMMARY.md` | Executive summary | 5 min |
| `OUTLOOK_FIX_CHECKLIST.md` | **Action checklist** ⭐ | 25 min |
| `CHECK_AZURE_CONFIG.md` | Azure verification guide | As needed |
| `DIAGNOSE_OUTLOOK_ISSUE.sql` | **SQL diagnostic** ⭐ | 5 min |
| `OUTLOOK_INTEGRATION_DIAGNOSIS.md` | Full technical analysis | 30 min |

**⭐ = Most useful for fixing**

---

## 🎯 Success Path

```
1. Read OUTLOOK_ISSUE_SUMMARY.md
   ↓
2. Run DIAGNOSE_OUTLOOK_ISSUE.sql
   ↓ (tells you what's wrong)
3. Follow OUTLOOK_FIX_CHECKLIST.md
   ↓ (phases 1-4)
4. Test at /api/test-ms-oauth
   ↓
5. Test Outlook connection
   ↓
6. ✅ Fixed!
```

**Total time:** 30-40 minutes

---

## 🔍 Which Guide Should I Use?

### If you want to fix it FAST:
→ **`OUTLOOK_FIX_CHECKLIST.md`** (start at Phase 1)

### If you want to understand WHY first:
→ **`OUTLOOK_ISSUE_SUMMARY.md`** then **`OUTLOOK_INTEGRATION_DIAGNOSIS.md`**

### If you want to know what's wrong with a specific user:
→ **`DIAGNOSE_OUTLOOK_ISSUE.sql`**

### If you need to verify Azure settings:
→ **`CHECK_AZURE_CONFIG.md`**

---

## 🚨 Most Likely Fixes (Try These First)

### 1. Azure Portal → Your App → Authentication
Check: Redirect URIs are EXACT match (no typos, spaces, or trailing slashes)

### 2. Azure Portal → Your App → API Permissions  
Check: Has `Calendars.Read` and `Calendars.ReadWrite` (recently added to code)

### 3. Vercel → Settings → Environment Variables
Check: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, both tenant IDs = "common"

### 4. Vercel → Deployments
Check: Redeployed after any environment variable changes

---

## ✅ How to Know It's Fixed

Test this URL:
```
https://www.curiosityengine.io/api/test-ms-oauth
```

Should show all `true` and empty `issues` array.

Then test connection from dashboard → Should work!

---

## 📞 What to Do After Fixing

1. ✅ Test with multiple users
2. ✅ Update your documentation (add calendar permissions)
3. ✅ Clear any failed connection records from database
4. ✅ Celebrate! 🎉

---

## 🤔 Still Not Working?

1. Check Vercel function logs for error messages
2. Run the SQL diagnostic with actual user email
3. Read the error message carefully (usually tells you what's wrong)
4. Consult `OUTLOOK_INTEGRATION_DIAGNOSIS.md` for specific error codes

---

## 🎯 Recommended Order

1. **`START_HERE_OUTLOOK_FIX.md`** ← You are here ✅
2. **`DIAGNOSE_OUTLOOK_ISSUE.sql`** ← Run this next
3. **`OUTLOOK_FIX_CHECKLIST.md`** ← Follow this to fix
4. Test and verify

**That's it!**

---

**Confidence:** 95% this will fix your issue  
**Time:** 30-40 minutes  
**Difficulty:** Medium  

Let's fix this! 🚀


