-- 🔍 Outlook Integration Diagnostic Script
-- Run this in Supabase SQL Editor to diagnose Outlook connection issues
-- Replace 'your-email@example.com' with the user's actual email

DO $$
DECLARE
  v_user_email TEXT := 'your-email@example.com'; -- CHANGE THIS
  v_user_id UUID;
  v_org_id UUID;
  v_has_org BOOLEAN;
  v_outlook_count INTEGER;
  v_outlook_enabled BOOLEAN;
  v_has_config BOOLEAN;
  v_has_tokens BOOLEAN;
  v_scopes TEXT;
  v_token_count INTEGER;
BEGIN
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║   OUTLOOK INTEGRATION DIAGNOSTIC                       ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '👤 Checking user: %', v_user_email;
  RAISE NOTICE '─────────────────────────────────────────────────────────';

  -- Step 1: Check if user exists
  SELECT id, organization_id INTO v_user_id, v_org_id
  FROM users
  WHERE email = v_user_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ USER NOT FOUND';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Fix: User needs to sign up at https://www.curiosityengine.io/login';
    RETURN;
  END IF;

  RAISE NOTICE '✅ User found: %', v_user_id;
  
  -- Step 2: Check organization
  IF v_org_id IS NULL THEN
    RAISE NOTICE '❌ USER HAS NO ORGANIZATION';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Fix: Run this command:';
    RAISE NOTICE '';
    RAISE NOTICE 'INSERT INTO organizations (id, name, created_at, updated_at)';
    RAISE NOTICE 'VALUES (''%'', ''My Organization'', NOW(), NOW());', v_user_id;
    RAISE NOTICE '';
    RAISE NOTICE 'UPDATE users SET organization_id = ''%'' WHERE id = ''%'';', v_user_id, v_user_id;
    RAISE NOTICE '';
    v_has_org := FALSE;
  ELSE
    RAISE NOTICE '✅ Organization: %', v_org_id;
    v_has_org := TRUE;
  END IF;

  RAISE NOTICE '─────────────────────────────────────────────────────────';

  -- Step 3: Check for Outlook integration
  IF v_has_org THEN
    SELECT COUNT(*), 
           BOOL_OR(is_enabled),
           BOOL_OR(configuration IS NOT NULL AND configuration != '{}')
    INTO v_outlook_count, v_outlook_enabled, v_has_config
    FROM organization_integrations
    WHERE organization_id = v_org_id
      AND integration_type = 'outlook_user';

    RAISE NOTICE '📊 Outlook Integration Status:';
    RAISE NOTICE '   Records found: %', v_outlook_count;

    IF v_outlook_count = 0 THEN
      RAISE NOTICE '❌ NO OUTLOOK INTEGRATION FOUND';
      RAISE NOTICE '';
      RAISE NOTICE '🔧 Fix: User needs to connect Outlook:';
      RAISE NOTICE '   1. Go to https://www.curiosityengine.io/dashboard';
      RAISE NOTICE '   2. Click Integrations tab';
      RAISE NOTICE '   3. Click Connect for Microsoft Outlook';
      RAISE NOTICE '';
      RAISE NOTICE '⚠️  If connect fails, check:';
      RAISE NOTICE '   - Azure AD redirect URIs are correct';
      RAISE NOTICE '   - Environment variables in Vercel';
      RAISE NOTICE '   - Run: https://www.curiosityengine.io/api/test-ms-oauth';
    ELSIF NOT v_outlook_enabled THEN
      RAISE NOTICE '⚠️  Integration exists but DISABLED';
      RAISE NOTICE '';
      RAISE NOTICE '🔧 Fix: Enable the integration or delete and reconnect:';
      RAISE NOTICE '';
      RAISE NOTICE 'DELETE FROM organization_integrations';
      RAISE NOTICE 'WHERE organization_id = ''%'' AND integration_type = ''outlook_user'';', v_org_id;
    ELSIF NOT v_has_config THEN
      RAISE NOTICE '⚠️  Integration enabled but NO CONFIGURATION';
      RAISE NOTICE '';
      RAISE NOTICE '🔧 Fix: Delete and reconnect:';
      RAISE NOTICE '';
      RAISE NOTICE 'DELETE FROM organization_integrations';
      RAISE NOTICE 'WHERE organization_id = ''%'' AND integration_type = ''outlook_user'';', v_org_id;
    ELSE
      RAISE NOTICE '✅ Integration enabled with configuration';
      
      -- Step 4: Check tokens for this specific user
      SELECT 
        (configuration ? v_user_id::text),
        configuration->v_user_id::text->>'scope'
      INTO v_has_tokens, v_scopes
      FROM organization_integrations
      WHERE organization_id = v_org_id
        AND integration_type = 'outlook_user'
      LIMIT 1;

      IF NOT v_has_tokens THEN
        RAISE NOTICE '❌ NO TOKENS FOR THIS USER';
        RAISE NOTICE '';
        RAISE NOTICE '🔧 Fix: User needs to connect their personal Outlook:';
        RAISE NOTICE '   1. Go to https://www.curiosityengine.io/dashboard';
        RAISE NOTICE '   2. Click Integrations tab';
        RAISE NOTICE '   3. Click Connect for Microsoft Outlook';
      ELSE
        RAISE NOTICE '✅ User has tokens';
        RAISE NOTICE '';
        RAISE NOTICE '📋 Scopes: %', v_scopes;
        RAISE NOTICE '';
        
        -- Check for required scopes
        IF v_scopes IS NULL THEN
          RAISE NOTICE '⚠️  No scopes found in token';
        ELSE
          IF v_scopes LIKE '%Calendars.Read%' THEN
            RAISE NOTICE '   ✅ Calendars.Read';
          ELSE
            RAISE NOTICE '   ❌ Missing Calendars.Read';
          END IF;
          
          IF v_scopes LIKE '%Calendars.ReadWrite%' THEN
            RAISE NOTICE '   ✅ Calendars.ReadWrite';
          ELSE
            RAISE NOTICE '   ❌ Missing Calendars.ReadWrite';
          END IF;
          
          IF v_scopes LIKE '%Mail.Send%' THEN
            RAISE NOTICE '   ✅ Mail.Send';
          ELSE
            RAISE NOTICE '   ❌ Missing Mail.Send';
          END IF;
          
          IF v_scopes LIKE '%Mail.ReadWrite%' THEN
            RAISE NOTICE '   ✅ Mail.ReadWrite';
          ELSE
            RAISE NOTICE '   ❌ Missing Mail.ReadWrite';
          END IF;
          
          IF v_scopes LIKE '%offline_access%' THEN
            RAISE NOTICE '   ✅ offline_access';
          ELSE
            RAISE NOTICE '   ❌ Missing offline_access (refresh token won''t work)';
          END IF;
          
          -- Check if reconnection needed
          IF v_scopes NOT LIKE '%Calendars.Read%' OR v_scopes NOT LIKE '%Calendars.ReadWrite%' THEN
            RAISE NOTICE '';
            RAISE NOTICE '⚠️  CALENDAR SCOPES MISSING - RECONNECTION REQUIRED';
            RAISE NOTICE '';
            RAISE NOTICE '🔧 Fix: Disconnect and reconnect Outlook:';
            RAISE NOTICE '';
            RAISE NOTICE 'DELETE FROM organization_integrations';
            RAISE NOTICE 'WHERE organization_id = ''%'' AND integration_type = ''outlook_user'';', v_org_id;
            RAISE NOTICE '';
            RAISE NOTICE 'Then reconnect from dashboard.';
          END IF;
        END IF;
      END IF;
    END IF;

    RAISE NOTICE '─────────────────────────────────────────────────────────';

    -- Step 5: Check RLS policies
    RAISE NOTICE '🔒 Checking RLS Policies:';
    
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'organization_integrations' 
        AND policyname = 'Service role full access'
    ) THEN
      RAISE NOTICE '   ✅ Service role policy exists';
    ELSE
      RAISE NOTICE '   ❌ Service role policy MISSING';
      RAISE NOTICE '';
      RAISE NOTICE '🔧 Fix: Run FIX_ALL_RLS_ISSUES_SAFE.sql';
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'organization_integrations' 
        AND policyname LIKE '%Users manage own%'
    ) THEN
      RAISE NOTICE '   ✅ User access policy exists';
    ELSE
      RAISE NOTICE '   ⚠️  User access policy might be missing';
    END IF;

    RAISE NOTICE '─────────────────────────────────────────────────────────';

    -- Step 6: Summary and next steps
    RAISE NOTICE '📋 SUMMARY:';
    RAISE NOTICE '';
    
    IF v_outlook_count = 0 THEN
      RAISE NOTICE '❌ Status: NOT CONNECTED';
      RAISE NOTICE '🎯 Action: Connect Outlook from dashboard';
      RAISE NOTICE '📖 Guide: OUTLOOK_FIX_CHECKLIST.md';
    ELSIF NOT v_outlook_enabled OR NOT v_has_config THEN
      RAISE NOTICE '⚠️  Status: BROKEN CONNECTION';
      RAISE NOTICE '🎯 Action: Delete and reconnect';
      RAISE NOTICE '📖 Guide: OUTLOOK_FIX_CHECKLIST.md Task 3.3';
    ELSIF NOT v_has_tokens THEN
      RAISE NOTICE '⚠️  Status: NO USER TOKENS';
      RAISE NOTICE '🎯 Action: User must connect their Outlook';
      RAISE NOTICE '📖 Guide: OUTLOOK_FIX_CHECKLIST.md Task 4.2';
    ELSIF v_scopes NOT LIKE '%Calendars.Read%' THEN
      RAISE NOTICE '⚠️  Status: MISSING CALENDAR PERMISSIONS';
      RAISE NOTICE '🎯 Action: Disconnect and reconnect with new scopes';
      RAISE NOTICE '📖 Guide: OUTLOOK_CALENDAR_FIX.md';
    ELSE
      RAISE NOTICE '✅ Status: FULLY CONNECTED';
      RAISE NOTICE '🎯 Ready to use calendar and email features!';
      RAISE NOTICE '';
      RAISE NOTICE '📝 Test commands:';
      RAISE NOTICE '   - Calendar sync in dashboard';
      RAISE NOTICE '   - AI chat: "What''s on my calendar?"';
      RAISE NOTICE '   - AI chat: "Create an email draft to test@example.com"';
    END IF;

  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║   END OF DIAGNOSTIC                                    ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  
END $$;

-- Show full integration details
SELECT 
  '════════════════════════════════════════════' as separator,
  'FULL INTEGRATION RECORD' as section;

SELECT 
  oi.id,
  oi.organization_id,
  oi.integration_type,
  oi.is_enabled,
  oi.created_at,
  oi.updated_at,
  oi.enabled_at,
  CASE 
    WHEN oi.configuration IS NULL THEN 'NULL'
    WHEN oi.configuration = '{}' THEN 'EMPTY'
    ELSE 'HAS DATA'
  END as config_status,
  jsonb_object_keys(oi.configuration) as user_ids_with_tokens
FROM organization_integrations oi
JOIN users u ON oi.organization_id = u.organization_id
WHERE u.email = 'your-email@example.com' -- CHANGE THIS
  AND oi.integration_type = 'outlook_user';

-- Show config details (without revealing actual tokens)
SELECT 
  '════════════════════════════════════════════' as separator,
  'TOKEN CONFIGURATION STRUCTURE' as section;

SELECT 
  oi.id,
  jsonb_object_keys(oi.configuration) as user_id,
  oi.configuration->jsonb_object_keys(oi.configuration)->>'scope' as scopes,
  CASE 
    WHEN oi.configuration->jsonb_object_keys(oi.configuration)->>'access_token' IS NOT NULL 
    THEN '✓ Present' 
    ELSE '✗ Missing' 
  END as has_access_token,
  CASE 
    WHEN oi.configuration->jsonb_object_keys(oi.configuration)->>'refresh_token' IS NOT NULL 
    THEN '✓ Present' 
    ELSE '✗ Missing' 
  END as has_refresh_token
FROM organization_integrations oi
JOIN users u ON oi.organization_id = u.organization_id
WHERE u.email = 'your-email@example.com' -- CHANGE THIS
  AND oi.integration_type = 'outlook_user'
  AND oi.configuration IS NOT NULL
  AND oi.configuration != '{}';


