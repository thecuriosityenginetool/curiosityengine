-- Reset Gmail Connection for Fresh OAuth
-- Run this in Supabase SQL Editor

-- Step 1: Check current Gmail integration
SELECT 
    id,
    organization_id,
    integration_type,
    is_enabled,
    enabled_at,
    updated_at,
    (configuration->>'access_token' IS NOT NULL) as has_tokens
FROM organization_integrations
WHERE organization_id = 'f802b263-f05d-4b09-a085-cbcd8b6490e1'
  AND integration_type = 'gmail_user';

-- Step 2: Delete the Gmail integration
DELETE FROM organization_integrations
WHERE organization_id = 'f802b263-f05d-4b09-a085-cbcd8b6490e1'
  AND integration_type = 'gmail_user';

-- Step 3: Verify it's deleted
SELECT 
    integration_type,
    is_enabled
FROM organization_integrations
WHERE organization_id = 'f802b263-f05d-4b09-a085-cbcd8b6490e1'
  AND integration_type = 'gmail_user';

-- Expected: No results (integration deleted)

-- ✅ After running this:
-- 1. Refresh your dashboard
-- 2. Go to Connectors tab
-- 3. Click "Connect" on Gmail
-- 4. Complete OAuth
-- 5. Fresh tokens will be saved

