import React, { useState } from 'react';
import { ArrowLeft, Share2 } from 'lucide-react';
import { auth, functions } from '../firebase';
import { deleteUser } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFirebase } from '../hooks/useFirebase';
import { useEntitlement } from '../hooks/useEntitlement';
import { useSettingsState } from '../hooks/useSettingsState';
import { usePresencePreferences } from '../hooks/usePresencePreferences';
import { useSecuritySettings } from '../hooks/useSecuritySettings';
import CommandCalibration from './tools/nexus/CommandCalibration';
import { seedPersonaFromIntent } from '../services/personaService';

import SettingsProfileCard from './settings/SettingsProfileCard';
import SettingsSubscriptionCard from './settings/SettingsSubscriptionCard';
import SettingsSecuritySection from './settings/SettingsSecuritySection';
import SettingsPresenceSection from './settings/SettingsPresenceSection';
import SettingsDangerZone from './settings/SettingsDangerZone';

interface SettingsPageProps {
  onBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { userMeta, saveFinancialProfile, wipeUserData } = useFirebase(user?.uid);
  const { effectiveTier, billingStatus, loading: billingLoading } = useEntitlement();
  const isPro = effectiveTier !== 'free';
  const isPremium = effectiveTier === 'premium';
  const isNative = Capacitor.isNativePlatform();

  const settings = useSettingsState(user, userMeta, saveFinancialProfile);
  const presence = usePresencePreferences(user);
  const security = useSecuritySettings(user);

  const [deleteStep, setDeleteStep] = useState<'idle' | 'checking' | 'blocked_subscription' | 'confirming' | 'deleting' | 'error'>('idle');
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);

  /* ── ESTADO SEGURO PARA EXCLUSÃO ──
   * A conta só pode ser excluída se não houver assinatura ativa.
   * effectiveTier === 'free' significa que não há cobrança em vigor.
   * billingStatus duplica a verificação para capturar inconsistências. */
  const isSafeToDelete = effectiveTier === 'free' && (!billingStatus || billingStatus === 'expired' || billingStatus === 'incomplete');

  /* ── ABRIR PORTAL STRIPE ── */
  const handleOpenPortal = async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const fn = httpsCallable(functions, 'createPortalSession');
      const result = await fn({ returnUrl: window.location.href });
      const data = result.data as { url: string };
      if (isNative) {
        await Browser.open({ url: data.url });
      } else {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao abrir portal de gerenciamento';
      setPortalError(msg);
    } finally {
      setPortalLoading(false);
    }
  };

  /* ── INICIAR FLUXO DE EXCLUSÃO ── */
  const handleDeleteAccount = async () => {
    if (billingLoading) return;
    setDeleteStep('checking');

    if (!isSafeToDelete) {
      setDeleteStep('blocked_subscription');
      return;
    }

    setDeleteStep('confirming');
  };

  /* ── CONFIRMAR E EXECUTAR EXCLUSÃO ── */
  const handleConfirmDelete = async () => {
    setDeleteStep('deleting');
    setDeleteError(null);

    try {
      await wipeUserData();
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
        alert("Sua conta e todos os dados associados foram removidos com sucesso.");
      }
      setDeleteStep('idle');
    } catch (error: unknown) {
      console.error("Erro ao excluir conta:", error);
      if ((error as { code?: string }).code === 'auth/requires-recent-login') {
        setDeleteError("Por segurança, a exclusão de conta exige um login recente. Faça login novamente e tente excluir em seguida.");
        await logout();
      } else {
        setDeleteError("Ocorreu um erro ao tentar excluir sua conta. Tente novamente mais tarde.");
      }
      setDeleteStep('error');
    }
  };

  const resetDeleteFlow = () => {
    setDeleteStep('idle');
    setPortalError(null);
    setDeleteError(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6">
      {/* Header da página */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all shadow-sm active:scale-95"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
            Mais Opções
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
            {isNative ? 'Preferências Mobile' : 'Preferências Web'}
          </p>
        </div>
      </div>

      {/* 1. PERFIL + 2. ASSINATURA (grid 2 colunas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <SettingsProfileCard
          settings={settings}
          user={user}
        />
        <SettingsSubscriptionCard
          isPremium={isPremium}
          isPro={isPro}
          userMeta={userMeta}
          onOpenCalibration={() => setShowCalibration(true)}
          onNavigatePricing={() => navigate('/app/mais/pricing')}
        />
      </div>

      {/* 3. PREFERÊNCIAS & SEGURANÇA */}
      <SettingsSecuritySection
        security={security}
        isNative={isNative}
        isPremium={isPremium}
        onNavigate={navigate}
        onNavigatePricing={() => navigate('/app/mais/pricing')}
      />

      {/* 4. NOTIFICAÇÕES E PRESENÇA */}
      <SettingsPresenceSection
        presence={presence}
      />

      {/* 5. INDICAÇÃO / COMPARTILHAR APP */}
      <div className="rounded-[2rem] border border-sky-200/80 dark:border-slate-800 bg-gradient-to-r from-sky-50/70 via-white to-emerald-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/90 shadow-card p-6 md:p-8 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-sky-600/20 shrink-0">
            <Share2 size={26} />
          </div>
          <div>
            <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Indicar o Finanças Pro Invest
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
              Compartilhe o aplicativo com seus amigos e familiares para que eles também organizem suas finanças com clareza e soberania.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/download')}
          className="w-full md:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 shrink-0"
        >
          <Share2 size={16} /> Ver Página de Download
        </button>
      </div>

      {/* 6. DADOS & ZONA DE RISCO */}
      <SettingsDangerZone
        onClearCache={security.handleClearCache}
        onLogout={logout}
        deleteStep={deleteStep}
        deleteError={deleteError}
        portalLoading={portalLoading}
        portalError={portalError}
        billingLoading={billingLoading}
        onDeleteAccount={handleDeleteAccount}
        onConfirmDelete={handleConfirmDelete}
        onOpenPortal={handleOpenPortal}
        onResetDeleteFlow={resetDeleteFlow}
      />

      {/* Modais */}
      {showCalibration && user?.uid && (
        <CommandCalibration
          userId={user.uid}
          initialAnswers={seedPersonaFromIntent(userMeta?.onboardingPersona || 'geral')}
          onComplete={() => setShowCalibration(false)}
          onClose={() => setShowCalibration(false)}
        />
      )}
    </div>
  );
};

export default SettingsPage;
