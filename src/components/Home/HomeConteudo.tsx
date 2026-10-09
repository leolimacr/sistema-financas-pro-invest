import React, { useState } from 'react';
import { Newspaper, TrendingUp, Coins, Landmark, Building2, Globe, ShieldCheck, Users } from 'lucide-react';
import { MarkdownViewer } from '../Public/MarkdownViewer';
import { PixAuditQueueModal } from '../Admin/PixAuditQueueModal';
import { AdminUsersModal } from '../Admin/AdminUsersModal';
import { usePixAudit } from '../../contexts/PixAuditContext';
import { isSystemAdmin } from '../../utils/adminCheck';

interface Props {
  heroPersona: 'dividas' | 'patrimonio';
  radarNews: any[];
  isAuthenticated: boolean;
  userMeta: any;
  setSelectedArticle: (a: any) => void;
  setShowNewsAdmin: (v: boolean) => void;
  setNewsForm: (f: any) => void;
  handleDeleteNews: (id: string) => void;
}

type CategoryStyle = {
  bg: string;
  text: string;
  border: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

export const HomeConteudo: React.FC<Props> = ({ 
  heroPersona, radarNews, isAuthenticated, userMeta, setSelectedArticle, 
  setShowNewsAdmin, setNewsForm, handleDeleteNews 
}) => {
  const [showPixAudit, setShowPixAudit] = useState(false);
  const [showUsersAdmin, setShowUsersAdmin] = useState(false);
  const { pendingCount: pendingPixCount } = usePixAudit();
  const categoryColors: Record<string, CategoryStyle> = {
    'Mercado': { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', Icon: TrendingUp },
    'Economia': { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', Icon: Coins },
    'Política': { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', Icon: Landmark },
    'Empresas': { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', Icon: Building2 },
    'Internacional': { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', Icon: Globe },
  };

  return (
    <section className="bg-surface-secondary dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-24 w-full font-sans">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Newspaper size={20} className="text-blue-600 dark:text-blue-400" />
            {heroPersona === 'dividas' ? 'Leituras para monitorar sua rotina' : 'Leituras para basear suas decisões'}
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {heroPersona === 'dividas' ? 'Contexto para quitação' : 'Contexto estratégico'}
            </span>
            {isAuthenticated && isSystemAdmin(userMeta) && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowPixAudit(true)} 
                  className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 px-3 py-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <ShieldCheck size={13} className="text-amber-600 dark:text-amber-400" /> Auditoria Pix
                  {pendingPixCount > 0 && (
                    <span className="w-4 h-4 bg-amber-600 text-white text-[9px] font-black flex items-center justify-center rounded-full">
                      {pendingPixCount}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setShowUsersAdmin(true)} 
                  className="text-[10px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-700 px-3 py-1 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/50 flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                >
                  <Users size={13} className="text-sky-600 dark:text-sky-400" /> Usuários
                </button>
                <button 
                  onClick={() => setShowNewsAdmin(true)} 
                  className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all shadow-xs cursor-pointer"
                >
                  + Nova notícia
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {radarNews.map((news: any, index: number) => {
            const category = news.tag || news.category || 'Mercado';
            const colors = categoryColors[category] || categoryColors['Mercado'];
            const CategoryIcon = colors.Icon;
            
            return (
              <div 
                key={news.id || index} 
                onClick={() => setSelectedArticle({ component: () => (
                  <div className="artigo-visualizacao text-slate-700 dark:text-slate-200">
                    <header className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-8">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                          {news.category || news.tag}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-bold">{news.date || news.badge}</span>
                      </div>
                      <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight mb-4">{news.title}</h1>
                      {(news.summary || news.excerpt) && (
                        <p className="text-lg text-slate-600 dark:text-slate-300 font-medium mb-6 leading-relaxed border-l-4 border-blue-500 pl-4">
                          {news.summary || news.excerpt}
                        </p>
                      )}
                      {news.coverImage && (
                        <img 
                          src={news.coverImage} 
                          className="w-full h-[450px] object-contain rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl bg-surface-secondary dark:bg-slate-800" 
                          alt="Capa"
                        />
                      )}
                    </header>
                    <div className="max-w-[800px] mx-auto">
                      <div className="prose dark:prose-invert max-w-none">
                        <MarkdownViewer content={news.content} />
                      </div>
                    </div>
                  </div>
                )})}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col h-full shadow-sm"
              >
                <div className="relative w-full h-48 bg-surface-secondary dark:bg-slate-800 overflow-hidden border-b border-slate-200 dark:border-slate-800">
                  {news.coverImage ? (
                    <img 
                      src={news.coverImage} 
                      className="w-full h-full object-cover" 
                      alt="Notícia"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Newspaper size={32} className="text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`${colors.bg} ${colors.text} text-[9px] font-bold uppercase px-2.5 py-1 rounded-lg border ${colors.border} flex items-center gap-1.5`}>
                      <CategoryIcon size={12} />
                      {news.tag || news.category}
                    </span>
                    <div className="flex items-center gap-3">
                      {isAuthenticated && isSystemAdmin(userMeta) && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setNewsForm({ id: news.id, title: news.title, summary: news.summary || '', content: news.content || '', coverImage: news.coverImage || '' }); setShowNewsAdmin(true); }} className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40">Editar</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteNews(news.id); }} className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40">Excluir</button>
                        </>
                      )}
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{news.badge || news.date}</span>
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-3 leading-tight tracking-tight line-clamp-2">
                    {news.title}
                  </h4>
                  
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 mt-auto">
                    {news.summary || news.excerpt}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <PixAuditQueueModal 
        isOpen={showPixAudit} 
        onClose={() => setShowPixAudit(false)} 
      />
      <AdminUsersModal
        isOpen={showUsersAdmin}
        onClose={() => setShowUsersAdmin(false)}
      />
    </section>
  );
};