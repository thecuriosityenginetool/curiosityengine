-- Update storage bucket file size limit to 50MB
-- Run this in your Supabase SQL Editor

-- Update the sales-materials bucket to allow 50MB files
UPDATE storage.buckets 
SET file_size_limit = 52428800  -- 50MB in bytes
WHERE id = 'sales-materials';

-- Verify the change
SELECT 
    id, 
    name, 
    file_size_limit,
    file_size_limit / 1024 / 1024 as size_limit_mb
FROM storage.buckets 
WHERE id = 'sales-materials';
