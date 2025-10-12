-- Add chats/conversations table for saving user interactions
-- Run this in your Supabase SQL Editor

-- Create chats table
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table (stores individual messages in a chat)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb, -- For storing additional data like LinkedIn URL, analysis type, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON public.chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can create their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can view messages from their chats" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can create messages in their chats" ON public.chat_messages;
DROP POLICY IF EXISTS "Service role has full access to chats" ON public.chats;
DROP POLICY IF EXISTS "Service role has full access to messages" ON public.chat_messages;

-- RLS Policies for chats
CREATE POLICY "Users can view their own chats"
  ON public.chats FOR SELECT
  USING (user_id IN (
    SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Users can create their own chats"
  ON public.chats FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Users can update their own chats"
  ON public.chats FOR UPDATE
  USING (user_id IN (
    SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Users can delete their own chats"
  ON public.chats FOR DELETE
  USING (user_id IN (
    SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'
  ));

-- Service role has full access (for API routes)
CREATE POLICY "Service role has full access to chats"
  ON public.chats FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages from their chats"
  ON public.chat_messages FOR SELECT
  USING (chat_id IN (
    SELECT id FROM public.chats WHERE user_id IN (
      SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'
    )
  ));

CREATE POLICY "Users can create messages in their chats"
  ON public.chat_messages FOR INSERT
  WITH CHECK (chat_id IN (
    SELECT id FROM public.chats WHERE user_id IN (
      SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email'
    )
  ));

-- Service role has full access (for API routes)
CREATE POLICY "Service role has full access to messages"
  ON public.chat_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add trigger to update chats.updated_at when messages are added
CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chats 
  SET updated_at = NOW() 
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chat_updated_at ON public.chat_messages;
CREATE TRIGGER trigger_update_chat_updated_at
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.chats IS 'Stores user conversation threads';
COMMENT ON TABLE public.chat_messages IS 'Stores individual messages within chats';
COMMENT ON COLUMN public.chat_messages.role IS 'Message role: user (from user), assistant (from AI), system (system message)';
COMMENT ON COLUMN public.chat_messages.metadata IS 'Additional context like LinkedIn URL, profile data, analysis type';

