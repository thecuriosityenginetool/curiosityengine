-- ================================================
-- DATABASE VERIFICATION & SETUP SCRIPT
-- Run this in Supabase SQL Editor to verify and fix your database
-- ================================================

-- Step 1: Check if all required tables exist
-- ================================================

DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check for required tables
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'users') THEN
        missing_tables := array_append(missing_tables, 'users');
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'organizations') THEN
        missing_tables := array_append(missing_tables, 'organizations');
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'organization_integrations') THEN
        missing_tables := array_append(missing_tables, 'organization_integrations');
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'chats') THEN
        missing_tables := array_append(missing_tables, 'chats');
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'chat_messages') THEN
        missing_tables := array_append(missing_tables, 'chat_messages');
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'activity_logs') THEN
        missing_tables := array_append(missing_tables, 'activity_logs');
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'linkedin_analyses') THEN
        missing_tables := array_append(missing_tables, 'linkedin_analyses');
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'email_generations') THEN
        missing_tables := array_append(missing_tables, 'email_generations');
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'sales_materials') THEN
        missing_tables := array_append(missing_tables, 'sales_materials');
    END IF;

    -- Report results
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '❌ MISSING TABLES: %', array_to_string(missing_tables, ', ');
        RAISE NOTICE 'Run the appropriate SQL migration files to create these tables.';
    ELSE
        RAISE NOTICE '✅ ALL REQUIRED TABLES EXIST';
    END IF;
END $$;

-- Step 2: Create missing tables if needed
-- ================================================

-- Create chats table if missing
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table if missing
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_logs table if missing
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'email_draft_created',
    'email_sent',
    'crm_lead_enriched',
    'crm_note_added',
    'meeting_scheduled',
    'linkedin_analysis',
    'chat_created',
    'integration_connected',
    'integration_disconnected',
    'crm_contact_created',
    'crm_lead_created',
    'crm_record_updated',
    'crm_task_created',
    'crm_search'
  )),
  action_title TEXT NOT NULL,
  action_description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create indexes for performance
-- ================================================

-- Chats indexes
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON public.chats(updated_at DESC);

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status ON public.activity_logs(status);

-- Step 4: Enable RLS on all tables
-- ================================================

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing restrictive policies
-- ================================================

DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can create their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON public.chats;
DROP POLICY IF EXISTS "Service role has full access to chats" ON public.chats;

DROP POLICY IF EXISTS "Users can view messages from their chats" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can create messages in their chats" ON public.chat_messages;
DROP POLICY IF EXISTS "Service role has full access to chat_messages" ON public.chat_messages;

DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can create their own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Service role has full access to activity logs" ON public.activity_logs;

-- Step 6: Create proper RLS policies
-- ================================================

-- CHATS POLICIES
CREATE POLICY "Service role full access to chats"
  ON public.chats FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own chats"
  ON public.chats FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own chats"
  ON public.chats FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own chats"
  ON public.chats FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own chats"
  ON public.chats FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- CHAT MESSAGES POLICIES
CREATE POLICY "Service role full access to chat_messages"
  ON public.chat_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view messages from own chats"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = chat_messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own chats"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = chat_messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- ACTIVITY LOGS POLICIES
CREATE POLICY "Service role full access to activity_logs"
  ON public.activity_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Step 7: Verify RLS policies are working
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '✅ DATABASE SETUP COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - chats';
    RAISE NOTICE '  - chat_messages';
    RAISE NOTICE '  - activity_logs';
    RAISE NOTICE '';
    RAISE NOTICE 'Indexes created for performance';
    RAISE NOTICE 'RLS policies configured';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Your database is ready for Salesforce AI Chat!';
END $$;

