# Salesforce Connection Fix - "External client app is not installed in this org"

## 🚨 **Problem Identified**

The error `External client app is not installed in this org` means your Salesforce Connected App isn't properly configured or installed in your Salesforce Developer org.

## 🔧 **Step-by-Step Fix**

### **Step 1: Access Salesforce Setup**
1. **Log into your Salesforce Developer account**
2. **Click the gear icon** ⚙️ in the top right
3. **Select "Setup"**

### **Step 2: Navigate to Connected Apps**
1. **In the Quick Find box**, search for **"App Manager"**
2. **Click "App Manager"**
3. **Look for your Connected App** named "Sales Curiosity Engine" or similar

### **Step 3: Check Connected App Status**
If you see your Connected App:
- **Status should be "Enabled"**
- If it shows "Disabled", click **"Edit"** and enable it

If you DON'T see your Connected App:
- **You need to create it** (see Step 4)

### **Step 4: Create Connected App (if missing)**
1. **Click "New Connected App"**
2. **Fill out the form**:
   - **Connected App Name**: `Sales Curiosity Engine`
   - **API Name**: `Sales_Curiosity_Engine`
   - **Contact Email**: Your email
3. **Enable OAuth Settings**:
   - ✅ Check "Enable OAuth Settings"
   - **Callback URL**: `https://www.curiosityengine.io/api/salesforce/user-callback`
   - **Selected OAuth Scopes**: Add these:
     - `Access and manage your data (api)`
     - `Perform requests on your behalf at any time (refresh_token, offline_access)`
     - `Full access (full)`
4. **Save**

### **Step 5: Install Connected App**
1. **After creating/editing**, click **"Manage"**
2. **Click "Edit Policies"**
3. **Set these policies**:
   - **Permitted Users**: "Admin approved users are pre-authorized"
   - **IP Relaxation**: "Relax IP restrictions"
   - **Refresh Token Policy**: "Refresh token is valid until revoked"
4. **Save**

### **Step 6: Pre-authorize Users**
1. **Go back to Connected App** → **"Manage"**
2. **Click "Manage Permitted Users"**
3. **Add your user** (the one you're testing with)
4. **Save**

### **Step 7: Get Consumer Key & Secret**
1. **In your Connected App**, click **"View"**
2. **Copy the "Consumer Key"** (Client ID)
3. **Click "Click to reveal"** next to Consumer Secret
4. **Copy the "Consumer Secret"**

### **Step 8: Update Vercel Environment Variables**
1. **Go to Vercel Dashboard** → Your project → **Settings** → **Environment Variables**
2. **Update these variables**:
   - `SALESFORCE_CLIENT_ID` = Consumer Key
   - `SALESFORCE_CLIENT_SECRET` = Consumer Secret
3. **Redeploy** your application

## 🔍 **Common Issues & Solutions**

### **Issue 1: "App not found"**
- **Solution**: Connected App doesn't exist - create it (Step 4)

### **Issue 2: "App disabled"**
- **Solution**: Enable the Connected App in App Manager

### **Issue 3: "User not authorized"**
- **Solution**: Add user to "Manage Permitted Users" (Step 6)

### **Issue 4: "Invalid callback URL"**
- **Solution**: Ensure callback URL exactly matches: `https://www.curiosityengine.io/api/salesforce/user-callback`

### **Issue 5: "Insufficient permissions"**
- **Solution**: Check OAuth scopes include `api`, `refresh_token`, `offline_access`, `full`

## 🧪 **Testing After Fix**

1. **Clear browser cache** and cookies
2. **Try connecting Salesforce** again
3. **Check console** - should see `Salesforce connected: true`
4. **Test email drafting** - should show CRM status

## 📋 **Quick Checklist**

- [ ] Connected App exists in Salesforce
- [ ] Connected App is enabled
- [ ] OAuth settings configured correctly
- [ ] Callback URL matches exactly
- [ ] OAuth scopes include required permissions
- [ ] User is pre-authorized
- [ ] Consumer Key & Secret copied correctly
- [ ] Vercel environment variables updated
- [ ] Application redeployed

## 🚨 **If Still Not Working**

Check these in Salesforce:
1. **Go to Setup** → **Security** → **Remote Site Settings**
2. **Add your domain**: `https://www.curiosityengine.io`
3. **Save**

The error should be resolved once the Connected App is properly configured and installed!
