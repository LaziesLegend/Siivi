import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGuestAuth } from '@/hooks/useGuestAuth';

const MESSAGE_COUNTER_KEY = 'siivi_message_counter';
const DONATION_INTERVAL = 5; // Show donation after every 5 messages

interface MessageCounter {
  count: number;
  lastDonationShown: number;
}

export const useMessageCounter = () => {
  const { user } = useAuth();
  const { guestSession } = useGuestAuth();
  const [messageCounter, setMessageCounter] = useState<MessageCounter>({ count: 0, lastDonationShown: 0 });
  const [showDonation, setShowDonation] = useState(false);

  useEffect(() => {
    // Load counter from localStorage
    const stored = localStorage.getItem(MESSAGE_COUNTER_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setMessageCounter(parsed);
      } catch (error) {
        console.error('Error parsing message counter:', error);
      }
    }
  }, []);

  const incrementCounter = useCallback(() => {
    const newCount = messageCounter.count + 1;
    const shouldShowDonation = newCount > 0 && 
      newCount % DONATION_INTERVAL === 0 && 
      newCount !== messageCounter.lastDonationShown;

    const updatedCounter = {
      count: newCount,
      lastDonationShown: shouldShowDonation ? newCount : messageCounter.lastDonationShown
    };

    setMessageCounter(updatedCounter);
    localStorage.setItem(MESSAGE_COUNTER_KEY, JSON.stringify(updatedCounter));

    if (shouldShowDonation) {
      setShowDonation(true);
    }
  }, [messageCounter]);

  const hideDonation = useCallback(() => {
    setShowDonation(false);
  }, []);

  const resetCounter = useCallback(() => {
    const resetCounter = { count: 0, lastDonationShown: 0 };
    setMessageCounter(resetCounter);
    localStorage.setItem(MESSAGE_COUNTER_KEY, JSON.stringify(resetCounter));
  }, []);

  return {
    messageCount: messageCounter.count,
    showDonation,
    incrementCounter,
    hideDonation,
    resetCounter
  };
};