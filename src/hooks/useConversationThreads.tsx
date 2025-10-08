import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useGuestAuth } from './useGuestAuth';
import { useToast } from './use-toast';

export interface ConversationThread {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export const useConversationThreads = () => {
  const { user } = useAuth();
  const { guestSession } = useGuestAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = guestSession ? guestSession.id : user?.id;

  useEffect(() => {
    if (userId) {
      fetchThreads();
    }
  }, [userId]);

  const fetchThreads = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('conversation_threads')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setThreads(data || []);
    } catch (error) {
      console.error('Error fetching threads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversation threads',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createThread = async (title: string, description?: string, color = 'blue', icon = 'folder') => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('conversation_threads')
        .insert({
          user_id: userId,
          title,
          description,
          color,
          icon,
        })
        .select()
        .single();

      if (error) throw error;

      setThreads((prev) => [data, ...prev]);
      toast({
        title: 'Thread created',
        description: `Created new thread: ${title}`,
      });

      return data;
    } catch (error) {
      console.error('Error creating thread:', error);
      toast({
        title: 'Error',
        description: 'Failed to create thread',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateThread = async (id: string, updates: Partial<ConversationThread>) => {
    try {
      const { error } = await supabase
        .from('conversation_threads')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setThreads((prev) =>
        prev.map((thread) => (thread.id === id ? { ...thread, ...updates } : thread))
      );

      toast({
        title: 'Thread updated',
        description: 'Thread updated successfully',
      });
    } catch (error) {
      console.error('Error updating thread:', error);
      toast({
        title: 'Error',
        description: 'Failed to update thread',
        variant: 'destructive',
      });
    }
  };

  const deleteThread = async (id: string) => {
    try {
      const { error } = await supabase
        .from('conversation_threads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setThreads((prev) => prev.filter((thread) => thread.id !== id));

      toast({
        title: 'Thread deleted',
        description: 'Thread deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting thread:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete thread',
        variant: 'destructive',
      });
    }
  };

  return {
    threads,
    loading,
    createThread,
    updateThread,
    deleteThread,
    refreshThreads: fetchThreads,
  };
};