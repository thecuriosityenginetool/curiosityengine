-- Fix remaining issues after nuclear RLS disable
-- Run this in Supabase SQL Editor

-- Step 1: Check if activity_logs table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'activity_logs'
) as activity_logs_exists;

-- Step 2: Create activity_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_title text NOT NULL,
  action_description text,
  metadata jsonb DEFAULT '{}',
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 3: Check Salesforce connection status
SELECT 
  'Salesforce Connection Check' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Salesforce connected'
    ELSE '❌ Salesforce not connected'
  END as status,
  COUNT(*) as connection_count
FROM organization_integrations
WHERE integration_type = 'salesforce_user'
  AND is_enabled = true;

-- Step 4: Check Outlook connection status  
SELECT 
  'Outlook Connection Check' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Outlook connected'
    ELSE '❌ Outlook not connected'
  END as status,
  COUNT(*) as connection_count
FROM organization_integrations
WHERE integration_type = 'outlook_user'
  AND is_enabled = true;

-- Step 5: Show all integrations
SELECT 
  integration_type,
  is_enabled,
  created_at,
  updated_at
FROM organization_integrations
ORDER BY created_at DESC;

-- Step 6: Summary
DO $$
DECLARE
  v_activity_logs_exists boolean;
  v_sf_count int;
  v_outlook_count int;
BEGIN
  -- Check if activity_logs exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'activity_logs'
  ) INTO v_activity_logs_exists;
  
  -- Count Salesforce connections
  SELECT COUNT(*) INTO v_sf_count
  FROM organization_integrations
  WHERE integration_type = 'salesforce_user' AND is_enabled = true;
  
  -- Count Outlook connections
  SELECT COUNT(*) INTO v_outlook_count
  FROM organization_integrations
  WHERE integration_type = 'outlook_user' AND is_enabled = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔧 REMAINING ISSUES FIX';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Status:';
  RAISE NOTICE '  - activity_logs table: %', CASE WHEN v_activity_logs_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '  - Salesforce connections: %', v_sf_count;
  RAISE NOTICE '  - Outlook connections: %', v_outlook_count;
  RAISE NOTICE '';
  
  IF v_sf_count = 0 THEN
    RAISE NOTICE '⚠️  Salesforce: Not connected - need to reconnect';
  ELSE
    RAISE NOTICE '✅ Salesforce: Connected';
  END IF;
  
  IF v_outlook_count = 0 THEN
    RAISE NOTICE '⚠️  Outlook: Not connected - need to reconnect for calendar';
  ELSE
    RAISE NOTICE '✅ Outlook: Connected';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🔄 NEXT STEPS:';
  RAISE NOTICE '1. Refresh dashboard - 500 error should be gone';
  RAISE NOTICE '2. If Salesforce shows disconnected, reconnect it';
  RAISE NOTICE '3. Connect Outlook for calendar sync';
  RAISE NOTICE '4. Test calendar sync and email drafts';
  RAISE NOTICE '';
END $$;
