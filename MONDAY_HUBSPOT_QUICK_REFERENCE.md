# Monday.com & HubSpot Integration - Quick Reference

## 🎯 Overview

Add Monday.com and HubSpot CRM integrations that work exactly like Salesforce - users connect their own accounts and get CRM-aware AI emails.

---

## ⚡ Monday.com Setup (30 minutes)

### 1. Create Monday.com App
→ https://monday.com/developers/apps → Create App

**OAuth Settings:**
```
Redirect URLs (need BOTH):
  - https://www.curiosityengine.io/api/monday/callback        (org-level)
  - https://www.curiosityengine.io/api/monday/user-callback   (user-level)

Scopes:
  ✅ boards:read
  ✅ boards:write
  ✅ users:read
  ✅ me:read
```

### 2. Get Credentials
```
Client ID → MONDAY_CLIENT_ID
Client Secret → MONDAY_CLIENT_SECRET
```

### 3. Files to Create

```
apps/sales-curiosity-web/src/lib/monday.ts
apps/sales-curiosity-web/src/app/api/monday/auth-user/route.ts
apps/sales-curiosity-web/src/app/api/monday/user-callback/route.ts
```

### 4. Vercel Environment Variables

```bash
MONDAY_CLIENT_ID=your_monday_client_id
MONDAY_CLIENT_SECRET=your_monday_client_secret
MONDAY_REDIRECT_URI=https://www.curiosityengine.io/api/monday/callback
MONDAY_USER_REDIRECT_URI=https://www.curiosityengine.io/api/monday/user-callback
```

### 5. SQL - Already Done! ✅

The `supabase-add-all-integrations.sql` already includes `monday` and `monday_user`.

---

## ⚡ HubSpot Setup (30 minutes)

### 1. Create HubSpot App
→ https://developers.hubspot.com/apps → Create app

**OAuth Settings:**
```
Redirect URLs (need BOTH):
  - https://www.curiosityengine.io/api/hubspot/callback        (org-level)
  - https://www.curiosityengine.io/api/hubspot/user-callback   (user-level)

Scopes:
  ✅ crm.objects.contacts.read
  ✅ crm.objects.contacts.write
  ✅ crm.objects.companies.read
  ✅ crm.objects.companies.write
  ✅ crm.schemas.contacts.read
```

### 2. Get Credentials
```
Client ID → HUBSPOT_CLIENT_ID
Client Secret → HUBSPOT_CLIENT_SECRET
```

### 3. Files to Create

```
apps/sales-curiosity-web/src/lib/hubspot.ts
apps/sales-curiosity-web/src/app/api/hubspot/auth-user/route.ts
apps/sales-curiosity-web/src/app/api/hubspot/user-callback/route.ts
```

### 4. Vercel Environment Variables

```bash
HUBSPOT_CLIENT_ID=your_hubspot_client_id
HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret
HUBSPOT_REDIRECT_URI=https://www.curiosityengine.io/api/hubspot/callback
HUBSPOT_USER_REDIRECT_URI=https://www.curiosityengine.io/api/hubspot/user-callback
```

### 5. SQL - Already Done! ✅

The `supabase-add-all-integrations.sql` already includes `hubspot` and `hubspot_user`.

---

## 🔗 Update Prospects API

**File:** `apps/sales-curiosity-web/src/app/api/prospects/route.ts`

Add checks for Monday.com and HubSpot after Salesforce check:

```typescript
// Check Monday.com
const { data: mondayIntegration } = await supabase
  .from('organization_integrations')
  .select('*')
  .eq('organization_id', organizationId)
  .eq('integration_type', 'monday_user')
  .eq('is_enabled', true)
  .single();

if (mondayIntegration) {
  const { searchPersonInMonday } = await import('@/lib/monday');
  // ... search logic
}

// Check HubSpot
const { data: hubspotIntegration } = await supabase
  .from('organization_integrations')
  .select('*')
  .eq('organization_id', organizationId)
  .eq('integration_type', 'hubspot_user')
  .eq('is_enabled', true)
  .single();

if (hubspotIntegration) {
  const { searchPersonInHubSpot } = await import('@/lib/hubspot');
  // ... search logic
}
```

---

## 📋 Complete File List

### Monday.com (3 files)
1. `src/lib/monday.ts` - Core service (~450 lines)
2. `src/app/api/monday/auth-user/route.ts` - OAuth initiation (~120 lines)
3. `src/app/api/monday/user-callback/route.ts` - OAuth callback (~100 lines)

### HubSpot (3 files)
1. `src/lib/hubspot.ts` - Core service (~500 lines)
2. `src/app/api/hubspot/auth-user/route.ts` - OAuth initiation (~120 lines)
3. `src/app/api/hubspot/user-callback/route.ts` - OAuth callback (~100 lines)

### Updates Needed (1 file)
1. `src/app/api/prospects/route.ts` - Add CRM checks (~50 lines added)

---

## 🧪 Testing

### Monday.com
1. Extension → Settings → Integrations → "Connect Monday.com"
2. Test with LinkedIn profile in Monday.com CRM → Should detect
3. Test with new profile → Should auto-create item

### HubSpot
1. Extension → Settings → Integrations → "Connect HubSpot"
2. Test with LinkedIn profile in HubSpot → Should detect
3. Test with new profile → Should auto-create contact

---

## 🎯 How It Works

**Without CRM:**
```
Generate email → Generic cold email
```

**With Monday.com/HubSpot:**
```
Generate email
   ↓
✅ Check user's CRM
   ↓
IF found: "Following up..." (follow-up style)
IF new: "I came across..." (cold style) + auto-creates contact
   ↓
Perfect email + CRM stays synced!
```

---

## 📊 Environment Variables Summary

### Monday.com (4 variables)
```bash
MONDAY_CLIENT_ID
MONDAY_CLIENT_SECRET
MONDAY_REDIRECT_URI
MONDAY_USER_REDIRECT_URI
```

### HubSpot (4 variables)
```bash
HUBSPOT_CLIENT_ID
HUBSPOT_CLIENT_SECRET
HUBSPOT_REDIRECT_URI
HUBSPOT_USER_REDIRECT_URI
```

**Total:** 8 new environment variables

---

## 🗄️ Database

**No new tables needed!** Uses existing `organization_integrations` table.

Integration types:
- `monday_user` - User-level Monday.com connection
- `hubspot_user` - User-level HubSpot connection

SQL constraint already includes these types. ✅

---

## 🔒 Security

- ✅ Each user connects their own account (OAuth)
- ✅ Tokens encrypted in Supabase
- ✅ Auto-refresh when expired
- ✅ Users can disconnect anytime
- ✅ Row Level Security (RLS) policies

---

## 🚀 Deployment Steps

1. **Create apps** in Monday.com and HubSpot developer portals
2. **Get credentials** (Client ID & Secret for each)
3. **Create files** (3 files per integration = 6 files total)
4. **Add environment variables** in Vercel (4 per integration = 8 total)
5. **Update prospects API** to check new integrations
6. **Redeploy** application
7. **Test** connections and functionality

---

## 📚 Full Documentation

See `MONDAY_HUBSPOT_INTEGRATION_GUIDE.md` for:
- Complete code for all files
- Detailed API documentation
- Step-by-step account setup
- Troubleshooting guide
- Testing procedures

---

## 🎉 Success Checklist

### Monday.com
- [ ] App created at monday.com/developers
- [ ] OAuth configured with redirect URLs
- [ ] Client ID & Secret obtained
- [ ] 3 files created (lib, auth-user, user-callback)
- [ ] 4 environment variables added to Vercel
- [ ] Prospects API updated
- [ ] Application redeployed
- [ ] Connection tested
- [ ] Search tested
- [ ] Auto-create tested

### HubSpot
- [ ] App created at developers.hubspot.com
- [ ] OAuth configured with redirect URLs and scopes
- [ ] Client ID & Secret obtained
- [ ] 3 files created (lib, auth-user, user-callback)
- [ ] 4 environment variables added to Vercel
- [ ] Prospects API updated
- [ ] Application redeployed
- [ ] Connection tested
- [ ] Search tested
- [ ] Auto-create tested

---

## 🔗 Key Resources

**Monday.com:**
- Developer Portal: https://monday.com/developers/apps
- API Docs: https://developer.monday.com/api-reference/docs
- OAuth Guide: https://developer.monday.com/apps/docs/oauth

**HubSpot:**
- Developer Portal: https://developers.hubspot.com/apps
- API Docs: https://developers.hubspot.com/docs/api/overview
- OAuth Guide: https://developers.hubspot.com/docs/api/oauth-quickstart-guide

---

**Ready to implement! Both integrations follow the exact same pattern as Salesforce.** 🚀

