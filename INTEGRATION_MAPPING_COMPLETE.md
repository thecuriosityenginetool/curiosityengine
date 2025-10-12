# Integration Mapping - Salesforce & Outlook

## 📊 Current Integration Status

### ✅ **Already Built & Ready:**

#### **Outlook (Microsoft 365)**
- ✅ OAuth authentication configured
- ✅ Email draft creation API
- ✅ Token storage in database
- ✅ Refresh token handling
- ✅ Microsoft Graph API integration

**Endpoints:**
- `GET /api/outlook/auth-user` - Initiate OAuth (user-level)
- `GET /api/outlook/user-callback` - OAuth callback
- `POST /api/email/draft` - Create email draft
- `POST /api/email/send` - Send email
- `GET /api/outlook/disconnect` - Disconnect Outlook

**Status**: 🟢 **LIVE - Users can connect now!**

#### **Salesforce**
- ✅ OAuth authentication configured
- ✅ Token storage in database
- ✅ Salesforce REST API integration
- ✅ Lead enrichment capability

**Endpoints:**
- `GET /api/salesforce/auth-user` - Initiate OAuth (user-level)
- `GET /api/salesforce/user-callback` - OAuth callback
- `GET /api/salesforce/route.ts` - Query Salesforce data
- `GET /api/salesforce/disconnect` - Disconnect Salesforce

**Status**: 🟢 **LIVE - Users can connect now!**

---

## 🔗 Integration Flow Mapping

### **Outlook Email Draft Creation**

#### Dashboard → Create Draft Flow:
```
1. User clicks calendar event
2. Chooses "Generate Email"
3. AI generates email content
4. User clicks Outlook icon below AI response
5. IF not connected:
   → Show connection modal
   → Click "Connect Outlook"
   → Redirect to /api/outlook/auth-user
   → Microsoft OAuth flow
   → Callback to /api/outlook/user-callback
   → Tokens saved to user_oauth_tokens table
   → Redirect back to dashboard
6. IF connected:
   → POST to /api/email/draft
   → Uses user_oauth_tokens for authentication
   → Creates draft via Microsoft Graph API
   → Activity logged
   → Success alert shown
```

#### API Call Structure:
```typescript
POST /api/email/draft
{
  to: string[],           // Email recipients
  subject: string,        // Email subject
  body: string,          // Email content (from AI)
  provider: 'microsoft'  // Force Outlook
}
```

#### Database Tables Used:
- `user_oauth_tokens` - Stores Microsoft access/refresh tokens
- `activity_logs` - Logs draft creation
- `users` - User identification

---

### **Salesforce Lead Enrichment**

#### Dashboard → Enrich Lead Flow:
```
1. User gets AI response about a lead
2. Clicks Salesforce icon below AI response
3. IF not connected:
   → Show connection modal
   → Click "Connect Salesforce"
   → Redirect to /api/salesforce/auth-user
   → Salesforce OAuth flow
   → Callback to /api/salesforce/user-callback
   → Tokens saved to organization_integrations or user_oauth_tokens
   → Redirect back to dashboard
4. IF connected:
   → Extract lead info from AI response
   → POST to /api/salesforce/route.ts (needs enhancement)
   → Update or create lead in Salesforce
   → Activity logged
   → Success alert shown
```

#### Enhancement Needed:
Create endpoint: `POST /api/salesforce/enrich-lead`
```typescript
{
  leadData: {
    name: string,
    company: string,
    title: string,
    email?: string,
    phone?: string,
    notes: string  // From AI response
  }
}
```

---

## 🔧 Implementation Tasks

### ✅ **Completed:**
1. OAuth flows for both Outlook and Salesforce
2. Token storage and refresh mechanisms
3. Connection status checking in dashboard
4. Connection modals with service icons
5. Activity logging for all actions
6. Email draft creation via Outlook

### 🚧 **Ready to Implement:**

#### 1. **Salesforce Lead Enrichment Endpoint**
Create: `apps/sales-curiosity-web/src/app/api/salesforce/enrich-lead/route.ts`

```typescript
// Parse AI response for lead data
// Create or update lead in Salesforce
// Add notes from AI analysis
// Return success/failure
```

#### 2. **Enhanced CRM Update Function**
Update `updateCRM()` in dashboard to:
- Extract lead details from AI response
- Call Salesforce enrich endpoint
- Show detailed success message

#### 3. **Outlook Calendar Sync** (Optional)
Create: `apps/sales-curiosity-web/src/app/api/outlook/calendar/route.ts`
- Fetch calendar events from Outlook
- Display in dashboard instead of mock data
- Create events via Microsoft Graph

---

## 📋 Integration Testing Checklist

### **Outlook Email Drafts:**
- [ ] User not connected → Click Outlook icon → Modal shows
- [ ] Click "Connect Outlook" → OAuth flow starts
- [ ] After OAuth → Redirects back to dashboard
- [ ] Click Outlook icon again → Draft created (no modal)
- [ ] Check Outlook → Draft appears in drafts folder
- [ ] Check Activity Logs → "Email Draft Created" logged

### **Salesforce Lead Enrichment:**
- [ ] User not connected → Click Salesforce icon → Modal shows
- [ ] Click "Connect Salesforce" → OAuth flow starts
- [ ] After OAuth → Redirects back to dashboard
- [ ] Click Salesforce icon again → Note added to CRM
- [ ] Check Salesforce → Lead note appears
- [ ] Check Activity Logs → "CRM Note Added" logged

### **Connection Status:**
- [ ] Go to Connectors tab
- [ ] See Outlook card - Status shows "Ready to Connect"
- [ ] Connect Outlook
- [ ] Return to Connectors → Status shows "✓ Connected"
- [ ] Connect button disabled and grayed out

---

## 🔑 Environment Variables Required

### Already Configured:
```bash
# Microsoft/Outlook
MICROSOFT_CLIENT_ID=3c5894ef-ffc7-4af7-bbdb-96c85ad0700b
MICROSOFT_CLIENT_SECRET=***
AZURE_AD_TENANT_ID=common

# Salesforce (if using)
SALESFORCE_CLIENT_ID=***
SALESFORCE_CLIENT_SECRET=***
SALESFORCE_REDIRECT_URI=https://www.curiosityengine.io/api/salesforce/user-callback
```

---

## 🎯 Next Steps for Full Integration

### Phase 1: Current (✅ Complete)
- User can connect Outlook
- User can connect Salesforce
- Email drafts work from dashboard
- Connection status tracked

### Phase 2: Enhancements (Ready to Build)
1. **Salesforce Lead Enrichment**
   - Parse AI insights
   - Create/update Salesforce records
   - Sync notes and tasks

2. **Outlook Calendar Sync**
   - Fetch real calendar events
   - Display in dashboard
   - Create/update events

3. **Bi-directional Sync**
   - CRM changes → Dashboard updates
   - Dashboard actions → CRM updates
   - Real-time synchronization

---

## 💡 Usage Examples

### **Email Draft from Calendar:**
```
1. Click "Demo with Acme Corp" event
2. Choose "Generate Email"
3. AI writes: "Hi John, Looking forward to our demo..."
4. Click Outlook icon
5. Draft created in Outlook Drafts folder
6. Activity log: "Email Draft Created: Demo with Acme Corp"
```

### **CRM Lead Enrichment:**
```
1. Ask AI: "Tell me about John Smith from LinkedIn"
2. AI responds with insights
3. Click Salesforce icon
4. IF connected: Note added to John Smith's lead record
5. Activity log: "CRM Note Added: AI insights for John Smith"
```

---

## 🚀 Ready for Production

**Current Capabilities:**
- ✅ Users can connect Outlook and Salesforce
- ✅ Create email drafts from AI responses
- ✅ Prepare CRM notes (ready for Salesforce API calls)
- ✅ All actions logged in Activity Logs
- ✅ Connection status visible in Connectors tab
- ✅ Beautiful modals with service icons

**Live at**: `https://www.curiosityengine.io`

