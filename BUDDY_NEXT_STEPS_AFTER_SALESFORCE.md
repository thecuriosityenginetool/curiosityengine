# ✅ Salesforce Connected! Now Test CRM Features

## What Your Buddy Just Did:
✅ Went through Salesforce connector flow
✅ Didn't get stuck (OAuth completed successfully!)

---

## 🧪 Next Tests - Send This to Your Buddy:

### TEST 1: Verify Salesforce Shows "Connected" (1 min)

**In the extension:**
1. Click the extension icon on LinkedIn
2. Click the **"Integrations"** tab (🔗 icon, orange when selected)
3. Look at the Salesforce card

**Expected result:**
- Status badge should show **"Connected"** (green)
- Button should say **"✓ Connected"** (disabled/grayed out)

**If it still shows "Not Connected":**
- Click to "Home" tab, then back to "Integrations" tab
- This triggers a refresh
- Should update to "Connected"

---

### TEST 2: Analyze a LinkedIn Profile (2 min)

**On LinkedIn:**
1. Go to **any LinkedIn profile page**
   - Example: linkedin.com/in/levi-perkins (CEO of Hannibal AI)
   - Or any other profile

2. Click the **Sales Curiosity** extension icon

3. Make sure you're on the **"Home"** tab (🏠)

4. Click the orange **"🔍 Analyze Profile"** button

5. **Wait 10-15 seconds** (OpenAI processing)

**Expected result:**
- Loading message appears
- AI analysis shows with insights about the person
- Analysis includes: summary, pain points, conversation starters

**If you see error:**
- "Failed to extract profile data" → Reload the LinkedIn page and try again
- "API Error" → Take screenshot and send me

---

### TEST 3: Draft Email with Salesforce CRM Check (3 min)

**Important:** For this test to show CRM features, you need to test with someone who IS or ISN'T in your Salesforce.

**Scenario A: Test with Someone NOT in Salesforce**

1. Go to a LinkedIn profile of someone you've never contacted
2. Extension → **"✉️ Draft Email"** button (white button with orange border)
3. Optional: When prompted, add context like "Interested in AI solutions"
4. **Wait 10-15 seconds**

**Expected result:**
- AI generates a personalized cold outreach email
- At the top you should see:
  ```
  ➕ Salesforce Status: New contact added to your CRM
  ```
- Email has cold outreach tone

5. **Verify in Salesforce:**
   - Open Salesforce in browser
   - Go to Contacts
   - Search for the person's name
   - ✅ They should exist as a new Contact!

**Scenario B: Test with Someone IN Salesforce**

1. First, manually add a contact to your Salesforce:
   - Go to Salesforce → Contacts → New
   - Add name and email that matches a LinkedIn profile

2. Go to that person's LinkedIn profile

3. Extension → **"✉️ Draft Email"**

4. **Wait 10-15 seconds**

**Expected result:**
- AI generates a personalized follow-up email
- At the top you should see:
  ```
  🔗 Salesforce Status: Found as Contact in your CRM
  Last interaction: [date]
  ```
- Email has warmer, follow-up tone

---

### TEST 4: Export Functions (1 min)

After generating any analysis or email:

1. Click **"📋 Copy"** button
   - **Expected:** Content copied to clipboard

2. Click **"📄 Text"** button
   - **Expected:** Downloads .txt file

3. Click **"📑 PDF"** button
   - **Expected:** Downloads .pdf file

---

### TEST 5: Context/Settings (2 min)

1. Extension → **"Context"** tab (📝)

2. Fill in **"About Me"** field:
   ```
   Example: "I'm a sales rep at [Company], selling [Product] to [Target Market]"
   ```

3. Fill in **"Sales Objectives"** field:
   ```
   Example: "Looking to connect with CTOs and VPs of Engineering at SaaS companies"
   ```

4. Click **"Save Context"** button

5. **Expected:** "✓ Context saved!" message

6. Now draft an email on a LinkedIn profile

7. **Expected:** Email includes your context (mentions your company, product, etc.)

---

## 🐛 If Something Doesn't Work:

### "Analyze Profile" Fails
**Error message:** "Failed to extract profile data"
**Fix:** 
- Make sure you're on an actual profile page (not feed/search)
- Refresh the LinkedIn page (Cmd+R)
- Try again

### "Draft Email" Takes Forever
**Symptom:** Button says "Drafting..." for more than 30 seconds
**Fix:**
- OpenAI API might be slow
- Wait up to 60 seconds
- If still nothing, there might be an API timeout

### Salesforce Status Doesn't Show
**Symptom:** No "🔗 Found" or "➕ New contact added" message
**Possible causes:**
- Salesforce not actually connected (check Integrations tab)
- API error (check console for red errors)
- Person's email/name not found (Salesforce searches by email + name)

### "Not Connected" After Salesforce OAuth
**Fix:**
- Click away from Integrations tab
- Click back to Integrations tab
- Should refresh and show "Connected"

---

## 📸 What to Screenshot:

**If something doesn't work, send me:**
1. Extension popup (what you see)
2. Extension console (right-click popup → Inspect → Console)
3. Browser console (F12 → Console)
4. The error message

---

## ✅ Success Looks Like:

- ✅ Salesforce shows "Connected" in Integrations tab
- ✅ "Analyze Profile" generates AI insights
- ✅ "Draft Email" generates personalized email
- ✅ Salesforce status appears in email response
- ✅ New contacts created in Salesforce automatically
- ✅ Context saves and is used in emails
- ✅ Export buttons work

---

**Send this list to your buddy and have him test each one!** 

The fact that Salesforce OAuth worked is HUGE - that was the hardest part! Now just need to test the CRM features.

Let me know what he says! 🚀

