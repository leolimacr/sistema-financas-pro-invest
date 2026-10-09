import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { usePresenceEvents } from '../../hooks/usePresenceEvents';

interface Props {
  userId: string | null;
}

export const PresenceAlertsBanner: React.FC<Props> = ({ userId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: events = [] } = usePresenceEvents(userId || undefined);

  const hasAlerts = events.length > 0;

  return (
    <section className="px-4 lg:px-12 mb-4 max-w-[1600px] mx-auto w-full">
      <div className="w-full bg-amber-50 border border-amber-200 rounded-lg py-3 flex flex-col transition-all">
        {/* Barra principal sempre visível */}
        <div 
          className="flex items-center justify-between px-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <span className="text-amber-600 font-bold text-sm">
              {hasAlerts ? `⚠️ ${events.length} alerta(s) pendente(s)` : 'SEUS ALERTAS AQUI'}
            </span>
          </div>
          <ChevronDown 
            size={20} 
            className={`text-amber-700 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
          />
        </div>

        {/* Conteúdo expandido */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-amber-100 space-y-3 px-4">
            {hasAlerts ? (
              events.map((ev) => (
                <div key={ev.eventId} className="text-sm text-slate-700">
                  <p className="font-bold">{ev.message.title}</p>
                  <p className="text-xs text-slate-600">{ev.message.body}</p>
                  {ev.deepLink && (
                    <a href={ev.deepLink} className="text-xs text-amber-700 underline mt-1 inline-block">
                      Ver detalhes
                    </a>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 italic">
                Nenhum alerta no momento. Seus alertas aparecerão aqui quando houver dívidas próximas do vencimento.
              </p>
            )}
          </div>
        )}
      </div>
    </section>

  );
};
