import { UserDataResult } from "./data-integrator";
export interface PromptBuilderOptions {
    userName: string;
    context: any;
    marketData: string;
    userData: UserDataResult;
    assetsSummary: string;
    passivesSummary: string;
    patrimonioVisaoGerencialStr: string;
    debtsSummary: string;
    billsSummary?: string;
    cardsSummary?: string;
    isFirst: boolean;
    historyDescription: string;
    avoidRepetition: string;
    isUserCorrection: boolean;
    transactionsForPrompt: string;
    goalsForPrompt: string;
    financialFactsSection?: string;
}
export declare class PromptBuilder {
    static buildSystemPrompt(options: PromptBuilderOptions): string;
}
