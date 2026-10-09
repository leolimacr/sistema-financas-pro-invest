import type { UserTransaction, UserGoal, FinancialProfile } from './data-integrator';
export interface DeterministicFinancialFacts {
    cashflow: {
        totalIncome: number;
        totalExpenses: number;
        balance: number;
        burnRatePercent: number;
        hasTransactions: boolean;
    };
    protection: {
        reserveCurrent: number;
        reserveTargetMonths: number;
        reserveTargetValue: number;
        estimatedMonthlyCost: number;
        monthsCovered: number;
        status: 'blindada' | 'em_formacao' | 'vulneravel' | 'nao_configurada';
    };
    debts: {
        totalBalance: number;
        monthlyInstallments: number;
        activeCount: number;
        maxMonthlyRate: number;
        mostExpensiveDebtName?: string;
        incomeCommitmentPercent: number;
        severity: 'critica' | 'atencao' | 'sob_controle' | 'sem_dividas';
    };
    immediateCommitments: {
        fixedBillsTotal: number;
        invoicesTotal: number;
        totalImmediate: number;
        projectedMargin: number;
    };
    wealth: {
        totalInvestments: number;
        totalProperty: number;
        netWorth: number;
    };
    narrativeFacts: string[];
}
export interface ComputeFactsParams {
    transactions?: UserTransaction[] | any[];
    goals?: UserGoal[] | any[];
    debts?: any[];
    assets?: any[];
    passives?: any[];
    bills?: any[];
    cards?: any[];
    invoices?: any[];
    financialProfile?: FinancialProfile;
}
export declare class FinancialFactsEngine {
    private static fmt;
    static computeFacts(params: ComputeFactsParams): DeterministicFinancialFacts;
    static formatForPrompt(facts: DeterministicFinancialFacts): string;
}
