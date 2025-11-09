-- ============================================
-- Fix Supabase Storage Bucket for Excel Files
-- ============================================
-- Run this in Supabase SQL Editor to allow Excel uploads

-- Update the sales-materials bucket to allow Excel MIME types
-- Note: This updates the allowed_mime_types array in the storage.buckets table

-- First, check current bucket configuration
SELECT 
  id,
  name,
  allowed_mime_types,
  file_size_limit,
  public
FROM storage.buckets
WHERE name = 'sales-materials';

-- Update bucket to allow Excel and all document types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  -- Excel formats
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  -- .xlsx
  'application/vnd.ms-excel',  -- .xls
  
  -- PDF
  'application/pdf',
  
  -- Word documents
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  -- .docx
  'application/msword',  -- .doc
  
  -- PowerPoint
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',  -- .pptx
  'application/vnd.ms-powerpoint',  -- .ppt
  
  -- Text files
  'text/plain',
  
  -- CSV (if needed later)
  'text/csv',
  'application/csv',
  
  -- Generic fallback
  'application/octet-stream'
]
WHERE name = 'sales-materials';

-- Verify the update
SELECT 
  id,
  name,
  allowed_mime_types,
  file_size_limit
FROM storage.buckets
WHERE name = 'sales-materials';

-- Expected output should show all the MIME types including Excel formats

-- ============================================
-- Alternative: If bucket doesn't exist, create it
-- ============================================

-- Check if bucket exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'sales-materials'
  ) THEN
    -- Create the bucket with all allowed MIME types
    INSERT INTO storage.buckets (
      id,
      name,
      public,
      file_size_limit,
      allowed_mime_types
    ) VALUES (
      'sales-materials',
      'sales-materials',
      true,  -- Set to true if you want public access, false for private
      52428800,  -- 50MB in bytes
      ARRAY[
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint',
        'text/csv',
        'application/csv',
        'application/octet-stream'
      ]
    );
    RAISE NOTICE 'Created sales-materials bucket';
  ELSE
    RAISE NOTICE 'Bucket already exists, updated above';
  END IF;
END $$;

-- ============================================
-- Verification Query
-- ============================================

-- Run this to confirm Excel MIME types are allowed
SELECT 
  name,
  CASE 
    WHEN 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' = ANY(allowed_mime_types)
    THEN '✅ XLSX allowed'
    ELSE '❌ XLSX NOT allowed'
  END as xlsx_status,
  CASE 
    WHEN 'application/vnd.ms-excel' = ANY(allowed_mime_types)
    THEN '✅ XLS allowed'
    ELSE '❌ XLS NOT allowed'
  END as xls_status,
  file_size_limit / 1048576 || ' MB' as max_file_size
FROM storage.buckets
WHERE name = 'sales-materials';

-- ============================================
-- Quick Fix: Remove MIME type restrictions (if needed)
-- ============================================

-- If you want to allow ALL file types temporarily:
-- UPDATE storage.buckets
-- SET allowed_mime_types = NULL
-- WHERE name = 'sales-materials';

-- Note: NULL means all MIME types are allowed
-- This is less secure but useful for testing

-- ============================================
-- Storage Policies (ensure RLS allows uploads)
-- ============================================

-- Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- If needed, create upload policy for authenticated users
CREATE POLICY IF NOT EXISTS "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sales-materials' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create read policy for authenticated users
CREATE POLICY IF NOT EXISTS "Authenticated users can read files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'sales-materials'
);

-- Create delete policy for file owners
CREATE POLICY IF NOT EXISTS "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'sales-materials' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- DONE!
-- ============================================

-- After running this SQL:
-- 1. Excel uploads should work
-- 2. Try uploading .xlsx file again
-- 3. Check for success message

COMMIT;

