import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useGuestAuth } from './useGuestAuth';
import { useToast } from './use-toast';

export type MoodType = 'happy' | 'sad' | 'anxious' | 'calm' | 'excited' | 'tired' | 'stressed' | 'content';

export interface MoodLog {
  id: string;
  user_id: string;
  mood: MoodType;
  intensity: number;
  note?: string;
  created_at: string;
}

export const useMoodTracking = () => {
  const { user } = useAuth();
  const { guestSession } = useGuestAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = guestSession ? guestSession.id : user?.id;

  useEffect(() => {
    if (userId) {
      fetchLogs();
    }
  }, [userId]);

  const fetchLogs = async (days = 30) => {
    if (!userId) return;

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs((data || []) as MoodLog[]);
    } catch (error) {
      console.error('Error fetching mood logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const logMood = async (mood: MoodType, intensity: number, note?: string) => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('mood_logs')
        .insert({
          user_id: userId,
          mood,
          intensity,
          note,
        })
        .select()
        .single();

      if (error) throw error;

      setLogs((prev) => [data as MoodLog, ...prev]);
      toast({
        title: 'Mood logged',
        description: `You're feeling ${mood} today`,
      });

      return data;
    } catch (error) {
      console.error('Error logging mood:', error);
      toast({
        title: 'Error',
        description: 'Failed to log mood',
        variant: 'destructive',
      });
      return null;
    }
  };

  const getMoodInsights = () => {
    if (logs.length === 0) return null;

    const moodCounts: Record<MoodType, number> = {
      happy: 0,
      sad: 0,
      anxious: 0,
      calm: 0,
      excited: 0,
      tired: 0,
      stressed: 0,
      content: 0,
    };

    logs.forEach((log) => {
      moodCounts[log.mood]++;
    });

    const mostCommonMood = Object.entries(moodCounts).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0] as MoodType;

    const avgIntensity =
      logs.reduce((sum, log) => sum + log.intensity, 0) / logs.length;

    return {
      mostCommonMood,
      avgIntensity: Math.round(avgIntensity * 10) / 10,
      totalLogs: logs.length,
      moodDistribution: moodCounts,
    };
  };

  return {
    logs,
    loading,
    logMood,
    getMoodInsights,
    refreshLogs: fetchLogs,
  };
};