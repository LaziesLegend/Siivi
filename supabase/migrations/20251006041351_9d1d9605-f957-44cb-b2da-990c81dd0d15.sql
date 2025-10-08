-- Add personality and TTS settings to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS personality_tone TEXT DEFAULT 'casual' CHECK (personality_tone IN ('funny', 'professional', 'casual', 'motivational')),
ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tts_voice TEXT DEFAULT 'alloy';

-- Create conversation_threads table for organizing chats
CREATE TABLE IF NOT EXISTS public.conversation_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'blue',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own threads"
ON public.conversation_threads FOR SELECT
USING (true);

CREATE POLICY "Users can create their own threads"
ON public.conversation_threads FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own threads"
ON public.conversation_threads FOR UPDATE
USING (true);

CREATE POLICY "Users can delete their own threads"
ON public.conversation_threads FOR DELETE
USING (true);

-- Add thread_id to conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.conversation_threads(id) ON DELETE SET NULL;

-- Create reminders table
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reminders"
ON public.reminders FOR ALL
USING (true);

-- Create knowledge_cards table
CREATE TABLE IF NOT EXISTS public.knowledge_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own knowledge cards"
ON public.knowledge_cards FOR ALL
USING (true);

-- Create mood_logs table
CREATE TABLE IF NOT EXISTS public.mood_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mood TEXT NOT NULL CHECK (mood IN ('happy', 'sad', 'anxious', 'calm', 'excited', 'tired', 'stressed', 'content')),
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 5),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own mood logs"
ON public.mood_logs FOR ALL
USING (true);

-- Create drafts table for offline mode
CREATE TABLE IF NOT EXISTS public.drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  draft_type TEXT DEFAULT 'note' CHECK (draft_type IN ('note', 'blog', 'code', 'email')),
  synced BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own drafts"
ON public.drafts FOR ALL
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_threads_user_id ON public.conversation_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_thread_id ON public.conversations(thread_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON public.reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_cards_user_id ON public.knowledge_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_logs_user_id ON public.mood_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_logs_created_at ON public.mood_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON public.drafts(user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_conversation_threads_updated_at
BEFORE UPDATE ON public.conversation_threads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_cards_updated_at
BEFORE UPDATE ON public.knowledge_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drafts_updated_at
BEFORE UPDATE ON public.drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();