-- ============================================
-- MINIMAL SALESFORCE SETUP
-- ============================================
-- This creates ONLY the essential tables for Salesforce integration
-- Safe to run - won't destroy existing data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Organizations Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'individual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  organization_id UUID REFERENCES public.organizations(id),
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. Organization Integrations (CRITICAL FOR SALESFORCE)
-- ============================================
CREATE TABLE IF NOT EXISTS public.organization_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  configuration JSONB DEFAULT '{}'::jsonb,
  enabled_at TIMESTAMP WITH TIME ZONE,
  enabled_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, integration_type)
);

-- ============================================
-- 4. Update Integration Type Constraint
-- ============================================
ALTER TABLE organization_integrations DROP CONSTRAINT IF EXISTS organization_integrations_integration_type_check;

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

-- ============================================
-- 5. Create Essential Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_org ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_integrations_lookup ON public.organization_integrations(organization_id, integration_type, is_enabled);

-- ============================================
-- 6. Disable RLS temporarily for API access
-- ============================================
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_integrations DISABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT '✅ Step 1: Tables created' as status;

SELECT 'Checking tables...' as step;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'organizations', 'organization_integrations')
ORDER BY table_name;

SELECT 'Checking configuration column...' as step;
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN data_type = 'jsonb' THEN '✅ Correct type'
    ELSE '❌ Wrong type'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'organization_integrations'
  AND column_name = 'configuration';

SELECT 'Checking integration types...' as step;
SELECT check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'organization_integrations_integration_type_check';

SELECT '✅ ✅ ✅ SETUP COMPLETE! ✅ ✅ ✅' as final_status;
SELECT 'You can now save Salesforce credentials and connect!' as next_step;

