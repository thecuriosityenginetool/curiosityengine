-- Check if Salesforce connection tokens are saved
-- Run this in Supabase SQL Editor after connecting

SELECT 
    id,
    organization_id,
    integration_type,
    is_enabled,
    enabled_at,
    CASE 
        WHEN configuration IS NOT NULL THEN 'Has configuration ✅'
        ELSE 'No configuration ❌'
    END as config_status,
    -- Show keys in configuration (but not actual tokens for security)
    CASE 
        WHEN configuration IS NOT NULL THEN jsonb_object_keys(configuration)
        ELSE NULL
    END as config_keys
FROM organization_integrations
WHERE integration_type IN ('salesforce', 'salesforce_user')
ORDER BY enabled_at DESC;

-- This should show:
-- ✅ integration_type = 'salesforce_user'
-- ✅ is_enabled = true
-- ✅ config_status = 'Has configuration ✅'
-- ✅ config_keys = your user ID

-- If you see results, your connection IS saved!
-- The problem is just the UI not detecting it.

