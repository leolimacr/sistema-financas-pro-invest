// src/services/nexusDebtPlanClient.ts
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase"; // ajuste o caminho conforme seu setup

// Mesmos tipos do backend, simplificados para o front
export interface DebtItem {
  id: string;
  nome: string;
  saldoAtual: number;
  taxaJurosMes: number;
  parcelaMensal?: number;
  atrasoEmDias?: number;
  ehGarantida?: boolean;
  observacoes?: string;
}

export interface DebtSimulationSummary {
  rendaMensalEstimada?: number;
  despesasMensaisMedias?: number;
  totalParcelasMensais?: number;
  sobraMensalReal?: number;
  janelaAnaliseDias?: number;
  totalDividas: number;
  custoTotalJurosAtual?: number;
  prazoEstimadoQuitacaoAtual?: number;
  prazoEstimadoQuitacaoOtimizado?: number;
  economiaEstimadaJuros?: number;
}

export type UsuarioPerfil = "endividado_iniciante" | "endividado_intermediario";
export type Estabilidade = "estavel" | "regular" | "volatil";

export interface PerfilContexto {
  estabilidade: Estabilidade;
  reservaAtual: number;
  metaReservaEmMeses: number;
}
export interface PatrimonioContexto {
  valorTotalInvestimentosFinanceiros: number;
  valorPatrimonioLiquido?: number;
}

export interface CustoOportunidadeContexto {
  selicAno?: number;
  cdiAno?: number;
  retornoLiquidoEstimadoAno?: number;
  estrategiaSugerida?: string;
}

export interface NexusDebtPlanRequest {
  usuarioPerfil?: UsuarioPerfil;
  perfilContexto?: PerfilContexto;
  patrimonioContexto?: PatrimonioContexto;
  custoOportunidadeContexto?: CustoOportunidadeContexto;
  forceRegenerate?: boolean;
  dividas: DebtItem[];
  simulacao: DebtSimulationSummary;
}

export type HorizontePasso = "7_dias" | "30_dias" | "90_dias";

export interface ActionStep {
  ordem: number;
  horizonte: HorizontePasso;
  descricao: string;
  observacoes?: string;
}

export interface PriorityExplanation {
  idDividaPrioritaria: string;
  nomeDividaPrioritaria: string;
  motivo: string;
  recomendacaoPrincipal: string;
}

export interface DiagnosticoFinanceiro {
  patrimonioAtivo?: number | null;
  patrimonioPassivo?: number | null;
  patrimonioLiquido?: number | null;
  rendaMensalConsiderada?: number | null;
  reservaAtual?: number | null;
  metaReservaEmMeses?: number | null;
  diagnosticoResumo?: string;
}

export interface AnaliseCustoOportunidade {
  taxaReferenciaAno?: number | null;
  retornoLiquidoEstimadoAno?: number | null;
  haVantagemEmAntecipar?: boolean | null;
  resumoDecisao?: string;
  justificativa?: string;
}

export interface DecisaoPorDivida {
  ordem?: number;
  nomeDivida: string;
  acaoRecomendada:
    | "quitar_agressivamente"
    | "amortizar"
    | "manter_parcelas"
    | "renegociar"
    | "nao_antecipar";
  justificativa: string;
  observacoes?: string;
}

export interface DebtPlanResponse {
  format: "markdown";
  planoMarkdown: string;
  generatedAt?: string;
}

interface GenerateDebtPlanCallableResponse {
  success: boolean;
  format?: "markdown";
  planoMarkdown?: string;
  generatedAt?: string;
  model?: string;
  provider?: string;
  cacheStatus?: "fresh" | "stale_recommended" | "stale_expired";
  cacheAgeDays?: number;
  cacheUpdatedAt?: number;
  needsUserConfirmationToRegenerate?: boolean;
}

export interface GenerateDebtPlanResult {
  plan: DebtPlanResponse;
  model?: string;
  provider?: string;
  cacheStatus?: "fresh" | "stale_recommended" | "stale_expired";
  cacheAgeDays?: number;
  cacheUpdatedAt?: number;
  needsUserConfirmationToRegenerate?: boolean;
}

/**
 * Chama a Cloud Function generateDebtPlan com os dados do simulador.
 */
 
export async function callGenerateDebtPlan(
  payload: NexusDebtPlanRequest
): Promise<GenerateDebtPlanResult> {
  try {
    const fn = httpsCallable<NexusDebtPlanRequest, GenerateDebtPlanCallableResponse>(
      functions,
      "generateDebtPlan"
    );

    const result = await fn(payload);
    const data = result.data;










    if (!data || !data.success || !data.planoMarkdown) {
      throw new Error("Falha ao gerar plano de quitação. Tente novamente.");
    }

    return {
      plan: {
        format: "markdown",
        planoMarkdown: data.planoMarkdown,
        generatedAt: data.generatedAt,
      },
      model: data.model,
      provider: data.provider,
      cacheStatus: data.cacheStatus,
      cacheAgeDays: data.cacheAgeDays,
      cacheUpdatedAt: data.cacheUpdatedAt,
      needsUserConfirmationToRegenerate: data.needsUserConfirmationToRegenerate,
    };
    
  } catch (error: any) {
    console.error("Erro ao gerar plano de quitação:", error);

    if (error?.code === "unavailable") {
      throw new Error(
        "Os modelos de IA estão instáveis no momento. Tente novamente em alguns instantes."
      );
    }

    throw error;
  }
}