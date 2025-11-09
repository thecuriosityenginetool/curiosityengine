-- ============================================
-- Fix sales_materials Table to Allow Excel Files
-- ============================================
-- Run this in Supabase SQL Editor

-- Check current constraint
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'sales_materials'::regclass
  AND contype = 'c'
  AND conname LIKE '%file_type%';

-- Drop the old constraint
ALTER TABLE sales_materials 
DROP CONSTRAINT IF EXISTS sales_materials_file_type_check;

-- Add new constraint with xlsx and xls
ALTER TABLE sales_materials
ADD CONSTRAINT sales_materials_file_type_check 
CHECK (file_type IN ('pdf', 'docx', 'txt', 'pptx', 'xlsx', 'xls'));

-- Verify the new constraint
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'sales_materials'::regclass
  AND contype = 'c'
  AND conname LIKE '%file_type%';

-- Check the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sales_materials'
  AND column_name = 'file_type';

-- Test query - should show allowed values
SELECT 
  'pdf' as file_type,
  CASE WHEN 'pdf' IN ('pdf', 'docx', 'txt', 'pptx', 'xlsx', 'xls') 
    THEN '✅ Allowed' 
    ELSE '❌ Not allowed' 
  END as status
UNION ALL
SELECT 'xlsx', CASE WHEN 'xlsx' IN ('pdf', 'docx', 'txt', 'pptx', 'xlsx', 'xls') THEN '✅ Allowed' ELSE '❌ Not allowed' END
UNION ALL
SELECT 'xls', CASE WHEN 'xls' IN ('pdf', 'docx', 'txt', 'pptx', 'xlsx', 'xls') THEN '✅ Allowed' ELSE '❌ Not allowed' END;

-- Done! Now try uploading Excel files again.

