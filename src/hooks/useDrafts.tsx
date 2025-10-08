import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useGuestAuth } from './useGuestAuth';
import { useToast } from './use-toast';

export type DraftType = 'note' | 'blog' | 'code' | 'email';

export interface Draft {
  id: string;
  user_id: string;
  title: string;
  content: string;
  type: DraftType;
  synced: boolean;
  created_at: string;
  updated_at: string;
}

export const useDrafts = () => {
  const { user } = useAuth();
  const { guestSession } = useGuestAuth();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [offlineMode, setOfflineMode] = useState(!navigator.onLine);

  const userId = guestSession ? guestSession.id : user?.id;

  useEffect(() => {
    if (userId) {
      fetchDrafts();
    }

    // Handle online/offline status
    const handleOnline = () => {
      setOfflineMode(false);
      syncDrafts();
    };
    const handleOffline = () => setOfflineMode(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [userId]);

  const fetchDrafts = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDrafts((data || []).map(d => ({ ...d, type: d.type as DraftType })));
    } catch (error) {
      console.error('Error fetching drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDraft = async (title: string, content: string, type: DraftType = 'note') => {
    if (!userId) return null;

    const draft = {
      user_id: userId,
      title,
      content,
      type: type,
      synced: !offlineMode,
    };

    try {
      if (offlineMode) {
        // Store in localStorage for offline
        const localDrafts = JSON.parse(localStorage.getItem('offline_drafts') || '[]');
        const newDraft: Draft = { 
          ...draft, 
          id: crypto.randomUUID(), 
          created_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        };
        localDrafts.push(newDraft);
        localStorage.setItem('offline_drafts', JSON.stringify(localDrafts));
        
        setDrafts((prev) => [newDraft, ...prev]);
        toast({
          title: 'Draft saved offline',
          description: 'Will sync when you\'re back online',
        });
        return newDraft;
      }

      const { data, error } = await supabase
        .from('drafts')
        .insert({
          user_id: userId,
          title,
          content,
          type: type,
          synced: !offlineMode
        })
        .select()
        .single();

      if (error) throw error;
      
      const newDraft = { ...data, type: data.type as DraftType };

      setDrafts((prev) => [newDraft, ...prev]);
      toast({
        title: 'Draft created',
        description: `Created: ${title}`,
      });

      return data;
    } catch (error) {
      console.error('Error creating draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to create draft',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateDraft = async (id: string, updates: Partial<Draft>) => {
    try {
      const { error } = await supabase
        .from('drafts')
        .update({ ...updates, synced: !offlineMode })
        .eq('id', id);

      if (error) throw error;

      setDrafts((prev) =>
        prev.map((draft) => (draft.id === id ? { ...draft, ...updates } : draft))
      );
    } catch (error) {
      console.error('Error updating draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to update draft',
        variant: 'destructive',
      });
    }
  };

  const deleteDraft = async (id: string) => {
    try {
      const { error } = await supabase.from('drafts').delete().eq('id', id);

      if (error) throw error;

      setDrafts((prev) => prev.filter((draft) => draft.id !== id));
      toast({
        title: 'Draft deleted',
        description: 'Draft deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete draft',
        variant: 'destructive',
      });
    }
  };

  const syncDrafts = async () => {
    if (offlineMode || !userId) return;

    try {
      const localDrafts = JSON.parse(localStorage.getItem('offline_drafts') || '[]');
      
      if (localDrafts.length === 0) return;

      for (const draft of localDrafts) {
        await supabase.from('drafts').insert({
          user_id: draft.user_id,
          title: draft.title,
          content: draft.content,
          type: draft.type,
          synced: true,
        });
      }

      localStorage.removeItem('offline_drafts');
      fetchDrafts();
      
      toast({
        title: 'Drafts synced',
        description: `Synced ${localDrafts.length} offline drafts`,
      });
    } catch (error) {
      console.error('Error syncing drafts:', error);
    }
  };

  return {
    drafts,
    loading,
    offlineMode,
    createDraft,
    updateDraft,
    deleteDraft,
    syncDrafts,
    refreshDrafts: fetchDrafts,
  };
};