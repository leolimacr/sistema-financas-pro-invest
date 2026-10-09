import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useAiAgent, type NexusAnalysisBasis, type NexusDecisionObject } from '../../../hooks/useAiAgent';
import { useEntitlement } from '../../../hooks/useEntitlement';
import { useLocation, useNavigate } from 'react-router-dom';
import { getLocalDateString } from '../../../utils/dateHelpers';
import {
  Send,
  PlusCircle,
  Folder,
  Cpu,
  Activity,
  X,
  Trash2,
  Lock,
  AlertTriangle,
  LayoutDashboard,
  TrendingUp,
  Target,
  ChevronRight,
  Sparkles,
  Brain,
  Zap,
  CheckCircle2
} from 'lucide-react';
import {
  saveChatHistory,
  loadUserChatHistory,
  updateChatHistory,
  deleteChatHistory,
  type ChatHistoryItem
} from '../../../services/chatHistoryService';
import { Preferences } from '@capacitor/preferences';
import { NEXUS_COPY } from '../../../theme/fpiVoiceGuide';
import type { Transaction, ActiveAsset, PassiveAsset } from '../../../types';
import type { DebtItem } from '../../../services/debt/debt.types';
import type { Goal } from '../../../services/goalService';

interface AiAdvisorProps {
  transactions: Transaction[];
  currentCalcResult: unknown;
  goals: Goal[];
  assets?: ActiveAsset[];
  passives?: PassiveAsset[];
  debts?: DebtItem[];
  currentTool: string;
}

interface Message {
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
  isIntro?: boolean;
  isSpecialIntro?: boolean;
  isGuided?: boolean;
  analysisBasis?: NexusAnalysisBasis;
  decisionObject?: NexusDecisionObject;
  actions?: Array<{
    id: string;
    label: string;
    route: string;
    icon?: string;
  }>;
}

const formatMarkdown = (text: string) => {
  return text.split('\n').map((line, i) => {
    const formattedLine = line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={j} className="font-black text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    return (
      <p key={i} className={line.trim().startsWith('•') ? 'ml-2 mb-1' : 'mb-3'}>
        {formattedLine}
      </p>
    );
  });
};

const HUB_ACTIONS = [
  {
    group: NEXUS_COPY.hubActions[0].group,
    color: 'border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20',
    headerColor: 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800',
    icon: <AlertTriangle size={14} className="text-rose-600 dark:text-rose-400" />,
    actions: [...NEXUS_COPY.hubActions[0].actions],
  },
  {
    group: NEXUS_COPY.hubActions[1].group,
    color: 'border-sky-200 dark:border-sky-900/50 bg-sky-50 dark:bg-sky-950/20',
    headerColor: 'text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/40 border-sky-200 dark:border-sky-800',
    icon: <LayoutDashboard size={14} className="text-sky-600 dark:text-sky-400" />,
    actions: [...NEXUS_COPY.hubActions[1].actions],
  },
  {
    group: NEXUS_COPY.hubActions[2].group,
    color: 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20',
    headerColor: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800',
    icon: <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />,
    actions: [...NEXUS_COPY.hubActions[2].actions],
  },
  {
    group: NEXUS_COPY.hubActions[3].group,
    color: 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20',
    headerColor: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800',
    icon: <Target size={14} className="text-amber-600 dark:text-amber-400" />,
    actions: [...NEXUS_COPY.hubActions[3].actions],
  },
];

const SECTION_COLORS: Record<string, string> = {
  'diagnóstico':     'bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300',
  'interpretação':   'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300',
  'plano de ação':   'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300',
  'próximos passos': 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300',
  'alertas':         'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300',
};

const SECTION_ICONS: Record<string, React.ReactNode> = {
  'diagnóstico':     <Brain size={14} />,
  'interpretação':   <Sparkles size={14} />,
  'plano de ação':   <Zap size={14} />,
  'próximos passos': <CheckCircle2 size={14} />,
  'alertas':         <AlertTriangle size={14} />,
};

const formatGuidedResponse = (text: string) => {
  const sectionKeys = Object.keys(SECTION_COLORS);
  const regex = new RegExp(
    `\\*{0,2}(${sectionKeys.join('|')})\\*{0,2}[:\\s]*`,
    'gi'
  );

  const parts = text.split(regex).filter(Boolean);
  const blocks: { title: string; content: string }[] = [];

  for (let i = 0; i < parts.length; i++) {
    const lower = parts[i].toLowerCase().trim();
    if (sectionKeys.includes(lower)) {
      blocks.push({ title: lower, content: parts[i + 1]?.trim() || '' });
      i++;
    }
  }

  if (blocks.length === 0) {
    return (
      <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
        {formatMarkdown(text)}
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      {blocks.map((block) => (
        <div
          key={block.title}
          className={`border rounded-xl p-4 ${SECTION_COLORS[block.title]}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span>{SECTION_ICONS[block.title]}</span>
            <span className="text-xs font-black uppercase tracking-widest">
              {block.title}
            </span>
          </div>
          <div className="text-sm leading-relaxed">{formatMarkdown(block.content)}</div>
        </div>
      ))}
    </div>
  );
};

const inferFallbackActions = (text: string) => {
  const lower = text.toLowerCase();
  const actions: Array<{ id: string; label: string; route: string; icon?: string }> = [];
  if (lower.includes('calculadora de dívida') || lower.includes('amortiza') || lower.includes('quitar dívida')) {
    actions.push({ id: 'NAV_DEBT_SIMULATOR', label: 'Calculadora de Dívidas', route: '/app/ferramentas/dividas' });
  } else if (lower.includes('juros compostos') || lower.includes('efeito bola de neve')) {
    actions.push({ id: 'NAV_COMPOUND', label: 'Simulador de Juros Compostos', route: '/app/ferramentas/juros' });
  } else if (lower.includes('independência financeira') || lower.includes('fire')) {
    actions.push({ id: 'NAV_FIRE', label: 'Calculadora FIRE (Independência)', route: '/app/ferramentas/fire' });
  } else if (lower.includes('inflação') || lower.includes('poder de compra')) {
    actions.push({ id: 'NAV_INFLATION', label: 'Ver Impacto da Inflação', route: '/app/ferramentas/inflacao' });
  } else if (lower.includes('dividendo') || lower.includes('renda passiva')) {
    actions.push({ id: 'NAV_DIVIDENDS', label: 'Simulador de Dividendos', route: '/app/ferramentas/dividendos' });
  } else if (lower.includes('à vista') || lower.includes('parcelad') || lower.includes('parcelamento')) {
    actions.push({ id: 'NAV_CASH_VS_INSTALL', label: 'Comparar À Vista ou Parcelado', route: '/app/ferramentas/compra-avista-parcelado' });
  } else if (lower.includes('reserva') || lower.includes('colchão')) {
    actions.push({ id: 'NAV_RESERVE', label: 'Configurar Reserva / Colchão', route: '/app/controla' });
  } else if (lower.includes('meta')) {
    actions.push({ id: 'NAV_GOALS', label: 'Criar / Ajustar Metas', route: '/app/metas' });
  } else if (lower.includes('minhas dívidas') || lower.includes('dívida')) {
    actions.push({ id: 'NAV_DEBTS', label: 'Ver Minhas Dívidas', route: '/app/minhas-dividas' });
  }
  return actions.slice(0, 2);
};

const AiAdvisor: React.FC<AiAdvisorProps> = ({
  transactions = [],
  currentCalcResult = [],
  goals = [],
  assets = [],
  passives = [],
  debts = [],
  currentTool
}) => {
  const { user } = useAuth();
  const { sendToNexus, isLoading: isAiLoading } = useAiAgent();
  const { effectiveTier } = useEntitlement();
  const isPro = effectiveTier !== 'free';
  const isPremium = effectiveTier === 'premium';
  const chatEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const [conversationHistory, setConversationHistory] = useState<ChatHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [dailyCount, setDailyCount] = useState(0);
  const [input, setInput] = useState('');
  const [hubVisible, setHubVisible] = useState(true);
  const [inputExpanded, setInputExpanded] = useState(false);
  const hasProcessedRef = useRef(false);
  const isFromHubRef = useRef(false);

  const FREE_DAILY_LIMIT = 5;

  const getUserName = () => {
    if (user?.displayName) return user.displayName.split(' ')[0];
    const emailName = user?.email ? user.email.split('@')[0] : 'Investidor';
    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
  };

  const capitalizedName = getUserName();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      isSpecialIntro: true,
      text: `Olá, ${capitalizedName}. Eu sou o Nexus, seu consultor inteligente dentro do FPI.\n\nAnaliso sua rotina financeira — entradas, saídas, contas e o que sobra no seu mês — para destacar padrões, sinais e próximos passos com base nos seus dados.\n\nPergunte o que quiser sobre seu dinheiro. Estou aqui para te ajudar a enxergar o que realmente importa.`,
      timestamp: new Date()
    }
  ]);

  const incrementDailyCount = useCallback(async () => {
    if (isPro || isPremium || !user?.uid) return;
    const today = getLocalDateString();
    // Lê o valor atual do storage (não do state) para evitar perda por
    // stale closure em envios rápidos sucessivos.
    const { value } = await Preferences.get({ key: `nexus_count_${user.uid}_${today}` });
    const newCount = (value ? parseInt(value) : 0) + 1;
    setDailyCount(newCount);
    await Preferences.set({
      key: `nexus_count_${user?.uid}_${today}`,
      value: newCount.toString()
    });
  }, [isPro, isPremium, user?.uid]);

  const refreshHistory = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const history = await loadUserChatHistory(user.uid);
      let daysLimit = 3;

      if (isPremium) daysLimit = 90;
      else if (isPro) daysLimit = 30;

      const cutoff = Date.now() - daysLimit * 24 * 60 * 60 * 1000;
      setConversationHistory(history.filter((item) => item.createdAt > cutoff));
    } catch {
      // Histórico indisponível — o chat segue sem ele.
    }
  }, [user?.uid, isPro, isPremium]);

  const saveToHistory = useCallback(async (title: string, messagesToSave: Message[]) => {
    if (messagesToSave.length <= 1 || !user?.uid) return;

    const historyItem: Omit<ChatHistoryItem, 'id'> = {
      userId: user.uid,
      title: title || `Conversa ${new Date().toLocaleDateString()}`,
      messages: messagesToSave.map((msg) => ({
        role: msg.role,
        text: msg.text,
        timestamp: msg.timestamp.getTime()
      })),
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      toolContext: currentTool
    };

    const newChatId = await saveChatHistory(user.uid, historyItem);
    setCurrentChatId(newChatId);
    await refreshHistory();
  }, [user?.uid, currentTool, refreshHistory]);

  const updateCurrentChat = useCallback(async (updatedMessages: Message[]) => {
    if (!currentChatId || !user?.uid) return;

    await updateChatHistory(user.uid, currentChatId, {
      messages: updatedMessages.map((msg) => ({
        role: msg.role,
        text: msg.text,
        timestamp: msg.timestamp.getTime()
      })),
      lastUpdated: Date.now()
    });
  }, [currentChatId, user?.uid]);

  const handleSend = useCallback(async (customText?: unknown) => {
    const rawValue =
      typeof customText === 'string'
        ? customText
        : typeof input === 'string'
        ? input
        : '';

    const textToSend = rawValue.trim();
    if (!textToSend || isAiLoading || !user) return;

    if (!isPro && !isPremium && dailyCount >= FREE_DAILY_LIMIT) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: '**LIMITE DIÁRIO ATINGIDO**\n\nAtualize para o plano Pro para continuar.',
          timestamp: new Date()
        }
      ]);
      return;
    }

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', text: textToSend, timestamp: new Date() }
    ];

    setMessages(newMessages);
    setInput('');
    await incrementDailyCount();

    const response = await sendToNexus(
      textToSend,
      {
        transactions,
        simulations: currentCalcResult,
        goals,
        assets,
        passives,
        debts,
        currentTool
      },
      capitalizedName,
      newMessages
        .filter((m) => !m.isIntro)
        .map((m) => ({ role: m.role, text: m.text })),
      newMessages.length === 2
    );

    if (response) {
      const fallbackActions = (!response.actions || response.actions.length === 0)
        ? inferFallbackActions(response.answer)
        : [];

      const finalActions = (response.actions && response.actions.length > 0)
        ? response.actions
        : fallbackActions;

      const updatedWithAi: Message[] = [
        ...newMessages,
        { 
          role: 'ai', 
          text: response.answer, 
          timestamp: new Date(), 
          isGuided: isFromHubRef.current,
          actions: finalActions,
          analysisBasis: response.analysisBasis,
          decisionObject: response.decisionObject,
        }
      ];
      isFromHubRef.current = false;

      setMessages(updatedWithAi);

      if (!currentChatId) {
        await saveToHistory(`Análise: ${textToSend.substring(0, 20)}...`, updatedWithAi);
      } else {
        await updateCurrentChat(updatedWithAi);
      }
    }
  }, [
    input,
    isAiLoading,
    messages,
    user?.uid,
    dailyCount,
    isPro,
    isPremium,
    transactions,
    currentCalcResult,
    goals,
    assets,
    passives,
    debts,
    currentTool,
    capitalizedName,
    currentChatId,
    incrementDailyCount,
    saveToHistory,
    sendToNexus,
  ]);

  useEffect(() => {
    const state = location.state as { initialPrompt?: string } | null;
    if (state?.initialPrompt && !hasProcessedRef.current && user) {
      hasProcessedRef.current = true;
      setHubVisible(false);
      setInputExpanded(false);
      isFromHubRef.current = true;
      navigate(location.pathname, { replace: true, state: {} });
      handleSend(state.initialPrompt);
    }
  }, [
    location.state,
    user,
    location.pathname,
    navigate,
    handleSend
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiLoading]);

  useEffect(() => {
    const checkLimit = async () => {
      if (!user?.uid) return;
      const today = getLocalDateString();
      const { value } = await Preferences.get({
        key: `nexus_count_${user.uid}_${today}`
      });
      setDailyCount(value ? parseInt(value) : 0);
    };

    checkLimit();
  }, [user]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const loadFromHistory = async (historyItem: ChatHistoryItem) => {
    if (!user?.uid) return;

    const loadedMessages: Message[] = historyItem.messages.map((msg) => ({
      role: msg.role as 'user' | 'ai',
      text: msg.text,
      timestamp: new Date(msg.timestamp)
    }));

    setMessages(loadedMessages);
    setCurrentChatId(historyItem.id || null);
    setIsHistoryOpen(false);
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();

    if (window.confirm('Excluir esta conversa?')) {
      await deleteChatHistory(user!.uid, chatId);
      if (currentChatId === chatId) startNewConversation();
      await refreshHistory();
    }
  };

  const startNewConversation = () => {
    setCurrentChatId(null);
    setHubVisible(true);
    setInputExpanded(false);
    setMessages([
      {
        role: 'ai',
        isSpecialIntro: true,
        text: `Olá, ${capitalizedName}. Eu sou o Nexus, seu consultor inteligente dentro do FPI.\n\nAnaliso sua rotina financeira — entradas, saídas, contas e o que sobra no seu mês — para destacar padrões, sinais e próximos passos com base nos seus dados.\n\nPergunte o que quiser sobre seu dinheiro. Estou aqui para te ajudar a enxergar o que realmente importa.`,
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 relative font-sans">
      <div className="flex items-center justify-between p-4 border-b border-slate-300 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {!hubVisible && (
            <button
              onClick={() => { setHubVisible(true); setInputExpanded(false); }}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-all"
              title="Voltar ao hub"
            >
              <ChevronRight size={20} className="rotate-180" />
            </button>
          )}
          <div className="p-2 bg-sky-100 dark:bg-sky-950/50 rounded-lg border border-sky-300 dark:border-sky-800 shadow-sm">
            <Cpu size={18} className="text-sky-700 dark:text-sky-400" />
          </div>

          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              {NEXUS_COPY.advisorTitle}
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-widest">
                Online
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {!isPro && !isPremium && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] text-slate-700 dark:text-slate-300 font-bold">
                {FREE_DAILY_LIMIT - dailyCount} perguntas hoje
              </span>
            </div>
          )}

          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-all"
          >
            <Folder size={20} />
          </button>

          <button
            onClick={startNewConversation}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-all"
          >
            <PlusCircle size={20} />
          </button>
        </div>
      </div>
      {hubVisible ? (
        <div className="flex-grow overflow-y-auto my-14 px-4 md:px-6 custom-scrollbar bg-slate-50 dark:bg-slate-900">
          <div className="max-w-2xl mx-auto py-4">

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-sky-600 dark:text-sky-400" />
                <span className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-widest">
                  Nexus Guiado
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Olá, {capitalizedName}. Por onde vamos começar hoje?
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Escolha um tema ou escreva sua pergunta diretamente abaixo.
              </p>
            </div>

            <div className="space-y-4">
              {HUB_ACTIONS.map((group) => (
                <div
                  key={group.group}
                  className={`border rounded-2xl overflow-hidden ${group.color}`}
                >
                  <div
                    className={`flex items-center gap-2 px-4 py-2.5 border-b ${group.headerColor}`}
                  >
                    {group.icon}
                    <span className="text-xs font-black uppercase tracking-widest">
                      {group.group}
                    </span>
                  </div>
                  <div className="divide-y divide-white/60 dark:divide-slate-800/60">
                    {group.actions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        disabled={isAiLoading}
                        onClick={() => {
                          isFromHubRef.current = true;
                          setHubVisible(false);
                          handleSend(action);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-slate-800 dark:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-800/70 active:bg-white dark:active:bg-slate-800 transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>{action}</span>
                        <ChevronRight
                          size={14}
                          className="text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors shrink-0 ml-2"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {!inputExpanded && (
              <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6 pb-2">
                Ou clique no campo abaixo para uma pergunta personalizada
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto py-8 px-4 md:p-8 space-y-8 custom-scrollbar bg-slate-50 dark:bg-slate-900">
          {messages.filter((msg) => !msg.isIntro).map((msg: Message, i: number) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.isIntro ? (
                <div className="w-full max-w-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-3xl p-6 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-sky-500 to-transparent"></div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-700/60 p-3 rounded-xl border border-slate-300 dark:border-slate-600">
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase">Usuário</span>
                      <span className="text-xs text-slate-900 dark:text-white font-mono font-semibold">
                        {capitalizedName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800">
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase">Status</span>
                      <div className="flex items-center gap-2">
                        <Activity size={12} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                          CONNECTED
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : msg.isSpecialIntro ? (
                <div className="w-full max-w-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-300 dark:border-sky-800 rounded-2xl p-5 shadow-md text-left">
                  <div className="text-sm text-sky-800 dark:text-sky-200 leading-relaxed font-medium markdown-container">
                    {formatMarkdown(msg.text)}
                  </div>
                </div>
              ) : (
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'max-w-[85%] bg-sky-600 text-white rounded-tr-none'
                      : msg.isGuided
                      ? 'w-full bg-white dark:bg-slate-800 rounded-tl-none border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                      : 'max-w-[85%] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <div className="markdown-container">
                    {msg.isGuided ? formatGuidedResponse(msg.text) : formatMarkdown(msg.text)}
                  </div>

                  {msg.role === 'ai' && msg.decisionObject && (
                    <div className="mt-3 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/30 p-3 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 shadow-sm" aria-label="Objeto de Decisão do Nexus">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-sky-200/60 dark:border-sky-800/40">
                        <span className="font-black uppercase tracking-wider text-[10px] text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                          <Brain size={13} className="text-sky-600 dark:text-sky-400" />
                          Decisão Estratégica
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          msg.decisionObject.confidenceLevel === 'alta'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : msg.decisionObject.confidenceLevel === 'media'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                        }`}>
                          Confiança {msg.decisionObject.confidenceLevel}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white mb-1">
                        {msg.decisionObject.observedFact}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 text-[10px]">
                        <strong>Impacto esperado:</strong> {msg.decisionObject.impact}
                      </p>
                      {msg.decisionObject.invalidatingCondition && (
                        <p className="text-amber-800 dark:text-amber-300 text-[9.5px] mt-1">
                          ⚠️ <em>Condição de invalidação:</em> {msg.decisionObject.invalidatingCondition}
                        </p>
                      )}

                      <details className="group mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/40 text-[10px]">
                        <summary className="cursor-pointer font-bold text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-200 transition-colors list-none flex items-center justify-between">
                          <span>Por que o Nexus disse isso?</span>
                          <span className="text-[9px] group-open:rotate-180 transition-transform">▾</span>
                        </summary>
                        <div className="mt-2 space-y-1.5 text-slate-600 dark:text-slate-400 text-[9.5px] leading-relaxed">
                          <p>
                            <strong className="text-slate-700 dark:text-slate-300">Recorte temporal:</strong> {msg.decisionObject.analyzedPeriod}
                          </p>
                          {msg.decisionObject.sourcesUsed.length > 0 && (
                            <p>
                              <strong className="text-slate-700 dark:text-slate-300">Fontes auditadas:</strong> {msg.decisionObject.sourcesUsed.join(', ')}
                            </p>
                          )}
                          {msg.decisionObject.assumptions.length > 0 && (
                            <div>
                              <strong className="text-slate-700 dark:text-slate-300">Premissas contábeis:</strong>
                              <ul className="list-disc list-inside mt-0.5 space-y-0.5 pl-1">
                                {msg.decisionObject.assumptions.map((assump, aIdx) => (
                                  <li key={aIdx}>{assump}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  )}

                  {msg.role === 'ai' && msg.analysisBasis && (
                    <aside className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 px-3 py-2 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300" aria-label="Base da análise do Nexus">
                      <p className="font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Base da análise</p>
                      <p>{msg.analysisBasis.sources.length > 0 ? `Dados considerados: ${msg.analysisBasis.sources.join(', ')}.` : 'Sem dados financeiros suficientes para um diagnóstico individual.'}</p>
                      <p>Recorte: {msg.analysisBasis.period}.</p>
                      {msg.analysisBasis.limitations.map((limitation) => <p key={limitation} className="mt-1 text-amber-700 dark:text-amber-300">{limitation}</p>)}
                    </aside>
                  )}

                  {msg.role === 'ai' && msg.actions && msg.actions.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
                      {msg.actions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => navigate(action.route)}
                          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white rounded-xl border border-emerald-500/40 hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-950/20 active:scale-95 transition-all text-xs font-black tracking-tight group"
                        >
                          <Sparkles size={13} className="text-amber-400 shrink-0 group-hover:rotate-12 transition-transform" />
                          <span>{action.label}</span>
                          <ChevronRight size={13} className="text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isAiLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-sm flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce [animation-delay:300ms]" />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                  Nexus analisando...
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      )}
      <div className="p-4 md:p-6 bg-white dark:bg-slate-900 border-t border-slate-300 dark:border-slate-800">
        <div className="max-w-4xl mx-auto relative">
          {hubVisible && !inputExpanded ? (
            <button
              onClick={() => setInputExpanded(true)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-600 hover:bg-sky-50 dark:hover:bg-slate-700 rounded-2xl transition-all text-sm text-slate-500 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium"
            >
              <span>Digite uma pergunta personalizada...</span>
              <Send size={16} className="text-slate-500 dark:text-slate-400" />
            </button>
          ) : (
            <>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    if (hubVisible && inputExpanded) {
                      isFromHubRef.current = true;
                      setHubVisible(false);
                      setInputExpanded(false);
                    }
                    handleSend();
                  }
                }}
                placeholder={
              !isPro && !isPremium && dailyCount >= FREE_DAILY_LIMIT
                ? 'Você atingiu o limite diário. Faça upgrade para continuar.'
                : NEXUS_COPY.advisorPlaceholder
            }
            disabled={!isPro && !isPremium && dailyCount >= FREE_DAILY_LIMIT}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-4 pr-14 rounded-2xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950 transition-all text-sm placeholder:text-slate-500 dark:placeholder:text-slate-400 disabled:opacity-50 shadow-sm"
          />

          <button
            onClick={() => {
                  if (hubVisible && inputExpanded) {
                    isFromHubRef.current = true;
                    setHubVisible(false);
                    setInputExpanded(false);
                  }
                  handleSend();
                }}
            disabled={
              isAiLoading ||
              !input.trim() ||
              (!isPro && !isPremium && dailyCount >= FREE_DAILY_LIMIT)
            }
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-sky-600 text-white rounded-xl active:scale-90 transition-all disabled:opacity-50 shadow-sm hover:bg-sky-700"
          >
            {!isPro && !isPremium && dailyCount >= FREE_DAILY_LIMIT ? (
              <Lock size={18} />
            ) : (
              <Send size={18} />
            )}
          </button>
            </>
          )}
        </div>
      </div>

      {isHistoryOpen && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm">
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-50 dark:bg-slate-900 border-l border-slate-300 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
            <div className="p-6 border-b border-slate-300 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
              <h4 className="text-slate-900 dark:text-white font-black text-xs uppercase tracking-widest">
                Suas Conversas
              </h4>

              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-3">
              {conversationHistory.length === 0 ? (
                <div className="flex flex-col items-center text-center mt-10 px-4 gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    <Folder size={18} className="text-slate-500 dark:text-slate-400" />
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 font-black text-sm">Nenhuma conversa ainda</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">Suas conversas com o Nexus ficam salvas aqui para você retomar quando quiser.</p>
                </div>
              ) : (
                conversationHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className={`p-4 border rounded-2xl cursor-pointer group transition-all relative flex justify-between items-center shadow-sm ${
                      currentChatId === item.id
                        ? 'border-sky-500 bg-sky-100 dark:bg-sky-950/50'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <div className="flex-grow overflow-hidden mr-2">
                      <p className="text-slate-900 dark:text-white font-bold text-sm truncate group-hover:text-slate-950 dark:group-hover:text-white">
                        {item.title}
                      </p>
                      <p className="text-[9px] text-slate-600 dark:text-slate-400 mt-1 uppercase font-bold tracking-tighter">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDeleteChat(e, item.id!)}
                      className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiAdvisor;
