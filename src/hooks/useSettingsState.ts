import { useState, useEffect } from 'react';
import { ref, update, onValue } from 'firebase/database';
import { db } from '../firebase';
import type { FinancialProfile } from '../types';

export function useSettingsState(
  user: { uid?: string } | null,
  userMeta: { financialProfile?: FinancialProfile } | null | undefined,
  saveFinancialProfile: (profile: FinancialProfile) => Promise<void>,
) {
  const [nickname, setNickname] = useState('');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState('');

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileProfileForm] = useState<FinancialProfile>({
    monthlyIncome: 0,
    emergencyReserveTarget: 6,
    emergencyReserveCurrent: 0,
    marcoZero: 0,
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (userMeta?.financialProfile) {
      setProfileProfileForm(userMeta.financialProfile);
    }
  }, [userMeta]);

  useEffect(() => {
    if (!user?.uid) return;
    const settingsRef = ref(db, `users/${user.uid}/settings`);
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setNickname(data.nickname || '');
    });
    return () => unsubscribe();
  }, [user]);

  const handleSaveNickname = () => {
    if (!user?.uid) return;
    update(ref(db, `users/${user.uid}/settings`), { nickname: tempNickname });
    setNickname(tempNickname);
    setIsEditingNickname(false);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await saveFinancialProfile(profileForm);
      setIsEditingProfile(false);
      alert("Estratégia CFP atualizada!");
    } catch (_e) {
      alert("Erro ao salvar perfil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return {
    nickname,
    isEditingNickname,
    setIsEditingNickname,
    tempNickname,
    setTempNickname,
    isEditingProfile,
    setIsEditingProfile,
    profileForm,
    setProfileProfileForm,
    isSavingProfile,
    handleSaveNickname,
    handleSaveProfile,
  };
}
