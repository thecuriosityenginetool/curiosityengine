# CRM Integration Implementation Checklist

Use this checklist to implement Monday.com and HubSpot integrations step by step.

---

## 🎯 Prerequisites

- [ ] Salesforce integration is working (reference implementation)
- [ ] Access to Vercel deployment settings
- [ ] Access to Supabase SQL editor
- [ ] Code editor ready
- [ ] Time estimate: 6-8 hours total (3-4 hours per CRM)

---

# 📝 Phase 1: Monday.com Integration

## Step 1: Monday.com Developer Account (10 minutes)

- [ ] Go to https://monday.com/ and sign up/login
- [ ] Create a workspace if needed
- [ ] Go to https://monday.com/developers/apps
- [ ] Click "Create App"
- [ ] Fill in app name: `Sales Curiosity Engine`
- [ ] Add description: `AI-powered sales intelligence for LinkedIn`
- [ ] Upload logo (optional)
- [ ] Click "Create"

## Step 2: Configure Monday.com OAuth (10 minutes)

- [ ] In your new app, click "OAuth" in sidebar
- [ ] Add Redirect URLs:
  ```
  https://www.curiosityengine.io/api/monday/user-callback
  http://localhost:3000/api/monday/user-callback
  ```
- [ ] Select scopes:
  - [ ] `boards:read`
  - [ ] `boards:write`
  - [ ] `users:read`
  - [ ] `me:read`
- [ ] Click "Save"
- [ ] Copy **Client ID** → Save in notes
- [ ] Copy **Client Secret** → Click "Show" and save in notes

## Step 3: Create Monday.com Code Files (2 hours)

### File 1: Core Service
- [ ] Create file: `apps/sales-curiosity-web/src/lib/monday.ts`
- [ ] Copy code from `MONDAY_HUBSPOT_INTEGRATION_GUIDE.md` (Monday.com Part 2, File 1)
- [ ] Save file

### File 2: Auth Initiation
- [ ] Create directory: `apps/sales-curiosity-web/src/app/api/monday/auth-user/`
- [ ] Create file: `route.ts` in above directory
- [ ] Copy code from guide (Monday.com Part 2, File 2)
- [ ] Save file

### File 3: OAuth Callback
- [ ] Create directory: `apps/sales-curiosity-web/src/app/api/monday/user-callback/`
- [ ] Create file: `route.ts` in above directory
- [ ] Copy code from guide (Monday.com Part 2, File 3)
- [ ] Save file

## Step 4: Add Monday.com Environment Variables (5 minutes)

- [ ] Go to Vercel Dashboard
- [ ] Open your project
- [ ] Go to Settings → Environment Variables
- [ ] Add variable: `MONDAY_CLIENT_ID`
  - Value: [Paste Client ID from Step 2]
  - Environment: Production, Preview, Development
  - Click "Save"
- [ ] Add variable: `MONDAY_CLIENT_SECRET`
  - Value: [Paste Client Secret from Step 2]
  - Environment: Production, Preview, Development
  - Click "Save"
- [ ] Add variable: `MONDAY_REDIRECT_URI`
  - Value: `https://www.curiosityengine.io/api/monday/callback`
  - Environment: Production, Preview, Development
  - Click "Save"
- [ ] Add variable: `MONDAY_USER_REDIRECT_URI`
  - Value: `https://www.curiosityengine.io/api/monday/user-callback`
  - Environment: Production, Preview, Development
  - Click "Save"

## Step 5: Update Prospects API for Monday.com (30 minutes)

- [ ] Open file: `apps/sales-curiosity-web/src/app/api/prospects/route.ts`
- [ ] Find the Salesforce check (around line 164)
- [ ] After Salesforce check, add Monday.com check code from guide
- [ ] Find the auto-create section (around line 450)
- [ ] Add Monday.com auto-create code from guide
- [ ] Save file

## Step 6: Deploy Monday.com Integration (5 minutes)

- [ ] Commit all changes to git
- [ ] Push to main branch
- [ ] Wait for Vercel deployment to complete
- [ ] Check deployment status in Vercel dashboard

## Step 7: Test Monday.com Integration (30 minutes)

### Test Connection
- [ ] Open Chrome extension
- [ ] Go to Settings → Integrations
- [ ] Find "Monday.com" card
- [ ] Click "Connect Monday.com"
- [ ] New tab opens with Monday.com OAuth
- [ ] Log in with Monday.com credentials
- [ ] Click "Authorize"
- [ ] Redirected back to dashboard
- [ ] Verify "Connected" status shows

### Test Search (Existing Contact)
- [ ] Create a test contact in Monday.com CRM board manually
  - Name: Test Person
  - Email: test@example.com
- [ ] Go to LinkedIn profile (any profile)
- [ ] Open Chrome extension
- [ ] Click "Generate Email"
- [ ] Check console logs for "Monday.com search result"
- [ ] If test email matches, should show "Found in CRM"

### Test Auto-Create (New Contact)
- [ ] Go to a different LinkedIn profile
- [ ] Click "Generate Email"
- [ ] Wait for email generation
- [ ] Check Monday.com CRM board
- [ ] Verify new item was created with LinkedIn data

### Test Disconnect
- [ ] Click "Disconnect Monday.com"
- [ ] Verify status shows "Not Connected"
- [ ] Generate email → Should work without CRM check

---

# 📝 Phase 2: HubSpot Integration

## Step 1: HubSpot Developer Account (10 minutes)

- [ ] Go to https://developers.hubspot.com/
- [ ] Click "Get started free" or login
- [ ] Complete developer account signup
- [ ] Verify email if needed
- [ ] Go to https://developers.hubspot.com/apps
- [ ] Click "Create app"

## Step 2: Configure HubSpot OAuth (15 minutes)

### Basic Info
- [ ] App name: `Sales Curiosity Engine`
- [ ] Description: `AI-powered sales intelligence for LinkedIn`
- [ ] Upload logo (optional)

### Auth Tab
- [ ] Click "Auth" tab
- [ ] Add Redirect URLs:
  ```
  https://www.curiosityengine.io/api/hubspot/user-callback
  http://localhost:3000/api/hubspot/user-callback
  ```
- [ ] Click "Scopes" section
- [ ] Select scopes:
  - [ ] `crm.objects.contacts.read`
  - [ ] `crm.objects.contacts.write`
  - [ ] `crm.objects.companies.read`
  - [ ] `crm.objects.companies.write`
  - [ ] `crm.schemas.contacts.read`
- [ ] Click "Save"
- [ ] Go back to "Auth" tab
- [ ] Copy **Client ID** → Save in notes
- [ ] Copy **Client Secret** → Save in notes

## Step 3: Create HubSpot Code Files (2 hours)

### File 1: Core Service
- [ ] Create file: `apps/sales-curiosity-web/src/lib/hubspot.ts`
- [ ] Copy code from `MONDAY_HUBSPOT_INTEGRATION_GUIDE.md` (HubSpot Part 2, File 1)
- [ ] Save file

### File 2: Auth Initiation
- [ ] Create directory: `apps/sales-curiosity-web/src/app/api/hubspot/auth-user/`
- [ ] Create file: `route.ts` in above directory
- [ ] Copy code from guide (HubSpot Part 2, File 2)
- [ ] Save file

### File 3: OAuth Callback
- [ ] Create directory: `apps/sales-curiosity-web/src/app/api/hubspot/user-callback/`
- [ ] Create file: `route.ts` in above directory
- [ ] Copy code from guide (HubSpot Part 2, File 3)
- [ ] Save file

## Step 4: Add HubSpot Environment Variables (5 minutes)

- [ ] Go to Vercel Dashboard
- [ ] Open your project
- [ ] Go to Settings → Environment Variables
- [ ] Add variable: `HUBSPOT_CLIENT_ID`
  - Value: [Paste Client ID from Step 2]
  - Environment: Production, Preview, Development
  - Click "Save"
- [ ] Add variable: `HUBSPOT_CLIENT_SECRET`
  - Value: [Paste Client Secret from Step 2]
  - Environment: Production, Preview, Development
  - Click "Save"
- [ ] Add variable: `HUBSPOT_REDIRECT_URI`
  - Value: `https://www.curiosityengine.io/api/hubspot/callback`
  - Environment: Production, Preview, Development
  - Click "Save"
- [ ] Add variable: `HUBSPOT_USER_REDIRECT_URI`
  - Value: `https://www.curiosityengine.io/api/hubspot/user-callback`
  - Environment: Production, Preview, Development
  - Click "Save"

## Step 5: Update Prospects API for HubSpot (30 minutes)

- [ ] Open file: `apps/sales-curiosity-web/src/app/api/prospects/route.ts`
- [ ] Find the Monday.com check you just added
- [ ] After Monday.com check, add HubSpot check code from guide
- [ ] Find the auto-create section
- [ ] Add HubSpot auto-create code from guide (after Monday.com)
- [ ] Save file

## Step 6: Deploy HubSpot Integration (5 minutes)

- [ ] Commit all changes to git
- [ ] Push to main branch
- [ ] Wait for Vercel deployment to complete
- [ ] Check deployment status in Vercel dashboard

## Step 7: Test HubSpot Integration (30 minutes)

### Test Connection
- [ ] Open Chrome extension
- [ ] Go to Settings → Integrations
- [ ] Find "HubSpot" card
- [ ] Click "Connect HubSpot"
- [ ] New tab opens with HubSpot OAuth
- [ ] Log in with HubSpot credentials
- [ ] Click "Authorize"
- [ ] Redirected back to dashboard
- [ ] Verify "Connected" status shows

### Test Search (Existing Contact)
- [ ] Create a test contact in HubSpot manually
  - First Name: Test
  - Last Name: Person
  - Email: test@example.com
- [ ] Go to LinkedIn profile
- [ ] Open Chrome extension
- [ ] Click "Generate Email"
- [ ] Check console logs for "HubSpot search result"
- [ ] If test email matches, should show "Found in CRM"

### Test Auto-Create (New Contact)
- [ ] Go to a different LinkedIn profile
- [ ] Click "Generate Email"
- [ ] Wait for email generation
- [ ] Check HubSpot contacts
- [ ] Verify new contact was created with LinkedIn data

### Test Disconnect
- [ ] Click "Disconnect HubSpot"
- [ ] Verify status shows "Not Connected"
- [ ] Generate email → Should work without CRM check

---

# 📝 Phase 3: Database & Final Checks

## Verify Database Schema (5 minutes)

- [ ] Go to Supabase Dashboard
- [ ] Open SQL Editor
- [ ] Run this query to check integration types:
  ```sql
  SELECT constraint_name, check_clause 
  FROM information_schema.check_constraints 
  WHERE constraint_name = 'organization_integrations_integration_type_check';
  ```
- [ ] Verify output includes `monday_user` and `hubspot_user`
- [ ] If not present, run the SQL from `supabase-add-all-integrations.sql`

## Test All Three CRMs Together (15 minutes)

- [ ] Connect all three CRMs to same test account
- [ ] Verify all show "Connected" in extension
- [ ] Test email generation with profiles that exist in each CRM
- [ ] Verify correct CRM is checked first (priority order)
- [ ] Test disconnecting each one individually

---

# 📝 Phase 4: Extension UI Updates (Optional)

## Add Monday.com & HubSpot Cards to Extension (1 hour)

If your extension has a dedicated integrations page:

- [ ] Find integrations page component
- [ ] Locate Salesforce integration card
- [ ] Duplicate card for Monday.com
  - Update title: "Monday.com"
  - Update icon/color
  - Update integration type: `monday_user`
  - Update API endpoint: `/api/monday/auth-user`
- [ ] Duplicate card for HubSpot
  - Update title: "HubSpot"
  - Update icon/color
  - Update integration type: `hubspot_user`
  - Update API endpoint: `/api/hubspot/auth-user`
- [ ] Test UI in extension

---

# 📝 Phase 5: Documentation & User Communication

## Update User-Facing Documentation (30 minutes)

- [ ] Create user guide: `USER_GUIDE_MONDAY.md`
- [ ] Create user guide: `USER_GUIDE_HUBSPOT.md`
- [ ] Update main README with new integrations
- [ ] Add screenshots of connection process
- [ ] Document any limitations or known issues

## Communication

- [ ] Announce new integrations to users via email
- [ ] Update marketing website with CRM logos
- [ ] Create tutorial videos (optional)
- [ ] Update Chrome Web Store description

---

# 📊 Final Verification Checklist

## Code Files Created (6 files)

- [ ] `src/lib/monday.ts`
- [ ] `src/app/api/monday/auth-user/route.ts`
- [ ] `src/app/api/monday/user-callback/route.ts`
- [ ] `src/lib/hubspot.ts`
- [ ] `src/app/api/hubspot/auth-user/route.ts`
- [ ] `src/app/api/hubspot/user-callback/route.ts`

## Code Files Modified (1 file)

- [ ] `src/app/api/prospects/route.ts` (added CRM checks)

## Environment Variables (8 variables)

### Monday.com
- [ ] `MONDAY_CLIENT_ID`
- [ ] `MONDAY_CLIENT_SECRET`
- [ ] `MONDAY_REDIRECT_URI`
- [ ] `MONDAY_USER_REDIRECT_URI`

### HubSpot
- [ ] `HUBSPOT_CLIENT_ID`
- [ ] `HUBSPOT_CLIENT_SECRET`
- [ ] `HUBSPOT_REDIRECT_URI`
- [ ] `HUBSPOT_USER_REDIRECT_URI`

## Testing Completed

### Monday.com
- [ ] OAuth connection works
- [ ] Existing contact search works
- [ ] New contact auto-creation works
- [ ] Follow-up email style for existing contacts
- [ ] Cold email style for new contacts
- [ ] Disconnect works

### HubSpot
- [ ] OAuth connection works
- [ ] Existing contact search works
- [ ] New contact auto-creation works
- [ ] Follow-up email style for existing contacts
- [ ] Cold email style for new contacts
- [ ] Disconnect works

## Production Ready

- [ ] All tests passing
- [ ] No console errors
- [ ] Error handling tested
- [ ] Token refresh tested (HubSpot)
- [ ] Multiple users can connect simultaneously
- [ ] Disconnect doesn't affect other users
- [ ] Application redeployed with all changes
- [ ] Database constraints verified

---

# 🎯 Success Metrics

After implementation, verify:

- [ ] Users can connect Monday.com accounts
- [ ] Users can connect HubSpot accounts
- [ ] CRM search is working (check logs)
- [ ] Auto-creation is working (check CRMs)
- [ ] Email quality improves (follow-up vs cold)
- [ ] No performance degradation
- [ ] No increase in errors

---

# 🚨 Troubleshooting

## Common Issues

### OAuth Redirect Mismatch
- [ ] Verify callback URLs in CRM app settings match exactly
- [ ] Check for trailing slashes (should not have them)
- [ ] Ensure HTTPS in production URLs

### "Integration not configured" Error
- [ ] Verify environment variables are set in Vercel
- [ ] Check variable names match exactly (case-sensitive)
- [ ] Redeploy after adding env vars

### Search Not Finding Contacts
- [ ] Check email format in CRM
- [ ] Verify scopes include read permissions
- [ ] Check console logs for API errors
- [ ] Test with known email in CRM

### Contact Not Auto-Creating
- [ ] Verify write permissions in scopes
- [ ] Check if CRM board/workspace exists (Monday.com)
- [ ] Ensure required fields are populated
- [ ] Check error logs

---

# 📅 Estimated Timeline

| Phase | Monday.com | HubSpot | Total |
|-------|-----------|---------|-------|
| Account Setup | 20 min | 25 min | 45 min |
| Code Files | 2 hours | 2 hours | 4 hours |
| Env Variables | 5 min | 5 min | 10 min |
| Prospects API | 30 min | 30 min | 1 hour |
| Testing | 30 min | 30 min | 1 hour |
| **Total** | **3.5 hours** | **3.5 hours** | **7 hours** |

---

# 🎉 Completion

Once all checkboxes are complete:

- [ ] All three CRMs (Salesforce, Monday.com, HubSpot) are working
- [ ] Users can connect any or all CRMs
- [ ] Email generation uses CRM data appropriately
- [ ] Contacts auto-sync to CRMs
- [ ] Documentation is updated
- [ ] Users have been notified

**Congratulations! You now have a multi-CRM sales intelligence platform! 🚀**

---

# 📚 Reference Documents

Quick links to full documentation:

- **Main Guide:** `MONDAY_HUBSPOT_INTEGRATION_GUIDE.md`
- **Quick Reference:** `MONDAY_HUBSPOT_QUICK_REFERENCE.md`
- **Comparison:** `CRM_INTEGRATIONS_COMPARISON.md`
- **This Checklist:** `CRM_IMPLEMENTATION_CHECKLIST.md`

---

# 🔗 Developer Resources

Keep these tabs open while implementing:

- Monday.com: https://developer.monday.com/api-reference/docs
- HubSpot: https://developers.hubspot.com/docs/api/overview
- Salesforce (reference): Your existing implementation
- Supabase: Your database dashboard
- Vercel: Your deployment dashboard

