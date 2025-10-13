# 🚀 Deployment & Testing Checklist

## Quick Start (5 Minutes)

Follow these steps to get your Salesforce AI Chat system live and working.

---

## Step 1: Database Setup (2 minutes)

### Run the Verification Script

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Create a new query
3. Copy the entire contents of `verify-database-setup.sql`
4. Click **Run**

**Expected Output:**
```
✅ ALL REQUIRED TABLES EXIST
✅ DATABASE SETUP COMPLETE!
```

If you see missing tables, the script will create them automatically.

---

## Step 2: Verify Environment Variables (1 minute)

### Check Vercel Settings

Go to **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Verify these are set:

#### Required (App won't work without these):
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `OPENAI_API_KEY`
- ✅ `NEXTAUTH_URL` (should be `https://www.curiosityengine.io`)
- ✅ `NEXTAUTH_SECRET`

#### Optional (for Salesforce integration):
- ⚠️ `SALESFORCE_CLIENT_ID`
- ⚠️ `SALESFORCE_CLIENT_SECRET`
- ⚠️ `SALESFORCE_REDIRECT_URI` (should be `https://www.curiosityengine.io/api/salesforce/callback`)

**Missing variables?** Add them and redeploy.

---

## Step 3: Deploy to Vercel (1 minute)

### Option A: Push to GitHub (Automatic Deploy)
```bash
git add .
git commit -m "Add Salesforce AI Chat integration"
git push origin main
```

Vercel will automatically deploy. Wait 2-3 minutes.

### Option B: Manual Deploy
1. Go to **Vercel Dashboard** → **Deployments**
2. Click **"Redeploy"** on the latest deployment
3. **Uncheck** "Use existing build cache"
4. Click **"Redeploy"**

---

## Step 4: Verify Deployment (30 seconds)

### Test API Endpoints

Open your browser console and run:

```javascript
// Test chat API (should return text/event-stream)
fetch('https://www.curiosityengine.io/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'test' })
}).then(r => console.log('Chat API:', r.status, r.headers.get('content-type')));

// Test calendar API (should return 401 Unauthorized - that's good!)
fetch('https://www.curiosityengine.io/api/calendar')
  .then(r => console.log('Calendar API:', r.status));

// Test activity logs API (should return 401 Unauthorized - that's good!)
fetch('https://www.curiosityengine.io/api/activity-logs')
  .then(r => console.log('Activity Logs API:', r.status));
```

**Expected Results:**
- Chat API: `401` or streaming response
- Calendar API: `401` (means endpoint exists, just needs auth)
- Activity Logs API: `401` (means endpoint exists, just needs auth)

**❌ If you see 404:** The endpoint doesn't exist. Redeploy without cache.

---

## Step 5: Connect Salesforce (1 minute)

### If You Haven't Connected Salesforce Yet:

1. Go to **https://www.curiosityengine.io/dashboard**
2. Click **"Settings"** or **"Integrations"** tab
3. Find **"Salesforce CRM"** card
4. Click **"Connect with Salesforce"**
5. Log in to your Salesforce account
6. Grant permissions
7. You'll be redirected back with **"✅ Salesforce Connected"**

### Verify Connection:

Check in Supabase:
```sql
SELECT * FROM organization_integrations 
WHERE integration_type = 'salesforce' 
AND is_enabled = true;
```

You should see a row with your tokens.

---

## Step 6: Test the AI Chat! 🎉

### Go to Dashboard

Navigate to: **https://www.curiosityengine.io/dashboard**

### Test Basic Chat
Type: `Hello!`

**Expected:** AI responds normally.

### Test Salesforce Search (if connected)
Type: `Who is John Smith?`

**Expected:** 
- You see 🔍 icon appear
- AI searches Salesforce
- Returns contact details or "not found"

### Test Lead Creation (if connected)
Type: `Create a lead for Jane Doe at Acme Corp, she's the CMO`

**Expected:**
- You see ✏️ icon appear
- AI creates lead in Salesforce
- Returns success message with Record ID
- **Verify in Salesforce:** Go to Leads → Find "Jane Doe"

### Test Calendar Integration
Type: `What's on my calendar today?`

**Expected:**
- Shows your calendar events
- If Salesforce connected, shows CRM matches for attendees

---

## Troubleshooting

### Issue: 500 Errors on Dashboard

**Solution:** Run the database setup script again.
```sql
-- In Supabase SQL Editor
-- Run verify-database-setup.sql
```

### Issue: "Salesforce CRM is not connected" in chat

**Solutions:**
1. Connect Salesforce in Settings
2. Check `organization_integrations` table has valid tokens
3. Verify `SALESFORCE_CLIENT_ID` and `SALESFORCE_CLIENT_SECRET` are set in Vercel

### Issue: Chat doesn't stream / no response

**Solutions:**
1. Check browser console for errors
2. Verify `OPENAI_API_KEY` is set in Vercel
3. Check Vercel logs for API errors
4. Try refreshing the page

### Issue: Tools aren't working (no 🔍 icons)

**Solutions:**
1. Ensure Salesforce is connected
2. Check browser console for tool execution errors
3. Verify Salesforce tokens are valid (re-connect if needed)

### Issue: Calendar shows "No upcoming events"

**Solutions:**
1. Calendar integration is currently using mock data
2. Connect your actual calendar (Outlook/Google) via Settings
3. Or, it's working correctly - you just don't have events!

---

## Success Criteria ✅

Your system is working when:

- ✅ Dashboard loads without console errors
- ✅ Chat responds to messages
- ✅ Streaming works (you see text appear in real-time)
- ✅ Salesforce tools show icons (🔍 ✏️ 📝 ✅)
- ✅ You can search for contacts
- ✅ You can create leads/contacts
- ✅ Calendar events display
- ✅ No 404 or 500 errors

---

## Quick Test Script

Copy this into your browser console on the dashboard:

```javascript
// Quick test suite
async function testSystem() {
  console.log('🧪 Testing Salesforce AI Chat System...\n');
  
  // Test 1: API endpoints exist
  console.log('Test 1: Checking API endpoints...');
  const apis = [
    '/api/chat',
    '/api/calendar',
    '/api/activity-logs',
    '/api/chats',
    '/api/salesforce/route'
  ];
  
  for (const api of apis) {
    const res = await fetch(api);
    const status = res.status === 401 || res.status === 200 ? '✅' : '❌';
    console.log(`${status} ${api}: ${res.status}`);
  }
  
  console.log('\n✅ System check complete!');
  console.log('If all show ✅ or 401 (unauthorized but exists), you\'re good!');
}

testSystem();
```

---

## Performance Tips

### For Faster Responses:
1. Use **GPT-4o** (already configured) for tool calling
2. Enable caching (already implemented - 5 min TTL)
3. Consider Redis for production caching

### For Cost Optimization:
1. Use **GPT-4o-mini** for simple queries (requires code change)
2. Implement more aggressive caching (10-15 min)
3. Batch Salesforce API calls where possible

---

## Next Steps

Once everything is working:

1. **Test with Real Data**
   - Search for actual contacts in your Salesforce
   - Create test leads
   - Add notes and tasks

2. **Train Your Team**
   - Show them how to use the chat interface
   - Share example queries
   - Demonstrate calendar + CRM matching

3. **Monitor Usage**
   - Check OpenAI API usage
   - Monitor Salesforce API limits
   - Review Vercel logs for errors

4. **Chrome Extension** (Future)
   - Apply same CRM tools to extension
   - Enable LinkedIn → Salesforce workflow

---

## Support Resources

- **Implementation Guide:** `SALESFORCE_AI_CHAT_COMPLETE.md`
- **Bug Fixes Needed:** `BUDDY_TEST_FIXES_NEEDED.md`
- **Database Setup:** `verify-database-setup.sql`
- **Salesforce Setup:** `SALESFORCE_SETUP_COMPLETE_GUIDE.md`

---

## 🎉 You're All Set!

Your Salesforce AI Chat system is ready to use. Enjoy your AI-powered sales workflow!

**Questions?** Check the console logs or review the implementation guide.

**Happy Selling! 🚀**

