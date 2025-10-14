-- Diagnose Outlook Connection Issue
-- Run this in your Supabase SQL Editor to see what's happening

-- Step 1: Find your user
DO $$
DECLARE
  v_user_email TEXT := 'matt@antimatterai.com'; -- Change this to your email
  v_user_id UUID;
  v_org_id UUID;
  v_integration_count INT;
  v_config JSONB;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 DIAGNOSING OUTLOOK CONNECTION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Get user info
  SELECT id, organization_id 
  INTO v_user_id, v_org_id
  FROM users 
  WHERE email = v_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ User not found with email: %', v_user_email;
    RAISE NOTICE 'Update the v_user_email variable at the top of this script';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ User found:';
  RAISE NOTICE '   Email: %', v_user_email;
  RAISE NOTICE '   User ID: %', v_user_id;
  RAISE NOTICE '   Org ID: %', COALESCE(v_org_id::text, v_user_id::text);
  RAISE NOTICE '';
  
  -- Use user ID as org ID if no org_id set
  v_org_id := COALESCE(v_org_id, v_user_id);
  
  -- Check for organization_integrations records
  SELECT COUNT(*), 
         MAX(configuration)
  INTO v_integration_count,
       v_config
  FROM organization_integrations 
  WHERE organization_id = v_org_id 
    AND integration_type = 'outlook_user';
  
  RAISE NOTICE '📊 Integration Records:';
  RAISE NOTICE '   Count: %', v_integration_count;
  RAISE NOTICE '';
  
  IF v_integration_count = 0 THEN
    RAISE NOTICE '❌ NO OUTLOOK INTEGRATION RECORD FOUND';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 This means the OAuth callback failed to save tokens.';
    RAISE NOTICE '   Possible causes:';
    RAISE NOTICE '   1. RLS policy blocking INSERT';
    RAISE NOTICE '   2. Error in callback handler';
    RAISE NOTICE '   3. OAuth flow didn''t complete';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Check Vercel logs at:';
    RAISE NOTICE '   https://vercel.com/[your-project]/logs';
    RAISE NOTICE '   Filter for: /api/outlook/user-callback';
  ELSE
    -- Show integration details
    RAISE NOTICE '✅ Integration record(s) found:';
    RAISE NOTICE '';
    
    FOR rec IN 
      SELECT 
        id,
        is_enabled,
        configuration,
        enabled_at,
        enabled_by,
        created_at
      FROM organization_integrations 
      WHERE organization_id = v_org_id 
        AND integration_type = 'outlook_user'
    LOOP
      RAISE NOTICE '   Record ID: %', rec.id;
      RAISE NOTICE '   Enabled: %', rec.is_enabled;
      RAISE NOTICE '   Created: %', rec.created_at;
      RAISE NOTICE '   Enabled At: %', rec.enabled_at;
      RAISE NOTICE '   Enabled By: %', rec.enabled_by;
      RAISE NOTICE '';
      
      -- Check if user has tokens in config
      IF rec.configuration ? v_user_id::text THEN
        RAISE NOTICE '   ✅ User % HAS TOKENS in configuration', v_user_id;
        
        -- Check token structure
        IF rec.configuration->v_user_id::text ? 'access_token' THEN
          RAISE NOTICE '   ✅ Has access_token';
        ELSE
          RAISE NOTICE '   ❌ Missing access_token';
        END IF;
        
        IF rec.configuration->v_user_id::text ? 'refresh_token' THEN
          RAISE NOTICE '   ✅ Has refresh_token';
        ELSE
          RAISE NOTICE '   ❌ Missing refresh_token';
        END IF;
        
        IF rec.configuration->v_user_id::text ? 'expires_in' THEN
          RAISE NOTICE '   ✅ Has expires_in: %', rec.configuration->v_user_id::text->>'expires_in';
        END IF;
        
        IF rec.configuration->v_user_id::text ? 'scope' THEN
          RAISE NOTICE '   ✅ Scopes: %', rec.configuration->v_user_id::text->>'scope';
        END IF;
      ELSE
        RAISE NOTICE '   ❌ User % NOT FOUND in configuration', v_user_id;
        RAISE NOTICE '   Configuration keys: %', jsonb_object_keys(rec.configuration);
        RAISE NOTICE '';
        RAISE NOTICE '   🔍 This is the problem! Tokens were saved for different user ID.';
      END IF;
      RAISE NOTICE '';
    END LOOP;
  END IF;
  
  -- Check RLS policies
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔒 RLS POLICIES ON organization_integrations:';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  FOR rec IN 
    SELECT 
      polname as policy_name,
      polcmd as command,
      CASE polpermissive
        WHEN TRUE THEN 'PERMISSIVE'
        ELSE 'RESTRICTIVE'
      END as type,
      pg_get_expr(polqual, polrelid) as using_expression,
      pg_get_expr(polwithcheck, polrelid) as with_check
    FROM pg_policy 
    WHERE polrelid = 'organization_integrations'::regclass
    ORDER BY polcmd, polname
  LOOP
    RAISE NOTICE 'Policy: %', rec.policy_name;
    RAISE NOTICE '  Command: %', rec.command;
    RAISE NOTICE '  Type: %', rec.type;
    RAISE NOTICE '  Using: %', rec.using_expression;
    IF rec.with_check IS NOT NULL THEN
      RAISE NOTICE '  With Check: %', rec.with_check;
    END IF;
    RAISE NOTICE '';
  END LOOP;
  
  -- Test if current user can SELECT
  RAISE NOTICE '========================================';
  RAISE NOTICE '🧪 TESTING RLS ACCESS:';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Note: This script runs as service role (bypasses RLS)';
  RAISE NOTICE '   Actual API calls use authenticated user context';
  RAISE NOTICE '';
  
END $$;

