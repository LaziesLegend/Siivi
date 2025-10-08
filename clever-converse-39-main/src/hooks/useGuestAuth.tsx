import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GuestSession {
  id: string;
  expiresAt: Date;
  messageCount: number;
}

const GUEST_SESSION_KEY = 'siivi_guest_session';
const MESSAGE_LIMIT = 20;
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const useGuestAuth = () => {
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedSession = localStorage.getItem(GUEST_SESSION_KEY);
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        session.expiresAt = new Date(session.expiresAt);
        
        if (session.expiresAt > new Date()) {
          setGuestSession(session);
        } else {
          clearExpiredGuestSession(session.id);
        }
      } catch (error) {
        console.error('Error parsing guest session:', error);
        localStorage.removeItem(GUEST_SESSION_KEY);
      }
    }
    setLoading(false);
  }, []);

  const clearExpiredGuestSession = async (sessionId: string) => {
    try {
      await supabase.functions.invoke('clear-guest-data', {
        body: { sessionId },
      });
    } catch (error) {
      console.error('Error clearing expired guest session:', error);
    }
    localStorage.removeItem(GUEST_SESSION_KEY);
  };

  const createGuestSession = async (): Promise<GuestSession> => {
    // Clear any existing guest session first
    if (guestSession) {
      await clearGuestSession();
    }
    
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DURATION);
    
    // Clean up any orphaned guest data
    try {
      const { data: oldProfiles } = await supabase
        .from('profiles')
        .select('id')
        .like('display_name', 'Guest User');
      
      if (oldProfiles && oldProfiles.length > 0) {
        for (const profile of oldProfiles) {
          await supabase.functions.invoke('clear-guest-data', {
            body: { sessionId: profile.id },
          });
        }
      }
    } catch (error) {
      console.error('Error cleaning up old guest sessions:', error);
    }
    
    // Create profile for guest
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: sessionId,
        display_name: 'Guest User',
      });

    if (profileError) {
      console.error('Error creating guest profile:', profileError);
      throw new Error('Failed to create guest session');
    }

    const session: GuestSession = {
      id: sessionId,
      expiresAt,
      messageCount: 0,
    };

    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
    setGuestSession(session);
    
    return session;
  };

  const incrementMessageCount = async () => {
    if (!guestSession) return;

    const updatedSession = {
      ...guestSession,
      messageCount: guestSession.messageCount + 1,
    };

    setGuestSession(updatedSession);
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(updatedSession));
  };

  const clearGuestSession = async () => {
    if (!guestSession) return;

    try {
      await supabase.functions.invoke('clear-guest-data', {
        body: { sessionId: guestSession.id },
      });
    } catch (error) {
      console.error('Error clearing guest session:', error);
    }

    localStorage.removeItem(GUEST_SESSION_KEY);
    setGuestSession(null);
  };

  const isMessageLimitReached = () => {
    return guestSession ? guestSession.messageCount >= MESSAGE_LIMIT : false;
  };

  return {
    guestSession,
    loading,
    createGuestSession,
    incrementMessageCount,
    clearGuestSession,
    isMessageLimitReached,
  };
};
