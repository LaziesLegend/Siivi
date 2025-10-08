import { useState, useEffect, useCallback } from 'react';

interface DeviceLimit {
  accountCount: number;
  lastGuestSession: string | null;
  guestSessionsThisWeek: number;
  deviceId: string;
}

const DEVICE_STORAGE_KEY = 'siivi_device_info';
const MAX_ACCOUNTS_PER_DEVICE = 2;
const MAX_GUEST_SESSIONS_PER_WEEK = 1;

export const useDeviceLimit = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceLimit | null>(null);
  const [loading, setLoading] = useState(true);

  const generateDeviceId = useCallback(() => {
    // Create a unique device ID based on browser fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = canvas.toDataURL() + 
      navigator.userAgent + 
      navigator.language + 
      screen.width + 
      screen.height + 
      new Date().getTimezoneOffset();
    
    return btoa(fingerprint).substring(0, 32);
  }, []);

  useEffect(() => {
    const deviceId = generateDeviceId();
    const stored = localStorage.getItem(DEVICE_STORAGE_KEY);
    
    if (stored) {
      try {
        const parsedInfo = JSON.parse(stored);
        setDeviceInfo({ ...parsedInfo, deviceId });
      } catch (error) {
        console.error('Error parsing device info:', error);
        initializeDeviceInfo(deviceId);
      }
    } else {
      initializeDeviceInfo(deviceId);
    }
    
    setLoading(false);
  }, [generateDeviceId]);

  const initializeDeviceInfo = (deviceId: string) => {
    const newInfo: DeviceLimit = {
      accountCount: 0,
      lastGuestSession: null,
      guestSessionsThisWeek: 0,
      deviceId
    };
    setDeviceInfo(newInfo);
    localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(newInfo));
  };

  const incrementAccountCount = useCallback(() => {
    if (!deviceInfo) return false;
    
    if (deviceInfo.accountCount >= MAX_ACCOUNTS_PER_DEVICE) {
      return false;
    }
    
    const updatedInfo = { ...deviceInfo, accountCount: deviceInfo.accountCount + 1 };
    setDeviceInfo(updatedInfo);
    localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(updatedInfo));
    return true;
  }, [deviceInfo]);

  const canCreateGuestSession = useCallback(() => {
    if (!deviceInfo) return false;
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Check if last guest session was more than a week ago
    if (deviceInfo.lastGuestSession) {
      const lastSession = new Date(deviceInfo.lastGuestSession);
      if (lastSession > oneWeekAgo) {
        return false;
      }
    }
    
    return true;
  }, [deviceInfo]);

  const createGuestSession = useCallback(() => {
    if (!deviceInfo || !canCreateGuestSession()) return false;
    
    const now = new Date().toISOString();
    const updatedInfo = { 
      ...deviceInfo, 
      lastGuestSession: now,
      guestSessionsThisWeek: deviceInfo.guestSessionsThisWeek + 1
    };
    
    setDeviceInfo(updatedInfo);
    localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(updatedInfo));
    return true;
  }, [deviceInfo, canCreateGuestSession]);

  const canCreateAccount = useCallback(() => {
    return deviceInfo ? deviceInfo.accountCount < MAX_ACCOUNTS_PER_DEVICE : false;
  }, [deviceInfo]);

  return {
    deviceInfo,
    loading,
    canCreateAccount,
    canCreateGuestSession,
    incrementAccountCount,
    createGuestSession,
    maxAccounts: MAX_ACCOUNTS_PER_DEVICE,
    maxGuestSessions: MAX_GUEST_SESSIONS_PER_WEEK
  };
};