# Settings & Sales Materials System - COMPLETE ✅

## 🎯 What's Implemented

### 1️⃣ **Enhanced Settings Tab**

#### Profile Information (All Saved to Database):
- ✅ **Full Name** - User's full name
- ✅ **Job Title** - Sales role (e.g., "Sales Manager")
- ✅ **Company Name** - Company/organization name
- ✅ **Company URL** - Company website
- ✅ **Save Profile** button - Updates database immediately

#### AI Context (Existing):
- About Me textarea
- Objectives textarea
- Integrated with profile data in AI prompts

### 2️⃣ **Sales Materials Upload System**

#### File Upload:
- ✅ Drag & drop or click to upload
- ✅ Supported formats: PDF, DOCX, TXT, PPTX
- ✅ Max file size: 10MB
- ✅ Files stored in Supabase Storage
- ✅ Text extraction for AI context
- ✅ Upload progress indicator (⏳)

#### File Management:
- ✅ View all uploaded materials
- ✅ File name, category, size, date shown
- ✅ Delete button (🗑️) for each file
- ✅ Confirmation dialog before deletion

#### AI Integration:
- ✅ Uploaded content extracted and saved
- ✅ First 1000 chars per file included in AI prompts
- ✅ Up to 5 most recent files used for context
- ✅ AI references materials when generating responses

### 3️⃣ **Upgrade to Company Plan**

#### Features Displayed:
- ✓ Team collaboration & shared context
- ✓ Unlimited sales material storage
- ✓ Advanced CRM integrations
- ✓ Custom AI training on your data
- ✓ Priority support

#### Request Upgrade Button:
- ✅ Opens pre-filled email to `hello@curiosityengine.io`
- ✅ Includes user name and email
- ✅ Professional email template
- ✅ Orange gradient card design

## 🗄️ Database Schema

### New Columns Added to `users` table:
```sql
- company_name TEXT
- job_title TEXT
- company_url TEXT
```

### New Columns Added to `organizations` table:
```sql
- company_url TEXT
- industry TEXT
- company_size TEXT
- plan_type TEXT (individual/company)
```

### New `sales_materials` Table:
```sql
- id UUID (primary key)
- user_id UUID (references users)
- organization_id UUID (references organizations)
- file_name TEXT
- file_type TEXT (pdf/docx/txt/pptx)
- file_size INTEGER
- file_url TEXT (Supabase Storage URL)
- extracted_text TEXT (AI-extracted content)
- description TEXT
- category TEXT (sales_guide/product_sheet/case_study/pitch_deck/other)
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### Supabase Storage Bucket:
- **Bucket name**: `sales-materials`
- **Public**: Yes
- **Max size**: 10MB per file
- **Allowed types**: PDF, DOCX, TXT, PPTX
- **RLS Policies**: Users can only access their own files

## 📡 API Endpoints

### Profile Management:
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile (name, title, company, URL)

### Sales Materials:
- `GET /api/sales-materials` - Get user's uploaded materials
- `POST /api/sales-materials` - Upload new material
- `DELETE /api/sales-materials?id=xxx` - Delete material

### Enhanced Chat:
- `POST /api/chat` - Now includes:
  - User profile data
  - Sales materials content
  - Company information
  - User context
  - Calendar events

## 🎨 UI Features

### Settings Page Layout:
1. **Profile Information** section (4 fields in 2-column grid)
2. **Save Profile** button
3. **AI Context** section (About Me + Objectives)
4. **Sales Materials Upload** section with drag & drop
5. **Uploaded Materials** list with delete buttons
6. **Upgrade to Company Plan** call-to-action card

### Smart AI Context:
When AI generates responses, it now has access to:
- ✅ Your name, role, company
- ✅ Company website for research
- ✅ Sales materials content (guides, decks, case studies)
- ✅ Personal objectives and context
- ✅ Calendar events

## 🧪 Testing Checklist

### Profile Management:
- [ ] Go to **Settings** tab
- [ ] Fill in: Full Name, Job Title, Company Name, Company URL
- [ ] Click **Save Profile**
- [ ] Refresh page - data should persist
- [ ] Start chat - AI should use your company info

### File Upload:
- [ ] Click upload area in Settings
- [ ] Select a PDF/DOCX/TXT file (under 10MB)
- [ ] See "Uploading..." message
- [ ] File appears in list below with details
- [ ] Click 🗑️ to delete - confirm dialog appears
- [ ] After deletion, file removed from list

### AI Context Integration:
- [ ] Upload a sales guide PDF
- [ ] Go to Dashboard
- [ ] Ask: "What products do we sell?"
- [ ] AI should reference uploaded materials
- [ ] Ask: "Draft an email introducing our company"
- [ ] AI should use your profile + company URL

### Upgrade Feature:
- [ ] Scroll to **Upgrade to Company Plan** section
- [ ] Click **📧 Request Upgrade** button
- [ ] Email client opens with pre-filled message
- [ ] Email sent to `hello@curiosityengine.io`

## 🔒 Security

- ✅ Row Level Security on all tables
- ✅ Storage bucket RLS policies
- ✅ Users can only access their own files
- ✅ Service role for backend operations
- ✅ File size limits enforced
- ✅ File type validation

## 📋 Setup Instructions

### 1. Run SQL Migration:
```bash
# In Supabase SQL Editor, run:
supabase-add-settings-fields.sql
```

This creates:
- New user profile fields
- `sales_materials` table
- Storage bucket with policies

### 2. Enable Storage:
- Go to **Supabase → Storage**
- Verify `sales-materials` bucket exists
- Check public access is enabled

### 3. Test Upload:
- Visit Settings tab
- Upload a test PDF
- Verify it appears in Storage bucket

## 🚀 Live Features

All deployed to: `https://www.curiosityengine.io/dashboard`

**What Users Can Do Now:**
1. ✅ Complete profile with company info
2. ✅ Upload sales materials (PDFs, docs, presentations)
3. ✅ AI automatically uses uploaded content in responses
4. ✅ Request upgrade to Company Plan
5. ✅ Manage uploaded files (view/delete)

**What AI Now Knows:**
- Your role and company
- Company website and industry
- Sales guides and product sheets
- Case studies and pitch decks
- Your personal sales objectives

This makes every AI response more personalized and relevant to your specific sales context! 🎯

