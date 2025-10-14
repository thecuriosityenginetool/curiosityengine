# Salesforce Integration Testing - Test User Setup Guide

## 🎯 Goal
Set up a test user account to verify the Salesforce integration works end-to-end, including:
- User-level Salesforce connection
- Lead/prospect checking
- Email draft validation
- Auto-creation of contacts in Salesforce

---

## 👤 Option 1: Create a Test User in Your Existing Salesforce

### **Step 1: Create Test User in Salesforce**
1. **Log into your Salesforce Developer account**
2. **Go to Setup** → **Users** → **New User**
3. **Fill out the form**:
   - **First Name**: Test
   - **Last Name**: User
   - **Email**: `test@yourdomain.com` (or any email you control)
   - **Username**: `testuser@yourorg.force.com` (or similar)
   - **Profile**: **System Administrator** (for full access)
   - **Role**: **CEO** or create a custom role
4. **Save** the user

### **Step 2: Set Password**
1. **Click on the new user** in the Users list
2. **Click "Reset Password"**
3. **Check "Generate new password and notify user immediately"**
4. **Save** - Salesforce will email the login credentials

### **Step 3: Log in with Test User**
1. **Open incognito browser window**
2. **Go to your Salesforce login URL**
3. **Use the test user credentials**
4. **Complete any setup steps**

---

## 👤 Option 2: Create a Completely Separate Salesforce Org

### **Step 1: Create New Developer Account**
1. **Go to**: https://developer.salesforce.com/signup
2. **Use different email** (like `test+sf@yourdomain.com`)
3. **Create new username** (like `testuser2024`)
4. **Verify email and set password**

### **Step 2: Set up Connected App (if needed)**
If you want to test with a completely separate org, you'll need to:
1. **Create a new Connected App** in the test org
2. **Add callback URLs**:
   - `https://www.curiosityengine.io/api/salesforce/user-callback`
   - `http://localhost:3000/api/salesforce/user-callback` (for local testing)
3. **Copy Consumer Key & Secret**
4. **Update Vercel environment variables** (or create separate env vars for testing)

---

## 🧪 Testing the Integration

### **Phase 1: Connect Salesforce as Test User**

1. **Open your web app** (curiosityengine.io)
2. **Sign in with a test email** (different from your main account)
3. **Go to Dashboard** → **Connectors** tab
4. **Find Salesforce card** and click **"Connect Salesforce"**
5. **Should redirect to Salesforce login**
6. **Log in with your test Salesforce user**
7. **Grant permissions** when prompted
8. **Should redirect back** with success message

### **Phase 2: Test Chrome Extension**

1. **Install/reload the Chrome extension**
2. **Sign in with the same test email**
3. **Go to Integrations tab** in extension
4. **Should show "Connected"** for Salesforce
5. **Go to any LinkedIn profile**
6. **Click extension** → **"✉️ Draft Email"**
7. **Should show Salesforce status** in the response

### **Phase 3: Verify CRM Integration**

#### **Test with Existing Contact (if any)**
1. **Create a contact in your test Salesforce**:
   - Go to **Contacts** → **New Contact**
   - Add: **Name**, **Email**, **Company**
   - **Save**

2. **Draft email for that person**:
   - Find their LinkedIn profile (or use any profile)
   - **Draft email** via extension
   - **Should show**: "🔗 Found as Contact in your CRM"
   - **Email should be** follow-up style (not cold outreach)

#### **Test with New Contact**
1. **Draft email for someone NOT in Salesforce**:
   - Use any LinkedIn profile
   - **Draft email** via extension
   - **Should show**: "➕ New contact added to your CRM"
   - **Email should be** cold outreach style
   - **Check Salesforce** → **Contacts** → Should see new contact created

---

## 🔍 Verification Steps

### **Check Database**
Run this SQL in Supabase to verify connection:
```sql
-- Check if test user's Salesforce connection is saved
SELECT 
  organization_id,
  integration_type,
  is_enabled,
  enabled_at,
  enabled_by
FROM organization_integrations
WHERE integration_type = 'salesforce_user'
ORDER BY enabled_at DESC;
```

### **Check Salesforce**
1. **Log into test Salesforce account**
2. **Go to Contacts**
3. **Look for newly created contacts** from email drafting
4. **Verify contact details** match LinkedIn profile data

### **Check Extension Status**
1. **Open extension** → **Integrations tab**
2. **Should show**: "Connected" for Salesforce
3. **Try drafting emails** → Should show Salesforce status

---

## 🐛 Troubleshooting

### **Issue: "Failed to get Salesforce OAuth URL"**
- **Check**: Vercel deployment has latest code
- **Check**: Environment variables are set correctly
- **Check**: `/api/salesforce/auth-user` endpoint is deployed

### **Issue: "Redirect URI mismatch"**
- **Check**: Callback URL in Salesforce Connected App matches exactly
- **Check**: Both production and local URLs are added if testing locally

### **Issue: "Salesforce not connected" in extension**
- **Check**: User is signed in to extension with same email as web app
- **Check**: Database shows `salesforce_user` integration enabled
- **Check**: Tokens are valid (not expired)

### **Issue: No Salesforce status in email responses**
- **Check**: Salesforce integration is enabled in database
- **Check**: User has valid Salesforce tokens
- **Check**: Salesforce API calls are working (check browser console)

---

## ✅ Success Criteria

**Integration is working correctly if**:

1. ✅ **Connection**: Test user can connect Salesforce via web app
2. ✅ **Extension**: Extension shows "Connected" status
3. ✅ **Existing Contacts**: Email drafting shows "Found in CRM" for existing contacts
4. ✅ **New Contacts**: Email drafting shows "New contact added" and creates contact in Salesforce
5. ✅ **Email Style**: Emails are tailored based on CRM status (follow-up vs cold outreach)
6. ✅ **Auto-Creation**: New contacts appear in Salesforce with LinkedIn data

---

## 📝 Test Results Template

```
Test Date: ___________
Test User Email: ___________
Salesforce Org: ___________

Phase 1 - Connection:
[ ] Web app connection successful
[ ] Extension shows "Connected"
[ ] Database shows salesforce_user integration enabled

Phase 2 - Existing Contact Test:
[ ] Contact exists in Salesforce: ___________
[ ] Email shows "Found in CRM"
[ ] Email style is follow-up (not cold outreach)

Phase 3 - New Contact Test:
[ ] LinkedIn profile tested: ___________
[ ] Email shows "New contact added"
[ ] Contact created in Salesforce
[ ] Contact data matches LinkedIn profile

Overall Result: ✅ PASS / ❌ FAIL
Issues Found: ___________
```

This setup will give you a complete test environment to verify the Salesforce integration works as expected!
