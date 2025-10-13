-- Check Outlook connection status for calendar sync
-- Run this in Supabase SQL Editor

-- Step 1: Check if Outlook integration exists
SELECT 
  'Outlook Integration Check' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Outlook integration found'
    ELSE '❌ No Outlook integration found'
  END as status,
  COUNT(*) as integration_count
FROM organization_integrations
WHERE integration_type = 'outlook_user'
  AND is_enabled = true;

-- Step 2: Show all Outlook integrations
SELECT 
  id,
  organization_id,
  integration_type,
  is_enabled,
  created_at,
  updated_at,
  CASE 
    WHEN configuration IS NOT NULL THEN 'Has config'
    ELSE 'No config'
  END as config_status
FROM organization_integrations
WHERE integration_type LIKE '%outlook%'
ORDER BY created_at DESC;

-- Step 3: Check user's organization
SELECT 
  'User Organization Check' as check_name,
  u.id as user_id,
  u.email,
  u.organization_id,
  CASE 
    WHEN u.organization_id IS NOT NULL THEN '✅ User has organization'
    ELSE '❌ User missing organization'
  END as status
FROM users u
WHERE u.email = 'matthewbravo13@gmail.com';

-- Step 4: Check if user's organization has Outlook integration
SELECT 
  'User Outlook Integration' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ User org has Outlook integration'
    ELSE '❌ User org missing Outlook integration'
  END as status,
  COUNT(*) as integration_count
FROM organization_integrations oi
JOIN users u ON u.organization_id = oi.organization_id
WHERE u.email = 'matthewbravo13@gmail.com'
  AND oi.integration_type = 'outlook_user'
  AND oi.is_enabled = true;

-- Step 5: Show detailed integration config
SELECT 
  oi.id,
  oi.organization_id,
  oi.integration_type,
  oi.is_enabled,
  oi.created_at,
  oi.updated_at,
  jsonb_pretty(oi.configuration) as config_formatted
FROM organization_integrations oi
JOIN users u ON u.organization_id = oi.organization_id
WHERE u.email = 'matthewbravo13@gmail.com'
  AND oi.integration_type = 'outlook_user'
ORDER BY oi.created_at DESC;

-- Step 6: Summary
DO $$
DECLARE
  v_outlook_count int;
  v_user_org_id uuid;
  v_user_has_org boolean;
BEGIN
  -- Count Outlook integrations
  SELECT COUNT(*) INTO v_outlook_count
  FROM organization_integrations
  WHERE integration_type = 'outlook_user' AND is_enabled = true;
  
  -- Check user organization
  SELECT organization_id INTO v_user_org_id
  FROM users
  WHERE email = 'matthewbravo13@gmail.com';
  
  v_user_has_org := v_user_org_id IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📅 OUTLOOK CALENDAR STATUS CHECK';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Status:';
  RAISE NOTICE '  - Outlook integrations: %', v_outlook_count;
  RAISE NOTICE '  - User has organization: %', CASE WHEN v_user_has_org THEN 'YES' ELSE 'NO' END;
  RAISE NOTICE '  - User org ID: %', COALESCE(v_user_org_id::text, 'NULL');
  RAISE NOTICE '';
  
  IF v_outlook_count = 0 THEN
    RAISE NOTICE '❌ ISSUE: No Outlook integrations found';
    RAISE NOTICE '   Solution: Connect Outlook from the dashboard';
  ELSIF NOT v_user_has_org THEN
    RAISE NOTICE '❌ ISSUE: User missing organization';
    RAISE NOTICE '   Solution: Run CREATE_USER_ORGANIZATION.sql';
  ELSE
    RAISE NOTICE '✅ Outlook integration exists';
    RAISE NOTICE '   Calendar should sync with real Outlook events';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Next steps:';
  RAISE NOTICE '1. If no Outlook integration: Connect from dashboard';
  RAISE NOTICE '2. If user missing org: Run CREATE_USER_ORGANIZATION.sql';
  RAISE NOTICE '3. Test calendar sync after fixes';
  RAISE NOTICE '';
END $$;
