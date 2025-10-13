-- Clear any existing Salesforce connections to start fresh
-- Run this in Supabase SQL Editor

-- Check current connections
SELECT 
    organization_id,
    integration_type,
    is_enabled,
    enabled_at
FROM organization_integrations
WHERE integration_type IN ('salesforce', 'salesforce_user');

-- Delete all Salesforce connections (to start fresh)
DELETE FROM organization_integrations
WHERE integration_type IN ('salesforce', 'salesforce_user');

-- Verify they're gone
SELECT COUNT(*) as remaining_salesforce_connections
FROM organization_integrations
WHERE integration_type IN ('salesforce', 'salesforce_user');

-- Should return 0

