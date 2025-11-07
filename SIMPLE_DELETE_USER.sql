-- Simple user deletion - CASCADE will handle related records
-- Run this in Supabase SQL Editor

-- Delete integrations for this user's organization
DELETE FROM organization_integrations
WHERE organization_id IN (
  SELECT COALESCE(organization_id, id)
  FROM users 
  WHERE email = 'matthewbravo13@gmail.com'
);

-- Delete the user (CASCADE will delete related records)
DELETE FROM users
WHERE email = 'matthewbravo13@gmail.com';

-- Verify
SELECT 'User deleted successfully!' as status;
SELECT COUNT(*) as remaining
FROM users 
WHERE email = 'matthewbravo13@gmail.com';

