-- Quick Verification Script
-- Run this to confirm everything is fixed

-- 1. Check RLS policies are in place
SELECT 
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE tablename IN ('users', 'organization_integrations', 'chats', 'chat_messages', 'activity_logs')
GROUP BY tablename
ORDER BY tablename;

-- 2. Check Outlook connection status
SELECT 
  'Outlook Connection' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '❌ Still connected (need to reconnect for new scopes)'
    ELSE '✅ Disconnected (ready to reconnect)'
  END as status
FROM organization_integrations
WHERE integration_type = 'outlook_user'
  AND organization_id = (
    SELECT organization_id 
    FROM users 
    WHERE email = 'matthewbravo13@gmail.com'
    LIMIT 1
  );

-- 3. Check your user and organization
SELECT 
  'User & Organization' as check_name,
  CASE 
    WHEN u.organization_id IS NOT NULL THEN '✅ User has organization'
    ELSE '❌ User missing organization'
  END as status,
  u.id as user_id,
  u.organization_id,
  u.email
FROM users u
WHERE u.email = 'matthewbravo13@gmail.com';

-- 4. Check Salesforce connection
SELECT 
  'Salesforce Connection' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Salesforce connected'
    ELSE '❌ Salesforce not connected'
  END as status
FROM organization_integrations
WHERE integration_type = 'salesforce_user'
  AND is_enabled = true
  AND organization_id = (
    SELECT organization_id 
    FROM users 
    WHERE email = 'matthewbravo13@gmail.com'
    LIMIT 1
  );

-- Summary
DO $$
DECLARE
  v_policies_count int;
  v_outlook_count int;
  v_sf_count int;
BEGIN
  -- Count policies
  SELECT COUNT(DISTINCT tablename) INTO v_policies_count
  FROM pg_policies
  WHERE tablename IN ('users', 'organization_integrations', 'chats', 'chat_messages', 'activity_logs');
  
  -- Check Outlook
  SELECT COUNT(*) INTO v_outlook_count
  FROM organization_integrations
  WHERE integration_type = 'outlook_user';
  
  -- Check Salesforce
  SELECT COUNT(*) INTO v_sf_count
  FROM organization_integrations
  WHERE integration_type = 'salesforce_user' AND is_enabled = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 VERIFICATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS Policies: % tables configured', v_policies_count;
  RAISE NOTICE '   Expected: 5 tables (users, organization_integrations, chats, chat_messages, activity_logs)';
  RAISE NOTICE '';
  
  IF v_outlook_count = 0 THEN
    RAISE NOTICE '✅ Outlook: Disconnected (ready to reconnect)';
  ELSE
    RAISE NOTICE '⚠️  Outlook: Still connected (needs reconnection for calendar scopes)';
  END IF;
  
  IF v_sf_count > 0 THEN
    RAISE NOTICE '✅ Salesforce: Connected';
  ELSE
    RAISE NOTICE '⚠️  Salesforce: Not connected';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🔄 NEXT STEPS:';
  RAISE NOTICE '1. Refresh your dashboard at https://www.curiosityengine.io/dashboard';
  RAISE NOTICE '2. Check browser console - 406 errors should be GONE ✅';
  RAISE NOTICE '3. Go to Integrations tab';
  RAISE NOTICE '4. Click "Connect" for Microsoft Outlook';
  RAISE NOTICE '5. Grant calendar permissions when prompted';
  RAISE NOTICE '6. Test 🔄 Sync button in calendar section';
  RAISE NOTICE '';
END $$;

