-- Fix activity_logs constraint to allow new action types
-- Run this in Supabase SQL Editor

-- Step 1: Check current constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'activity_logs'::regclass 
  AND contype = 'c';

-- Step 2: Drop the existing constraint
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_action_type_check;

-- Step 3: Create a more permissive constraint
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_action_type_check 
  CHECK (action_type IN (
    'login',
    'logout', 
    'profile_update',
    'lead_created',
    'lead_updated',
    'contact_created',
    'contact_updated',
    'email_sent',
    'email_draft_created',
    'calendar_event_created',
    'salesforce_connected',
    'salesforce_disconnected',
    'outlook_connected',
    'outlook_disconnected',
    'integration_connected',
    'integration_disconnected',
    'chat_message',
    'ai_tool_executed',
    'calendar_sync',
    'crm_sync',
    'other'
  ));

-- Step 4: Test the fix by inserting a test record
INSERT INTO activity_logs (
  user_id,
  action_type,
  action_title,
  action_description,
  status
) VALUES (
  (SELECT id FROM users LIMIT 1),
  'outlook_disconnected',
  'Test Outlook Disconnect',
  'Testing constraint fix',
  'completed'
) ON CONFLICT DO NOTHING;

-- Step 5: Clean up test record
DELETE FROM activity_logs 
WHERE action_title = 'Test Outlook Disconnect';

-- Step 6: Summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ACTIVITY LOGS CONSTRAINT FIXED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Allowed action types now include:';
  RAISE NOTICE '  - outlook_disconnected ✅';
  RAISE NOTICE '  - salesforce_disconnected ✅';
  RAISE NOTICE '  - integration_connected ✅';
  RAISE NOTICE '  - integration_disconnected ✅';
  RAISE NOTICE '  - And many more...';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Next steps:';
  RAISE NOTICE '1. Fix Microsoft redirect URI in Azure Portal';
  RAISE NOTICE '2. Try disconnecting/reconnecting Outlook';
  RAISE NOTICE '3. Test calendar sync and email drafts';
  RAISE NOTICE '';
END $$;
