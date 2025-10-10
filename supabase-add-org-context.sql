-- Add organization context field to organizations table
-- This allows org admins to set context for all users in the organization

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS org_context JSONB DEFAULT '{}'::jsonb;

-- Update the settings column comment to clarify what it's for
COMMENT ON COLUMN public.organizations.org_context IS 'Organization-level context (aboutUs, objectives, valueProposition) that applies to all users';
COMMENT ON COLUMN public.organizations.settings IS 'Organization settings (logo, theme, billing, etc)';

-- Grant update permission for org_context
-- (Already covered by existing GRANT statement for organizations table)
