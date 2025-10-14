-- Add support for salesforce_user integration type
-- Run this in Supabase SQL Editor if your database doesn't support salesforce_user yet

-- Drop existing constraint if it exists
ALTER TABLE organization_integrations DROP CONSTRAINT IF EXISTS organization_integrations_integration_type_check;

-- Add new constraint that includes salesforce_user
ALTER TABLE organization_integrations ADD CONSTRAINT organization_integrations_integration_type_check 
  CHECK (integration_type IN (
    'salesforce', 
    'salesforce_user', 
    'hubspot', 
    'gmail', 
    'outlook', 
    'calendar',
    'slack',
    'teams'
  ));

-- Verify the constraint was added
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'organization_integrations_integration_type_check';

-- Show current integrations
SELECT 
  organization_id,
  integration_type,
  is_enabled,
  enabled_at
FROM organization_integrations
WHERE integration_type IN ('salesforce', 'salesforce_user')
ORDER BY organization_id, integration_type;
