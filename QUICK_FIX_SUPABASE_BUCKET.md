# 🔥 QUICK FIX: Supabase Bucket for Excel

## The Issue

The error `mime type application/vnd.openxmlformats-officedocument.spreadsheetml.sheet is not supported` means your Supabase Storage bucket is blocking Excel files.

---

## ✅ FASTEST FIX (1 minute)

### Option 1: Allow All File Types (Recommended for Testing)

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor:**
   - Click **SQL Editor** in left sidebar
   - Click **New Query**

3. **Copy and paste THIS:**

```sql
-- Remove MIME type restrictions (allows all file types)
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE name = 'sales-materials';

-- Verify the update
SELECT 
  name,
  allowed_mime_types,
  public,
  file_size_limit
FROM storage.buckets
WHERE name = 'sales-materials';
```

4. **Click "Run"**
   - Should show: `UPDATE 1`
   - Then show your bucket config with `allowed_mime_types = NULL`

5. **Done!** Try uploading Excel file again.

---

## ✅ Alternative: Specific MIME Types (More Secure)

If you prefer to explicitly allow specific types:

```sql
-- Allow specific file types including Excel
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/octet-stream'
]
WHERE name = 'sales-materials';

-- Verify
SELECT name, allowed_mime_types FROM storage.buckets WHERE name = 'sales-materials';
```

---

## 🔍 Check Current Configuration

Run this to see what's currently allowed:

```sql
SELECT 
  name,
  allowed_mime_types,
  file_size_limit,
  public
FROM storage.buckets
WHERE name = 'sales-materials';
```

**Look for:**
- If `allowed_mime_types` is an array that doesn't include Excel types → Run Option 1 or 2
- If `allowed_mime_types` is `NULL` → All types allowed (good!)
- If bucket doesn't exist → Create it (see below)

---

## 🆕 If Bucket Doesn't Exist

If the query returns no rows, create the bucket:

```sql
-- Create sales-materials bucket
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) VALUES (
  'sales-materials',
  'sales-materials',
  true,
  52428800,  -- 50MB
  NULL  -- Allow all MIME types
);
```

---

## 🧪 Test Again

After running the SQL:

1. **Wait 10 seconds** (for Supabase to update)
2. **Refresh your browser** (hard refresh: Cmd+Shift+R or Ctrl+Shift+R)
3. **Try uploading Excel file** again
4. **Should work!** ✅

---

## 🐛 Still Not Working?

### Check 1: Verify SQL Ran Successfully

Run this verification query:

```sql
SELECT 
  name,
  CASE 
    WHEN allowed_mime_types IS NULL THEN '✅ All MIME types allowed'
    WHEN 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' = ANY(allowed_mime_types) 
    THEN '✅ Excel allowed'
    ELSE '❌ Excel NOT allowed - run the UPDATE again'
  END as status
FROM storage.buckets
WHERE name = 'sales-materials';
```

### Check 2: Storage Policies

Make sure authenticated users can upload:

```sql
-- Check existing policies
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- If no INSERT policy exists, create one:
CREATE POLICY IF NOT EXISTS "Users can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'sales-materials');
```

### Check 3: Browser Console

Open browser console (F12) and look for errors:
- Network tab → Check the upload request
- Console tab → Look for error details

---

## 📋 Expected Results

**Before fix:**
```
❌ Failed to upload file: mime type ... is not supported
```

**After fix:**
```
✅ Uploading file...
✅ File uploaded successfully!
📊 Extracting data from Excel file...
```

---

## 🎯 Quick Summary

1. **Run SQL:** Set `allowed_mime_types = NULL` (or add Excel types)
2. **Verify:** Check bucket shows NULL or includes Excel types
3. **Test:** Upload Excel file
4. **Should work!**

**Most common issue:** Forgetting to run the SQL in Supabase!

---

## 🔗 Resources

- Full guide: `EXCEL_UPLOAD_FIX_GUIDE.md`
- Complete SQL: `FIX_EXCEL_UPLOAD_SUPABASE.sql`
- Supabase Docs: https://supabase.com/docs/guides/storage

---

**Need help? Let me know the output of the verification query!**

