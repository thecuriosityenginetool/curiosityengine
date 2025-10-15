-- Complete Fix for AI Context Saving and File Upload
-- This script fixes the user_context field issue and ensures file upload works
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/mrdqdgztzwboglkrtaui/sql

-- ===========================================
-- 1. FIX USER_CONTEXT FIELD ISSUE
-- ===========================================

-- Check if user_context column exists and add it if missing
DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'user_context'
    ) THEN
        -- Add the user_context column
        ALTER TABLE public.users 
        ADD COLUMN user_context JSONB DEFAULT '{}'::jsonb;
        
        RAISE NOTICE '✅ Added user_context column to users table';
    ELSE
        RAISE NOTICE '✅ user_context column already exists in users table';
    END IF;
END $$;

-- ===========================================
-- 2. ENSURE SALES_MATERIALS TABLE EXISTS
-- ===========================================

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

-- ===========================================
-- 3. SET UP RLS POLICIES FOR SALES_MATERIALS
-- ===========================================

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

-- ===========================================
-- 4. SET UP STORAGE BUCKET
-- ===========================================

-- Create storage bucket for sales materials
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sales-materials',
  'sales-materials',
  true,
  10485760, -- 10MB
  ARRAY[
    'application/pdf', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'text/plain', 
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- 5. SET UP STORAGE POLICIES
-- ===========================================

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload their own sales materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own sales materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own sales materials" ON storage.objects;

-- Storage policies for sales-materials bucket
CREATE POLICY "Users can upload their own sales materials"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'sales-materials' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own sales materials"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'sales-materials' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own sales materials"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'sales-materials' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ===========================================
-- 6. ADD TRIGGER FOR UPDATED_AT
-- ===========================================

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

-- ===========================================
-- 7. VERIFICATION
-- ===========================================

-- Verify the user_context column was added
SELECT 
    'user_context field check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'user_context'
        ) THEN '✅ user_context field exists'
        ELSE '❌ user_context field missing'
    END as status;

-- Verify sales_materials table exists
SELECT 
    'sales_materials table check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'sales_materials'
        ) THEN '✅ sales_materials table exists'
        ELSE '❌ sales_materials table missing'
    END as status;

-- Verify storage bucket exists
SELECT 
    'storage bucket check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM storage.buckets 
            WHERE id = 'sales-materials'
        ) THEN '✅ sales-materials bucket exists'
        ELSE '❌ sales-materials bucket missing'
    END as status;

-- Show all columns in users table
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users' 
ORDER BY ordinal_position;

-- Show sales_materials table structure
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'sales_materials' 
ORDER BY ordinal_position;

-- Final success message
SELECT 
    'Migration completed successfully!' as status,
    'AI context saving and file upload should now work' as details;
