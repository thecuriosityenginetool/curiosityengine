-- ============================================
-- Fix: Add gmail_user to organization_integrations constraint
-- ============================================
-- This fixes the error: "violates check constraint organization_integrations_integration_type_check"
-- Run this in Supabase SQL Editor NOW

-- Drop existing constraint
ALTER TABLE organization_integrations DROP CONSTRAINT IF EXISTS organization_integrations_integration_type_check;

-- Add new constraint with ALL integration types including gmail_user
ALTER TABLE organization_integrations ADD CONSTRAINT organization_integrations_integration_type_check 
  CHECK (integration_type IN (
    'salesforce', 
    'salesforce_user', 
    'hubspot', 
    'hubspot_user', 
    'gmail', 
    'gmail_user',          -- THIS WAS MISSING!
    'outlook', 
    'outlook_user',        -- THIS WAS MISSING!
    'monday', 
    'monday_user',
    'calendar',
    'slack',
    'teams'
  ));

-- Verify the fix
SELECT '✅ Constraint updated successfully!' as status;

SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'organization_integrations_integration_type_check';

-- You can now connect Google Workspace!
SELECT 'Ready to connect Gmail! Try clicking Connect on Google Workspace card.' as next_step;

