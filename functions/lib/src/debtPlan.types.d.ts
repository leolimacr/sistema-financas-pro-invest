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
export interface DebtItem {
    id: string;
    nome: string;
    saldoAtual: number;
    taxaJurosMes: number;
    parcelaMensal?: number;
    atrasoEmDias?: number;
    ehGarantida?: boolean;
    observacoes?: string;
    proposito?: string;
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
export declare const DebtSeriesSchema: z.ZodObject<{
    id: z.ZodString;
    year: z.ZodNumber;
    startMonth: z.ZodNumber;
    installmentsCount: z.ZodNumber;
    installmentValue: z.ZodNumber;
    adjustmentRate: z.ZodOptional<z.ZodNumber>;
    effectiveRate: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const DebtAdjustmentConfigSchema: z.ZodObject<{
    type: z.ZodEnum<{
        fixed: "fixed";
        annual_percent: "annual_percent";
        manual_series: "manual_series";
    }>;
    annualPercentRate: z.ZodOptional<z.ZodNumber>;
    series: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        year: z.ZodNumber;
        startMonth: z.ZodNumber;
        installmentsCount: z.ZodNumber;
        installmentValue: z.ZodNumber;
        adjustmentRate: z.ZodOptional<z.ZodNumber>;
        effectiveRate: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>;
    frequency: z.ZodOptional<z.ZodEnum<{
        annual: "annual";
        monthly: "monthly";
        quarterly: "quarterly";
        semi_annual: "semi_annual";
    }>>;
}, z.core.$strip>;
export declare const DebtItemSchema: z.ZodObject<{
    id: z.ZodString;
    nome: z.ZodString;
    saldoAtual: z.ZodNumber;
    taxaJurosMes: z.ZodNumber;
    parcelaMensal: z.ZodOptional<z.ZodNumber>;
    atrasoEmDias: z.ZodOptional<z.ZodNumber>;
    ehGarantida: z.ZodOptional<z.ZodBoolean>;
    observacoes: z.ZodOptional<z.ZodString>;
    proposito: z.ZodOptional<z.ZodString>;
    adjustmentConfig: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            fixed: "fixed";
            annual_percent: "annual_percent";
            manual_series: "manual_series";
        }>;
        annualPercentRate: z.ZodOptional<z.ZodNumber>;
        series: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            year: z.ZodNumber;
            startMonth: z.ZodNumber;
            installmentsCount: z.ZodNumber;
            installmentValue: z.ZodNumber;
            adjustmentRate: z.ZodOptional<z.ZodNumber>;
            effectiveRate: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>>;
        frequency: z.ZodOptional<z.ZodEnum<{
            annual: "annual";
            monthly: "monthly";
            quarterly: "quarterly";
            semi_annual: "semi_annual";
        }>>;
    }, z.core.$strip>>;
    currentSeriesIndex: z.ZodOptional<z.ZodNumber>;
    nextAdjustmentDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const DebtSimulationSummarySchema: z.ZodObject<{
    rendaMensalEstimada: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    despesasMensaisMedias: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    totalParcelasMensais: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    sobraMensalReal: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    janelaAnaliseDias: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    totalDividas: z.ZodNumber;
    custoTotalJurosAtual: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    prazoEstimadoQuitacaoAtual: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    prazoEstimadoQuitacaoOtimizado: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    economiaEstimadaJuros: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const PerfilContextoSchema: z.ZodObject<{
    estabilidade: z.ZodEnum<{
        estavel: "estavel";
        regular: "regular";
        volatil: "volatil";
    }>;
    reservaAtual: z.ZodNumber;
    metaReservaEmMeses: z.ZodNumber;
}, z.core.$strip>;
export declare const PatrimonioContextoSchema: z.ZodObject<{
    valorTotalInvestimentosFinanceiros: z.ZodNumber;
    valorPatrimonioLiquido: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    valorDisponivelAcimaReserva: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    usaReservaParaQuitar: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const CustoOportunidadeContextoSchema: z.ZodObject<{
    selicAno: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    cdiAno: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    retornoLiquidoEstimadoAno: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    estrategiaSugerida: z.ZodOptional<z.ZodEnum<{
        quitar: "quitar";
        amortizar: "amortizar";
        provisionar: "provisionar";
    }>>;
    justificativaBase: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const NexusDebtPlanRequestSchema: z.ZodObject<{
    usuarioPerfil: z.ZodOptional<z.ZodEnum<{
        endividado_iniciante: "endividado_iniciante";
        endividado_intermediario: "endividado_intermediario";
    }>>;
    perfilContexto: z.ZodOptional<z.ZodObject<{
        estabilidade: z.ZodEnum<{
            estavel: "estavel";
            regular: "regular";
            volatil: "volatil";
        }>;
        reservaAtual: z.ZodNumber;
        metaReservaEmMeses: z.ZodNumber;
    }, z.core.$strip>>;
    patrimonioContexto: z.ZodOptional<z.ZodObject<{
        valorTotalInvestimentosFinanceiros: z.ZodNumber;
        valorPatrimonioLiquido: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        valorDisponivelAcimaReserva: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        usaReservaParaQuitar: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    custoOportunidadeContexto: z.ZodOptional<z.ZodObject<{
        selicAno: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        cdiAno: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        retornoLiquidoEstimadoAno: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        estrategiaSugerida: z.ZodOptional<z.ZodEnum<{
            quitar: "quitar";
            amortizar: "amortizar";
            provisionar: "provisionar";
        }>>;
        justificativaBase: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    forceRegenerate: z.ZodOptional<z.ZodBoolean>;
    dividas: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        nome: z.ZodString;
        saldoAtual: z.ZodNumber;
        taxaJurosMes: z.ZodNumber;
        parcelaMensal: z.ZodOptional<z.ZodNumber>;
        atrasoEmDias: z.ZodOptional<z.ZodNumber>;
        ehGarantida: z.ZodOptional<z.ZodBoolean>;
        observacoes: z.ZodOptional<z.ZodString>;
        proposito: z.ZodOptional<z.ZodString>;
        adjustmentConfig: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<{
                fixed: "fixed";
                annual_percent: "annual_percent";
                manual_series: "manual_series";
            }>;
            annualPercentRate: z.ZodOptional<z.ZodNumber>;
            series: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                year: z.ZodNumber;
                startMonth: z.ZodNumber;
                installmentsCount: z.ZodNumber;
                installmentValue: z.ZodNumber;
                adjustmentRate: z.ZodOptional<z.ZodNumber>;
                effectiveRate: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>>;
            frequency: z.ZodOptional<z.ZodEnum<{
                annual: "annual";
                monthly: "monthly";
                quarterly: "quarterly";
                semi_annual: "semi_annual";
            }>>;
        }, z.core.$strip>>;
        currentSeriesIndex: z.ZodOptional<z.ZodNumber>;
        nextAdjustmentDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>;
    simulacao: z.ZodObject<{
        rendaMensalEstimada: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        despesasMensaisMedias: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        totalParcelasMensais: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        sobraMensalReal: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        janelaAnaliseDias: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        totalDividas: z.ZodNumber;
        custoTotalJurosAtual: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        prazoEstimadoQuitacaoAtual: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        prazoEstimadoQuitacaoOtimizado: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        economiaEstimadaJuros: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ActionStepSchema: z.ZodObject<{
    ordem: z.ZodNumber;
    horizonte: z.ZodEnum<{
        "7_dias": "7_dias";
        "30_dias": "30_dias";
        "90_dias": "90_dias";
    }>;
    descricao: z.ZodString;
    observacoes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const PriorityExplanationSchema: z.ZodObject<{
    idDividaPrioritaria: z.ZodString;
    nomeDividaPrioritaria: z.ZodString;
    motivo: z.ZodString;
    recomendacaoPrincipal: z.ZodString;
}, z.core.$strip>;
export declare const DiagnosticoFinanceiroSchema: z.ZodObject<{
    patrimonioAtivo: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    patrimonioPassivo: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    patrimonioLiquido: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    rendaMensalConsiderada: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    reservaAtual: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    metaReservaEmMeses: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    diagnosticoResumo: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const AnaliseCustoOportunidadeSchema: z.ZodObject<{
    taxaReferenciaAno: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    retornoLiquidoEstimadoAno: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    haVantagemEmAntecipar: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    resumoDecisao: z.ZodOptional<z.ZodString>;
    justificativa: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const DecisaoPorDividaSchema: z.ZodObject<{
    ordem: z.ZodOptional<z.ZodNumber>;
    nomeDivida: z.ZodString;
    acaoRecomendada: z.ZodEnum<{
        amortizar: "amortizar";
        quitar_agressivamente: "quitar_agressivamente";
        manter_parcelas: "manter_parcelas";
        renegociar: "renegociar";
        nao_antecipar: "nao_antecipar";
    }>;
    justificativa: z.ZodString;
    observacoes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const DebtPlanResponseSchema: z.ZodObject<{
    resumo3Linhas: z.ZodArray<z.ZodString>;
    prioridade: z.ZodObject<{
        idDividaPrioritaria: z.ZodString;
        nomeDividaPrioritaria: z.ZodString;
        motivo: z.ZodString;
        recomendacaoPrincipal: z.ZodString;
    }, z.core.$strip>;
    planoHorizonte: z.ZodObject<{
        prazoEstimadoQuitacaoMeses: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        economiaEstimadaJuros: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, z.core.$strip>;
    diagnosticoFinanceiro: z.ZodOptional<z.ZodObject<{
        patrimonioAtivo: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        patrimonioPassivo: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        patrimonioLiquido: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        rendaMensalConsiderada: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        reservaAtual: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        metaReservaEmMeses: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        diagnosticoResumo: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    analiseCustoOportunidade: z.ZodOptional<z.ZodObject<{
        taxaReferenciaAno: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        retornoLiquidoEstimadoAno: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        haVantagemEmAntecipar: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
        resumoDecisao: z.ZodOptional<z.ZodString>;
        justificativa: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    decisoesPorDivida: z.ZodDefault<z.ZodArray<z.ZodObject<{
        ordem: z.ZodOptional<z.ZodNumber>;
        nomeDivida: z.ZodString;
        acaoRecomendada: z.ZodEnum<{
            amortizar: "amortizar";
            quitar_agressivamente: "quitar_agressivamente";
            manter_parcelas: "manter_parcelas";
            renegociar: "renegociar";
            nao_antecipar: "nao_antecipar";
        }>;
        justificativa: z.ZodString;
        observacoes: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    explicacaoCenarioAtual: z.ZodOptional<z.ZodString>;
    explicacaoMetaPlano: z.ZodOptional<z.ZodString>;
    explicacaoEsforcoMensal: z.ZodOptional<z.ZodString>;
    passos7Dias: z.ZodDefault<z.ZodArray<z.ZodObject<{
        ordem: z.ZodNumber;
        horizonte: z.ZodEnum<{
            "7_dias": "7_dias";
            "30_dias": "30_dias";
            "90_dias": "90_dias";
        }>;
        descricao: z.ZodString;
        observacoes: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    passos30Dias: z.ZodDefault<z.ZodArray<z.ZodObject<{
        ordem: z.ZodNumber;
        horizonte: z.ZodEnum<{
            "7_dias": "7_dias";
            "30_dias": "30_dias";
            "90_dias": "90_dias";
        }>;
        descricao: z.ZodString;
        observacoes: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    passos90Dias: z.ZodDefault<z.ZodArray<z.ZodObject<{
        ordem: z.ZodNumber;
        horizonte: z.ZodEnum<{
            "7_dias": "7_dias";
            "30_dias": "30_dias";
            "90_dias": "90_dias";
        }>;
        descricao: z.ZodString;
        observacoes: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    alertasImportantes: z.ZodDefault<z.ZodArray<z.ZodString>>;
    tomGeral: z.ZodOptional<z.ZodEnum<{
        calmo: "calmo";
        direto: "direto";
        motivador: "motivador";
    }>>;
}, z.core.$strip>;
export type DebtPlanResponseSafe = z.output<typeof DebtPlanResponseSchema>;
