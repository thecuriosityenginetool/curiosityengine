-- Reset Salesforce Integration for Fresh Connection Attempt
-- This will delete existing Salesforce integration records so you can connect cleanly
-- Run this in Supabase SQL Editor

-- Step 1: Check what Salesforce integrations currently exist
SELECT 
    id,
    organization_id,
    integration_type,
    is_enabled,
    enabled_at,
    enabled_by,
    updated_at,
    (configuration->>'access_token' IS NOT NULL) as has_org_tokens,
    jsonb_object_keys(configuration) as config_keys
FROM organization_integrations
WHERE integration_type IN ('salesforce', 'salesforce_user')
ORDER BY created_at DESC;

-- Step 2: Find your organization ID (for matthewbravo13@gmail.com)
SELECT 
    id as user_id,
    email,
    organization_id,
    role
FROM users
WHERE email = 'matthewbravo13@gmail.com';

-- Step 3: Delete ALL Salesforce integrations for your organization
-- Replace 'YOUR_ORG_ID' with the organization_id from Step 2
DELETE FROM organization_integrations
WHERE organization_id = 'f802b263-f05d-4b09-a085-cbcd8b6490e1'
  AND integration_type IN ('salesforce', 'salesforce_user');

-- Step 4: Verify deletion
SELECT 
    integration_type,
    is_enabled
FROM organization_integrations
WHERE organization_id = 'f802b263-f05d-4b09-a085-cbcd8b6490e1';

-- Expected: No Salesforce integrations should remain

-- ✅ After running this, you can:
-- 1. Refresh your dashboard
-- 2. Click "Connect Salesforce" 
-- 3. Complete the OAuth flow fresh
-- 4. Tokens should save properly this time

-- DEBUG: If OAuth still fails, run this to see the exact error:
SELECT 
    created_at,
    level,
    msg
FROM logs
WHERE msg LIKE '%Salesforce%'
ORDER BY created_at DESC
LIMIT 20;

