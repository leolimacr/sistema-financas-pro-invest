// functions/src/debtPlan.types.ts
// Contratos de dados entre Simulador de Dívidas ↔ Nexus (plano guiado)

import { z } from "zod";

export type DebtAdjustmentType = 'fixed' | 'annual_percent' | 'manual_series';
export type DebtSeriesFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface DebtSeries {
  id: string;
  year: number;
  startMonth: number;
  installmentsCount: number;
  installmentValue: number;
  adjustmentRate?: number;
  effectiveRate?: number;
}

export interface DebtAdjustmentConfig {
  type: DebtAdjustmentType;
  annualPercentRate?: number;
  series?: DebtSeries[];
  frequency?: DebtSeriesFrequency;
}

// ---------- REQUEST (Simulador → Nexus) ----------

export interface DebtItem {
  id: string;                   // id interno da calculadora
  nome: string;                 // "Cartão X", "Empréstimo consignado"
  saldoAtual: number;           // valor atual devido
  taxaJurosMes: number;         // juros ao mês (em %)
  parcelaMensal?: number;       // valor da parcela atual (se existir)
  atrasoEmDias?: number;        // opcional
  ehGarantida?: boolean;        // ex: financiamento com garantia
  observacoes?: string;         // algo relevante que o usuário informou
  proposito?: string;           // [NEXUS] Contexto emocional/estratégico da dívida
  adjustmentConfig?: DebtAdjustmentConfig;
  currentSeriesIndex?: number;
  nextAdjustmentDate?: string | null;
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

export type UsuarioPerfil = 'endividado_iniciante' | 'endividado_intermediario';
export type Estabilidade = 'estavel' | 'regular' | 'volatil';

export interface PerfilContexto {
  estabilidade: Estabilidade;
  reservaAtual: number;
  metaReservaEmMeses: number;
}

export interface PatrimonioContexto {
  valorTotalInvestimentosFinanceiros: number;
  valorPatrimonioLiquido?: number;
  valorDisponivelAcimaReserva?: number;
  usaReservaParaQuitar?: boolean;
}

export interface CustoOportunidadeContexto {
  selicAno?: number;
  cdiAno?: number;
  retornoLiquidoEstimadoAno?: number;
  estrategiaSugerida?: 'quitar' | 'amortizar' | 'provisionar';
  justificativaBase?: string;
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

// ---------- RESPONSE (Nexus → Simulador) ----------

export type HorizontePasso = '7_dias' | '30_dias' | '90_dias';

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
  acaoRecomendada: 'quitar_agressivamente' | 'amortizar' | 'manter_parcelas' | 'renegociar' | 'nao_antecipar';
  justificativa: string;
  observacoes?: string;
}

export interface DebtPlanResponse {
  resumo3Linhas: string[];
  prioridade: PriorityExplanation;
  planoHorizonte: {
    prazoEstimadoQuitacaoMeses?: number | null;
    economiaEstimadaJuros?: number | null;
  };
  diagnosticoFinanceiro?: DiagnosticoFinanceiro;
  analiseCustoOportunidade?: AnaliseCustoOportunidade;
  decisoesPorDivida?: DecisaoPorDivida[];
  explicacaoCenarioAtual?: string;
  explicacaoMetaPlano?: string;
  explicacaoEsforcoMensal?: string;
  passos7Dias: ActionStep[];
  passos30Dias: ActionStep[];
  passos90Dias?: ActionStep[];
  alertasImportantes: string[];
  tomGeral?: 'calmo' | 'direto' | 'motivador';
}

// ---------- SCHEMAS ZOD PARA VALIDAÇÃO ----------

export const DebtSeriesSchema = z.object({
  id: z.string(),
  year: z.number(),
  startMonth: z.number().min(1).max(12),
  installmentsCount: z.number().positive(),
  installmentValue: z.number().positive(),
  adjustmentRate: z.number().optional(),
  effectiveRate: z.number().optional(),
});

export const DebtAdjustmentConfigSchema = z.object({
  type: z.enum(['fixed', 'annual_percent', 'manual_series']),
  annualPercentRate: z.number().positive().optional(),
  series: z.array(DebtSeriesSchema).optional(),
  frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']).optional(),
});

export const DebtItemSchema = z.object({
  id: z.string(),
  nome: z.string(),
  saldoAtual: z.number(),
  taxaJurosMes: z.number(),
  parcelaMensal: z.number().optional(),
  atrasoEmDias: z.number().optional(),
  ehGarantida: z.boolean().optional(),
  observacoes: z.string().optional(),
  proposito: z.string().optional(),
  adjustmentConfig: DebtAdjustmentConfigSchema.optional(),
  currentSeriesIndex: z.number().int().nonnegative().optional(),
  nextAdjustmentDate: z.string().nullable().optional(),
});

export const DebtSimulationSummarySchema = z.object({
  rendaMensalEstimada: z.number().optional().nullable(),
  despesasMensaisMedias: z.number().optional().nullable(),
  totalParcelasMensais: z.number().optional().nullable(),
  sobraMensalReal: z.number().optional().nullable(),
  janelaAnaliseDias: z.number().optional().nullable(),
  totalDividas: z.number(),
  custoTotalJurosAtual: z.number().optional().nullable(),
  prazoEstimadoQuitacaoAtual: z.number().optional().nullable(),
  prazoEstimadoQuitacaoOtimizado: z.number().optional().nullable(),
  economiaEstimadaJuros: z.number().optional().nullable(),
});

export const PerfilContextoSchema = z.object({
  estabilidade: z.enum(['estavel', 'regular', 'volatil']),
  reservaAtual: z.number(),
  metaReservaEmMeses: z.number(),
});

export const PatrimonioContextoSchema = z.object({
  valorTotalInvestimentosFinanceiros: z.number(),
  valorPatrimonioLiquido: z.number().optional().nullable(),
  valorDisponivelAcimaReserva: z.number().optional().nullable(),
  usaReservaParaQuitar: z.boolean().optional(),
});

export const CustoOportunidadeContextoSchema = z.object({
  selicAno: z.number().optional().nullable(),
  cdiAno: z.number().optional().nullable(),
  retornoLiquidoEstimadoAno: z.number().optional().nullable(),
  estrategiaSugerida: z.enum(['quitar', 'amortizar', 'provisionar']).optional(),
  justificativaBase: z.string().optional(),
});

export const NexusDebtPlanRequestSchema = z.object({
  usuarioPerfil: z.enum(['endividado_iniciante', 'endividado_intermediario']).optional(),
  perfilContexto: PerfilContextoSchema.optional(),
  patrimonioContexto: PatrimonioContextoSchema.optional(),
  custoOportunidadeContexto: CustoOportunidadeContextoSchema.optional(),
  forceRegenerate: z.boolean().optional(),
  dividas: z.array(DebtItemSchema).min(1),
  simulacao: DebtSimulationSummarySchema,
});

export const ActionStepSchema = z.object({
  ordem: z.number().int().nonnegative(),
  horizonte: z.enum(['7_dias', '30_dias', '90_dias']),
  descricao: z.string().min(3),
  observacoes: z.string().optional(),
});

export const PriorityExplanationSchema = z.object({
  idDividaPrioritaria: z.string(),
  nomeDividaPrioritaria: z.string(),
  motivo: z.string().min(3),
  recomendacaoPrincipal: z.string().min(3),
});

export const DiagnosticoFinanceiroSchema = z.object({
  patrimonioAtivo: z.number().nullable().optional(),
  patrimonioPassivo: z.number().nullable().optional(),
  patrimonioLiquido: z.number().nullable().optional(),
  rendaMensalConsiderada: z.number().nullable().optional(),
  reservaAtual: z.number().nullable().optional(),
  metaReservaEmMeses: z.number().nullable().optional(),
  diagnosticoResumo: z.string().optional(),
});

export const AnaliseCustoOportunidadeSchema = z.object({
  taxaReferenciaAno: z.number().nullable().optional(),
  retornoLiquidoEstimadoAno: z.number().nullable().optional(),
  haVantagemEmAntecipar: z.boolean().nullable().optional(),
  resumoDecisao: z.string().optional(),
  justificativa: z.string().optional(),
});

export const DecisaoPorDividaSchema = z.object({
  ordem: z.number().int().positive().optional(),
  nomeDivida: z.string().min(1),
  acaoRecomendada: z.enum([
    'quitar_agressivamente',
    'amortizar',
    'manter_parcelas',
    'renegociar',
    'nao_antecipar',
  ]),
  justificativa: z.string().min(3),
  observacoes: z.string().optional(),
});

export const DebtPlanResponseSchema = z.object({
  resumo3Linhas: z.array(z.string()).min(1),
  prioridade: PriorityExplanationSchema,
  planoHorizonte: z.object({
    prazoEstimadoQuitacaoMeses: z.number().nullable().optional(),
    economiaEstimadaJuros: z.number().nullable().optional(),
  }),
  diagnosticoFinanceiro: DiagnosticoFinanceiroSchema.optional(),
  analiseCustoOportunidade: AnaliseCustoOportunidadeSchema.optional(),
  decisoesPorDivida: z.array(DecisaoPorDividaSchema).default([]),
  explicacaoCenarioAtual: z.string().optional(),
  explicacaoMetaPlano: z.string().optional(),
  explicacaoEsforcoMensal: z.string().optional(),
  passos7Dias: z.array(ActionStepSchema).default([]),
  passos30Dias: z.array(ActionStepSchema).default([]),
  passos90Dias: z.array(ActionStepSchema).default([]),
  alertasImportantes: z.array(z.string()).default([]),
  tomGeral: z.enum(['calmo', 'direto', 'motivador']).optional(),
});

export type DebtPlanResponseSafe = z.output<typeof DebtPlanResponseSchema>;
