-- Simple check for Salesforce connection
-- Run this in Supabase SQL Editor

-- 1. Check if Salesforce tokens are saved
SELECT 
    id,
    organization_id,
    integration_type,
    is_enabled,
    enabled_at,
    enabled_by,
    CASE 
        WHEN configuration IS NOT NULL THEN 'Has tokens ✅'
        ELSE 'No tokens ❌'
    END as token_status
FROM organization_integrations
WHERE integration_type IN ('salesforce', 'salesforce_user')
ORDER BY enabled_at DESC;

-- 2. Check the actual configuration (shows the structure)
SELECT 
    integration_type,
    is_enabled,
    configuration
FROM organization_integrations
WHERE integration_type = 'salesforce_user'
LIMIT 1;

-- Expected results:
-- ✅ Row exists with integration_type = 'salesforce_user'
-- ✅ is_enabled = true
-- ✅ configuration = { "user-id-here": { access_token: "...", ... } }

-- If you see this, connection IS saved!
-- The problem is just the dashboard not detecting it on refresh.

