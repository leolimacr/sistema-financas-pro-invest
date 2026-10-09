import { useState, useEffect, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { NativeBiometric } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

export function useSecuritySettings(user: { uid?: string } | null) {
  const isNative = Capacitor.isNativePlatform();

  const [hasPin, setHasPin] = useState(false);
  const [alwaysAsk, setAlwaysAsk] = useState(false);
  const [useBiometrics, setUseBiometrics] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [startupHome, setStartupHome] = useState<'home' | 'central'>('home');
  const [savingStartupHome, setSavingStartupHome] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const loadLocalSettings = async () => {
      const { value: pin } = await Preferences.get({ key: `pin_${user.uid}` });
      const { value: ask } = await Preferences.get({ key: `always_ask_${user.uid}` });
      const { value: bio } = await Preferences.get({ key: `use_biometrics_${user.uid}` });
      const { value: preferredHome } = await Preferences.get({ key: `app_home_${user.uid}` });
      setHasPin(!!pin);
      setAlwaysAsk(ask === 'true');
      setUseBiometrics(bio === 'true');
      setStartupHome(preferredHome === 'central' ? 'central' : 'home');
    };
    loadLocalSettings();
  }, [user?.uid]);

  const handleToggleAlwaysAsk = useCallback(async () => {
    if (!isNative) return alert("Disponível apenas no App Mobile.");
    if (!hasPin) return setActiveModal('pin');
    const newVal = !alwaysAsk;
    setAlwaysAsk(newVal);
    await Preferences.set({ key: `always_ask_${user?.uid}`, value: String(newVal) });
  }, [isNative, hasPin, alwaysAsk, user?.uid]);

  const handleToggleBiometrics = useCallback(async () => {
    if (!isNative) return alert("Disponível apenas no App Mobile.");
    if (!hasPin) return setActiveModal('pin');
    if (!useBiometrics) {
      try {
        const result = await NativeBiometric.isAvailable();
        if (result.isAvailable) {
          setUseBiometrics(true);
          await Preferences.set({ key: `use_biometrics_${user?.uid}`, value: 'true' });
        } else alert("Biometria não disponível.");
      } catch (_e) { alert("Erro na biometria."); }
    } else {
      setUseBiometrics(false);
      await Preferences.set({ key: `use_biometrics_${user?.uid}`, value: 'false' });
    }
  }, [isNative, hasPin, useBiometrics, user?.uid]);

  const handleStartupHomeChange = useCallback(async (
    next: 'home' | 'central',
    isPremium: boolean,
    handleOpenExternal: (path: string) => void,
  ) => {
    if (!user?.uid) return;
    if (!isNative) return alert("Disponível apenas no App Mobile.");
    if (next === 'central' && !isPremium) {
      handleOpenExternal('/pricing');
      return;
    }
    setSavingStartupHome(true);
    try {
      await Preferences.set({ key: `app_home_${user.uid}`, value: next });
      setStartupHome(next);
    } finally {
      setSavingStartupHome(false);
    }
  }, [user?.uid, isNative]);

  const handleSavePin = useCallback(async () => {
    if (pinInput.length !== 4) return;
    await Preferences.set({ key: `pin_${user?.uid}`, value: pinInput });
    setHasPin(true);
    setPinInput('');
    setActiveModal(null);
    alert("PIN salvo!");
  }, [pinInput, user?.uid]);

  const handlePinKeyPress = useCallback((num: string) => {
    setPinInput(prev => prev.length < 4 ? prev + num : prev);
  }, []);

  const handleClearCache = useCallback(async () => {
    if (window.confirm('Limpar cache local do aplicativo?')) {
      await Preferences.clear();
      window.location.reload();
    }
  }, []);

  return {
    hasPin,
    alwaysAsk,
    useBiometrics,
    activeModal,
    setActiveModal,
    pinInput,
    startupHome,
    savingStartupHome,
    handleToggleAlwaysAsk,
    handleToggleBiometrics,
    handleStartupHomeChange,
    handleSavePin,
    handlePinKeyPress,
    handleClearCache,
  };
}
