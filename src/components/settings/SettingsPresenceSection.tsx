import React from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { FPI_COPY } from '../../theme/fpiVoiceGuide';
import type { usePresencePreferences } from '../../hooks/usePresencePreferences';
import Toggle from './Toggle';

interface SettingsPresenceSectionProps {
  presence: ReturnType<typeof usePresencePreferences>;
}

export const SettingsPresenceSection: React.FC<SettingsPresenceSectionProps> = ({
  presence,
}) => {
  return (
    <div className="rounded-[2rem] border border-slate-200/80 bg-white shadow-card overflow-hidden mb-6">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 rounded-xl">
            <Bell size={18} className="text-teal-600" />
          </div>
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Notificações e Presença
          </h4>
        </div>
        {presence.savingPresence && (
          <Loader2 size={14} className="text-teal-500 animate-spin" />
        )}
      </div>

      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Canais */}
          <div className="space-y-0 divide-y divide-slate-100">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pb-3">Canais</p>
            <div className="py-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-slate-900">Notificações Push</p>
                <p className="text-xs text-slate-500">Avisos no dispositivo</p>
              </div>
              <Toggle
                active={presence.presencePrefs.pushEnabled}
                onClick={() =>
                  presence.savePresencePrefs({
                    ...presence.presencePrefs,
                    pushEnabled: !presence.presencePrefs.pushEnabled,
                  })
                }
              />
            </div>
            <div className="py-4 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-slate-900">Resumos por Email</p>
                <p className="text-xs text-slate-500">Digest semanal e revisões</p>
              </div>
              <Toggle
                active={presence.presencePrefs.emailEnabled}
                onClick={() =>
                  presence.savePresencePrefs({
                    ...presence.presencePrefs,
                    emailEnabled: !presence.presencePrefs.emailEnabled,
                  })
                }
              />
            </div>
          </div>

          {/* Temas */}
          <div className="space-y-0 divide-y divide-slate-100">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pb-3">Temas</p>
            {(
              [
                { key: 'debts' as const, label: 'Dívidas', desc: 'Vencimentos e plano' },
                { key: 'wealth' as const, label: 'Patrimônio', desc: 'Metas e aportes' },
                { key: 'routine' as const, label: 'Rotina', desc: FPI_COPY.settingsRoutine },
                { key: 'nexus' as const, label: 'Nexus', desc: 'Insights e análises' },
              ]
            ).map(({ key, label, desc }) => (
              <div key={key} className="py-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-slate-900">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <Toggle
                  active={presence.presencePrefs.topics[key]}
                  onClick={() => presence.toggleTopic(key)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Frequência de Insights */}
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Frequência de Insights</p>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { value: 'essential' as const, label: 'Essencial', desc: 'Só urgências' },
                { value: 'balanced' as const, label: 'Equilibrado', desc: 'Urgências + lembretes úteis' },
                { value: 'complete' as const, label: 'Completo', desc: 'Tudo + insights Nexus' },
              ]
            ).map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => presence.savePresencePrefs({ ...presence.presencePrefs, intensity: value })}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  presence.presencePrefs.intensity === value
                    ? 'border-teal-500 bg-teal-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <p className={`text-sm font-black ${presence.presencePrefs.intensity === value ? 'text-teal-700' : 'text-slate-800'}`}>
                  {label}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 leading-tight">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPresenceSection;
