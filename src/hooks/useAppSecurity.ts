import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const LOCK_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const useAppSecurity = (userId?: string, isAuthenticated?: boolean) => {
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isAuthenticated && userId && isNative) {
      checkSecurity();
    } else {
      setIsAppLocked(false);
    }
  }, [isAuthenticated, userId]);

  async function checkSecurity() {
    try {
      const { value: pin } = await Preferences.get({ key: `pin_${userId}` });
      if (pin) {
        setStoredPin(pin);
        const { value: last } = await Preferences.get({ key: `last_auth_${userId}` });
        const elapsed = Date.now() - (last ? parseInt(last) : 0);
        if (elapsed > LOCK_TIMEOUT_MS) {
          setIsAppLocked(true);
        }
      }
    } catch (_e) {
      // Silently fail on security check
    }
  }

  const handleUnlockSuccessRef = useRef<() => Promise<void>>(async () => {});
  handleUnlockSuccessRef.current = async () => {
    if (userId) {
      await Preferences.set({ key: `last_auth_${userId}`, value: Date.now().toString() });
    }
    setIsAppLocked(false);
  };

  const handleUnlockSuccess = useCallback(async () => handleUnlockSuccessRef.current(), []);

  return { isAppLocked, storedPin, handleUnlockSuccess };
};
