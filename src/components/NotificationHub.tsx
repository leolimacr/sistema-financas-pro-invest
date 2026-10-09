import React, { useState } from 'react';
import { Bell, X, Sparkles, ChevronRight, CheckCheck, Inbox, History, RefreshCcw, CalendarCheck2, Clock } from 'lucide-react';
import type { NexusEvent } from '../contexts/NotificationContext';
import { useNotifications } from '../contexts/NotificationContext';
import { resolveAppRoute } from '../utils/deepLinkRouter';

export function formatNotificationDateTime(createdAt: any): string {
  if (!createdAt) return '';
  let date: Date | null = null;
  if (typeof createdAt?.toDate === 'function') {
    date = createdAt.toDate();
  } else if (typeof createdAt?.toMillis === 'function') {
    date = new Date(createdAt.toMillis());
  } else if (typeof createdAt?.seconds === 'number') {
    date = new Date(createdAt.seconds * 1000);
  } else if (createdAt instanceof Date) {
    date = createdAt;
  } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
    date = new Date(createdAt);
  }
  if (!date || isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

interface NotificationHubProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  onMarkBillAsPaid?: (billId: string) => Promise<void>;
}

const NotificationHub: React.FC<NotificationHubProps> = ({ isOpen, onClose, onNavigate, onMarkBillAsPaid }) => {
  const { unreadEvents, historyEvents, dismiss, markAllAsRead, loadMoreHistory, hasMoreHistory, loading } = useNotifications();
  const [activeTab, setActiveTab] = useState<'unread' | 'history'>('unread');
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const isRecurringBillEvent = (event: NexusEvent) => event.eventType === 'finance.recurring_bill_due_today';
  const isNexusAdvisorEvent = (event: NexusEvent) => event.eventType === 'nexus.insight_ready';

  if (!isOpen) return null;

  const handleNavigateToEvent = (event: NexusEvent) => {
    const targetRoute = resolveAppRoute(event.deepLink, event.eventType);
    onNavigate(targetRoute);
    if (!event.read) {
      dismiss(event.id);
    }
    onClose();
  };

  const handleCtaAction = async (event: NexusEvent) => {
    if (isRecurringBillEvent(event)) {
      const confirmed = window.confirm('Você tem certeza que este lançamento pode ser registrado como pago? Se confirmar, você pode alterar a qualquer momento.');
      if (!confirmed) return;

      if (onMarkBillAsPaid && event.resourceId) {
        await onMarkBillAsPaid(event.resourceId);
        if (!event.read) {
          await dismiss(event.id);
        }
        onClose();
        return;
      }
    }

    handleNavigateToEvent(event);
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await loadMoreHistory();
    setIsLoadingMore(false);
  };

  const renderEventCard = (event: NexusEvent) => {
    const formattedDate = formatNotificationDateTime(event.createdAt);

    return (
      <div 
        key={event.id}
        onClick={() => handleNavigateToEvent(event)}
        className={`group relative bg-white dark:bg-slate-900 border rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all active:scale-[0.99] overflow-hidden cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 text-left ${
          isRecurringBillEvent(event)
            ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 ring-1 ring-amber-100 dark:ring-amber-900/30'
            : isNexusAdvisorEvent(event)
            ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 ring-1 ring-emerald-100/60 dark:ring-emerald-900/30'
            : 'border-slate-200 dark:border-slate-800'
        } ${
          !event.read && event.urgency === 'high' ? 'border-l-4 border-l-rose-500' : 
          !event.read && event.urgency === 'medium' ? 'border-l-4 border-l-amber-500' : 
          !event.read ? 'border-l-4 border-l-sky-500' : 'opacity-85'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`mt-1 p-2.5 rounded-xl text-white shrink-0 ${
               isRecurringBillEvent(event)
                 ? 'bg-amber-600'
                 : isNexusAdvisorEvent(event)
                 ? 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-md shadow-emerald-500/20'
                 : event.read ? 'bg-slate-400 dark:bg-slate-600' :
                 event.urgency === 'high' ? 'bg-rose-600' : 
                 event.urgency === 'medium' ? 'bg-amber-600' : 
                 'bg-sky-600'
          }`}>
            {isRecurringBillEvent(event) ? <CalendarCheck2 size={18} /> : <Sparkles size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className={`text-sm font-black leading-tight uppercase tracking-tight ${event.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                {event.message.title}
              </h4>
              {isRecurringBillEvent(event) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                  <CalendarCheck2 size={10} /> Pendente
                </span>
              )}
              {isNexusAdvisorEvent(event) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 dark:bg-emerald-900/60 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Sparkles size={10} className="fill-emerald-700 dark:fill-emerald-400" /> Consultor Nexus
                </span>
              )}
            </div>

            {/* Data e Hora de Envio */}
            {formattedDate && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2">
                <Clock size={11} className="shrink-0 text-slate-400 dark:text-slate-500" />
                <span>Enviado em {formattedDate}</span>
              </div>
            )}

            <p className={`text-xs font-medium leading-relaxed mb-4 ${
              isRecurringBillEvent(event)
                ? 'text-amber-900/80 dark:text-amber-200/80'
                : isNexusAdvisorEvent(event)
                ? 'text-slate-700 dark:text-slate-300'
                : 'text-slate-500 dark:text-slate-400'
            }`}>
              {event.message.body}
            </p>
            
            {event.message.ctaLabel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCtaAction(event);
                }}
                className={`mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                  isRecurringBillEvent(event)
                    ? 'text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300'
                    : isNexusAdvisorEvent(event)
                    ? 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300'
                    : 'text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300'
                }`}
              >
                {event.message.ctaLabel}
                <ChevronRight size={14} />
              </button>
            )}

            {/* Botão de Confirmação de Leitura (Aba Entrada) */}
            {!event.read ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(event.id);
                }}
                className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.99] text-white font-black text-[10px] uppercase tracking-wider transition-all shadow-xs"
              >
                <CheckCheck size={14} className="text-emerald-400" />
                <span>Ciente do comunicado</span>
              </button>
            ) : (
              /* Selo de Confirmação de Leitura (Aba Histórico) */
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <CheckCheck size={12} /> Ciente do comunicado
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />

      {/* Drawer */}
      <div className="relative w-full max-w-xl h-screen h-[100dvh] bg-slate-50 dark:bg-slate-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-800">
        
        {/* Header com padding superior seguro contra status bar/bateria no mobile */}
        <div className="bg-white dark:bg-slate-900 px-6 pt-[max(1.75rem,calc(env(safe-area-inset-top)+1rem))] pb-2 border-b border-slate-200 dark:border-slate-800 flex flex-col shadow-sm shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell size={24} className="text-slate-900 dark:text-white" />
                {unreadEvents.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
                    {unreadEvents.length}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Comunicações</h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={onClose}
                className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
                aria-label="Fechar notificações"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('unread')}
              className={`pb-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                activeTab === 'unread' ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Entrada ({unreadEvents.length})
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`pb-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                activeTab === 'history' ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Histórico
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {loading && unreadEvents.length === 0 && historyEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 opacity-50">
              <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-800 border-t-sky-500 rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Buscando atualizações...</p>
            </div>
          ) : activeTab === 'unread' ? (
            <div className="space-y-3">
              {unreadEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-4">
                  <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-800">
                    <Inbox size={40} className="text-slate-200 dark:text-slate-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">Nada novo por aqui</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-6">
                      Suas mensagens lidas estão guardadas no histórico.
                    </p>
                    <button 
                      onClick={() => setActiveTab('history')}
                      className="flex items-center gap-2 mx-auto px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                      <History size={14} /> Acessar Histórico
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4 px-2">
                    <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Não lidas</span>
                    <button 
                      onClick={markAllAsRead}
                      className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                    >
                      <CheckCheck size={12} /> Marcar tudo como lido
                    </button>
                  </div>
                  {unreadEvents.map(renderEventCard)}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {historyEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Nenhum histórico encontrado.</p>
                </div>
              ) : (
                <>
                  {historyEvents.map(renderEventCard)}
                  {hasMoreHistory && (
                    <button 
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="w-full mt-6 py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-300 dark:hover:border-sky-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isLoadingMore ? (
                        <RefreshCcw size={14} className="animate-spin" />
                      ) : (
                        <>Ver mais mensagens</>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
            Finanças Pro Invest · Nexus AI
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationHub;
