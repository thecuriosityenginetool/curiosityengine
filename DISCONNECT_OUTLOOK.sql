-- Disconnect Outlook to Force Reconnection with New Scopes
-- Run this in Supabase SQL Editor if you need to reset Outlook connection

-- Replace 'matthewbravo13@gmail.com' with your email
DELETE FROM organization_integrations
WHERE integration_type = 'outlook_user'
  AND organization_id = (
    SELECT organization_id 
    FROM users 
    WHERE email = 'matthewbravo13@gmail.com'
    LIMIT 1
  );

-- Verify deletion
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Outlook disconnected successfully. You can now reconnect from the dashboard.'
    ELSE '❌ Outlook still connected. Check your email in the query above.'
  END as status
FROM organization_integrations
WHERE integration_type = 'outlook_user'
  AND organization_id = (
    SELECT organization_id 
    FROM users 
    WHERE email = 'matthewbravo13@gmail.com'
    LIMIT 1
  );

