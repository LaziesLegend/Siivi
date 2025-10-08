import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useGuestAuth } from './useGuestAuth';
import { useToast } from './use-toast';

export interface KnowledgeCard {
  id: string;
  user_id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export const useKnowledgeCards = () => {
  const { user } = useAuth();
  const { guestSession } = useGuestAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = guestSession ? guestSession.id : user?.id;

  useEffect(() => {
    if (userId) {
      fetchCards();
    }
  }, [userId]);

  const fetchCards = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('knowledge_cards')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error('Error fetching knowledge cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCard = async (
    category: string,
    title: string,
    content: string,
    tags: string[] = []
  ) => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('knowledge_cards')
        .insert({
          user_id: userId,
          category,
          title,
          content,
          tags,
        })
        .select()
        .single();

      if (error) throw error;

      setCards((prev) => [data, ...prev]);
      toast({
        title: 'Knowledge card created',
        description: `Added: ${title}`,
      });

      return data;
    } catch (error) {
      console.error('Error creating knowledge card:', error);
      toast({
        title: 'Error',
        description: 'Failed to create knowledge card',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateCard = async (id: string, updates: Partial<KnowledgeCard>) => {
    try {
      const { error } = await supabase
        .from('knowledge_cards')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setCards((prev) =>
        prev.map((card) => (card.id === id ? { ...card, ...updates } : card))
      );

      toast({
        title: 'Knowledge card updated',
        description: 'Card updated successfully',
      });
    } catch (error) {
      console.error('Error updating knowledge card:', error);
      toast({
        title: 'Error',
        description: 'Failed to update knowledge card',
        variant: 'destructive',
      });
    }
  };

  const deleteCard = async (id: string) => {
    try {
      const { error } = await supabase.from('knowledge_cards').delete().eq('id', id);

      if (error) throw error;

      setCards((prev) => prev.filter((card) => card.id !== id));
      toast({
        title: 'Knowledge card deleted',
        description: 'Card deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting knowledge card:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete knowledge card',
        variant: 'destructive',
      });
    }
  };

  const searchCards = (query: string) => {
    return cards.filter(
      (card) =>
        card.title.toLowerCase().includes(query.toLowerCase()) ||
        card.content.toLowerCase().includes(query.toLowerCase()) ||
        card.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
    );
  };

  return {
    cards,
    loading,
    createCard,
    updateCard,
    deleteCard,
    searchCards,
    refreshCards: fetchCards,
  };
};