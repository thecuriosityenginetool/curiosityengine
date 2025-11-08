-- ============================================
-- SALESFORCE INTEGRATION - DATABASE SETUP
-- ============================================
-- Run this ONCE in Supabase SQL Editor
-- Safe to run - won't destroy existing data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CREATE TABLES (IF NOT EXISTS)
-- ============================================

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'individual' CHECK (account_type IN ('individual', 'organization')),
  domain TEXT,
  billing_email TEXT,
  max_seats INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb,
  organization_context JSONB DEFAULT '{}'::jsonb
);

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT,
  job_title TEXT,
  company_name TEXT,
  company_url TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('super_admin', 'org_admin', 'member')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_context JSONB DEFAULT '{"aboutMe": "", "objectives": ""}'::jsonb
);

-- LinkedIn Profile Analyses
CREATE TABLE IF NOT EXISTS public.linkedin_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  linkedin_url TEXT NOT NULL,
  profile_name TEXT,
  profile_headline TEXT,
  profile_location TEXT,
  profile_data JSONB,
  ai_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Generations table
CREATE TABLE IF NOT EXISTS public.email_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  linkedin_url TEXT,
  profile_name TEXT,
  subject TEXT,
  body TEXT,
  email_context TEXT,
  tone TEXT DEFAULT 'professional',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization Integrations (THE CRITICAL TABLE FOR SALESFORCE)
CREATE TABLE IF NOT EXISTS public.organization_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  configuration JSONB DEFAULT '{}'::jsonb,
  enabled_at TIMESTAMP WITH TIME ZONE,
  enabled_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, integration_type)
);

-- Sales Materials table
CREATE TABLE IF NOT EXISTS public.sales_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  is_organization_wide BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chats table
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity Logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- UPDATE CONSTRAINTS
-- ============================================

-- Drop old constraint if exists
ALTER TABLE organization_integrations DROP CONSTRAINT IF EXISTS organization_integrations_integration_type_check;

-- Add updated constraint with ALL integration types
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
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_organization ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_analyses_user ON public.linkedin_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_analyses_org ON public.linkedin_analyses(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_integrations_type_enabled ON public.organization_integrations(organization_id, integration_type, is_enabled);
CREATE INDEX IF NOT EXISTS idx_sales_materials_org ON public.sales_materials(organization_id);
CREATE INDEX IF NOT EXISTS idx_chats_user ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org ON public.activity_logs(organization_id);

-- ============================================
-- CREATE RLS POLICIES (Row Level Security)
-- ============================================

-- Enable RLS on tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can view own organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can view org integrations" ON public.organization_integrations;
DROP POLICY IF EXISTS "Admins can manage integrations" ON public.organization_integrations;
DROP POLICY IF EXISTS "Users can view org analyses" ON public.linkedin_analyses;
DROP POLICY IF EXISTS "Users can view org emails" ON public.email_generations;
DROP POLICY IF EXISTS "Users can view org materials" ON public.sales_materials;
DROP POLICY IF EXISTS "Users can view own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can view org activity" ON public.activity_logs;

-- Users can read their own data
CREATE POLICY "Users can view own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Organizations - users can see their own org
CREATE POLICY "Users can view own organization"
  ON public.organizations FOR SELECT
  USING (id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

-- Organization integrations - users can see their org's integrations
CREATE POLICY "Users can view org integrations"
  ON public.organization_integrations FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

-- Admins can manage integrations
CREATE POLICY "Admins can manage integrations"
  ON public.organization_integrations FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('org_admin', 'super_admin')
    )
  );

-- LinkedIn analyses - users can see their org's data
CREATE POLICY "Users can view org analyses"
  ON public.linkedin_analyses FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

-- Email generations - users can see their org's data
CREATE POLICY "Users can view org emails"
  ON public.email_generations FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

-- Sales materials - users can see their org's materials
CREATE POLICY "Users can view org materials"
  ON public.sales_materials FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

-- Chats - users can view own chats
CREATE POLICY "Users can view own chats"
  ON public.chats FOR ALL
  USING (user_id = auth.uid());

-- Activity logs - users can view org logs
CREATE POLICY "Users can view org activity"
  ON public.activity_logs FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

-- ============================================
-- CREATE HELPER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_organization_id UUID,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
  INSERT INTO public.activity_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    p_organization_id,
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ Schema created successfully!' as status;

SELECT 'Tables created:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'organizations', 'organization_integrations', 'linkedin_analyses', 'sales_materials', 'chats', 'activity_logs')
ORDER BY table_name;

SELECT 'Integration types supported:' as info;
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'organization_integrations_integration_type_check';

SELECT '✅ Database is ready for Salesforce integration!' as final_status;

