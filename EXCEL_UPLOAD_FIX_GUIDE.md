# 🔧 Excel Upload Error Fix

## ❌ Problem

```
Failed to upload file: mime type application/vnd.openxmlformats-officedocument.spreadsheetml.sheet is not supported
```

This means Supabase Storage bucket doesn't allow Excel file MIME types.

---

## ✅ Solution (3 Steps)

### Step 1: Update Code (✅ Already Done)

I've updated the API route to explicitly handle Excel MIME types:
- ✅ Maps .xlsx → correct MIME type
- ✅ Maps .xls → correct MIME type
- ✅ Handles all document types explicitly

**File updated:** `apps/sales-curiosity-web/src/app/api/sales-materials/route.ts`

### Step 2: Fix Supabase Bucket Configuration

You need to update your Supabase Storage bucket to allow Excel files.

**Choose ONE of these methods:**

---

## 🎯 Method A: Via Supabase Dashboard (Easiest - 2 minutes)

### 1. Go to Supabase Dashboard
   - Open: https://supabase.com/dashboard
   - Select your project

### 2. Navigate to Storage
   - Click **Storage** in left sidebar
   - Find **sales-materials** bucket
   - Click on bucket name

### 3. Click Settings (Gear Icon)
   - Look for **"Allowed MIME types"** section
   - Click **Edit**

### 4. Add Excel MIME Types
   Add these to the allowed list:
   ```
   application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
   application/vnd.ms-excel
   ```

### 5. Save Changes
   - Click **Save**
   - Try uploading Excel file again

---

## 🎯 Method B: Via SQL Editor (Complete - 3 minutes)

### 1. Open SQL Editor
   - Go to Supabase Dashboard
   - Click **SQL Editor** in left sidebar
   - Click **New Query**

### 2. Run This SQL
   Copy and paste this into the editor:

```sql
-- Update sales-materials bucket to allow Excel files
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
  
  -- Text files
  'text/plain',
  
  -- Generic
  'application/octet-stream'
]
WHERE name = 'sales-materials';
```

### 3. Click "Run"
   - Wait for success message
   - Query should return: `UPDATE 1`

### 4. Verify
   Run this to check:
```sql
SELECT 
  name,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'sales-materials';
```

Should show all MIME types including Excel formats.

---

## 🎯 Method C: Quick Fix (Allow All - 1 minute)

**⚠️ Less secure but works for testing:**

### 1. Open SQL Editor

### 2. Run This:
```sql
-- Allow ALL MIME types (removes restriction)
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE name = 'sales-materials';
```

### 3. Done
   - Now all file types are allowed
   - Excel uploads will work
   - Can restrict later if needed

---

## 📦 Step 3: Deploy Updated Code

After fixing Supabase, deploy the updated code:

```bash
cd /Users/paulwallace/Desktop/sales-curiosity-engine
git add apps/sales-curiosity-web/src/app/api/sales-materials/route.ts
git commit -m "fix: Handle Excel MIME types explicitly for uploads"
git push origin main
```

Wait 2-3 minutes for Vercel deployment.

---

## 🧪 Test Again

After both fixes:

1. **Go to your app:** https://www.curiosityengine.io/dashboard
2. **Settings → Knowledge Base**
3. **Upload Excel file (.xlsx or .xls)**
4. **Should succeed!** ✅

---

## 🐛 Still Not Working?

### Check Browser Console (F12)

Look for error messages:
```
Failed to upload file: [error message]
```

### Common Issues:

**1. "File too large"**
- Max size: 50MB
- Solution: Compress or split file

**2. "Bucket not found"**
- Bucket doesn't exist
- Solution: Run SQL to create bucket (see `FIX_EXCEL_UPLOAD_SUPABASE.sql`)

**3. "Permission denied"**
- RLS policy issue
- Solution: Check storage policies in SQL

**4. Still MIME type error**
- Bucket not updated yet
- Solution: Wait 30 seconds, try again
- Or check Supabase Dashboard → Storage → Bucket settings

---

## 📊 Verification Checklist

After fixes, verify:

- [ ] Ran SQL to update bucket OR updated via Dashboard
- [ ] Bucket shows Excel MIME types in allowed list
- [ ] Code deployed to Vercel (check deployment status)
- [ ] Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
- [ ] Excel file uploads successfully
- [ ] Console shows: `✅ Extracted X characters from Excel file`

---

## 🔍 Full SQL Script

For complete SQL with verification and policies, see:
**`FIX_EXCEL_UPLOAD_SUPABASE.sql`**

This includes:
- Bucket update
- Verification queries
- Storage policies
- Fallback options

---

## ✅ Expected Result

After fixes:

**Before:**
```
❌ Failed to upload file: mime type ... is not supported
```

**After:**
```
✅ File uploaded successfully!
📊 Extracting data from Excel file...
✅ Extracted 523 characters from Excel file with 1 sheet(s)
```

---

## 🎯 Summary

1. ✅ **Code fix:** Updated API to handle Excel MIME types explicitly
2. ⏳ **Supabase fix:** Update bucket to allow Excel MIME types (Method A, B, or C above)
3. ⏳ **Deploy:** Push updated code to production
4. ⏳ **Test:** Upload Excel file again

**Time needed:** 5 minutes total

---

**Need help?** Let me know which error you're still seeing!

