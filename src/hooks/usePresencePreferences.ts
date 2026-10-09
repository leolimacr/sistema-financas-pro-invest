import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '../firebase';

export interface PresencePrefs {
  pushEnabled: boolean;
  emailEnabled: boolean;
  intensity: 'essential' | 'balanced' | 'complete';
  topics: { debts: boolean; wealth: boolean; routine: boolean; nexus: boolean };
  allowedHoursStart: number;
  allowedHoursEnd: number;
}

export function usePresencePreferences(user: { uid?: string } | null) {
  const [presencePrefs, setPresencePrefs] = useState<PresencePrefs>({
    pushEnabled: true,
    emailEnabled: true,
    intensity: 'balanced',
    topics: { debts: true, wealth: true, routine: true, nexus: true },
    allowedHoursStart: 8,
    allowedHoursEnd: 21,
  });
  const [savingPresence, setSavingPresence] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const loadPresence = async () => {
      const docRef = doc(firestore, `users/${user.uid}/presencePreferences/config`);
      const snap = await getDoc(docRef);
      if (snap.exists()) setPresencePrefs(snap.data() as PresencePrefs);
    };
    loadPresence();
  }, [user?.uid]);

  const savePresencePrefs = useCallback(async (updated: PresencePrefs) => {
    if (!user?.uid) return;
    setSavingPresence(true);
    try {
      await setDoc(
        doc(firestore, `users/${user.uid}/presencePreferences/config`),
        { ...updated, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        { merge: true },
      );
      setPresencePrefs(updated);
    } finally {
      setSavingPresence(false);
    }
  }, [user?.uid]);

  const toggleTopic = useCallback((key: keyof PresencePrefs['topics']) => {
    const updated = {
      ...presencePrefs,
      topics: { ...presencePrefs.topics, [key]: !presencePrefs.topics[key] },
    };
    savePresencePrefs(updated);
  }, [presencePrefs, savePresencePrefs]);

  return {
    presencePrefs,
    savingPresence,
    savePresencePrefs,
    toggleTopic,
  };
}
