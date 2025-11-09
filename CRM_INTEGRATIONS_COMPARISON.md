# CRM Integrations Comparison

## Overview

This document shows how Salesforce, Monday.com, and HubSpot integrations align with each other. All three follow the same pattern but have different OAuth endpoints and API structures.

---

## 🏗️ Architecture Pattern (All Three)

```
User clicks "Connect CRM" in extension/web app
          ↓
GET /api/{crm}/auth-user (authenticated)
          ↓
Returns: { authUrl: "https://{crm-oauth-url}" }
          ↓
User authorizes with their CRM account
          ↓
CRM redirects to: /api/{crm}/user-callback?code=xxx
          ↓
Backend exchanges code for tokens
          ↓
Tokens saved to organization_integrations table
          ↓
User sees "Connected" status
```

---

## 📋 Comparison Table

| Feature | Salesforce | Monday.com | HubSpot |
|---------|-----------|------------|---------|
| **OAuth Type** | OAuth 2.0 | OAuth 2.0 | OAuth 2.0 |
| **API Type** | REST | GraphQL | REST |
| **Token Refresh** | Yes | No (long-lived) | Yes |
| **Integration Type** | `salesforce_user` | `monday_user` | `hubspot_user` |
| **Main Objects** | Contact, Lead | Item (in CRM board) | Contact, Company |
| **Search Method** | SOQL Query | GraphQL Query | REST Search API |
| **Auth URL** | `login.salesforce.com` | `auth.monday.com` | `app.hubspot.com` |
| **Token Endpoint** | `/services/oauth2/token` | `/oauth2/token` | `/oauth/v1/token` |
| **API Base URL** | Instance-specific | `api.monday.com/v2` | `api.hubapi.com` |

---

## 🔐 OAuth URLs Comparison

### Salesforce
```
Authorization: https://login.salesforce.com/services/oauth2/authorize
Token Exchange: https://login.salesforce.com/services/oauth2/token
Callback: https://yourapp.com/api/salesforce/user-callback
```

### Monday.com
```
Authorization: https://auth.monday.com/oauth2/authorize
Token Exchange: https://auth.monday.com/oauth2/token
Callback: https://yourapp.com/api/monday/user-callback
```

### HubSpot
```
Authorization: https://app.hubspot.com/oauth/authorize
Token Exchange: https://api.hubapi.com/oauth/v1/token
Callback: https://yourapp.com/api/hubspot/user-callback
```

---

## 🔑 OAuth Scopes Comparison

### Salesforce
```
- api (Access and manage data)
- refresh_token, offline_access (Refresh tokens)
- full (Full access)
```

### Monday.com
```
- boards:read (Read board data)
- boards:write (Create/update items)
- users:read (Read user info)
- me:read (Read current user)
```

### HubSpot
```
- crm.objects.contacts.read (Read contacts)
- crm.objects.contacts.write (Create/update contacts)
- crm.objects.companies.read (Read companies)
- crm.objects.companies.write (Create/update companies)
- crm.schemas.contacts.read (Read contact properties)
```

---

## 🗄️ Database Storage (All Three)

All integrations use the same table structure:

```sql
-- Table: organization_integrations
{
  organization_id: uuid
  integration_type: 'salesforce_user' | 'monday_user' | 'hubspot_user'
  is_enabled: boolean
  configuration: {
    [userId]: {
      access_token: string
      refresh_token?: string  // Salesforce & HubSpot only
      instance_url?: string    // Salesforce only
      expires_in?: number      // HubSpot only
      // ... other OAuth data
    }
  }
  enabled_at: timestamp
  enabled_by: uuid
}
```

---

## 📁 File Structure Comparison

### Salesforce (Already Exists)
```
src/lib/salesforce.ts                           (470 lines)
src/app/api/salesforce/auth-user/route.ts       (174 lines)
src/app/api/salesforce/user-callback/route.ts   (160 lines)
```

### Monday.com (To Create)
```
src/lib/monday.ts                               (~450 lines)
src/app/api/monday/auth-user/route.ts           (~120 lines)
src/app/api/monday/user-callback/route.ts       (~100 lines)
```

### HubSpot (To Create)
```
src/lib/hubspot.ts                              (~500 lines)
src/app/api/hubspot/auth-user/route.ts          (~120 lines)
src/app/api/hubspot/user-callback/route.ts      (~100 lines)
```

---

## 🔍 Search Function Comparison

### Salesforce (SOQL)
```typescript
// Search Contacts first, then Leads
const query = `SELECT Id, FirstName, LastName, Email, Title 
               FROM Contact 
               WHERE Email = '${email}'`;

const endpoint = `/services/data/v59.0/query?q=${encodeURIComponent(query)}`;
```

### Monday.com (GraphQL)
```typescript
const query = `
  query SearchContacts($searchTerm: String!) {
    boards(board_kind: crm) {
      items_page(query_params: {rules: [{column_id: "email", compare_value: [$searchTerm]}]}) {
        items { id name column_values { id text } }
      }
    }
  }
`;
```

### HubSpot (REST API)
```typescript
const searchBody = {
  filterGroups: [{
    filters: [{
      propertyName: 'email',
      operator: 'EQ',
      value: email
    }]
  }]
};

const endpoint = '/crm/v3/objects/contacts/search';
```

---

## ➕ Create Function Comparison

### Salesforce
```typescript
// Create Contact
POST /services/data/v59.0/sobjects/Contact
Body: {
  FirstName: "John",
  LastName: "Doe",
  Email: "john@example.com"
}
```

### Monday.com
```typescript
// Create Item in CRM board
mutation CreateContact {
  create_item(
    board_id: "123456",
    item_name: "John Doe",
    column_values: "{\"email\":\"john@example.com\"}"
  ) { id }
}
```

### HubSpot
```typescript
// Create Contact
POST /crm/v3/objects/contacts
Body: {
  properties: {
    firstname: "John",
    lastname: "Doe",
    email: "john@example.com"
  }
}
```

---

## 🔄 Token Refresh Comparison

### Salesforce ✅
```typescript
// Automatic token refresh supported
POST /services/oauth2/token
Body: {
  grant_type: 'refresh_token',
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  refresh_token: REFRESH_TOKEN
}
```

### Monday.com ❌
```typescript
// No refresh token - access tokens are long-lived
// Users need to reconnect if token expires
```

### HubSpot ✅
```typescript
// Automatic token refresh supported
POST /oauth/v1/token
Body: {
  grant_type: 'refresh_token',
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  refresh_token: REFRESH_TOKEN
}
```

---

## 🌐 Environment Variables

### Salesforce (Existing)
```bash
SALESFORCE_CLIENT_ID=xxx
SALESFORCE_CLIENT_SECRET=xxx
SALESFORCE_REDIRECT_URI=https://yourapp.com/api/salesforce/callback
SALESFORCE_USER_REDIRECT_URI=https://yourapp.com/api/salesforce/user-callback
```

### Monday.com (New)
```bash
MONDAY_CLIENT_ID=xxx
MONDAY_CLIENT_SECRET=xxx
MONDAY_REDIRECT_URI=https://yourapp.com/api/monday/callback
MONDAY_USER_REDIRECT_URI=https://yourapp.com/api/monday/user-callback
```

### HubSpot (New)
```bash
HUBSPOT_CLIENT_ID=xxx
HUBSPOT_CLIENT_SECRET=xxx
HUBSPOT_REDIRECT_URI=https://yourapp.com/api/hubspot/callback
HUBSPOT_USER_REDIRECT_URI=https://yourapp.com/api/hubspot/user-callback
```

**Total Environment Variables:** 12 (4 per CRM × 3 CRMs)

---

## 🎨 UI Integration (Extension)

All three integrations appear identically in the UI:

```typescript
// Extension Settings → Integrations Tab

┌─────────────────────────────────────┐
│  🔵 Salesforce                      │
│  Status: Connected ✅               │
│  [Disconnect]                       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🟣 Monday.com                      │
│  Status: Not Connected              │
│  [Connect Monday.com]               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🟠 HubSpot                         │
│  Status: Connected ✅               │
│  [Disconnect]                       │
└─────────────────────────────────────┘
```

---

## 🧪 Testing Checklist (All Three)

| Test | Salesforce | Monday.com | HubSpot |
|------|-----------|------------|---------|
| OAuth flow works | ✅ | ⬜ | ⬜ |
| Tokens stored correctly | ✅ | ⬜ | ⬜ |
| Search finds existing contact | ✅ | ⬜ | ⬜ |
| Auto-creates new contact | ✅ | ⬜ | ⬜ |
| Follow-up email generated | ✅ | ⬜ | ⬜ |
| Cold email generated | ✅ | ⬜ | ⬜ |
| Token refresh works | ✅ | N/A | ⬜ |
| Disconnect works | ✅ | ⬜ | ⬜ |

---

## 🔧 Implementation Effort

| Task | Salesforce | Monday.com | HubSpot |
|------|-----------|------------|---------|
| **Status** | ✅ Complete | ⬜ To Do | ⬜ To Do |
| **Developer Account** | Done | ~10 min | ~10 min |
| **OAuth App Setup** | Done | ~15 min | ~15 min |
| **Code Files** | Done | ~2 hours | ~2 hours |
| **Environment Variables** | Done | ~5 min | ~5 min |
| **Testing** | Done | ~30 min | ~30 min |
| **Total Time** | ✅ | ~3 hours | ~3 hours |

---

## 🎯 Key Differences Summary

### Salesforce
- **Pros:** Most mature, widely used, powerful SOQL queries
- **Cons:** Complex setup, instance URLs vary
- **Best For:** Enterprise sales teams

### Monday.com
- **Pros:** Simple GraphQL API, visual boards, flexible
- **Cons:** No token refresh, less structured than traditional CRM
- **Best For:** Startups, small teams, project-focused sales

### HubSpot
- **Pros:** Marketing automation, easy REST API, great docs
- **Cons:** Scopes are very granular
- **Best For:** Marketing & sales alignment, SMBs

---

## 🚀 Recommended Implementation Order

1. ✅ **Salesforce** - Already complete
2. ⬜ **HubSpot** - Most popular among SMBs, similar to Salesforce pattern
3. ⬜ **Monday.com** - Different API structure (GraphQL), good for variety

---

## 📊 Feature Parity Matrix

| Feature | Salesforce | Monday.com | HubSpot |
|---------|-----------|------------|---------|
| Search by email | ✅ | ✅ | ✅ |
| Search by name | ✅ | ✅ | ✅ |
| Create contact | ✅ | ✅ | ✅ |
| Update contact | ✅ | ✅ | ✅ |
| Last interaction date | ✅ | ✅ | ✅ |
| Token auto-refresh | ✅ | ❌ | ✅ |
| LinkedIn URL field | ✅ | ✅ | ✅ |
| Company association | ✅ | ✅ | ✅ |
| Custom fields | ✅ | ✅ | ✅ |

---

## 🎓 Learning from Salesforce Implementation

The Salesforce integration already demonstrates:
- ✅ User-level OAuth flow
- ✅ Token storage in configuration JSONB
- ✅ Automatic token refresh
- ✅ Search and create functions
- ✅ Integration with prospects API
- ✅ Extension UI integration

**Monday.com and HubSpot simply replicate this pattern with different OAuth endpoints and API calls.**

---

## 📝 Code Reusability

### Highly Similar (95% code reuse):
- OAuth initiation routes (`auth-user/route.ts`)
- OAuth callback routes (`user-callback/route.ts`)
- Token storage logic
- State parameter generation
- Error handling

### CRM-Specific (unique per integration):
- API endpoint URLs
- OAuth scopes
- Search query structure
- Contact creation payload
- Token refresh logic

---

## 🔗 Integration Testing Flow

```
1. Connect CRM
   → Click "Connect {CRM}" in extension
   → Authorize with CRM credentials
   → Verify "Connected" status appears

2. Test Existing Contact
   → Open LinkedIn profile of someone in CRM
   → Click "Generate Email"
   → Verify "Found in CRM" message
   → Verify follow-up email style

3. Test New Contact
   → Open LinkedIn profile NOT in CRM
   → Click "Generate Email"
   → Verify "Added to CRM" message
   → Verify cold outreach email style
   → Check CRM for new contact

4. Test Disconnect
   → Click "Disconnect"
   → Verify status shows "Not Connected"
   → Try generating email (should work without CRM)
```

---

**All three integrations work identically from the user's perspective - they just connect to different CRM systems!** 🎉

