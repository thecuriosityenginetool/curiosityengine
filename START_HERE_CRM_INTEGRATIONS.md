# 🚀 START HERE: Monday.com & HubSpot CRM Integrations

## 📍 You Are Here

You want to add **Monday.com** and **HubSpot** integrations that work exactly like your existing **Salesforce** integration.

✅ **Good news:** Your Salesforce integration provides the perfect template. You just need to replicate it for Monday.com and HubSpot with different OAuth endpoints and API calls.

---

## 📚 Documentation Created

I've created **4 comprehensive documents** for you:

### 1️⃣ **MONDAY_HUBSPOT_INTEGRATION_GUIDE.md** (Main Guide)
📖 **Use this for:** Complete implementation details

**Contains:**
- Full account creation steps for Monday.com & HubSpot
- Complete code for all 6 files (3 per CRM)
- Detailed API documentation
- SQL queries (already included in your schema)
- All environment variables needed
- Testing procedures

**Sections:**
- Part 1: Monday.com account & OAuth setup
- Part 2: Monday.com code files
- Part 3: Monday.com environment variables
- Part 4: HubSpot account & OAuth setup
- Part 5: HubSpot code files
- Part 6: HubSpot environment variables
- Part 7: Integration with Prospects API
- Part 8: Testing & verification

---

### 2️⃣ **MONDAY_HUBSPOT_QUICK_REFERENCE.md** (TL;DR)
⚡ **Use this for:** Quick lookup while implementing

**Contains:**
- Account setup URLs
- OAuth configuration summary
- Files to create (list)
- Environment variables (list)
- SQL status (already done ✅)
- Testing checklist

**Perfect for:** When you need a quick reminder of what to do next.

---

### 3️⃣ **CRM_INTEGRATIONS_COMPARISON.md** (Side-by-Side)
🔍 **Use this for:** Understanding differences between CRMs

**Contains:**
- Architecture comparison (all three CRMs)
- OAuth URLs side-by-side
- API differences (REST vs GraphQL)
- Search & create function examples
- Token refresh comparison
- File structure comparison
- Feature parity matrix

**Perfect for:** Understanding how Monday.com & HubSpot relate to Salesforce.

---

### 4️⃣ **CRM_IMPLEMENTATION_CHECKLIST.md** (Step-by-Step)
✅ **Use this for:** Implementation execution

**Contains:**
- Complete checkbox checklist
- Time estimates for each step
- Detailed testing procedures
- Troubleshooting section
- Success metrics
- Final verification checklist

**Perfect for:** Following step-by-step during implementation.

---

## 🎯 Quick Start Guide

### If you have 5 minutes:
Read **MONDAY_HUBSPOT_QUICK_REFERENCE.md**

### If you have 20 minutes:
1. Read the Quick Reference
2. Skim through **MONDAY_HUBSPOT_INTEGRATION_GUIDE.md**
3. Look at **CRM_INTEGRATIONS_COMPARISON.md** to understand the pattern

### If you're ready to implement:
1. Open **CRM_IMPLEMENTATION_CHECKLIST.md**
2. Follow it step-by-step (7 hours total)
3. Use **MONDAY_HUBSPOT_INTEGRATION_GUIDE.md** for code snippets

---

## 📊 What You Need to Do

### Summary (High Level)

1. **Create Developer Accounts**
   - Monday.com Developer App (~20 min)
   - HubSpot Developer App (~25 min)

2. **Write Code** (3 files per CRM = 6 files)
   - Core service library (`lib/monday.ts`, `lib/hubspot.ts`)
   - OAuth initiation route (`api/{crm}/auth-user/route.ts`)
   - OAuth callback route (`api/{crm}/user-callback/route.ts`)

3. **Update Prospects API** (1 file)
   - Add Monday.com check
   - Add HubSpot check
   - Add auto-create logic

4. **Add Environment Variables** (8 variables)
   - 4 for Monday.com (client ID, secret, redirect URIs)
   - 4 for HubSpot (client ID, secret, redirect URIs)

5. **Deploy & Test**
   - Push to Vercel
   - Test OAuth connections
   - Test search functionality
   - Test auto-create functionality

**Total Time: ~7 hours**

---

## 🗂️ Files You'll Create

### Monday.com (3 files)
```
apps/sales-curiosity-web/src/lib/monday.ts                        (~450 lines)
apps/sales-curiosity-web/src/app/api/monday/auth-user/route.ts   (~120 lines)
apps/sales-curiosity-web/src/app/api/monday/user-callback/route.ts (~100 lines)
```

### HubSpot (3 files)
```
apps/sales-curiosity-web/src/lib/hubspot.ts                       (~500 lines)
apps/sales-curiosity-web/src/app/api/hubspot/auth-user/route.ts  (~120 lines)
apps/sales-curiosity-web/src/app/api/hubspot/user-callback/route.ts (~100 lines)
```

### Updates (1 file)
```
apps/sales-curiosity-web/src/app/api/prospects/route.ts          (~50 lines added)
```

**Total: 7 files (6 new, 1 updated)**

---

## 🌐 Environment Variables You'll Add

### Vercel → Settings → Environment Variables

**Monday.com:**
```bash
MONDAY_CLIENT_ID=xxx
MONDAY_CLIENT_SECRET=xxx
MONDAY_REDIRECT_URI=https://www.curiosityengine.io/api/monday/callback
MONDAY_USER_REDIRECT_URI=https://www.curiosityengine.io/api/monday/user-callback
```

**HubSpot:**
```bash
HUBSPOT_CLIENT_ID=xxx
HUBSPOT_CLIENT_SECRET=xxx
HUBSPOT_REDIRECT_URI=https://www.curiosityengine.io/api/hubspot/callback
HUBSPOT_USER_REDIRECT_URI=https://www.curiosityengine.io/api/hubspot/user-callback
```

**Total: 8 environment variables**

---

## 🗄️ Database / SQL

**Status: ✅ Already Done!**

Your `supabase-add-all-integrations.sql` file already includes support for:
- `monday_user` integration type
- `hubspot_user` integration type

No additional SQL needed! The `organization_integrations` table already supports these types.

---

## 📋 Developer Account Setup

### Monday.com
1. Go to: https://monday.com/developers/apps
2. Create app: "Sales Curiosity Engine"
3. Configure OAuth with redirect URLs
4. Add scopes: `boards:read`, `boards:write`, `users:read`, `me:read`
5. Get Client ID & Client Secret

### HubSpot
1. Go to: https://developers.hubspot.com/apps
2. Create app: "Sales Curiosity Engine"
3. Configure OAuth with redirect URLs
4. Add scopes: `crm.objects.contacts.read`, `crm.objects.contacts.write`, etc.
5. Get Client ID & Client Secret

**Detailed steps in MONDAY_HUBSPOT_INTEGRATION_GUIDE.md**

---

## 🎯 How It Works (For Users)

Just like Salesforce:

```
User clicks "Connect Monday.com" in extension
          ↓
OAuth flow opens Monday.com login
          ↓
User authorizes
          ↓
Tokens saved to database
          ↓
Extension shows "Connected" ✅
          ↓
When generating email:
  → Checks Monday.com for contact
  → If found: Follow-up email style
  → If not found: Cold email + auto-creates contact
```

Same flow for HubSpot!

---

## 🔄 Integration Flow

```
LinkedIn Profile → Extension → Generate Email
                       ↓
              Check CRMs in order:
                1. Salesforce ✅
                2. Monday.com (NEW)
                3. HubSpot (NEW)
                       ↓
         Found in CRM? ← Yes → Follow-up email
                ↓ No
         Create in CRM + Cold outreach email
```

---

## 🧪 Testing Plan

### Phase 1: Monday.com
- [ ] Connect account via OAuth
- [ ] Search for existing contact (should find)
- [ ] Generate email for new prospect (should auto-create)
- [ ] Verify follow-up email for existing
- [ ] Verify cold email for new
- [ ] Disconnect and reconnect

### Phase 2: HubSpot
- [ ] Connect account via OAuth
- [ ] Search for existing contact (should find)
- [ ] Generate email for new prospect (should auto-create)
- [ ] Verify follow-up email for existing
- [ ] Verify cold email for new
- [ ] Disconnect and reconnect

### Phase 3: All Three CRMs
- [ ] Connect all three CRMs
- [ ] Verify priority order (Salesforce → Monday → HubSpot)
- [ ] Test with profiles in different CRMs
- [ ] Verify disconnect doesn't affect others

---

## ⏱️ Time Estimates

| Task | Monday.com | HubSpot | Total |
|------|-----------|---------|-------|
| Account Setup | 20 min | 25 min | 45 min |
| Create Code Files | 2 hours | 2 hours | 4 hours |
| Add Env Variables | 5 min | 5 min | 10 min |
| Update Prospects API | 30 min | 30 min | 1 hour |
| Testing | 30 min | 30 min | 1 hour |
| Documentation | 15 min | 15 min | 30 min |
| **TOTAL** | **3.5 hours** | **3.5 hours** | **~7 hours** |

---

## 🎓 Key Insights

### What Makes This Easy:
1. ✅ Salesforce integration already works (template to follow)
2. ✅ Database schema already supports Monday.com & HubSpot
3. ✅ Extension UI already has integration framework
4. ✅ OAuth pattern is identical across all three
5. ✅ All documentation is written for you

### What Makes This Different:
1. **Monday.com:** Uses GraphQL instead of REST
2. **HubSpot:** Different API endpoints but similar to Salesforce
3. Each CRM has different OAuth scopes
4. Each CRM has different search/create payloads

### The Pattern:
```
Every CRM integration needs:
1. OAuth app in CRM platform
2. Core service file (lib/{crm}.ts)
3. Auth initiation route (api/{crm}/auth-user)
4. OAuth callback route (api/{crm}/user-callback)
5. Environment variables (client ID, secret, redirect URIs)
6. Integration with prospects API

That's it! Same pattern every time.
```

---

## 🚀 Recommended Implementation Order

1. **Start with Monday.com** (simpler GraphQL API)
   - Implement all 3 files
   - Add environment variables
   - Test thoroughly
   - Deploy

2. **Then add HubSpot** (similar to Salesforce)
   - Implement all 3 files
   - Add environment variables
   - Test thoroughly
   - Deploy

3. **Final verification**
   - Test all three CRMs together
   - Verify priority order
   - Document any issues

---

## 📖 Documentation References

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **START_HERE_CRM_INTEGRATIONS.md** | Overview (this file) | First read |
| **MONDAY_HUBSPOT_QUICK_REFERENCE.md** | Quick lookup | During implementation |
| **MONDAY_HUBSPOT_INTEGRATION_GUIDE.md** | Complete guide | For code and detailed steps |
| **CRM_INTEGRATIONS_COMPARISON.md** | Understanding differences | To understand patterns |
| **CRM_IMPLEMENTATION_CHECKLIST.md** | Step-by-step execution | While implementing |

---

## ✅ Success Criteria

You'll know you're done when:

- [ ] Users can connect Monday.com accounts
- [ ] Users can connect HubSpot accounts
- [ ] CRM search works for all three
- [ ] Auto-contact creation works for all three
- [ ] Email style changes based on CRM status
- [ ] Multiple users can connect their own CRMs
- [ ] Disconnect works properly
- [ ] No errors in console
- [ ] No performance degradation

---

## 🆘 Need Help?

### If you get stuck:

1. **Check the specific guide:**
   - OAuth issues? → See account setup section in main guide
   - Code errors? → Check the comparison document
   - Testing failing? → See troubleshooting in checklist

2. **Common issues:**
   - "Redirect URI mismatch" → Check callback URLs match exactly
   - "Integration not configured" → Verify environment variables
   - "Search not finding contacts" → Check scopes and permissions
   - "Auto-create failing" → Verify write permissions in scopes

3. **Compare with Salesforce:**
   - Your Salesforce integration works perfectly
   - Use it as a reference for structure
   - Copy the pattern, change the endpoints

---

## 🎯 Next Steps

### Right Now (5 minutes):
1. Read **MONDAY_HUBSPOT_QUICK_REFERENCE.md**
2. Skim **CRM_INTEGRATIONS_COMPARISON.md**
3. Understand the pattern

### Today/Tomorrow (3-4 hours):
1. Implement Monday.com (use checklist)
2. Test Monday.com thoroughly
3. Deploy

### This Week (3-4 hours):
1. Implement HubSpot (use checklist)
2. Test HubSpot thoroughly
3. Deploy
4. Test all three together

### Done! 🎉

---

## 🎉 Final Thoughts

This is a **straightforward implementation** because:
- ✅ You already have the pattern (Salesforce)
- ✅ The database is ready
- ✅ The extension framework exists
- ✅ All documentation is written
- ✅ It's just replication with different APIs

**You've got this!** 💪

Follow the checklist, use the code from the guide, and you'll have both integrations working in ~7 hours total.

---

## 📞 Documentation Roadmap

```
START HERE (You are here)
    ↓
QUICK_REFERENCE (Get oriented)
    ↓
INTEGRATION_GUIDE (Get code)
    ↓
IMPLEMENTATION_CHECKLIST (Execute)
    ↓
COMPARISON (Understand details)
    ↓
SUCCESS! 🎉
```

---

**Ready? Open `CRM_IMPLEMENTATION_CHECKLIST.md` and start checking boxes!** ✅

Good luck! 🚀

