-- ============================================
-- Add All Integration Types to Schema
-- ============================================
-- Run this in your Supabase SQL Editor to add support for:
-- - HubSpot CRM (hubspot, hubspot_user)
-- - Gmail (gmail, gmail_user)
-- - Outlook (outlook, outlook_user)
-- - Monday.com (monday, monday_user)

-- Drop existing constraint
ALTER TABLE organization_integrations DROP CONSTRAINT IF EXISTS organization_integrations_integration_type_check;

-- Add new constraint with all integration types
ALTER TABLE organization_integrations ADD CONSTRAINT organization_integrations_integration_type_check 
  CHECK (integration_type IN (
    'salesforce', 
    'salesforce_user', 
    'hubspot', 
    'hubspot_user', 
    'gmail', 
    'gmail_user', 
    'outlook', 
    'outlook_user', 
    'monday', 
    'monday_user',
    'calendar',
    'slack',
    'teams'
  ));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_org_integrations_type_enabled 
  ON organization_integrations(organization_id, integration_type, is_enabled);

-- Create index for user-level integrations
CREATE INDEX IF NOT EXISTS idx_org_integrations_user_enabled
  ON organization_integrations(organization_id, integration_type)
  WHERE is_enabled = true;

-- Verify the constraint
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'organization_integrations_integration_type_check';

-- Show existing integrations
SELECT 
  organization_id,
  integration_type,
  is_enabled,
  enabled_at
FROM organization_integrations
ORDER BY organization_id, integration_type;

