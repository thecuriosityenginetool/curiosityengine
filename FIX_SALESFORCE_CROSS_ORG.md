# 🔧 Fix Salesforce "External client app not installed" Error

## The Problem

Your buddy is getting:
```
External client app is not installed in this org
```

**This means:** Your Connected App was created in YOUR Salesforce org, but it's not configured to work with OTHER people's Salesforce orgs!

---

## 🔧 Solution: Make Connected App Work for ALL Orgs

### Go to Salesforce and Update Settings:

1. **Log in to YOUR Salesforce Developer account**
   - https://login.salesforce.com

2. **Go to Setup** → Search for **"App Manager"**

3. **Find "Sales Curiosity Engine"** app

4. **Click the ▼ dropdown** → **"Manage"**

5. **Click "Edit Policies"**

6. **Set these options:**

   **OAuth Policies:**
   ```
   Permitted Users: All users may self-authorize ← CRITICAL!
   IP Relaxation: Relax IP restrictions
   Refresh Token Policy: Refresh token is valid until revoked
   ```

7. **Scroll down to "Connected App Policies":**
   ```
   Permitted Users: All users may self-authorize (admin approved users are pre-authorized)
   ```

8. **Click "Save"**

---

## ⚠️ Alternative: For Testing Only

**If you want to test quickly without changing settings:**

**Option A: Your buddy uses YOUR Salesforce account**
- Give him your Salesforce login
- He connects using your credentials
- CRM features will work with your Salesforce data

**Option B: Install app in his org (more complex)**
- He needs admin access to his Salesforce
- He goes to Setup → Connected Apps → Install from URL
- Complex for just testing

**RECOMMENDED: Fix the policies (steps above) so ANY Salesforce user can connect!**

---

## ✅ After Fixing Policies:

1. Save the changes in Salesforce
2. Wait 1-2 minutes for Salesforce to sync
3. Tell buddy to try "Connect Salesforce" again
4. Should work!

---

**This is why the "Permitted Users" setting is critical for your use case!**

Your app needs to work with ANY Salesforce org (all your users), not just yours!

