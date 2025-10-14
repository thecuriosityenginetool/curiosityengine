-- Add activity logs table for tracking AI actions
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
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
  )),
  action_title TEXT NOT NULL,
  action_description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status ON public.activity_logs(status);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can create their own activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Service role has full access to activity logs" ON public.activity_logs;

-- RLS Policies
CREATE POLICY "Users can view their own activity logs"
  ON public.activity_logs FOR SELECT
  USING (user_id IN (
    SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Users can create their own activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'
  ));

-- Service role has full access
CREATE POLICY "Service role has full access to activity logs"
  ON public.activity_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.activity_logs IS 'Tracks AI-powered actions performed by the system';
COMMENT ON COLUMN public.activity_logs.action_type IS 'Type of action performed';
COMMENT ON COLUMN public.activity_logs.action_title IS 'Short title of the action (e.g., "Email Draft to John Smith")';
COMMENT ON COLUMN public.activity_logs.action_description IS 'Detailed description of what was done';
COMMENT ON COLUMN public.activity_logs.metadata IS 'Additional context like email content, CRM IDs, etc.';
COMMENT ON COLUMN public.activity_logs.status IS 'Status of the action: completed, failed, or pending';

