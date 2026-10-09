import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { HomeConteudo } from './Home/HomeConteudo';
import { HomeTerminalMercado } from './Home/HomeTerminalMercado';
import { InfiniteTicker } from './Public/MarketComponents';
import { AssetModal } from './Public/HomeModals';
import { getLatestNews } from '../services/newsService';
import { fetchMarketQuotes } from '../services/marketService';
import type { MarketQuote } from '../types';
import { TrendingUp, Calculator, Target, BookOpen, ChevronRight, Sparkles, Flame, Percent, Wallet, ShoppingCart } from 'lucide-react';
import { courses } from './Public/Courses';
import { TOOL_ROUTES } from '../hooks/useNavigation';

interface MarketData {
  indices: MarketQuote[];
  stocks: MarketQuote[];
  currencies: MarketQuote[];
  cryptos: MarketQuote[];
  indicators: MarketQuote[];
}

interface ExplorarHubProps {
  onNavigate: (tool: string) => void;
  routerNavigate: (path: string) => void;
}

export const ExplorarHub: React.FC<ExplorarHubProps> = ({ onNavigate, routerNavigate }) => {
  const [radarNews, setRadarNews] = useState<unknown[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<{ component: React.ComponentType } | null>(null);
  const [marketData, setMarketData] = useState<MarketData>({ indices: [], stocks: [], currencies: [], cryptos: [], indicators: [] });
  const [selectedAsset, setSelectedAsset] = useState<{ symbol: string; category: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'todos' | 'ferramentas' | 'cursos'>('todos');

  useEffect(() => {
    getLatestNews(9).then((news) => { if (news) setRadarNews(news); });
    fetchMarketQuotes().then(res => {
        const quotes = res.quotes;
        setMarketData({
            indices: quotes.filter(q => q.category === 'index'),
            stocks: quotes.filter(q => q.category === 'stock'),
            currencies: quotes.filter(q => q.category === 'currency'),
            cryptos: quotes.filter(q => q.category === 'crypto'),
            indicators: quotes.filter(q => q.category === 'indicator'),
        });
    });
  }, []);

  // Metadados de apresentação por ferramenta. A lista renderizada é derivada de
  // TOOL_ROUTES (contrato E6-02): toda rota com prefixo `tool-` ganha exatamente
  // uma entrada navegável; ids futuros sem metadados usam o fallback genérico.
  const TOOL_META: Record<string, { label: string; desc: string; icon: React.ReactNode; color: string; bg: string; image?: string; badge?: string; action?: string }> = {
    'tool-juros': {
      label: 'Juros Compostos',
      desc: 'Simule o crescimento exponencial do seu dinheiro no tempo com aportes mensais.',
      icon: <TrendingUp size={24} />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      image: '/assets/images/tools/juros-compostos-cover.jpg',
      badge: 'Efeito Bola de Neve',
      action: 'Calcular Agora',
    },
    'tool-dividas': {
      label: 'Calculadora de Dívidas',
      desc: 'Elimine anos de juros e descubra o caminho mais rápido para quitar seus débitos.',
      icon: <Calculator size={24} />,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      image: '/assets/images/tools/calculadora-dividas-cover.jpg',
      badge: 'Amortização Estratégica',
      action: 'Calcular Agora',
    },
    'tool-alugar': {
      label: 'Alugar vs Comprar',
      desc: 'Compare o custo real entre morar de aluguel e investir a diferença ou financiar um imóvel.',
      icon: <Target size={24} />,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      image: '/assets/images/tools/alugar-vs-comprar-cover.jpg',
      badge: 'Decisão Imobiliária',
      action: 'Comparar Agora',
    },
    'tool-fire': {
      label: 'Calculadora de Independência Financeira',
      desc: 'Veja quanto tempo você ainda precisa trabalhar para conseguir a sua independência financeira.',
      icon: <Flame size={24} />,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      image: '/assets/images/tools/calculadora-fire-cover.jpg',
      badge: 'Tempo de Trabalho Real',
      action: 'Calcular Agora',
    },
    'tool-inflacao': {
      label: 'Impacto da Inflação',
      desc: 'Calcule a corrosão do poder de compra no tempo e descubra como blindar seu capital.',
      icon: <Percent size={24} />,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      image: '/assets/images/tools/impacto-inflacao-cover.jpg',
      badge: 'Poder de Compra Real',
      action: 'Calcular Agora',
    },
    'tool-dividendos': {
      label: 'Simulador de Dividendos',
      desc: 'Projete a renda passiva da sua carteira e o efeito multiplicador dos proventos mensais.',
      icon: <Wallet size={24} />,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      image: '/assets/images/tools/simulador-dividendos-cover.jpg',
      badge: 'Renda Passiva Mensal',
      action: 'Simular Agora',
    },
    'tool-buy-cash-or-installments': {
      label: 'À Vista ou Parcelado',
      desc: 'Compare pagar agora com desconto ou parcelar sem juros e investir o saldo no CDI.',
      icon: <ShoppingCart size={24} />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      image: '/assets/images/tools/a-vista-ou-parcelado-cover.jpg',
      badge: 'Decisão de Compra',
      action: 'Comparar Agora',
    },
  };

  const TOOL_FALLBACK = {
    label: 'Ferramenta',
    desc: 'Acessar ferramenta.',
    icon: <Sparkles size={24} />,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  };

  const ferramentas = Object.keys(TOOL_ROUTES)
    .filter((id) => id.startsWith('tool-'))
    .map((id) => ({ id, ...(TOOL_META[id] ?? { ...TOOL_FALLBACK, label: id }) }));

  return (
    <>
      <div className="min-h-screen bg-surface-canvas dark:bg-slate-950 text-slate-900 dark:text-white pb-20 pt-20 md:pt-12">
        <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-8 md:space-y-12">
          
          {/* 1. CONVITE (HERO) */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
              <Sparkles size={12} className="fill-slate-400 dark:fill-slate-500" />
              <span className="text-[9px] font-black uppercase tracking-widest">Central de Descoberta</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-950 dark:text-white leading-none">
              Simulação e <br />
              <span className="text-emerald-600 dark:text-emerald-400">Inteligência</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-xl font-medium leading-relaxed">
              Explore cenários, aprofunde seus conhecimentos e acompanhe o mercado com ferramentas desenhadas para sua soberania.
            </p>
          </div>

          {/* FILTROS RÁPIDOS NO EXPLORAR (F5.2.2) */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Filtros da Central de Descoberta">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'todos'}
              onClick={() => setActiveTab('todos')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-2.5 ${
                activeTab === 'todos'
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-md shadow-slate-950/20'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Todos</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'todos' ? 'bg-slate-800 dark:bg-emerald-700 text-emerald-400 dark:text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {ferramentas.length + courses.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ferramentas'}
              onClick={() => setActiveTab('ferramentas')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-2.5 ${
                activeTab === 'ferramentas'
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-md shadow-slate-950/20'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Ferramentas de Decisão</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'ferramentas' ? 'bg-slate-800 dark:bg-emerald-700 text-emerald-400 dark:text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {ferramentas.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'cursos'}
              onClick={() => setActiveTab('cursos')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-2.5 ${
                activeTab === 'cursos'
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-md shadow-slate-950/20'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Formação & Cursos</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'cursos' ? 'bg-slate-800 dark:bg-emerald-700 text-emerald-400 dark:text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {courses.length}
              </span>
            </button>
          </div>

          {/* 2. EXPERIMENTE (FERRAMENTAS) */}
          {(activeTab === 'todos' || activeTab === 'ferramentas') && (
            <section className="space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Ferramentas de Apoio</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {ferramentas.map(f => (
                  <button 
                    key={f.id} 
                    onClick={() => onNavigate(f.id)} 
                    className="group p-6 md:p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-panel shadow-panel text-left hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5 transition-all flex flex-col gap-5 md:gap-6 overflow-hidden relative"
                  >
                    {f.image ? (
                      <div className="relative -mx-6 -mt-6 md:-mx-8 md:-mt-8 mb-1 h-44 sm:h-48 overflow-hidden rounded-t-panel bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                        <img
                          src={f.image}
                          alt={f.label}
                          loading="lazy"
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
                        {f.badge && (
                          <div className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 shadow-sm text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{f.badge}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl ${f.bg} ${f.color} flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm`}>
                        {f.icon}
                      </div>
                    )}
                    <div className="space-y-1.5 md:space-y-2">
                      <span className="block font-black text-lg md:text-xl tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{f.label}</span>
                      <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium leading-snug">{f.desc}</p>
                    </div>
                    <div className="pt-2 md:pt-4 mt-auto flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
                      {f.action || (f.id === 'tool-fire' ? 'Calcular Agora' : 'Acessar')} <ChevronRight size={12} />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 3. APRENDA (TRILHAS) */}
          {(activeTab === 'todos' || activeTab === 'cursos') && (
            <section className="space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Educação e Estratégia</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Trilhas estruturadas para transformar sua mentalidade e patrimônio.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {courses.slice(0, 4).map((curso: typeof courses[number]) => (
                  <button 
                    key={curso.slug} 
                    onClick={() => routerNavigate(`/curso/${curso.slug}`)} 
                    className="group p-6 md:p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-panel shadow-panel text-left hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5 transition-all flex flex-col gap-4 overflow-hidden relative"
                  >
                    {(curso as any).image && (
                      <div className="relative -mx-6 -mt-6 md:-mx-8 md:-mt-8 mb-1 h-44 sm:h-48 overflow-hidden rounded-t-panel bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                        <img
                          src={(curso as any).image}
                          alt={curso.title}
                          loading="lazy"
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
                        {(curso as any).badge && (
                          <div className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/60 shadow-sm text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{(curso as any).badge}</span>
                          </div>
                        )}
                        {(curso as any).duration && (
                          <div className="absolute top-3.5 right-3.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-slate-300 text-[10px] font-bold">
                            <span>⏱️ {(curso as any).duration}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <span className="block font-black text-lg md:text-xl tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                        {curso.title}
                      </span>
                      <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-2">
                        {curso.excerpt}
                      </p>
                    </div>
                    <div className="pt-2 md:pt-4 mt-auto flex items-center justify-between text-xs border-t border-slate-100/80 dark:border-slate-700/80">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {curso.modules} Módulos Práticos
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                        Acessar Trilha <ChevronRight size={12} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 4. CONTEXTO (MERCADO & LEITURAS) */}
          {activeTab === 'todos' && (
            <section className="space-y-8 pt-8 border-t-2 border-slate-300/60 dark:border-slate-700/60 animate-in fade-in duration-300">
              <div className="space-y-2">
                <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Inteligência de Mercado</h2>
                <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm font-medium">Fatos e movimentos que impactam suas decisões.</p>
              </div>

            <div className="space-y-8">
              <div className="bg-white dark:bg-slate-800 rounded-panel border border-slate-200 dark:border-slate-700 overflow-hidden shadow-panel">
                <InfiniteTicker data={marketData} />
                <div className="p-4 md:p-8">
                  <HomeTerminalMercado 
                      marketData={marketData} 
                      indicesComIndicadores={[...marketData.indices, ...marketData.indicators]}
                      onSetSelectedAsset={setSelectedAsset}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight px-1">Radar e Artigos</h3>
                <div className="rounded-section p-2 md:p-3 border border-slate-200 dark:border-slate-700 bg-surface-subtle dark:bg-slate-800">
                  <HomeConteudo 
                    heroPersona="patrimonio" 
                    radarNews={radarNews} 
                    isAuthenticated={true} 
                    userMeta={{}} 
                    setSelectedArticle={setSelectedArticle}
                    setShowNewsAdmin={() => {}} 
                    setNewsForm={() => {}} 
                    handleDeleteNews={() => {}} 
                  />
                </div>
              </div>
            </div>
          </section>
          )}

        {selectedArticle && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 md:p-8">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-4xl w-full p-8 relative mt-8 mb-8 shadow-2xl text-slate-900 dark:text-white">
              <button onClick={() => setSelectedArticle(null)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition-colors">
                Fechar
              </button>
              <selectedArticle.component />
            </div>
          </div>
        )}

        {selectedAsset && ReactDOM.createPortal(
          <AssetModal
            asset={selectedAsset}
            onClose={() => setSelectedAsset(null)}
          />,
          document.body
        )}
      </div>
    </div>
    </>
  );
};
