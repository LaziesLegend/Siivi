-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.check_auto_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix perform_auto_deletion function
CREATE OR REPLACE FUNCTION public.perform_auto_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;