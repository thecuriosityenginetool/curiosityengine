-- Clear test Salesforce connections
-- Run this in your Supabase SQL editor to reset Salesforce connections

DELETE FROM organization_integrations 
WHERE integration_type IN ('salesforce', 'salesforce_user');

-- Verify it's cleared
SELECT * FROM organization_integrations 
WHERE integration_type IN ('salesforce', 'salesforce_user');
