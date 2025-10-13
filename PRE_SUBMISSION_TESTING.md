# 🧪 Pre-Submission Testing Checklist

## Complete testing before Chrome Web Store submission

---

## 📋 Phase 1: Fresh Extension Installation (Like Real Users)

### Step 1: Create Fresh Test Environment
- [ ] Create new Chrome profile for testing
  - Go to `chrome://settings/people`
  - Click "Add person" or "Add profile"
  - Name it "Sales Curiosity Test"
  - Use this profile for testing

### Step 2: Download & Install Extension
- [ ] Go to https://www.curiosityengine.io/install (or your download page)
- [ ] Click "Download Extension" button
- [ ] Save `sales-curiosity-extension.zip` to Downloads
- [ ] Extract the ZIP file
- [ ] Go to `chrome://extensions/`
- [ ] Enable "Developer mode" (top right toggle)
- [ ] Click "Load unpacked"
- [ ] Select the extracted folder
- [ ] ✅ Extension appears in toolbar

---

## 🔐 Phase 2: OAuth Authentication Testing

### Test 1: Google Sign-In (Personal Gmail)
- [ ] Click extension icon
- [ ] Click "Sign in with Google"
- [ ] Sign in with **personal Gmail** (e.g., @gmail.com)
- [ ] Grant permissions
- [ ] See success page: "✅ Extension Connected!"
- [ ] See green message: "✅ Token saved to extension successfully!"
- [ ] Close tab (Cmd+W)
- [ ] Go to LinkedIn (any profile)
- [ ] Click extension icon
- [ ] ✅ Should show authenticated dashboard (NOT login screen)

### Test 2: Microsoft Sign-In (Personal Outlook)
- [ ] Sign out from extension
- [ ] Clear extension: Right-click icon → Inspect → Console → `chrome.storage.local.clear()`
- [ ] Click extension icon
- [ ] Click "Sign in with Microsoft"
- [ ] Sign in with **personal Outlook** (e.g., @outlook.com, @hotmail.com, @live.com)
- [ ] Grant permissions
- [ ] See success page: "✅ Extension Connected!"
- [ ] Close tab
- [ ] Go to LinkedIn
- [ ] Click extension icon
- [ ] ✅ Should show authenticated dashboard

### Test 3: Microsoft Sign-In (Business Email)
- [ ] Repeat Test 2 but with **business Microsoft 365 account** (e.g., @company.com)
- [ ] ✅ Should work the same way

### Test 4: Session Persistence
- [ ] Log in with either Google or Microsoft
- [ ] Click extension icon on LinkedIn
- [ ] Verify dashboard shows
- [ ] Click outside popup (popup closes - normal!)
- [ ] **Close Chrome completely**
- [ ] **Reopen Chrome**
- [ ] Go to LinkedIn
- [ ] Click extension icon
- [ ] ✅ Should STILL show dashboard (not login screen)

---

## ☁️ Phase 3: Salesforce Integration Testing

### Test 1: Connect Salesforce
- [ ] Make sure you're logged into extension (Google/Microsoft)
- [ ] Go to LinkedIn (any profile)
- [ ] Click extension icon
- [ ] Click "Integrations" tab
- [ ] Find "Salesforce" card
- [ ] Verify status shows "Not Connected"
- [ ] Click "Connect Salesforce" button
- [ ] New tab opens to Salesforce login
- [ ] Log in with your Salesforce Developer account
- [ ] Click "Allow" to grant permissions
- [ ] Tab redirects to callback
- [ ] Close the tab
- [ ] Return to extension
- [ ] Click extension icon again
- [ ] Go to Integrations tab
- [ ] ✅ Status should show "Connected"

### Test 2: CRM Search (Existing Contact)
**Prerequisites:** Add yourself or a test contact to your Salesforce first

- [ ] Go to LinkedIn profile of someone in your Salesforce
- [ ] Click extension icon
- [ ] Click "Draft Email"
- [ ] Wait for AI response
- [ ] ✅ Should see: "🔗 Salesforce Status: Found as Contact in your CRM"
- [ ] ✅ Email should have follow-up/warm tone

### Test 3: CRM Auto-Create (New Contact)
- [ ] Go to LinkedIn profile of someone NOT in your Salesforce
- [ ] Click extension icon
- [ ] Click "Draft Email"
- [ ] Wait for AI response
- [ ] ✅ Should see: "➕ Salesforce Status: New contact added to your CRM"
- [ ] ✅ Email should have cold outreach tone
- [ ] Open Salesforce in browser
- [ ] Check Contacts
- [ ] ✅ New contact should exist with LinkedIn data

### Test 4: Salesforce Disconnect
- [ ] In extension → Integrations tab
- [ ] Find "Salesforce" card
- [ ] Click "Disconnect" button (if exists)
- [ ] ✅ Status should change to "Not Connected"
- [ ] Draft email again
- [ ] ✅ Should NOT show Salesforce status

---

## 📧 Phase 4: Core Functionality Testing

### Test 1: Profile Analysis
- [ ] Go to any LinkedIn profile
- [ ] Click extension icon
- [ ] Click "🔍 Analyze Profile"
- [ ] ✅ Should show AI analysis within 5-10 seconds
- [ ] ✅ Analysis should include: summary, insights, pain points, conversation starters

### Test 2: Email Drafting
- [ ] On same profile
- [ ] Click "✉️ Draft Email" (or generate new one)
- [ ] Optional: Enter context when prompted
- [ ] ✅ Should show personalized email within 5-10 seconds
- [ ] ✅ Email should reference profile details
- [ ] ✅ Should use your saved context (if any)

### Test 3: Context Management
- [ ] Click "Context" tab
- [ ] Fill in "About Me" field
- [ ] Fill in "Sales Objectives" field
- [ ] Click "Save Context"
- [ ] ✅ Should see "✓ Context saved!" message
- [ ] Draft an email
- [ ] ✅ Email should incorporate your context

### Test 4: Export Functions
- [ ] Generate an analysis or email
- [ ] Click "📋 Copy" button
- [ ] ✅ Content should be copied to clipboard
- [ ] Click "📄 Text" button
- [ ] ✅ Should download .txt file
- [ ] Click "📑 PDF" button
- [ ] ✅ Should download .pdf file

---

## 🌐 Phase 5: Cross-Browser Testing

### Test on Different Chrome Versions
- [ ] Chrome Stable (latest)
- [ ] Chrome Beta (if available)
- [ ] Chromium (if you have it)

### Test on Different Operating Systems
- [ ] macOS (your current system)
- [ ] Windows (if available)
- [ ] Linux (optional)

---

## 🔒 Phase 6: Security & Privacy Testing

### Test 1: Data Isolation
- [ ] Log in with Account A
- [ ] Save context
- [ ] Sign out
- [ ] Log in with Account B
- [ ] ✅ Should NOT see Account A's context

### Test 2: Token Expiration
- [ ] Log in
- [ ] Wait 24 hours (or manually expire token in database)
- [ ] Use extension
- [ ] ✅ Should either work or prompt to re-login (not crash)

### Test 3: Network Failures
- [ ] Turn off WiFi
- [ ] Open extension
- [ ] ✅ Should show error message (not crash)
- [ ] Turn WiFi back on
- [ ] Try again
- [ ] ✅ Should work

---

## 🐛 Phase 7: Error Handling

### Test 1: Non-LinkedIn Pages
- [ ] Go to google.com
- [ ] Click extension icon
- [ ] ✅ Should show message: "Please navigate to a LinkedIn profile page"

### Test 2: LinkedIn Home (Not a Profile)
- [ ] Go to linkedin.com/feed
- [ ] Click extension icon
- [ ] ✅ Should show warning about needing a profile page

### Test 3: Invalid Profile
- [ ] Go to a LinkedIn profile with minimal data
- [ ] Try to analyze
- [ ] ✅ Should handle gracefully (not crash)

---

## 📊 Phase 8: Performance Testing

### Test 1: Speed
- [ ] Analyze 5 different profiles
- [ ] Measure time for each
- [ ] ✅ Should complete in 5-15 seconds

### Test 2: Memory Usage
- [ ] Open extension
- [ ] Use it 10+ times
- [ ] Check Chrome Task Manager (Shift+Esc)
- [ ] ✅ Memory usage should stay reasonable (<100MB)

---

## 🎨 Phase 9: UI/UX Testing

### Test 1: Visual Consistency
- [ ] Check all pages (Home, Context, Integrations)
- [ ] ✅ Consistent colors, fonts, spacing
- [ ] ✅ Logo appears correctly
- [ ] ✅ No broken images

### Test 2: Responsive Popup
- [ ] Extension should fit in popup (380px width)
- [ ] ✅ No horizontal scrolling
- [ ] ✅ All buttons clickable
- [ ] ✅ Text readable

### Test 3: Loading States
- [ ] Click analyze/email buttons
- [ ] ✅ Should show loading state ("Analyzing..." / "Drafting...")
- [ ] ✅ Buttons should be disabled while loading

---

## 📝 Phase 10: Documentation Verification

### User-Facing Content
- [ ] Privacy policy page exists: `/privacy`
- [ ] Terms of service page exists: `/terms`
- [ ] Install page works: `/install`
- [ ] All links work (no 404s)

---

## ✅ Phase 11: Microsoft Personal Email Verification

**Microsoft OAuth is configured to accept:**
- ✅ Personal accounts: @outlook.com, @hotmail.com, @live.com, @msn.com
- ✅ Business accounts: @company.com (Microsoft 365)
- ✅ School accounts: @university.edu

**Configuration Check:**
```typescript
tenantId: "common" // ✅ This accepts ALL Microsoft accounts
```

**No additional configuration needed!** ✅

---

## 🎯 Phase 12: Final Pre-Submission Checks

### Code Quality
- [ ] No `console.error` in production that shouldn't be there
- [ ] No hardcoded credentials or API keys
- [ ] All API endpoints use HTTPS (not HTTP in production)

### Permissions Justification
- [ ] `storage`: Save user preferences
- [ ] `activeTab`: Detect LinkedIn pages
- [ ] `scripting`: Extract LinkedIn profile data
- [ ] `tabs`: Open OAuth pages

### Manifest Verification
- [ ] Name: "Sales Curiosity"
- [ ] Version: "1.0.0"
- [ ] Description accurate
- [ ] Icons exist and display correctly
- [ ] Host permissions necessary
- [ ] No excessive permissions

---

## 🚀 Phase 13: Pre-Launch Deployment

### Web App Deployment
- [ ] Latest code pushed to GitHub
- [ ] Vercel deployment successful
- [ ] https://www.curiosityengine.io loads correctly
- [ ] All API endpoints working
- [ ] Salesforce OAuth env vars configured

### Extension Package
- [ ] Extension ZIP created: ✅ `sales-curiosity-extension.zip` (1.8MB)
- [ ] ZIP copied to web app public folder: ✅
- [ ] Available at: `/sales-curiosity-extension.zip`
- [ ] Downloadable from install page: ✅

---

## 📸 Phase 14: Chrome Web Store Assets

### Screenshots Needed (3-5 recommended)

**Screenshot 1: Login Screen**
- [ ] Capture extension OAuth login with Google/Microsoft buttons
- [ ] Size: 1280x800px
- [ ] Format: PNG

**Screenshot 2: Authenticated Dashboard**
- [ ] Show stats, Home/Context/Integrations tabs
- [ ] Size: 1280x800px
- [ ] Format: PNG

**Screenshot 3: Profile Analysis**
- [ ] Show AI analysis of a LinkedIn profile
- [ ] Size: 1280x800px
- [ ] Format: PNG

**Screenshot 4: Email Drafting**
- [ ] Show AI-generated email
- [ ] Include Salesforce status if possible
- [ ] Size: 1280x800px
- [ ] Format: PNG

**Screenshot 5: Integrations Page**
- [ ] Show Salesforce connection
- [ ] Size: 1280x800px
- [ ] Format: PNG

### Promotional Images (Optional)
- [ ] Small tile: 440x280px
- [ ] Large tile: 920x680px
- [ ] Marquee: 1400x560px

---

## 📤 Phase 15: Chrome Web Store Submission Prep

### Developer Account
- [ ] Register at https://chrome.google.com/webstore/devconsole
- [ ] Pay $5 one-time registration fee
- [ ] Verify email

### Store Listing Content

**Name:**
```
Sales Curiosity - LinkedIn AI Assistant
```

**Short Description:**
```
AI-powered LinkedIn intelligence. Analyze profiles, draft personalized emails, connect with Salesforce CRM.
```

**Category:** Productivity

**Language:** English

**Privacy Policy URL:**
```
https://www.curiosityengine.io/privacy
```

### Privacy Practices Disclosure

**Does this extension collect user data?**
Yes

**Data collected:**
- Email address (for authentication)
- LinkedIn profile data (for analysis)
- User context and preferences
- CRM integration credentials (encrypted)

**Data usage:**
- Authentication and account management
- Provide AI analysis services
- Salesforce integration
- Save user preferences

**Is data sold to third parties?**
No

**Is data used for purposes unrelated to the extension's core functionality?**
No

---

## 🧪 Testing Script (Copy & Paste)

### Test Salesforce OAuth Scopes:

Your Salesforce Connected App should have:
- ✅ `api` - Access and manage data
- ✅ `refresh_token` - Maintain access
- ✅ `offline_access` - Perform requests anytime
- ✅ `full` - Full access

### Test Microsoft OAuth Scopes:

Your Azure AD App should accept:
- ✅ `tenantId: "common"` - Personal AND business accounts
- ✅ `openid` - Sign in
- ✅ `email` - Read email
- ✅ `profile` - Read profile
- ✅ `offline_access` - Refresh tokens

**Both are configured correctly!** ✅

---

## 🎯 Critical Tests Before Submission

### Test with Different Account Types:

**Email Type** | **Provider** | **Should Work?** | **Test Status**
---------------|--------------|------------------|----------------
Personal Gmail | Google | ✅ Yes | [ ]
Business Gmail | Google Workspace | ✅ Yes | [ ]
Personal Outlook | Microsoft | ✅ Yes | [ ]
Business Outlook | Microsoft 365 | ✅ Yes | [ ]
Hotmail | Microsoft | ✅ Yes | [ ]
Live | Microsoft | ✅ Yes | [ ]

### Salesforce Account Types:

**Salesforce Edition** | **Should Work?** | **Test Status**
-----------------------|------------------|----------------
Developer Edition | ✅ Yes | [ ]
Professional | ✅ Yes | [ ]
Enterprise | ✅ Yes | [ ]
Unlimited | ✅ Yes | [ ]
Salesforce Sandbox | ⚠️ Not configured | [ ]

---

## 🚨 Known Limitations (Document for Users)

1. **Extension popup closes when you click outside**
   - This is normal Chrome behavior
   - Your login persists - just click icon again

2. **First-time OAuth requires tab closing**
   - Success page shows "close this tab" instruction
   - User must manually close (Cmd+W)
   - Then return to LinkedIn

3. **Salesforce Sandbox not supported**
   - Only production Salesforce
   - Can be configured if needed

---

## 📊 Success Criteria

### Extension Must:
- ✅ Install without errors
- ✅ OAuth login works (Google & Microsoft)
- ✅ Works with personal AND business emails
- ✅ Login persists across browser restarts
- ✅ Salesforce connection works
- ✅ CRM search finds existing contacts
- ✅ Auto-creates new contacts
- ✅ Email drafts include CRM context
- ✅ Profile analysis works on any LinkedIn profile
- ✅ Export functions work (Copy, TXT, PDF)
- ✅ Context saves and persists
- ✅ No console errors or warnings
- ✅ Graceful error handling

---

## 🎬 Final Submission Steps

After ALL tests pass:

### 1. Create Package
```bash
cd /Users/paulwallace/Desktop/sales-curiosity-engine/apps/sales-curiosity-extension
npm run build
cd dist
zip -r ../sales-curiosity-extension.zip .
```

✅ Already done! File ready at: `apps/sales-curiosity-extension/sales-curiosity-extension.zip`

### 2. Take Screenshots
- Use macOS Screenshot tool (Cmd+Shift+4)
- Capture at 1280x800 or larger
- Show real functionality
- Professional LinkedIn profiles only

### 3. Submit to Chrome Web Store
- Go to: https://chrome.google.com/webstore/devconsole
- Click "New Item"
- Upload ZIP
- Fill in all store listing info
- Add screenshots
- Submit for review

### 4. Wait for Review
- Usually 1-3 business days
- Check email for updates
- Respond quickly to any reviewer questions

---

## 📋 Quick Test Run (30 Minutes)

Want to test everything quickly? Follow this order:

1. **[5 min]** Fresh Chrome profile + Install extension
2. **[3 min]** Test Google login (personal Gmail)
3. **[3 min]** Test Microsoft login (personal Outlook)
4. **[5 min]** Connect Salesforce
5. **[5 min]** Test CRM search (existing contact)
6. **[5 min]** Test CRM auto-create (new contact)
7. **[2 min]** Test profile analysis
8. **[2 min]** Test exports

**Total: ~30 minutes for complete testing**

---

## 🎉 Ready to Submit?

When all checkboxes above are ✅:

1. Review Chrome Web Store guidelines
2. Take final screenshots
3. Submit!

---

## 📞 Support During Testing

If any test fails:
1. Check browser console for errors
2. Check extension console (right-click → Inspect)
3. Check Vercel logs
4. Verify environment variables in Vercel
5. Check Salesforce Connected App settings

---

**Start testing now! Use fresh Chrome profile and go through each phase.** 🧪

Let me know which tests pass/fail and I'll help fix any issues before submission!

