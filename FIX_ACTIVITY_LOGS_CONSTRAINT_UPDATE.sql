-- Fix activity_logs constraint to allow missing action types
-- This fixes the 500 error when creating activity logs

-- Drop the existing constraint
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_action_type_check;

-- Add the updated constraint with all required action types
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_action_type_check 
  CHECK (action_type IN (
    'email_draft_created',
    'email_draft_requested',
    'email_sent',
    'crm_lead_enriched',
    'crm_note_added',
    'meeting_scheduled',
    'linkedin_analysis',
    'chat_created',
    'integration_connected',
    'integration_disconnected',
    'salesforce_disconnected',
    'outlook_disconnected'
  ));

-- Test the constraint by trying to insert the previously failing action types
DO $$
BEGIN
  RAISE NOTICE 'Testing constraint with previously failing action types...';
  
  -- Test email_draft_requested
  BEGIN
    INSERT INTO activity_logs (user_id, action_type, action_title, action_description)
    VALUES (
      (SELECT id FROM users LIMIT 1), 
      'email_draft_requested', 
      'Test Draft Request', 
      'Testing constraint fix'
    );
    DELETE FROM activity_logs WHERE action_title = 'Test Draft Request';
    RAISE NOTICE '✅ email_draft_requested: PASSED';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ email_draft_requested: FAILED - %', SQLERRM;
  END;
  
  -- Test salesforce_disconnected
  BEGIN
    INSERT INTO activity_logs (user_id, action_type, action_title, action_description)
    VALUES (
      (SELECT id FROM users LIMIT 1), 
      'salesforce_disconnected', 
      'Test Salesforce Disconnect', 
      'Testing constraint fix'
    );
    DELETE FROM activity_logs WHERE action_title = 'Test Salesforce Disconnect';
    RAISE NOTICE '✅ salesforce_disconnected: PASSED';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ salesforce_disconnected: FAILED - %', SQLERRM;
  END;
  
  -- Test outlook_disconnected
  BEGIN
    INSERT INTO activity_logs (user_id, action_type, action_title, action_description)
    VALUES (
      (SELECT id FROM users LIMIT 1), 
      'outlook_disconnected', 
      'Test Outlook Disconnect', 
      'Testing constraint fix'
    );
    DELETE FROM activity_logs WHERE action_title = 'Test Outlook Disconnect';
    RAISE NOTICE '✅ outlook_disconnected: PASSED';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ outlook_disconnected: FAILED - %', SQLERRM;
  END;
  
  RAISE NOTICE 'Constraint fix completed successfully!';
END $$;
