import { firestore } from '../firebase';
import { calcularProximoAporte, diasAteProximoAporte } from '../utils/dateHelpers';
import { doc, deleteDoc } from 'firebase/firestore';
import React, { useEffect, useState, useMemo } from 'react';
import { ContentModal, AssetModal } from './Public/HomeModals';
import { InfiniteTicker } from './Public/MarketComponents';
import { getLatestNews } from '../services/newsService';
import { fetchCurrentSelicRate } from './tools/buy-cash-or-installments/selicService';
import { HomeHero } from './Home/HomeHero';
import { HomeJornada } from './Home/HomeJornada';
import { HomeEcossistema } from './Home/HomeEcossistema';
import { HomeSecoesSuporte } from './Home/HomeSecoesSuporte';
import { HomeCursos } from './Home/HomeCursos';
import { HomeConteudo } from './Home/HomeConteudo';
import { HomeTerminalMercado } from './Home/HomeTerminalMercado';
import { HomeFooter } from './Home/HomeFooter';
import PreAuthModal from './Auth/PreAuthModal';
import { useAuthInterceptor } from '../hooks/useAuthInterceptor';
import { LogOut } from 'lucide-react';
import DownloadQrModal from './DownloadQrModal';

const FIREBASE_FUNCTIONS_BASE_URL = import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL;
const BCB_API_BASE_URL = import.meta.env.VITE_BCB_API_BASE_URL;
const AWESOME_API_URL = 'https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,ETH-BRL,BNB-BRL,SOL-BRL,BTC-USD,ETH-USD,SOL-USD';

const RADAR_NEWS = [
  { id: 1, tag: 'Macroeconomia', date: 'Copom Vigente', title: 'Copom define taxa Selic em 10,75% a.a.', excerpt: 'Com o ciclo monetário em foco, a taxa básica baliza a remuneração de reservas e títulos pós-fixados. Entenda os impactos na sua estratégia.' },
  { id: 2, tag: 'Tecnologia & Carreira', date: 'Tendência', title: 'O avanço da IA e a nova produtividade', excerpt: 'Ferramentas de IA não estão substituindo investidores, mas investidores que usam IA estão superando os que não usam.' },
  { id: 3, tag: 'Mercado Imobiliário', date: 'Análise Setorial', title: 'Aluguel vs Financiamento: O cenário mudou', excerpt: 'Com as novas taxas de juros, a velha regra de "quem casa quer casa" precisa ser recalculada na ponta do lápis.' },
];

export const PublicHome: React.FC<any> = ({ onNavigate, isAuthenticated, userMeta, isPrivacyMode }) => {
  const {
    showPreAuth,
    handleProtectedAction,
    closePreAuth,
    goToLogin,
    goToRegister
  } = useAuthInterceptor(isAuthenticated, onNavigate);

  const [radarNews, setRadarNews] = useState<any[]>(RADAR_NEWS);
  const [patrimonioAtivo] = useState<number>(userMeta?.resumoFinanceiro?.patrimonioAtivo || 0);
  const [patrimonioPassivo] = useState<number>(userMeta?.resumoFinanceiro?.patrimonioPassivo || 0);
  const patrimonioTotal = patrimonioAtivo + patrimonioPassivo;

  // [F2.3.1] Atualização dinâmica da taxa Selic oficial Copom (Bacen Série 432)
  useEffect(() => {
    fetchCurrentSelicRate()
      .then((rate) => {
        if (rate && !isNaN(rate)) {
          setRadarNews((prev) =>
            prev.map((item) =>
              item.id === 1
                ? {
                    ...item,
                    title: `Copom define taxa Selic em ${rate.toFixed(2).replace('.', ',')}% a.a.`,
                    excerpt:
                      'Com o ciclo monetário em foco, a taxa básica baliza a remuneração de reservas e títulos pós-fixados. Entenda os impactos na sua estratégia.',
                  }
                : item
            )
          );
        }
      })
      .catch(() => {
        // Fallback garantido no baseline de 10,75% a.a.
      });
  }, []);

  const [marketData, setMarketData] = useState<any>({ indices: [], stocks: [], currencies: [], cryptos: [], indicators: [] });
  const indicesComIndicadores = useMemo(() => [
    ...(marketData.indices || []),
    ...(marketData.indicators || []),
  ], [marketData.indices, marketData.indicators]);

  const [heroPersona, setHeroPersona] = useState<'dividas' | 'patrimonio'>('dividas');

  useEffect(() => {
    if (!userMeta) return;
    if (userMeta.onboardingPersona === 'patrimonio') setHeroPersona('patrimonio');
    else setHeroPersona('dividas');
  }, [userMeta?.onboardingPersona]);

  const [selectedAsset, setSelectedAsset] = useState<{ symbol: string; category: string } | null>(null);
  const [activeInfoModal, setActiveInfoModal] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [isDownloadQrOpen, setIsDownloadQrOpen] = useState(false);
  const [_showNewsAdmin, setShowNewsAdmin] = useState(false);
  const [newsForm, setNewsForm] = useState({ id: '', title: '', summary: '', content: '', coverImage: '' });

  const handleDownloadAction = () => {
    const isMobileDevice = window.innerWidth < 768;
    if (isMobileDevice) {
      onNavigate('download');
    } else {
      setIsDownloadQrOpen(true);
    }
  };

  const fetchNews = async () => {
    const fetchedNews = await getLatestNews(9);
    if (fetchedNews && fetchedNews.length > 0) setRadarNews(fetchedNews);
  };
  
  useEffect(() => { fetchNews(); }, []);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const [cloudRes, awesomeRes, selic, ipca] = await Promise.all([
          fetch(`${FIREBASE_FUNCTIONS_BASE_URL}/getMarketData`).then(r => r.json()).catch(() => ({ indices: [], stocks: [] })),
          fetch(AWESOME_API_URL).then(r => r.json()).catch(() => ({})),
          fetch(`${BCB_API_BASE_URL}/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json`).then(r => r.json()).catch(() => [{ valor: '10.75' }]),
          fetch(`${BCB_API_BASE_URL}/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json`).then(r => r.json()).catch(() => [{ valor: '4.50' }]),
        ]);

        const formatB = (item: any, type: string) => ({
          symbol: item.symbol === '^BVSP' ? 'IBOV' : (item.symbol === '^GSPC' ? 'S&P 500' : item.symbol),
          price: item.price, change: item.change, up: (item.change || 0) >= 0, type
        });
        const formatC = (symbol: string, raw: any, type: string) => ({
          symbol, price: parseFloat(raw?.bid || 0), change: parseFloat(raw?.pctChange || 0),
          up: parseFloat(raw?.pctChange || 0) >= 0, type
        });

        setMarketData({
          indices: (cloudRes.indices || []).map((i: any) => formatB(i, 'index')),
          stocks:  (cloudRes.stocks  || []).map((i: any) => formatB(i, 'stock')),
          currencies: [
            formatC('USD', awesomeRes.USDBRL, 'currency'),
            formatC('EUR', awesomeRes.EURBRL, 'currency'),
            formatC('GBP', awesomeRes.GBPBRL, 'currency'),
          ].filter(item => item.price > 0),
          cryptos: [
            formatC('BTC/BRL', awesomeRes.BTCBRL, 'crypto'),
            formatC('BTC/USD', awesomeRes.BTCUSD, 'crypto'),
            formatC('ETH/BRL', awesomeRes.ETHBRL, 'crypto'),
            formatC('ETH/USD', awesomeRes.ETHUSD, 'crypto'),
            formatC('SOL/BRL', awesomeRes.SOLBRL, 'crypto'),
            formatC('SOL/USD', awesomeRes.SOLUSD, 'crypto'),
          ].filter(item => item.price > 0),
          indicators: [
            { symbol: 'SELIC', price: selic[0]?.valor + '%', type: 'indicator' },
            { symbol: 'IPCA 12m', price: ipca[0]?.valor + '%', type: 'indicator' },
          ],
        });
      } catch { /* silencioso */ }
    };
    fetchMarket();
    const interval = setInterval(fetchMarket, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteNews = async (id: string) => {
    try {
      await deleteDoc(doc(firestore, 'noticias', id));
      setRadarNews((prev) => prev.filter((news) => news.id !== id));
      alert('Notícia excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir notícia:', error);
      alert('Erro ao excluir a notícia. Tente novamente.');
    }
  };

  const handleNavigationAction = (route: string) => {
    if (route === 'download') {
      handleDownloadAction();
    } else {
      handleProtectedAction(route);
    }
  };

  return (
    <div className="bg-surface-secondary dark:bg-slate-950 flex flex-col overflow-x-hidden font-sans">
      <HomeHero
        isAuthenticated={isAuthenticated}
        onNavigate={handleNavigationAction}
        onStartNow={() => handleProtectedAction('register')}
        isPrivacyMode={isPrivacyMode}
        userMeta={userMeta}
      />

      <InfiniteTicker
        data={{
          indicators: marketData.indicators ?? [],
          indices: marketData.indices ?? [],
          currencies: marketData.currencies ?? [],
          cryptos: marketData.cryptos ?? [],
          stocks: marketData.stocks ?? [],
        }}
      />

      <HomeJornada heroPersona={heroPersona} />

      <HomeEcossistema
        heroPersona={heroPersona}
        onNavigate={handleProtectedAction}
        onStartNow={() => handleProtectedAction('register')}
        isAuthenticated={isAuthenticated}
      />

      <HomeSecoesSuporte
        heroPersona={heroPersona}
        onNavigate={handleNavigationAction}
        onStartNow={() => handleProtectedAction('register')}
        isAuthenticated={isAuthenticated}
      />

      <HomeCursos
        heroPersona={heroPersona}
        setHeroPersona={setHeroPersona}
        setSelectedCourse={setSelectedCourse}
      />

      <HomeConteudo
        heroPersona={heroPersona}
        radarNews={radarNews}
        isAuthenticated={isAuthenticated}
        userMeta={userMeta}
        setSelectedArticle={setSelectedArticle}
        setShowNewsAdmin={setShowNewsAdmin}
        setNewsForm={setNewsForm}
        handleDeleteNews={handleDeleteNews}
      />

      {heroPersona === 'patrimonio' && (
        <HomeTerminalMercado
          marketData={marketData}
          indicesComIndicadores={indicesComIndicadores}
          onSetSelectedAsset={setSelectedAsset}
        />
      )}

      <HomeFooter
        heroPersona={heroPersona}
        isAuthenticated={isAuthenticated}
        onNavigate={handleNavigationAction}
        onStartNow={() => handleProtectedAction('register')}
        setActiveInfoModal={setActiveInfoModal}
      />

      {/* Modais globais */}
      <PreAuthModal
        open={showPreAuth}
        onClose={closePreAuth}
        onCreateAccount={goToRegister}
        onLogin={goToLogin}
      />

      {selectedAsset && (
        <AssetModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
        />
      )}
      {activeInfoModal && (
        <ContentModal
          type={activeInfoModal}
          onClose={() => setActiveInfoModal(null)}
        />
      )}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 md:p-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-8 relative mt-8 mb-8 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
            <button onClick={() => setSelectedArticle(null)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <LogOut size={20} className="text-slate-500 dark:text-slate-400" />
            </button>
            <selectedArticle.component />
          </div>
        </div>
      )}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 md:p-8">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-8 relative mt-8 mb-8 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
            <button onClick={() => setSelectedCourse(null)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <LogOut size={20} className="text-slate-500 dark:text-slate-400" />
            </button>
            <selectedCourse.component />
          </div>
        </div>
      )}

      <DownloadQrModal
        isOpen={isDownloadQrOpen}
        onClose={() => setIsDownloadQrOpen(false)}
      />
    </div>
  );
};

export default PublicHome;
