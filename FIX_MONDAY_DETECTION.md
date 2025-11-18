# 🔧 Fix Monday.com Detection Issue

## 🐛 Problem

**Symptoms:**
- Monday.com shows "Connected" on Connectors page ✅
- Integration status API shows `monday: { connected: true }` ✅
- But "Monday.com CRM" NOT in Context Loaded when chatting ❌
- AI doesn't have Monday.com tools ❌
- AI uses browse_url instead of search_monday ❌

**Root Cause:** Chat API's Monday.com integration check is returning false/null

---

## 🔍 Step 1: Check Vercel Logs (CRITICAL)

We added extensive logging. Let's see what it shows:

1. **Go to Vercel Dashboard** → **Logs**
2. **Send a test message** in chat (anything)
3. **Look for these logs:**

```
🟣 [Chat API] Checking Monday.com for org: [your-org-id]
🟣 [Chat API] Monday.com query result: {
  found: true/false,
  error: null or error message,
  type: "monday_user" or null,
  enabled: true/false,
  hasConfig: true/false
}
🟣 [Chat API] hasMonday final value: true/false
```

**Tell me what each field shows!**

---

## 🎯 Possible Causes & Fixes

### Cause 1: Wrong Integration Type
**If type shows:** `"monday"` but code checks for `"monday_user"`

**Fix:** Update chat API to check for correct type

### Cause 2: is_enabled is false
**If enabled:** `false`

**Fix:** Run SQL to enable it:
```sql
UPDATE organization_integrations 
SET is_enabled = true 
WHERE integration_type LIKE '%monday%';
```

### Cause 3: No Configuration/Tokens
**If hasConfig:** `false`

**Fix:** Reconnect Monday.com to save tokens properly

### Cause 4: Different Organization ID
**If found:** `false`

**Fix:** User might be under different org than expected

---

## 🧪 Quick Database Check

Run this SQL in Supabase to see what's actually stored:

```sql
-- Check what Monday.com integrations exist
SELECT 
  id,
  organization_id,
  integration_type,
  is_enabled,
  created_at,
  enabled_at,
  configuration IS NOT NULL as has_config
FROM organization_integrations
WHERE integration_type LIKE '%monday%'
ORDER BY created_at DESC;
```

**Expected:**
- Should show at least one row
- `integration_type`: `monday_user` or `monday`  
- `is_enabled`: `true`
- `has_config`: `true`

---

## 🔧 Quick Test

### Option A: Check Current Connection

In browser console on dashboard:
```javascript
// This will show what the status API finds
fetch('/api/integrations/status')
  .then(r => r.json())
  .then(d => console.log('Monday status:', d.monday));
```

### Option B: Simple Chat Test

1. Start new chat
2. Ask: "Hello"
3. Check Vercel logs for Monday.com query result
4. Tell me what it shows

---

## 📊 Diagnostic Checklist

- [ ] Checked Vercel logs for Monday.com query result
- [ ] Ran SQL to see Monday.com integrations in database
- [ ] Verified integration_type matches what code checks for
- [ ] Verified is_enabled is true
- [ ] Verified configuration has tokens
- [ ] Verified organization_id matches user's org

---

**Check the Vercel logs or run the SQL query and tell me what you find!**

That will point us to the exact fix needed.

