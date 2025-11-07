-- Clean slate: Delete user and all related data for fresh Google signup test
-- Run this in Supabase SQL Editor
-- Replace 'matthewbravo13@gmail.com' with your email if different

-- Step 1: See what we're deleting
SELECT 'Current user data:' as info;
SELECT id, email, full_name, organization_id, role, email_provider
FROM users 
WHERE email = 'matthewbravo13@gmail.com';

SELECT 'Organization integrations:' as info;
SELECT id, organization_id, integration_type, is_enabled
FROM organization_integrations
WHERE organization_id IN (
  SELECT COALESCE(organization_id, id)
  FROM users 
  WHERE email = 'matthewbravo13@gmail.com'
);

-- Step 2: Delete integrations first (foreign key dependency)
DELETE FROM organization_integrations
WHERE organization_id IN (
  SELECT COALESCE(organization_id, id)
  FROM users 
  WHERE email = 'matthewbravo13@gmail.com'
);

-- Step 3: Delete activity logs
DELETE FROM activity_logs
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'matthewbravo13@gmail.com'
);

-- Step 4: Delete sales materials
DELETE FROM sales_materials
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'matthewbravo13@gmail.com'
);

-- Step 5: Delete chat messages
DELETE FROM chat_messages
WHERE chat_id IN (
  SELECT id FROM chats WHERE user_id IN (
    SELECT id FROM users WHERE email = 'matthewbravo13@gmail.com'
  )
);

-- Step 6: Delete chats
DELETE FROM chats
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'matthewbravo13@gmail.com'
);

-- Step 7: Delete leads
DELETE FROM leads
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'matthewbravo13@gmail.com'
);

-- Step 8: Delete organization if user is the only member
DELETE FROM organizations
WHERE id IN (
  SELECT organization_id
  FROM users 
  WHERE email = 'matthewbravo13@gmail.com'
  AND organization_id IS NOT NULL
)
AND NOT EXISTS (
  SELECT 1 FROM users 
  WHERE organization_id = organizations.id 
  AND email != 'matthewbravo13@gmail.com'
);

-- Step 9: Finally delete the user
DELETE FROM users
WHERE email = 'matthewbravo13@gmail.com';

-- Verify deletion
SELECT 'Deletion complete - verifying:' as status;
SELECT COUNT(*) as remaining_users
FROM users 
WHERE email = 'matthewbravo13@gmail.com';

SELECT 'Ready for fresh Google OAuth signup!' as next_step;

