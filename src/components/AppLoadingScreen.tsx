import React from 'react';

interface AppLoadingScreenProps {
  loadingTime?: number;
}

const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({ loadingTime = 0 }) => {
  const showSubtitle = loadingTime > 2500;
  const subtitleText = loadingTime > 7000 ? 'Quase lá...' : 'Sincronizando seus dados...';

  return (
    <main
      role="status"
      aria-live="polite"
      aria-label="Carregando Finanças Pro Invest"
      className="app-loading-screen min-h-screen overflow-hidden bg-surface-primary flex items-center justify-center px-5"
    >
      <div className="loading-orb loading-orb-left" />
      <div className="loading-orb loading-orb-right" />
      <div className="loading-grid" />

      <section className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
        <div className="brand-mark" aria-hidden="true">
          <div className="brand-mark-core">
            <span>F</span>
          </div>
        </div>

        <div className="brand-shell mt-6">
          <div className="brand-glow" aria-hidden="true" />

          <h1 className="brand-title">
            <span className="brand-title-text">Finanças Pro Invest</span>
            <span className="brand-shine" aria-hidden="true" />
          </h1>
        </div>

        <div className="mt-5 flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
            Inteligência para seu patrimônio
          </p>
        </div>

        <div className="loading-line-track mt-10" aria-hidden="true">
          <div className="loading-line-progress" />
        </div>

        <div className="mt-4 h-5">
          {showSubtitle && (
            <p className="loading-subtitle text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {subtitleText}
            </p>
          )}
        </div>

        {loadingTime > 10000 && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 transition-colors hover:text-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-4 rounded-sm"
          >
            Demorando muito? Recarregar aplicação
          </button>
        )}
      </section>

      <style>{`
        .app-loading-screen {
          position: relative;
          isolation: isolate;
          background:
            radial-gradient(circle at 50% 42%, rgba(224, 242, 254, 0.72), transparent 31%),
            linear-gradient(135deg, #ffffff 0%, #f8fbff 48%, #f5f3ff 100%);
        }

        .loading-grid {
          position: absolute;
          inset: 0;
          z-index: 0;
          opacity: 0.42;
          background-image:
            linear-gradient(rgba(148, 163, 184, 0.11) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.11) 1px, transparent 1px);
          background-size: 52px 52px;
          mask-image: radial-gradient(ellipse 65% 55% at 50% 50%, black 15%, transparent 77%);
          pointer-events: none;
        }

        .loading-orb {
          position: absolute;
          z-index: 0;
          width: 26rem;
          height: 26rem;
          border-radius: 9999px;
          filter: blur(75px);
          opacity: 0.3;
          pointer-events: none;
          animation: orbFloat 9s ease-in-out infinite alternate;
        }

        .loading-orb-left {
          top: -12rem;
          left: -9rem;
          background: #38bdf8;
        }

        .loading-orb-right {
          right: -10rem;
          bottom: -13rem;
          background: #a78bfa;
          animation-delay: -4.5s;
        }

        .brand-mark {
          display: grid;
          place-items: center;
          width: 3.25rem;
          height: 3.25rem;
          padding: 1px;
          border-radius: 1.05rem;
          background: linear-gradient(135deg, #38bdf8 0%, #6366f1 48%, #c084fc 100%);
          box-shadow:
            0 16px 35px rgba(79, 70, 229, 0.22),
            0 4px 12px rgba(14, 165, 233, 0.16);
          animation: markFloat 3.5s ease-in-out infinite;
        }

        .brand-mark-core {
          display: grid;
          place-items: center;
          width: 100%;
          height: 100%;
          border-radius: calc(1.05rem - 1px);
          background: rgba(255, 255, 255, 0.92);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .brand-mark-core span {
          font-size: 1.35rem;
          font-weight: 900;
          font-style: italic;
          line-height: 1;
          background: linear-gradient(135deg, #0284c7, #4f46e5 55%, #a855f7);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-shell {
          position: relative;
          display: inline-flex;
          padding: 0.85rem 1.15rem;
        }

        .brand-glow {
          position: absolute;
          inset: 12% 2%;
          z-index: -1;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(14, 165, 233, 0.3), rgba(139, 92, 246, 0.32), rgba(236, 72, 153, 0.22));
          filter: blur(24px);
          opacity: 0.7;
          animation: glowPulse 3s ease-in-out infinite;
        }

        .brand-title {
          position: relative;
          overflow: hidden;
          margin: 0;
          font-size: clamp(2rem, 7vw, 4.5rem);
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.065em;
        }

        .brand-title-text {
          display: block;
          background: linear-gradient(
            110deg,
            #0369a1 0%,
            #0ea5e9 24%,
            #4f46e5 49%,
            #8b5cf6 72%,
            #db2777 100%
          );
          background-size: 220% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientFlow 5s ease-in-out infinite;
        }

        .brand-shine {
          position: absolute;
          top: -40%;
          left: -45%;
          width: 28%;
          height: 180%;
          transform: rotate(20deg);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.08),
            rgba(255, 255, 255, 0.92),
            rgba(255, 255, 255, 0.08),
            transparent
          );
          filter: blur(1px);
          animation: textShine 4.8s ease-in-out infinite;
          pointer-events: none;
        }

        .loading-line-track {
          width: min(15rem, 72vw);
          height: 3px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.18);
          box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.06);
        }

        .loading-line-progress {
          width: 42%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #0ea5e9, #6366f1, #c084fc);
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.48);
          animation: loadingTravel 1.8s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }

        .loading-subtitle {
          animation: subtitleReveal 0.45s ease-out both;
        }

        @keyframes gradientFlow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes textShine {
          0%, 25% { left: -45%; opacity: 0; }
          32% { opacity: 1; }
          55%, 100% { left: 125%; opacity: 0; }
        }

        @keyframes loadingTravel {
          0% { transform: translateX(-135%); }
          100% { transform: translateX(335%); }
        }

        @keyframes markFloat {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-6px) rotate(2deg); }
        }

        @keyframes glowPulse {
          0%, 100% { opacity: 0.45; transform: scale(0.96); }
          50% { opacity: 0.82; transform: scale(1.04); }
        }

        @keyframes orbFloat {
          from { transform: translate3d(-2rem, -1rem, 0) scale(0.9); }
          to { transform: translate3d(3rem, 2rem, 0) scale(1.12); }
        }

        @keyframes subtitleReveal {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .loading-orb,
          .brand-mark,
          .brand-glow,
          .brand-title-text,
          .brand-shine,
          .loading-line-progress,
          .loading-subtitle {
            animation: none !important;
          }

          .brand-shine {
            display: none;
          }
        }
      `}</style>
    </main>
  );
};

export default AppLoadingScreen;