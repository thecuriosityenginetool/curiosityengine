# 📅 Outlook Calendar Integration - Fix Guide

## 🔍 Problem

The calendar sync button is not loading events from Outlook. This is because:

1. **New Calendar Scopes Required**: We just added `Calendars.Read` and `Calendars.ReadWrite` scopes to the Outlook OAuth flow
2. **Existing Token Missing Permissions**: Your current Outlook connection token was created BEFORE these scopes were added
3. **Need to Reconnect**: You must disconnect and reconnect Outlook to get the new permissions

## ✅ Solution: Reconnect Outlook

### Step 1: Check Current Connection

Run this in Supabase SQL Editor:

```sql
-- Check your Outlook connection status
SELECT 
  id,
  organization_id,
  integration_type,
  is_enabled,
  configuration->>'scope' as current_scopes,
  created_at,
  updated_at
FROM organization_integrations
WHERE integration_type LIKE 'outlook%'
  AND organization_id = (
    SELECT organization_id 
    FROM users 
    WHERE email = 'YOUR_EMAIL_HERE'  -- Replace with your email
    LIMIT 1
  );
```

### Step 2: Disconnect Outlook (if needed)

If the `current_scopes` field is missing `Calendars.Read` or `Calendars.ReadWrite`, you need to reconnect:

```sql
-- Disconnect Outlook to force reconnection with new scopes
DELETE FROM organization_integrations
WHERE integration_type = 'outlook_user'
  AND organization_id = (
    SELECT organization_id 
    FROM users 
    WHERE email = 'YOUR_EMAIL_HERE'  -- Replace with your email
    LIMIT 1
  );
```

### Step 3: Reconnect Outlook

1. Go to your dashboard: https://www.curiosityengine.io/dashboard
2. Click on **Integrations** tab
3. Click **Connect** next to Microsoft Outlook
4. Grant permissions when prompted (you'll see the calendar scopes listed)
5. After redirect, verify connection shows "Connected ✅"

### Step 4: Test Calendar Sync

1. Click the **🔄 Sync** button in the calendar section
2. You should see:
   - Spinner animation while loading
   - Real Outlook events appearing (if you have any)
   - Mock events only if Outlook has no events in the next 14 days

## 🔧 Expected OAuth Scopes

Your Outlook connection should request these scopes:

- ✅ `openid` - Basic identity
- ✅ `offline_access` - Refresh token
- ✅ `Mail.Send` - Send emails
- ✅ `Mail.ReadWrite` - Read/write emails
- ✅ `User.Read` - Read user profile
- ✅ **`Calendars.Read`** - **NEW: Read calendar events**
- ✅ **`Calendars.ReadWrite`** - **NEW: Create/update calendar events**

## 📊 How to Verify It's Working

### Via Console Logs:

Open browser DevTools (F12) and look for:

```
📅 Fetching calendar events from Outlook...
✅ Fetched X events from Outlook
```

### Via Database:

Check that your token has calendar scopes:

```sql
SELECT 
  (configuration->>'scope')::text as scopes
FROM organization_integrations
WHERE integration_type = 'outlook_user'
  AND organization_id = (
    SELECT organization_id 
    FROM users 
    WHERE email = 'YOUR_EMAIL_HERE'
    LIMIT 1
  );
```

Should include: `Calendars.Read Calendars.ReadWrite`

## 🎯 Testing Email Drafts

Once Outlook is reconnected with full permissions, test:

### Via AI Chat:

1. **Create Email Draft:**
   ```
   Create an email draft to john@example.com about our meeting tomorrow
   ```

2. **Create Calendar Event:**
   ```
   Create a meeting with Jane at 2pm tomorrow for 1 hour
   ```

3. **Sync Calendar:**
   Click the 🔄 Sync button to refresh events

## 🚨 Troubleshooting

### Calendar Still Shows Mock Data

**Check:**
1. Outlook is connected (Integrations tab shows ✅)
2. Browser console shows "Fetching calendar events from Outlook..."
3. No 401 errors in Network tab (would indicate token expired)

**Fix:**
- Disconnect and reconnect Outlook
- Check you have events in your Outlook calendar for the next 14 days

### 401 Unauthorized Errors

**Cause:** Token expired or invalid

**Fix:**
```sql
-- Force token refresh by deleting current connection
DELETE FROM organization_integrations
WHERE integration_type = 'outlook_user';
```

Then reconnect via dashboard.

### No Events Show Up

**Possible Reasons:**
1. Your Outlook calendar is empty for next 14 days → Expected behavior (will show mock data)
2. Calendar permissions not granted → Reconnect Outlook
3. Different calendar selected → Microsoft Graph API uses primary calendar by default

## 📝 Summary

**Required Action:** Disconnect and reconnect Microsoft Outlook to get calendar permissions

**Expected Result:** Calendar sync button loads real Outlook events

**No Supabase Changes Needed:** All database tables are already configured correctly

