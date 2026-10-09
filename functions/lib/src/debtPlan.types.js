"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebtPlanResponseSchema = exports.DecisaoPorDividaSchema = exports.AnaliseCustoOportunidadeSchema = exports.DiagnosticoFinanceiroSchema = exports.PriorityExplanationSchema = exports.ActionStepSchema = exports.NexusDebtPlanRequestSchema = exports.CustoOportunidadeContextoSchema = exports.PatrimonioContextoSchema = exports.PerfilContextoSchema = exports.DebtSimulationSummarySchema = exports.DebtItemSchema = exports.DebtAdjustmentConfigSchema = exports.DebtSeriesSchema = void 0;
const zod_1 = require("zod");
exports.DebtSeriesSchema = zod_1.z.object({
    id: zod_1.z.string(),
    year: zod_1.z.number(),
    startMonth: zod_1.z.number().min(1).max(12),
    installmentsCount: zod_1.z.number().positive(),
    installmentValue: zod_1.z.number().positive(),
    adjustmentRate: zod_1.z.number().optional(),
    effectiveRate: zod_1.z.number().optional(),
});
exports.DebtAdjustmentConfigSchema = zod_1.z.object({
    type: zod_1.z.enum(['fixed', 'annual_percent', 'manual_series']),
    annualPercentRate: zod_1.z.number().positive().optional(),
    series: zod_1.z.array(exports.DebtSeriesSchema).optional(),
    frequency: zod_1.z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']).optional(),
});
exports.DebtItemSchema = zod_1.z.object({
    id: zod_1.z.string(),
    nome: zod_1.z.string(),
    saldoAtual: zod_1.z.number(),
    taxaJurosMes: zod_1.z.number(),
    parcelaMensal: zod_1.z.number().optional(),
    atrasoEmDias: zod_1.z.number().optional(),
    ehGarantida: zod_1.z.boolean().optional(),
    observacoes: zod_1.z.string().optional(),
    proposito: zod_1.z.string().optional(),
    adjustmentConfig: exports.DebtAdjustmentConfigSchema.optional(),
    currentSeriesIndex: zod_1.z.number().int().nonnegative().optional(),
    nextAdjustmentDate: zod_1.z.string().nullable().optional(),
});
exports.DebtSimulationSummarySchema = zod_1.z.object({
    rendaMensalEstimada: zod_1.z.number().optional().nullable(),
    despesasMensaisMedias: zod_1.z.number().optional().nullable(),
    totalParcelasMensais: zod_1.z.number().optional().nullable(),
    sobraMensalReal: zod_1.z.number().optional().nullable(),
    janelaAnaliseDias: zod_1.z.number().optional().nullable(),
    totalDividas: zod_1.z.number(),
    custoTotalJurosAtual: zod_1.z.number().optional().nullable(),
    prazoEstimadoQuitacaoAtual: zod_1.z.number().optional().nullable(),
    prazoEstimadoQuitacaoOtimizado: zod_1.z.number().optional().nullable(),
    economiaEstimadaJuros: zod_1.z.number().optional().nullable(),
});
exports.PerfilContextoSchema = zod_1.z.object({
    estabilidade: zod_1.z.enum(['estavel', 'regular', 'volatil']),
    reservaAtual: zod_1.z.number(),
    metaReservaEmMeses: zod_1.z.number(),
});
exports.PatrimonioContextoSchema = zod_1.z.object({
    valorTotalInvestimentosFinanceiros: zod_1.z.number(),
    valorPatrimonioLiquido: zod_1.z.number().optional().nullable(),
    valorDisponivelAcimaReserva: zod_1.z.number().optional().nullable(),
    usaReservaParaQuitar: zod_1.z.boolean().optional(),
});
exports.CustoOportunidadeContextoSchema = zod_1.z.object({
    selicAno: zod_1.z.number().optional().nullable(),
    cdiAno: zod_1.z.number().optional().nullable(),
    retornoLiquidoEstimadoAno: zod_1.z.number().optional().nullable(),
    estrategiaSugerida: zod_1.z.enum(['quitar', 'amortizar', 'provisionar']).optional(),
    justificativaBase: zod_1.z.string().optional(),
});
exports.NexusDebtPlanRequestSchema = zod_1.z.object({
    usuarioPerfil: zod_1.z.enum(['endividado_iniciante', 'endividado_intermediario']).optional(),
    perfilContexto: exports.PerfilContextoSchema.optional(),
    patrimonioContexto: exports.PatrimonioContextoSchema.optional(),
    custoOportunidadeContexto: exports.CustoOportunidadeContextoSchema.optional(),
    forceRegenerate: zod_1.z.boolean().optional(),
    dividas: zod_1.z.array(exports.DebtItemSchema).min(1),
    simulacao: exports.DebtSimulationSummarySchema,
});
exports.ActionStepSchema = zod_1.z.object({
    ordem: zod_1.z.number().int().nonnegative(),
    horizonte: zod_1.z.enum(['7_dias', '30_dias', '90_dias']),
    descricao: zod_1.z.string().min(3),
    observacoes: zod_1.z.string().optional(),
});
exports.PriorityExplanationSchema = zod_1.z.object({
    idDividaPrioritaria: zod_1.z.string(),
    nomeDividaPrioritaria: zod_1.z.string(),
    motivo: zod_1.z.string().min(3),
    recomendacaoPrincipal: zod_1.z.string().min(3),
});
exports.DiagnosticoFinanceiroSchema = zod_1.z.object({
    patrimonioAtivo: zod_1.z.number().nullable().optional(),
    patrimonioPassivo: zod_1.z.number().nullable().optional(),
    patrimonioLiquido: zod_1.z.number().nullable().optional(),
    rendaMensalConsiderada: zod_1.z.number().nullable().optional(),
    reservaAtual: zod_1.z.number().nullable().optional(),
    metaReservaEmMeses: zod_1.z.number().nullable().optional(),
    diagnosticoResumo: zod_1.z.string().optional(),
});
exports.AnaliseCustoOportunidadeSchema = zod_1.z.object({
    taxaReferenciaAno: zod_1.z.number().nullable().optional(),
    retornoLiquidoEstimadoAno: zod_1.z.number().nullable().optional(),
    haVantagemEmAntecipar: zod_1.z.boolean().nullable().optional(),
    resumoDecisao: zod_1.z.string().optional(),
    justificativa: zod_1.z.string().optional(),
});
exports.DecisaoPorDividaSchema = zod_1.z.object({
    ordem: zod_1.z.number().int().positive().optional(),
    nomeDivida: zod_1.z.string().min(1),
    acaoRecomendada: zod_1.z.enum([
        'quitar_agressivamente',
        'amortizar',
        'manter_parcelas',
        'renegociar',
        'nao_antecipar',
    ]),
    justificativa: zod_1.z.string().min(3),
    observacoes: zod_1.z.string().optional(),
});
exports.DebtPlanResponseSchema = zod_1.z.object({
    resumo3Linhas: zod_1.z.array(zod_1.z.string()).min(1),
    prioridade: exports.PriorityExplanationSchema,
    planoHorizonte: zod_1.z.object({
        prazoEstimadoQuitacaoMeses: zod_1.z.number().nullable().optional(),
        economiaEstimadaJuros: zod_1.z.number().nullable().optional(),
    }),
    diagnosticoFinanceiro: exports.DiagnosticoFinanceiroSchema.optional(),
    analiseCustoOportunidade: exports.AnaliseCustoOportunidadeSchema.optional(),
    decisoesPorDivida: zod_1.z.array(exports.DecisaoPorDividaSchema).default([]),
    explicacaoCenarioAtual: zod_1.z.string().optional(),
    explicacaoMetaPlano: zod_1.z.string().optional(),
    explicacaoEsforcoMensal: zod_1.z.string().optional(),
    passos7Dias: zod_1.z.array(exports.ActionStepSchema).default([]),
    passos30Dias: zod_1.z.array(exports.ActionStepSchema).default([]),
    passos90Dias: zod_1.z.array(exports.ActionStepSchema).default([]),
    alertasImportantes: zod_1.z.array(zod_1.z.string()).default([]),
    tomGeral: zod_1.z.enum(['calmo', 'direto', 'motivador']).optional(),
});
//# sourceMappingURL=debtPlan.types.js.map