-- Create an organization for your user
-- This fixes the foreign key constraint error
-- Run this in Supabase SQL Editor

-- Step 1: Check your current user record
SELECT 
    id as user_id,
    email,
    full_name,
    organization_id,
    CASE 
        WHEN organization_id IS NULL THEN '❌ No organization'
        ELSE '✅ Has organization'
    END as org_status
FROM users
WHERE email = 'matthewbravo13@gmail.com';

-- Step 2: Create an organization if you don't have one
INSERT INTO organizations (id, name, account_type, created_at)
SELECT 
    u.id,  -- Use user ID as organization ID
    COALESCE(u.full_name, 'My Organization'),
    'individual',
    NOW()
FROM users u
WHERE u.email = 'matthewbravo13@gmail.com'
  AND u.organization_id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 3: Update user to link to their organization
UPDATE users
SET organization_id = id
WHERE email = 'matthewbravo13@gmail.com'
  AND organization_id IS NULL;

-- Step 4: Verify it worked
SELECT 
    u.id,
    u.email,
    u.organization_id,
    o.name as org_name,
    o.account_type,
    CASE 
        WHEN u.organization_id IS NOT NULL THEN '✅ Organization linked!'
        ELSE '❌ Still no organization'
    END as status
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.email = 'matthewbravo13@gmail.com';

-- ✅ After this, you can connect Salesforce!

