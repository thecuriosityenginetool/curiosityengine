# 🚨 URGENT: Fix 406 and 500 Errors

## Current Issues

### 1. **406 Errors on `/users` endpoint**
- **Cause**: RLS (Row Level Security) policies blocking API queries
- **Impact**: Dashboard can't load user data from Supabase
- **Fix**: Run `FIX_ALL_RLS_ISSUES.sql` in Supabase

### 2. **500 Error on `/api/email/draft` endpoint**
- **Cause**: Old email draft code trying to query `user_oauth_tokens` table (doesn't exist)
- **Impact**: Old email draft feature fails (we have new Outlook integration now)
- **Fix**: Remove old draft functionality OR create missing table

---

## Quick Fix Steps

### Step 1: Fix RLS Policies (CRITICAL)

Run this in Supabase SQL Editor:

```sql
-- This is in FIX_ALL_RLS_ISSUES.sql
-- Copy and paste the entire file into Supabase SQL Editor
```

This will:
- ✅ Fix `users` table RLS (resolve 406 errors)
- ✅ Fix `organization_integrations` table RLS
- ✅ Fix `chats`, `chat_messages`, `activity_logs` RLS
- ✅ Allow service role full access (for API routes)
- ✅ Allow authenticated users to access their own data

### Step 2: Fix Email Draft Issue

**Option A: Remove Old Functionality (Recommended)**

The old `/api/email/draft` endpoint is outdated. We now have:
- ✅ Outlook integration with email drafts via AI chat
- ✅ Better OAuth flow using `organization_integrations` table

**To remove**: Delete the old email draft function from dashboard (line 775)

**Option B: Create Missing Table**

If you want to keep the old functionality, create the table:

```sql
CREATE TABLE IF NOT EXISTS user_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL, -- 'google' or 'microsoft'
  access_token text NOT NULL,
  refresh_token text,
  token_expiry timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE user_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON user_oauth_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users manage own tokens"
  ON user_oauth_tokens
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

## Step 3: Test After Fixes

1. **Run** `FIX_ALL_RLS_ISSUES.sql` in Supabase
2. **Refresh** your dashboard
3. **Check console** - 406 errors should be gone
4. **Verify**:
   - ✅ No 406 errors on `/users` endpoint
   - ✅ Salesforce connection shows correctly
   - ✅ Calendar loads (or shows mock data)
   - ✅ Chat works without errors

---

## Why These Errors Happen

### 406 "Not Acceptable" Error
- Supabase returns 406 when RLS policy blocks a query
- Our API routes use **service role key** but policies weren't set up for it
- The `users` table had no "service_role" policy

### 500 "Internal Server Error"
- The old `/api/email/draft` endpoint queries `user_oauth_tokens` table
- This table was never created (or was deleted)
- SQL query fails → 500 error

---

## Recommended Actions

### Immediate (Required):
1. ✅ **Run** `FIX_ALL_RLS_ISSUES.sql` → Fixes 406 errors
2. ✅ **Choose** Option A or B for email draft issue

### After Outlook Reconnection:
3. ✅ Test new Outlook calendar sync
4. ✅ Test AI email draft creation via chat
5. ✅ Verify all integrations work

### Optional Cleanup:
- Remove old email draft code from dashboard
- Remove old `/api/email/draft` route file
- Use only new Outlook integration going forward

---

## Files to Run in Supabase

1. **`FIX_ALL_RLS_ISSUES.sql`** (REQUIRED) - Fixes RLS policies
2. **`CHECK_OAUTH_TOKENS_TABLE.sql`** (Optional) - Check if old table exists
3. **`CHECK_OUTLOOK_CONNECTION.sql`** (Optional) - Verify Outlook scopes
4. **`DISCONNECT_OUTLOOK.sql`** (When ready) - Reset Outlook connection

---

## Expected Results After Fixes

### Console Output (Clean):
```
✅ Supabase client created successfully
✅ Salesforce connected: true
📅 Fetching calendar events...
✅ No 406 or 500 errors
```

### Dashboard:
- ✅ Loads without errors
- ✅ Shows correct connection status
- ✅ Calendar sync button works
- ✅ AI chat functions properly

---

## Summary

**Problem**: RLS policies blocking API queries + old email code failing

**Solution**: 
1. Run `FIX_ALL_RLS_ISSUES.sql` to fix RLS
2. Remove old email draft code (or create missing table)
3. Use new Outlook integration for email drafts

**Time to Fix**: ~5 minutes (just run SQL scripts)

**Impact**: Eliminates all 406 and 500 errors ✅

