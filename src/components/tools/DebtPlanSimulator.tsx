import ReactMarkdown from 'react-markdown';
import { Sparkles } from 'lucide-react';
import html2pdf from 'html2pdf.js';
// src/components/tools/finance/DebtPlanSimulator.tsx
import React, { useState, useEffect } from "react";
import type {
  NexusDebtPlanRequest,
  DebtPlanResponse,
  DebtItem,
  DebtSimulationSummary} from "../../services/nexusDebtPlanClient";
import {
  callGenerateDebtPlan
} from "../../services/nexusDebtPlanClient";
import { PresenceEventService } from "../../services/PresenceEventService";

interface DebtPlanSimulatorProps {
  // Resultado da sua calculadora de dívidas
  dividas: DebtItem[];
  simulacao: DebtSimulationSummary;
  usuarioPerfil?: NexusDebtPlanRequest["usuarioPerfil"];
  perfilContexto?: NexusDebtPlanRequest["perfilContexto"];
  patrimonioContexto?: NexusDebtPlanRequest["patrimonioContexto"];
  custoOportunidadeContexto?: NexusDebtPlanRequest["custoOportunidadeContexto"];
  initialPlanMarkdown?: string;
  userId?: string;
}

export const DebtPlanSimulator: React.FC<DebtPlanSimulatorProps> = ({
  dividas,
  simulacao,
  usuarioPerfil,
  perfilContexto,
  patrimonioContexto,
  custoOportunidadeContexto,
  initialPlanMarkdown,
  userId,
}) => {

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<DebtPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = useState<NexusDebtPlanRequest | null>(null);
  const [staleCacheInfo, setStaleCacheInfo] = useState<{ ageDays?: number; status?: "stale_recommended" | "stale_expired" } | null>(null);
   
  useEffect(() => {
    if (initialPlanMarkdown) {
      setPlan({
        success: true,
        format: "markdown",
        planoMarkdown: initialPlanMarkdown,
      } as DebtPlanResponse);
      setError(null);
    }
  }, [initialPlanMarkdown]);

  const hasMinimumData = dividas && dividas.length > 0 && simulacao?.totalDividas > 0;
  const hasExistingPlan = !!plan?.planoMarkdown;

  const handleGeneratePlan = async () => {
    if (!hasMinimumData) {
      setError("Preencha e calcule suas dívidas antes de gerar o plano.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanedDividas = dividas.map(d => {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(d)) {
          if (value !== null && value !== undefined) {
            cleaned[key] = value;
          }
        }
        return cleaned;
      });

      const cleanedSimulacao: any = {
        totalDividas: simulacao.totalDividas,
        custoTotalJurosAtual: simulacao.custoTotalJurosAtual,
        prazoEstimadoQuitacaoAtual: simulacao.prazoEstimadoQuitacaoAtual,
      };

      if (simulacao.rendaMensalEstimada !== null && simulacao.rendaMensalEstimada !== undefined) {
        cleanedSimulacao.rendaMensalEstimada = simulacao.rendaMensalEstimada;
      }
      if (simulacao.prazoEstimadoQuitacaoOtimizado !== null && simulacao.prazoEstimadoQuitacaoOtimizado !== undefined) {
        cleanedSimulacao.prazoEstimadoQuitacaoOtimizado = simulacao.prazoEstimadoQuitacaoOtimizado;
      }
      if (simulacao.economiaEstimadaJuros !== null && simulacao.economiaEstimadaJuros !== undefined) {
        cleanedSimulacao.economiaEstimadaJuros = simulacao.economiaEstimadaJuros;
      }

      const payload: NexusDebtPlanRequest = {
        usuarioPerfil,
        ...(perfilContexto && { perfilContexto }),
        dividas: cleanedDividas,
        simulacao: cleanedSimulacao,
        ...(patrimonioContexto && { patrimonioContexto }),
        ...(custoOportunidadeContexto && { custoOportunidadeContexto }),
      };

      const response = await callGenerateDebtPlan(payload);

      if (response.needsUserConfirmationToRegenerate) {
        setPendingPayload(payload);
        setStaleCacheInfo({
          ageDays: response.cacheAgeDays,
          status: response.cacheStatus === "stale_expired" ? "stale_expired" : "stale_recommended",
        });
        setPlan(response.plan);
        return;
      }

      setPendingPayload(null);
      setStaleCacheInfo(null);
      setPlan(response.plan);

      if (userId && response.plan?.planoMarkdown) {
        PresenceEventService.create({
          uid: userId,
          eventType: 'nexus.insight_ready',
          persona: 'debts',
          urgency: 'medium',
          message: {
            title: 'Plano de quitação pronto',
            body: 'O Nexus montou seu plano com base nos dados mais recentes. Revise quando puder.',
            ctaLabel: 'Ver plano',
          },
          deepLink: 'minhas-dividas?view=estrategia',
          cooldownHours: 72,
          expiresInHours: 7 * 24,
          resourceId: `nexus_plan_${userId}`,
          payload: { totalDividas: simulacao.totalDividas },
        }).catch(() => {});
      }

    } catch (e: any) {
      console.error("Erro ao gerar plano de quitação:", e);
      if (e.response) {
        console.error("Detalhes da resposta:", e.response);
      }
      setError(e?.message || "Não foi possível gerar o plano. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    const conteudo = document.getElementById('plano-content');
    if (!conteudo) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <style>
        .pdf-export, .pdf-export * {
          color: #1e293b !important;
          background-color: transparent !important;
        }
        .pdf-export strong, .pdf-export h1, .pdf-export h2, .pdf-export h3, .pdf-export h4 {
          color: #0f172a !important;
        }
        .pdf-export a {
          color: #0d9488 !important;
        }
        .pdf-export svg {
          color: #0d9488 !important;
        }
      </style>
      <div class="pdf-export" style="font-family: Inter, system-ui, sans-serif; font-size: 13px; color: #1e293b; padding: 40px 48px; line-height: 1.75; background: #ffffff;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #0d9488;">
          <div style="width: 10px; height: 10px; border-radius: 9999px; background: #0d9488;"></div>
          <span style="font-size: 16px; font-weight: 700; color: #0d9488; letter-spacing: -0.3px;">Finanças Pro Invest</span>
          <span style="font-size: 11px; color: #64748b; margin-left: auto;">Plano gerado em ${new Date().toLocaleString('pt-BR')}</span>
        </div>
        ${conteudo.innerHTML}
      </div>
    `;

    const opt = {
      margin: 0,
      filename: `plano-quitacao-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    await html2pdf().set(opt as any).from(wrapper).save();
  };

  const handleUseSavedPlan = () => {
    setPendingPayload(null);
    setStaleCacheInfo(null);
  };

  const handleRegenerateConfirmed = async () => {
    if (!pendingPayload) return;

    setLoading(true);
    setError(null);

    try {
      const regeneratedResponse = await callGenerateDebtPlan({
        ...pendingPayload,
        forceRegenerate: true,
      });
      setPlan(regeneratedResponse.plan);
      setPendingPayload(null);
      setStaleCacheInfo(null);

      if (userId && regeneratedResponse.plan?.planoMarkdown) {
        PresenceEventService.create({
          uid: userId,
          eventType: 'nexus.insight_ready',
          persona: 'debts',
          urgency: 'medium',
          message: {
            title: 'Plano atualizado pelo Nexus',
            body: 'Seu plano foi regenerado com os dados mais recentes. Confira o que mudou.',
            ctaLabel: 'Ver plano atualizado',
          },
          deepLink: 'minhas-dividas?view=estrategia',
          cooldownHours: 72,
          expiresInHours: 7 * 24,
          resourceId: `nexus_plan_${userId}`,
          payload: { totalDividas: simulacao.totalDividas, regenerated: true },
        }).catch(() => {});
      }

    } catch (e: any) {
      console.error("Erro ao regerar plano de quitação:", e);
      setError(e?.message || "Não foi possível gerar um novo plano. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      {/* CSS DE IMPRESSÃO PARA EVITAR PÁGINAS EM BRANCO */}
      <style>{`
      
        @media print {
          body * {
            visibility: hidden;
          }
          #plano-content,
          #plano-content * {
            visibility: visible;
          }
          #plano-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
        }
      
      `}</style>
      <div className="mt-6 border border-teal-200 dark:border-teal-800 rounded-xl bg-gradient-to-br from-teal-50 to-slate-50 dark:from-teal-950/30 dark:to-slate-900 p-5 shadow-sm">      
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-teal-800 dark:text-teal-300 flex items-center gap-2">
            <Sparkles size={16} className="text-teal-600 dark:text-teal-400" />
            {hasExistingPlan ? "Você já tem um plano disponível." : "Suas dívidas estão prontas para análise."}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {hasExistingPlan
              ? "Se sua situação mudou, gere uma nova versão com os dados mais atuais. Se não mudou, você já pode seguir com o plano salvo."
              : "Pronto para ver seu caminho de saída? Deixe o Nexus analisar seus juros e priorizar cada centavo para sua quitação acelerada."}
          </p>
          <div className="mt-2 pt-2 border-t border-teal-100 dark:border-teal-900/50">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              {hasExistingPlan ? "Atualizar Estratégia de Alívio" : "Estratégia de Alívio com ajuda do Nexus"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {hasExistingPlan
                ? "Use o plano atual como referência e regenere somente quando os números tiverem mudado."
                : "Use o resultado da simulação para gerar um plano de ação claro para os próximos dias e semanas."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleGeneratePlan}
          disabled={loading || !hasMinimumData}
          className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors shadow-sm ${
            loading || !hasMinimumData
              ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              : "bg-teal-600 text-white hover:bg-teal-700"
          }`}
        >
          <Sparkles size={15} />
          {loading
            ? (hasExistingPlan ? "Atualizando estratégia..." : "Gerando estratégia...")
            : (hasExistingPlan ? "Gerar nova versão da estratégia" : "Montar minha Estratégia de Alívio")}
        </button>
      </div>

      {!hasMinimumData && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 leading-relaxed">
          Você precisa informar suas dívidas e calcular primeiro para o Nexus montar um plano coerente com sua situação.
        </p>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 px-4 py-3">
          <p className="text-sm text-rose-700 dark:text-rose-300 leading-relaxed">
            {error}
          </p>
        </div>
      )}
  
      {staleCacheInfo && plan && (
        <div className={`mt-4 rounded-2xl border p-4 ${
          staleCacheInfo.status === "stale_expired"
            ? "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"
            : "border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30"
        }`}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2">
            Plano já existente
          </p>
          <p className="text-sm font-black text-slate-800 dark:text-white">
            Você já tem um plano salvo há {staleCacheInfo.ageDays ?? "alguns"} dias.
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {staleCacheInfo.status === "stale_expired"
              ? "Esse plano já pode estar distante da sua situação atual. Se seus números mudaram, vale gerar uma nova versão agora."
              : "Se sua situação continua parecida, você pode seguir com o plano salvo. Se mudou, peça uma nova versão ao Nexus."}
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleUseSavedPlan}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
            >
              Seguir com plano salvo
            </button>
            <button
              type="button"
              onClick={handleRegenerateConfirmed}
              disabled={loading}
              className="flex-1 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {loading ? "Atualizando plano..." : "Gerar versão atualizada"}
            </button>
          </div>
        </div>
      )}
      {plan && (
        <>
          <div
            id="plano-content"
            className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 print:mt-0 print:space-y-3 print:animate-none print:text-black print:pb-0"
          >
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 print:break-inside-avoid">
              <div className="p-2 bg-teal-50 dark:bg-teal-950/50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600 dark:text-teal-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider">
                  {hasExistingPlan ? "Nexus — Plano disponível" : "Nexus — Plano gerado"}
                </p>
                <h3 className="text-base font-black text-slate-800 dark:text-white">Seu Plano de Quitação de Dívidas</h3>
              </div>
            </div>

            {plan.planoMarkdown && (
              <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed text-slate-800 dark:text-slate-200 print:break-inside-avoid">
                {plan.generatedAt && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider mb-2">
                    Plano gerado em {new Date(plan.generatedAt).toLocaleString("pt-BR")}
                  </p>
                )}
                <ReactMarkdown>{plan.planoMarkdown}</ReactMarkdown>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleGeneratePlan}
                disabled={loading || !hasMinimumData}
                className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
                  loading || !hasMinimumData
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    : "bg-teal-600 text-white hover:bg-teal-700"
                }`}
              >
                <Sparkles size={15} />
                {loading
                  ? (hasExistingPlan ? "Atualizando plano..." : "Gerando plano...")
                  : (hasExistingPlan ? "Atualizar plano" : "Gerar nova versão")}
              </button>

              <button
                onClick={handlePrint}
                className="w-full px-4 py-3 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Gerar plano em PDF
              </button>
            </div>
          </div>
        </>
      )}
    </div>
    </>
  );
};







