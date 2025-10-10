# 🎉 Salesforce User-Level Integration Added!

## What's New?

Individual users can now connect **their own** Salesforce accounts! Previously, only organization admins could connect Salesforce for the entire team. Now:

- ✅ **Organization Admins** can connect Salesforce for everyone
- ✅ **Individual Users** can connect their own personal Salesforce
- ✅ **Automatic Fallback**: System checks user's personal connection first, then org connection

---

## 🚨 CRITICAL: Add Second Callback URL to Salesforce

You need to add **TWO** callback URLs to your Salesforce Connected App:

### Go to Salesforce → Setup → External Client Apps → Sales Curiosity Engine → Settings

**Add BOTH of these callback URLs:**

```
https://curiosityengine-sales-curiosity-web.vercel.app/api/salesforce/callback
https://curiosityengine-sales-curiosity-web.vercel.app/api/salesforce/user-callback
```

### How to Add Multiple Callback URLs:

In the **"Callback URL"** field, enter them on separate lines:
```
https://curiosityengine-sales-curiosity-web.vercel.app/api/salesforce/callback
https://curiosityengine-sales-curiosity-web.vercel.app/api/salesforce/user-callback
```

Or comma-separated:
```
https://curiosityengine-sales-curiosity-web.vercel.app/api/salesforce/callback, https://curiosityengine-sales-curiosity-web.vercel.app/api/salesforce/user-callback
```

**Save the changes!**

---

## 📱 For Individual Users

### How to Connect Your Salesforce:

1. **Open the Chrome Extension**
2. Click on the **Integrations** tab
3. Find the **"Salesforce CRM"** card
4. Click **"Connect Salesforce"**
5. You'll be taken to Salesforce to authorize
6. After authorization, you're connected! ✅

### What You'll See:

**Before Connection:**
- Card shows "Not Connected"
- Button says "Connect Salesforce"

**After Connection:**
- Card shows "Connected" badge
- Button says "✓ Connected"
- Your emails will be tailored based on YOUR Salesforce data

---

## 🔄 How It Works

### Priority System:

```
User drafts email
      ↓
Check for Salesforce integration
      ↓
   1️⃣ Check user's personal Salesforce
      ↓
   Found? → Use it!
      ↓
   Not found? → Check org Salesforce
      ↓
   Found? → Use it!
      ↓
   Not found? → No Salesforce integration
```

### Storage:

- **Org-level tokens**: Stored in `organization_integrations` with `integration_type = 'salesforce'`
- **User-level tokens**: Stored in `organization_integrations` with `integration_type = 'salesforce_user'`
- **User tokens** are stored in a nested structure: `{ userId: tokens }`

---

## 💡 Use Cases

### **Organization with Shared Salesforce:**
- Admin connects org Salesforce
- All members use the same Salesforce instance
- Everyone's emails check the same CRM

### **Individual Users with Personal Salesforce:**
- Each user connects their own Salesforce
- User A's emails check User A's Salesforce
- User B's emails check User B's Salesforce
- Perfect for consultants or multi-tenant setups

### **Mixed Environment:**
- Admin connects org Salesforce for most users
- Power users can override with their own Salesforce
- System automatically uses personal connection if available

---

## 🧪 Testing Individual User Connection

1. **Log in as individual user** (not org admin)
2. Open extension → **Integrations** tab
3. Find **"Salesforce CRM"** card
4. Click **"Connect Salesforce"**
5. Authorize in Salesforce popup
6. You'll be redirected to `/dashboard` with success message
7. Reopen extension → Should show "Connected"
8. Draft an email → Should check YOUR Salesforce

---

## 🔍 Verifying Connection

### Check in Database:

```sql
-- See all Salesforce integrations
SELECT 
  id,
  organization_id,
  integration_type,
  is_enabled,
  enabled_at
FROM organization_integrations
WHERE integration_type IN ('salesforce', 'salesforce_user');

-- See user-specific connections
SELECT 
  id,
  integration_type,
  configuration
FROM organization_integrations
WHERE integration_type = 'salesforce_user';
```

### Check in Extension:

1. Open extension
2. Go to Integrations tab
3. Look for "Connected" badge on Salesforce card

---

## 🐛 Troubleshooting

### "Failed to initiate Salesforce connection"
- ❌ Missing callback URL in Salesforce
- ✅ Add both callback URLs (see above)

### "OAuth callback error"  
- ❌ Callback URLs don't match
- ✅ Check Salesforce Connected App settings
- ✅ Ensure both URLs are added

### "Integration not working in emails"
- ❌ User not actually connected
- ✅ Check extension shows "Connected"
- ✅ Try disconnecting and reconnecting
- ✅ Check console logs for errors

---

## 🎯 What Gets Checked

When drafting an email, the system:

1. ✅ Checks if person exists in **user's** Salesforce (if connected)
2. ✅ Falls back to **org's** Salesforce (if admin connected)
3. ✅ Tailors email as follow-up OR cold outreach
4. ✅ Auto-creates contact in **user's or org's** Salesforce

---

## 📊 Benefits

### For Individual Users:
- 🎯 Use your own Salesforce data
- 🔐 Keep your CRM separate
- ⚡ No need for org admin approval

### For Organizations:
- 👥 Org admin can still connect for everyone
- 🔄 Users can override with personal Salesforce
- 📈 Flexible for different use cases

---

## ✅ Summary

- ✅ Individual users can now connect Salesforce
- ✅ Extension shows "Connect Salesforce" button
- ✅ System checks user tokens first, then org tokens
- ✅ **Must add BOTH callback URLs to Salesforce**
- ✅ Already deployed and ready to use!

---

**Next:** Add both callback URLs to Salesforce and test the connection! 🚀
