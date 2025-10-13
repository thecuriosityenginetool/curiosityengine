-- Check Outlook Connection Status
-- Run this in Supabase SQL Editor

-- Replace 'matthewbravo13@gmail.com' with your actual email
DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_outlook_connection jsonb;
  v_scopes text;
BEGIN
  -- Get user info
  SELECT id, organization_id INTO v_user_id, v_org_id
  FROM users
  WHERE email = 'matthewbravo13@gmail.com'
  LIMIT 1;

  RAISE NOTICE '👤 User ID: %', v_user_id;
  RAISE NOTICE '🏢 Organization ID: %', v_org_id;
  RAISE NOTICE '----------------------------------------';

  -- Check for Outlook connection
  SELECT configuration INTO v_outlook_connection
  FROM organization_integrations
  WHERE organization_id = v_org_id
    AND integration_type = 'outlook_user'
    AND is_enabled = true
  LIMIT 1;

  IF v_outlook_connection IS NULL THEN
    RAISE NOTICE '❌ NO OUTLOOK CONNECTION FOUND';
    RAISE NOTICE '📌 Action: Connect Outlook from the dashboard';
  ELSE
    RAISE NOTICE '✅ Outlook connection exists';
    
    -- Extract scopes from the configuration
    -- The configuration structure is: { "user_id": { "access_token": "...", "scope": "..." } }
    SELECT value->>'scope' INTO v_scopes
    FROM jsonb_each(v_outlook_connection)
    LIMIT 1;
    
    RAISE NOTICE '📋 Current Scopes: %', v_scopes;
    RAISE NOTICE '----------------------------------------';
    
    -- Check if calendar scopes are present
    IF v_scopes LIKE '%Calendars.Read%' THEN
      RAISE NOTICE '✅ Has Calendars.Read permission';
    ELSE
      RAISE NOTICE '❌ MISSING Calendars.Read permission';
    END IF;
    
    IF v_scopes LIKE '%Calendars.ReadWrite%' THEN
      RAISE NOTICE '✅ Has Calendars.ReadWrite permission';
    ELSE
      RAISE NOTICE '❌ MISSING Calendars.ReadWrite permission';
    END IF;
    
    RAISE NOTICE '----------------------------------------';
    
    -- Check if reconnection is needed
    IF v_scopes NOT LIKE '%Calendars.Read%' OR v_scopes NOT LIKE '%Calendars.ReadWrite%' THEN
      RAISE NOTICE '🔧 ACTION REQUIRED: RECONNECT OUTLOOK';
      RAISE NOTICE '1. Go to dashboard → Integrations tab';
      RAISE NOTICE '2. Disconnect Outlook (or run the DELETE command below)';
      RAISE NOTICE '3. Connect Outlook again';
      RAISE NOTICE '4. Grant calendar permissions when prompted';
      RAISE NOTICE '';
      RAISE NOTICE 'Or run this command to disconnect:';
      RAISE NOTICE 'DELETE FROM organization_integrations WHERE id = (SELECT id FROM organization_integrations WHERE organization_id = ''%'' AND integration_type = ''outlook_user'' LIMIT 1);', v_org_id;
    ELSE
      RAISE NOTICE '✅ All calendar permissions present!';
      RAISE NOTICE '📅 Calendar sync should work';
      RAISE NOTICE '';
      RAISE NOTICE 'If sync still fails, check:';
      RAISE NOTICE '1. Browser console for errors';
      RAISE NOTICE '2. Outlook calendar has events in next 14 days';
      RAISE NOTICE '3. Token might be expired - try reconnecting';
    END IF;
  END IF;
  
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE '📊 Full integration record:';
END $$;

-- Show the full integration record for inspection
SELECT 
  id,
  organization_id,
  integration_type,
  is_enabled,
  created_at,
  updated_at,
  jsonb_pretty(configuration) as config_formatted
FROM organization_integrations
WHERE organization_id = (
  SELECT organization_id 
  FROM users 
  WHERE email = 'matthewbravo13@gmail.com'
  LIMIT 1
)
AND integration_type LIKE 'outlook%';

