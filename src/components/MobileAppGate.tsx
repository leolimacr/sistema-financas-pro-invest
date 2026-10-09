import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Smartphone, Download, CheckCircle2, BarChart3, ExternalLink, X, ShieldCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface MobileAppGateProps {
  isMobileBrowser: boolean;
  isAuthenticated: boolean;
}

const SESSION_KEY = 'fpi-mobile-web-dismissed';

export const MobileAppGate: React.FC<MobileAppGateProps> = ({
  isMobileBrowser,
  isAuthenticated,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(true);

  // Calcula rota alvo (preserva redirect se vier de tela de login deslogada)
  const targetPath = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const redirectParam = searchParams.get('redirect');
    if (redirectParam) {
      return redirectParam;
    }
    return `${location.pathname}${location.search}${location.hash}`;
  }, [location.pathname, location.search, location.hash]);

  // Identifica se a intenção do usuário é visualizar relatório financeiro
  const isReportTarget = useMemo(() => {
    return (
      targetPath.includes('dashboard') ||
      targetPath.includes('relatorio') ||
      targetPath.includes('relatório') ||
      targetPath.includes('resumo') ||
      targetPath.includes('fechamento') ||
      location.search.includes('email_weekly_summary') ||
      location.search.includes('email_monthly_close')
    );
  }, [targetPath, location.search]);

  useEffect(() => {
    if (!isMobileBrowser) {
      setDismissed(true);
      return;
    }

    const isDismissed = sessionStorage.getItem(SESSION_KEY);
    if (isDismissed) {
      setDismissed(true);
      return;
    }

    const isPublicDiscoveryPath =
      location.pathname === '/' ||
      location.pathname.startsWith('/ferramentas') ||
      location.pathname.startsWith('/artigos') ||
      location.pathname.startsWith('/termos') ||
      location.pathname.startsWith('/privacidade') ||
      location.pathname.startsWith('/download');

    if (isPublicDiscoveryPath && !isAuthenticated) {
      setDismissed(true);
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const redirectParam = searchParams.get('redirect');
    const isEmailOrDeepLink =
      location.search.includes('origin=email') ||
      location.search.includes('source=email') ||
      !!redirectParam ||
      location.pathname.startsWith('/app/');

    // Exibe quando autenticado no web ou quando vindo diretamente de um link de e-mail/deep link
    if (isAuthenticated || isEmailOrDeepLink) {
      setDismissed(false);
    } else {
      setDismissed(true);
    }
  }, [isMobileBrowser, isAuthenticated, location.search, location.pathname]);

  const handleOpenInApp = useCallback((isAuto = false) => {
    const isAndroid = /android/i.test(navigator.userAgent);
    const cleanPath = targetPath.replace(/^\/+/, '');
    const directSchemeUri = `financaspro://${cleanPath}`;

    if (isAndroid) {
      // Intent URI padrão do Chrome Android vinculando explicitamente ao pacote corporativo
      const intentUri = `intent://${cleanPath}#Intent;scheme=financaspro;package=com.financasproinvest.app;end`;
      try {
        window.location.href = intentUri;
      } catch {
        window.location.href = directSchemeUri;
      }

      if (!isAuto) {
        setTimeout(() => {
          try {
            window.location.href = directSchemeUri;
          } catch {}
        }, 600);
      }
    } else {
      window.location.href = directSchemeUri;
    }
  }, [targetPath]);

  // Tentativa automática não-bloqueante na primeira abertura de links de e-mail
  useEffect(() => {
    if (!isMobileBrowser || dismissed) return;

    const isEmailOrigin =
      location.search.includes('origin=email') ||
      location.search.includes('source=email') ||
      targetPath.includes('origin=email');

    if (!isEmailOrigin) return;

    const autoAttemptKey = 'fpi-auto-app-open-attempted';
    if (!sessionStorage.getItem(autoAttemptKey)) {
      sessionStorage.setItem(autoAttemptKey, 'true');
      handleOpenInApp(true);
    }
  }, [isMobileBrowser, dismissed, targetPath, location.search, handleOpenInApp]);

  const handleContinueOnWeb = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setDismissed(true);
  }, []);

  if (dismissed || !isMobileBrowser) {
    return null;
  }

  return (
    <div
      data-testid="mobile-app-gate"
      className="fixed inset-0 z-[200] bg-slate-950 text-white flex flex-col justify-between p-6 overflow-y-auto font-sans animate-in fade-in duration-300"
    >
      {/* Glow de fundo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Topo / Marca & Fechar */}
      <div className="relative z-10 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <img src="/assets/images/brand/logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-xs font-black tracking-wider uppercase text-slate-200 font-mono">
            Finanças Pro Invest
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            {isReportTarget ? 'Relatório' : 'App Mobile'}
          </span>
          <button
            onClick={handleContinueOnWeb}
            aria-label="Fechar e continuar na web"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Conteúdo Central */}
      <div className="relative z-10 my-auto py-6 space-y-5 text-center">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/30 border border-emerald-400/30">
          {isReportTarget ? <BarChart3 size={40} /> : <Smartphone size={40} />}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
            {isReportTarget ? 'Seu Relatório Está Pronto' : 'Experiência Completa no Celular'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            {isReportTarget
              ? 'Abra no aplicativo instalado para carregar gráficos e análises com velocidade nativa, ou continue navegando pelo navegador.'
              : 'Acesse pelo seu aplicativo instalado para aproveitar biometria, segurança reforçada e sincronização instantânea.'}
          </p>
        </div>

        {/* Benefícios Contextuais */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 max-w-sm mx-auto text-left space-y-3">
          {isReportTarget ? (
            <>
              <div className="flex items-center gap-3">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-slate-300">
                  Abertura instantânea sem precisar digitar senha novamente
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-slate-300">
                  Gráficos completos de fluxo de caixa e patrimônio
                </span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-slate-300">
                  Ambiente blindado com biometria e PIN nativo
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-slate-300">
                  Biometria e PIN de acesso rápido
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-slate-300">
                  Lançamento instantâneo offline
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-slate-300">
                  Agenda fluida e alertas antecipados
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Ações Inteligentes */}
      <div className="relative z-10 space-y-3 max-w-sm mx-auto w-full pb-4">
        {/* Botão Primário: Abre no App Instalado */}
        <button
          data-testid="open-in-app-btn"
          onClick={() => handleOpenInApp(false)}
          className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <ExternalLink size={18} />
          <span>{isReportTarget ? 'Abrir Relatório no Aplicativo' : 'Abrir no Aplicativo Instalado'}</span>
        </button>

        {/* Botão Secundário: Continua na Web sem perder a rota */}
        <button
          data-testid="continue-on-web-btn"
          onClick={handleContinueOnWeb}
          className="w-full py-3 px-6 rounded-xl border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900 font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98]"
        >
          {isReportTarget ? 'Ver Relatório no Navegador Web' : 'Continuar no Navegador Web'}
        </button>

        {/* Link Terciário para quem ainda não baixou */}
        <div className="text-center pt-2">
          <button
            onClick={() => navigate('/download')}
            className="text-[11px] text-slate-400 hover:text-emerald-400 underline underline-offset-4 transition-colors"
          >
            Ainda não instalou o aplicativo no celular? Baixar APK Android
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileAppGate;
