# 🔧 Fix: Salesforce Organization-Level OAuth Not Saving

## 🐛 Problem

- ✅ Individual Salesforce accounts connect successfully (user-level)
- ❌ Organization-level Salesforce OAuth redirects to dashboard without saving auth

**Symptom:** After authorizing Salesforce, you're redirected but connection doesn't persist.

---

## 🔍 Root Cause Analysis

The organization-level OAuth flow has a different architecture:

### User-Level OAuth (Working ✅):
```
1. User clicks "Connect"
2. System uses global SALESFORCE_CLIENT_ID from env vars
3. Redirects to Salesforce OAuth
4. Callback saves tokens to database
5. Done! ✅
```

### Org-Level OAuth (Not Working ❌):
```
1. Admin clicks "Connect"  
2. System looks for org-specific credentials in database
3. If NOT found → Returns error "needs credentials"
4. If found → Uses org credentials for OAuth
5. Callback saves tokens
6. Redirects to dashboard

PROBLEM: Org credentials might not be configured!
```

---

## ✅ Solution: Use Global Credentials for Org OAuth

The simplest fix is to allow org-level OAuth to use the global Salesforce credentials (from environment variables) instead of requiring org-specific credentials.

### Update Required

**File:** `apps/sales-curiosity-web/src/app/api/salesforce/auth/route.ts`

**Current code (lines 69-89):**
```typescript
// Get org-specific Salesforce credentials
const { data: integration } = await supabase
  .from('organization_integrations')
  .select('configuration')
  .eq('organization_id', user.organization_id)
  .eq('integration_type', 'salesforce')
  .maybeSingle();

const config = integration?.configuration as any || {};
const orgClientId = config.client_id;

if (!orgClientId) {
  console.error('❌ [Salesforce Auth-Org] No credentials configured');
  return NextResponse.json(
    { 
      error: 'Salesforce credentials not configured...',
      needsCredentials: true 
    },
    { status: 400 }
  );
}
```

**Should be:**
```typescript
// Get org-specific Salesforce credentials or use global env vars
const { data: integration } = await supabase
  .from('organization_integrations')
  .select('configuration')
  .eq('organization_id', user.organization_id)
  .eq('integration_type', 'salesforce')
  .maybeSingle();

const config = integration?.configuration as any || {};
const orgClientId = config.client_id;

// If no org-specific credentials, use global env vars (same as user-level)
if (!orgClientId) {
  console.log('🟪 [Salesforce Auth-Org] No org-specific credentials, using global env vars');
  // Will use SALESFORCE_CLIENT_ID from env vars via getSalesforceAuthUrl
}

console.log('🟪 [Salesforce Auth-Org] Using', orgClientId ? 'org-specific' : 'global', 'credentials');
```

**Also update callback (lines 89-109):**
```typescript
// Get org-specific Salesforce credentials or use env vars
const { data: existing } = await supabase
  .from('organization_integrations')
  .select('id, configuration')
  .eq('organization_id', organizationId)
  .eq('integration_type', 'salesforce')
  .maybeSingle();

const existingConfig = existing?.configuration as any || {};
const orgClientId = existingConfig.client_id;
const orgClientSecret = existingConfig.client_secret;

// If no org credentials, use global env vars (allow fallback)
console.log('🟪 [Salesforce Callback] Using', 
  (orgClientId && orgClientSecret) ? 'org-specific' : 'global', 
  'credentials for token exchange'
);
```

---

## 🚀 Alternative: Simpler Fix (Recommended)

Make org-level OAuth work exactly like user-level OAuth - use global credentials:

### Change 1: Auth Route
Remove the credential check - always generate OAuth URL

### Change 2: Callback Route  
Use global env vars if org credentials not present

---

## 📝 Quick Implementation

Want me to implement this fix now? It will allow org-level OAuth to work using the same global Salesforce app credentials that user-level OAuth uses.

**Benefits:**
- ✅ Org OAuth works immediately
- ✅ No need to configure separate credentials
- ✅ Same Salesforce app for both user and org connections
- ✅ Simpler architecture

**Trade-off:**
- ⚠️ Can't use different Salesforce apps for org vs user
- ⚠️ All connections use same OAuth app

---

## 🎯 Current Status

**Working:**
- ✅ User-level Salesforce OAuth (uses global credentials)
- ✅ Tokens save correctly
- ✅ Extension shows "Connected"

**Not Working:**
- ❌ Org-level Salesforce OAuth
- ❌ Expects org credentials in database
- ❌ Fails if credentials not configured

---

## 📋 Decision

Do you want me to:

**Option A:** Make org-level use global credentials (simple, works immediately)  
**Option B:** Create UI for admins to input org-specific credentials (complex, more flexible)  

**Recommendation:** Option A for now - get it working, can add Option B later if needed.

---

**Want me to implement Option A right now?** It's a 5-minute fix.

