# 🔍 Debug: Monday.com Not Being Detected by AI

## 🐛 Problem

**Symptoms:**
- Monday.com shows as "Connected" on Connectors page ✅
- Console shows: `Monday.com: {connected: true, enabled: true, hasTokens: true}` ✅
- But Thinking Summary does NOT show "Monday.com CRM" ❌
- AI says "unable to directly access your Monday CRM" ❌
- AI tries to use wrong tools (search_emails instead of search_monday) ❌

**Root Cause:** Chat API isn't detecting Monday.com as connected

---

## 🔍 What to Check

### Check 1: Vercel Logs (CRITICAL)

Go to Vercel Dashboard → Logs → Filter for "Monday"

**Look for:**
```
🟣 Monday.com integration check: { hasMonday: true/false, ... }
```

**If hasMonday is false:** The chat API isn't finding Monday.com integration  
**If hasMonday is true:** Tools should be created

### Check 2: Browser Console

When you send a message, look for:
```
🤖 Chat API - Available tools: {
  hasSalesforce: false,
  hasMonday: true,  ← Should be true!
  hasOutlook: true,
  hasGmail: false,
  toolsCount: X
}
```

**If hasMonday is false:** Integration check is failing

### Check 3: Database

Run this SQL in Supabase to see what's actually stored:

```sql
SELECT 
  integration_type,
  is_enabled,
  configuration ? 'access_token' as has_token
FROM organization_integrations
WHERE organization_id = 'your_org_id'
  AND integration_type LIKE '%monday%';
```

**Should show:** `monday_user` or `monday` with `is_enabled = true`

---

## 🎯 Possible Causes

### Cause 1: Integration Type Mismatch
**Problem:** Monday saved as different type than expected  
**Check:** Look for `monday` vs `monday_user` vs `monday_org`  
**Fix:** Update chat API to check correct type

### Cause 2: Token Structure Wrong
**Problem:** Tokens not in expected format  
**Check:** Look at configuration JSON structure  
**Fix:** Update token check logic

### Cause 3: Deployment Not Complete
**Problem:** Latest code not deployed yet  
**Check:** Vercel deployment status  
**Fix:** Wait for deployment to complete

---

## ✅ Quick Test

In browser console, when you ask about Monday, look for this exact log:

```
🟣 Monday.com integration check: { 
  organizationId: "...",
  hasMonday: true/false,  ← What does this say?
  integration: {...}
}
```

**If you see this log with hasMonday: false**, that's the problem!

---

## 🔧 Temporary Workaround

While we debug, you can test if Monday.com API itself works by:

1. Going to Network tab in browser console
2. When you ask about Monday, check if `/api/monday/...` endpoint is called
3. See what the response is

---

**Check Vercel logs for the Monday.com integration check and tell me what hasMonday shows!**

That will tell us exactly why it's not being detected.

