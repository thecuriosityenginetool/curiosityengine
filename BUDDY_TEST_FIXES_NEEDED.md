# 🚨 Critical Fixes for Buddy Testing

## Issues Found From Buddy's Test:

### 1. Supabase 500 Error ❌ (BLOCKING!)
```
Failed to load resource: the server responded with a status of 500
users?select=*&email=eq.matthewbravo13@gmail.com
```

**What this means:** Your buddy logged in with matthewbravo13@gmail.com, but Supabase is blocking the user creation/fetch query.

**Root cause:** RLS (Row Level Security) policies are too restrictive

### 2. API Endpoints Return 404 ❌
```
popup.tsx:73 🔵 API validation response: false 404
```

**What this means:** `/api/user/stats` returns 404 (not found)

**Root cause:** Either:
- Routes not deployed properly
- Build error in API routes
- Next.js routing issue

### 3. Salesforce Shows "Already Connected" ⚠️
**Root cause:** Old test data in organization_integrations table

### 4. Web App JavaScript Errors ⚠️ (Non-blocking)
```
setCardMousePositions is not defined
```

**What this means:** Some animation/UI code has an issue
**Impact:** Visual bugs but doesn't block functionality

---

## 🔧 FIXES - Do These IN ORDER:

### Fix 1: Supabase RLS Policies (CRITICAL - 2 minutes)

**Go to Supabase → SQL Editor → Run:**

```sql
-- Fix RLS policies for user creation
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Service role has full access" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users"
ON users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable all for service role"
ON users FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

**Then run:**
```sql
-- Clear old Salesforce data
DELETE FROM organization_integrations 
WHERE integration_type IN ('salesforce', 'salesforce_user');
```

### Fix 2: Verify API Routes Exist (1 minute)

**Test in browser console:**
```javascript
fetch('https://www.curiosityengine.io/api/user/stats')
  .then(r => r.status)
  .then(status => console.log('Stats API Status:', status));
  
fetch('https://www.curiosityengine.io/api/salesforce/auth-user')
  .then(r => r.status)
  .then(status => console.log('SF Auth API Status:', status));
```

**Expected:** 401 (Unauthorized) - means endpoint exists
**Bad:** 404 (Not Found) - means endpoint missing

**If you get 404:**
- The routes haven't deployed
- Check Vercel build logs for errors
- May need to trigger another deployment

### Fix 3: Force Vercel Redeploy (2 minutes)

Even though deployments show "Ready", the API routes might not be working.

**Trigger a fresh deployment:**
1. Go to Vercel → Deployments
2. Click the top one
3. Click "..." → "Redeploy"
4. **IMPORTANT:** Uncheck "Use existing build cache"
5. Click "Redeploy"
6. Wait 3-5 minutes
7. Test again

---

## 🎯 Priority Order:

### PRIORITY 1: Fix Supabase (BLOCKS EVERYTHING!)
Run the RLS SQL above. Without this, **no new users can sign up**.

### PRIORITY 2: Check API Routes
Run the fetch tests to see if endpoints exist.

### PRIORITY 3: Redeploy if Needed
If endpoints return 404, redeploy without cache.

---

## 🧪 After Fixes - Expected Results:

### When Buddy Logs In:
- ✅ No Supabase 500 errors
- ✅ User record created
- ✅ Redirected to dashboard

### When Buddy Checks Extension:
- ✅ API returns 200 or 401 (not 404)
- ✅ Token validates correctly
- ✅ Dashboard shows

### When Buddy Connects Salesforce:
- ✅ Gets OAuth URL
- ✅ Can complete OAuth
- ✅ Shows "Connected" status

---

## 📊 Current Status Summary:

| Component | Status | Action Needed |
|-----------|--------|---------------|
| Extension OAuth | ✅ Working | None |
| Extension Branding | ✅ Working | None |
| Token Persistence | ✅ Working (workaround) | None |
| Supabase RLS | ❌ BROKEN | Run SQL fix |
| API Endpoints | ❌ 404 Errors | Verify deployment |
| Salesforce Creds | ✅ In Vercel | None |
| Old SF Data | ⚠️ Exists | Run DELETE SQL |

---

## 🚀 DO THIS RIGHT NOW:

### Step 1: Supabase SQL (2 min)
```sql
-- Copy the entire RLS fix from Fix 1 above
-- Paste in Supabase SQL Editor
-- Run it
```

### Step 2: Clear Old Data (30 sec)
```sql
DELETE FROM organization_integrations 
WHERE integration_type IN ('salesforce', 'salesforce_user');
```

### Step 3: Test API (30 sec)
```javascript
// In browser console
fetch('https://www.curiosityengine.io/api/user/stats').then(r => console.log('Status:', r.status));
```

### Step 4: If You Get 404 (3 min)
- Vercel → Redeploy latest without cache
- Wait 3-5 minutes
- Test again

---

## ✅ Success Criteria:

**You'll know it's fixed when:**
1. No more Supabase 500 errors
2. API returns 401 (not 404)
3. Buddy can sign in and stay logged in
4. Salesforce connection works
5. Analyze/Draft buttons work

---

**START WITH THE SUPABASE SQL - That's blocking everything!**

Run the RLS fix in Supabase SQL Editor, then test the API endpoints to see if they exist!

