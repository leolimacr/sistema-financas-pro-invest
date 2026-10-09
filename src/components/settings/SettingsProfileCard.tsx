import React from 'react';
import { User, Pencil, Check, Loader2 } from 'lucide-react';
import type { useSettingsState } from '../../hooks/useSettingsState';

interface SettingsProfileCardProps {
  settings: ReturnType<typeof useSettingsState>;
  user: { email?: string | null } | null;
}

export const SettingsProfileCard: React.FC<SettingsProfileCardProps> = ({
  settings,
  user,
}) => {
  return (
    <div className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card p-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-5">
        <User size={140} />
      </div>
      <div className="flex items-center gap-6 mb-8 relative z-10">
        <div className="w-20 h-20 bg-gradient-to-tr from-sky-600 to-emerald-500 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-md">
          {settings.nickname ? settings.nickname[0].toUpperCase() : user?.email?.[0].toUpperCase()}
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
            Seu Perfil
          </p>
          {settings.isEditingNickname ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.tempNickname}
                onChange={(e) => settings.setTempNickname(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-emerald-500/50 rounded-xl px-4 py-2 text-slate-900 dark:text-white text-sm w-full outline-none focus:border-brand-primaryCta"
                autoFocus
              />
              <button
                onClick={settings.handleSaveNickname}
                className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg"
              >
                <Check size={20} />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 group cursor-pointer"
              onClick={() => {
                settings.setTempNickname(settings.nickname);
                settings.setIsEditingNickname(true);
              }}
            >
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white truncate">
                {settings.nickname || 'Definir...'}
              </h3>
              <Pencil
                size={16}
                className="text-slate-500 dark:text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0"
              />
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate font-medium">{user?.email}</p>
        </div>
      </div>

      {/* Perfil Financeiro */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Perfil Financeiro
          </p>
          {!settings.isEditingProfile && (
            <button
              onClick={() => settings.setIsEditingProfile(true)}
              className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1 hover:text-emerald-500 transition-colors"
            >
              <Pencil size={12} /> Editar
            </button>
          )}
        </div>
        {settings.isEditingProfile ? (
          <div className="space-y-4">
            {[
              { key: 'monthlyIncome', label: 'Renda Mensal (R$)', placeholder: '5000' },
              { key: 'emergencyReserveTarget', label: 'Meta da Reserva de Emergência (R$)', placeholder: '43743' },
              { key: 'colchaoInicialTarget', label: 'Meta do Colchão Emergencial (R$)', placeholder: '15000' },
            ].map(({ key, label, placeholder }) => {
              const currentVal = (settings.profileForm as unknown as Record<string, number | undefined>)[key] ?? '';
              return (
                <div key={key}>
                  <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">{label}</p>
                  <input
                    type="number"
                    value={currentVal}
                    onChange={(e) => settings.setProfileProfileForm({ ...settings.profileForm, [key]: Number(e.target.value) })}
                    placeholder={placeholder}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-brand-primaryCta"
                  />
                </div>
              );
            })}
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              A cobertura da Reserva e do Colchão é calculada automaticamente a partir do seu saldo de caixa do Controla.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => settings.setIsEditingProfile(false)}
                className="flex-1 py-3 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={settings.handleSaveProfile}
                disabled={settings.isSavingProfile}
                className="flex-1 py-3 bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
              >
                {settings.isSavingProfile ? (
                  <><Loader2 size={14} className="animate-spin" /> Salvando</>
                ) : 'Salvar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Renda Mensal</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">R$ {settings.profileForm.monthlyIncome ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Meta da Reserva de Emergência</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">R$ {settings.profileForm.emergencyReserveTarget ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Meta do Colchão Emergencial</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">R$ {settings.profileForm.colchaoInicialTarget ?? 0}</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/60">
              Cobertura da proteção calculada automaticamente pelo saldo de caixa.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsProfileCard;
