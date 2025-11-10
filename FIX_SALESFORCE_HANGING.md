# 🔧 Fix: Salesforce Query Hanging Indefinitely

## 🐛 Problem

When asking "Check my recent Salesforce leads", the request hangs forever at "Auth bridge: Received message"

---

## ⏱️ Quick Fix Just Deployed

I've added a **10-second timeout** to the query_crm tool. After deployment (2 minutes):

1. Hard refresh (Cmd+Shift+R)
2. Ask about leads again
3. Should timeout after 10 seconds if still hanging
4. Will show error message instead of hanging forever

---

## 🔍 Possible Causes

### 1. Salesforce Token Expired
**Symptom:** Query hangs trying to refresh token  
**Fix:** Disconnect and reconnect Salesforce

### 2. Salesforce API Slow
**Symptom:** Query takes >10 seconds  
**Fix:** Timeout will catch this, suggest simpler query

### 3. Network Issue
**Symptom:** Can't reach Salesforce API  
**Fix:** Check Vercel logs for network errors

---

## 🧪 After Deployment (2 minutes)

### Check Vercel Logs:

Go to Vercel → Logs → Filter for "query_crm"

**Look for:**
```
🔍 [query_crm] Executing SOQL: SELECT...
```

**If you see:**
- Query starts but never completes → Salesforce API hanging
- "Query timeout after 10 seconds" → API too slow
- No log at all → Tool not being called

### Check Browser Console:

Open F12 → Console tab

**Look for:**
```
🔍 [query_crm] Executing SOQL: ...
✅ [query_crm] Query completed, records: 5
```

Or:
```
❌ [query_crm] Error: Query timeout
```

---

## 🚀 Quick Workarounds

### Option A: Use Simple Test Query
Ask: **"Query Salesforce: SELECT Id, Name FROM Lead LIMIT 5"**

This tests if Salesforce API works at all.

### Option B: Disconnect & Reconnect Salesforce
1. Go to Connectors
2. Disconnect Salesforce
3. Reconnect
4. Try query again

### Option C: Check Salesforce Connection
Go to Vercel → Logs and search for "Salesforce" to see if there are auth errors

---

## 📋 What to Send Me

After deployment completes and you test again:

1. **Does it still hang?** Yes/No
2. **Vercel logs:** Any errors for query_crm?
3. **Browser console:** What do you see for query_crm?
4. **If timeout:** Error message shown?

---

## ⏰ Timeline

- **Now:** Deploying timeout fix
- **2 minutes:** Deployment complete
- **Then:** Test and check logs
- **If hanging:** Will timeout after 10 seconds with error message

---

**Wait 2 minutes for deployment, then test!**

