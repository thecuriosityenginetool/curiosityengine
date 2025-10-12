-- Add settings fields to users and organizations tables
-- Run this in your Supabase SQL Editor

-- Add new columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS company_url TEXT;

-- Add new columns to organizations table for company plan features
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS company_url TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS company_size TEXT,
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'individual' CHECK (plan_type IN ('individual', 'company'));

-- Create table for storing sales materials/documents
CREATE TABLE IF NOT EXISTS public.sales_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt', 'pptx')),
  file_size INTEGER, -- in bytes
  file_url TEXT NOT NULL, -- Supabase Storage URL
  extracted_text TEXT, -- AI-extracted content from the file
  description TEXT,
  category TEXT CHECK (category IN ('sales_guide', 'product_sheet', 'case_study', 'pitch_deck', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for sales_materials
CREATE INDEX IF NOT EXISTS idx_sales_materials_user_id ON public.sales_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_materials_org_id ON public.sales_materials(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_materials_category ON public.sales_materials(category);

-- Enable RLS on sales_materials
ALTER TABLE public.sales_materials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own sales materials" ON public.sales_materials;
DROP POLICY IF EXISTS "Users can create their own sales materials" ON public.sales_materials;
DROP POLICY IF EXISTS "Users can delete their own sales materials" ON public.sales_materials;
DROP POLICY IF EXISTS "Service role has full access to sales materials" ON public.sales_materials;

-- RLS Policies for sales_materials
CREATE POLICY "Users can view their own sales materials"
  ON public.sales_materials FOR SELECT
  USING (
    user_id IN (SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email')
    OR organization_id IN (
      SELECT organization_id FROM public.users WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Users can create their own sales materials"
  ON public.sales_materials FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Users can delete their own sales materials"
  ON public.sales_materials FOR DELETE
  USING (user_id IN (
    SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'
  ));

-- Service role has full access
CREATE POLICY "Service role has full access to sales materials"
  ON public.sales_materials FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_sales_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sales_materials_updated_at ON public.sales_materials;
CREATE TRIGGER trigger_update_sales_materials_updated_at
  BEFORE UPDATE ON public.sales_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_materials_updated_at();

-- Comments for documentation
COMMENT ON COLUMN public.users.company_name IS 'User company/organization name';
COMMENT ON COLUMN public.users.job_title IS 'User job title/role';
COMMENT ON COLUMN public.users.company_url IS 'User company website URL';

COMMENT ON COLUMN public.organizations.company_url IS 'Organization website URL';
COMMENT ON COLUMN public.organizations.industry IS 'Organization industry/sector';
COMMENT ON COLUMN public.organizations.company_size IS 'Number of employees (e.g., 1-10, 11-50, 51-200, 201-500, 500+)';
COMMENT ON COLUMN public.organizations.plan_type IS 'Subscription plan type';

COMMENT ON TABLE public.sales_materials IS 'Stores uploaded sales materials, guides, and documents';
COMMENT ON COLUMN public.sales_materials.extracted_text IS 'AI-extracted text content from uploaded files for use in prompts';
COMMENT ON COLUMN public.sales_materials.file_url IS 'URL to the file in Supabase Storage';
COMMENT ON COLUMN public.sales_materials.category IS 'Type of sales material';

-- Verify changes
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'organizations', 'sales_materials')
ORDER BY table_name, ordinal_position;

