import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useGuestAuth } from './useGuestAuth';
import { useToast } from './use-toast';

export interface Reminder {
  id: string;
  user_id: string;
  conversation_id?: string;
  title: string;
  description?: string;
  remind_at: string;
  completed: boolean;
  created_at: string;
}

export const useReminders = () => {
  const { user } = useAuth();
  const { guestSession } = useGuestAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = guestSession ? guestSession.id : user?.id;

  useEffect(() => {
    if (userId) {
      fetchReminders();
      checkDueReminders();
    }
  }, [userId]);

  const fetchReminders = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', false)
        .order('remind_at', { ascending: true });

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkDueReminders = () => {
    const interval = setInterval(() => {
      reminders.forEach((reminder) => {
        if (new Date(reminder.remind_at) <= new Date() && !reminder.completed) {
          toast({
            title: '⏰ Reminder',
            description: reminder.title,
            duration: 10000,
          });
          markComplete(reminder.id);
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  };

  const createReminder = async (
    title: string,
    remindAt: Date,
    description?: string,
    conversationId?: string
  ) => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('reminders')
        .insert({
          user_id: userId,
          title,
          description,
          remind_at: remindAt.toISOString(),
          conversation_id: conversationId,
        })
        .select()
        .single();

      if (error) throw error;

      setReminders((prev) => [...prev, data]);
      toast({
        title: 'Reminder created',
        description: `I'll remind you: ${title}`,
      });

      return data;
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to create reminder',
        variant: 'destructive',
      });
      return null;
    }
  };

  const markComplete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ completed: true })
        .eq('id', id);

      if (error) throw error;

      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      const { error } = await supabase.from('reminders').delete().eq('id', id);

      if (error) throw error;

      setReminders((prev) => prev.filter((r) => r.id !== id));
      toast({
        title: 'Reminder deleted',
        description: 'Reminder deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete reminder',
        variant: 'destructive',
      });
    }
  };

  return {
    reminders,
    loading,
    createReminder,
    markComplete,
    deleteReminder,
    refreshReminders: fetchReminders,
  };
};