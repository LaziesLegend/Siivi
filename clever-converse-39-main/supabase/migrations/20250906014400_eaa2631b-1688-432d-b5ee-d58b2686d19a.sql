-- Create deletion notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.deletion_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  guest_session_id text,
  notification_type text NOT NULL, -- 'auto_deletion_warning', 'message_limit_warning'
  scheduled_deletion_at timestamp with time zone,
  sent_at timestamp with time zone DEFAULT now(),
  is_guest boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for deletion_notifications
ALTER TABLE public.deletion_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for deletion_notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.deletion_notifications;
CREATE POLICY "Users can view their own notifications" 
ON public.deletion_notifications 
FOR SELECT 
USING (
  (NOT is_guest AND auth.uid() = user_id) OR 
  (is_guest AND guest_session_id IS NOT NULL)
);

DROP POLICY IF EXISTS "System can create notifications" ON public.deletion_notifications;
CREATE POLICY "System can create notifications" 
ON public.deletion_notifications 
FOR INSERT 
WITH CHECK (true);

-- Create function to check and schedule auto-deletion
CREATE OR REPLACE FUNCTION public.check_auto_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark conversations for deletion (5 days old or 100+ messages in 3 days)
  UPDATE public.conversations 
  SET expires_at = now() + interval '24 hours'
  WHERE expires_at IS NULL 
  AND (
    created_at < now() - interval '5 days' OR
    (message_count >= 100 AND created_at > now() - interval '3 days')
  );
  
  -- Send warnings for conversations expiring in 24 hours
  INSERT INTO public.deletion_notifications (user_id, guest_session_id, notification_type, scheduled_deletion_at, is_guest)
  SELECT 
    c.user_id,
    c.guest_session_id,
    'auto_deletion_warning',
    c.expires_at,
    c.is_guest
  FROM public.conversations c
  WHERE c.expires_at IS NOT NULL 
  AND c.expires_at > now() 
  AND c.expires_at < now() + interval '25 hours'
  AND NOT EXISTS (
    SELECT 1 FROM public.deletion_notifications dn 
    WHERE dn.user_id = c.user_id 
    AND dn.guest_session_id = c.guest_session_id 
    AND dn.notification_type = 'auto_deletion_warning'
    AND dn.sent_at > now() - interval '24 hours'
  );
END;
$$;

-- Create function to perform auto-deletion
CREATE OR REPLACE FUNCTION public.perform_auto_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete expired conversations and their messages
  DELETE FROM public.messages 
  WHERE conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE expires_at IS NOT NULL AND expires_at < now()
  );
  
  DELETE FROM public.conversations 
  WHERE expires_at IS NOT NULL AND expires_at < now();
  
  -- Delete old deletion notifications
  DELETE FROM public.deletion_notifications 
  WHERE sent_at < now() - interval '7 days';
END;
$$;