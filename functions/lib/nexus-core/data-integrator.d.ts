export interface FinancialProfile {
    monthlyIncome: number;
    emergencyReserveTarget: number;
    emergencyReserveCurrent: number;
}
export interface UserGoal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: Date;
    category: 'retirement' | 'travel' | 'property' | 'education' | 'emergency' | 'investment';
    priority: 'low' | 'medium' | 'high';
}
export interface UserTransaction {
    id: string;
    date: Date;
    description: string;
    amount: number;
    category: string;
    type: 'income' | 'expense';
    userId: string;
}
export interface UserSimulation {
    id: string;
    label: string;
    details: string;
    createdAt: Date;
    parameters: Record<string, any>;
    results: Record<string, any>;
}
export interface UserDataResult {
    goals: UserGoal[];
    recentTransactions: UserTransaction[];
    simulations: UserSimulation[];
    financialProfile?: FinancialProfile;
    summary: string;
    hasData: boolean;
    dataStatus: 'ok' | 'empty' | 'error';
    error?: string;
}
export declare class DataIntegrator {
    static gatherUserData(userId: string, userPlan?: string): Promise<UserDataResult>;
    private static fetchRecentTransactionsWithTimeout;
    private static fetchUserGoalsWithTimeout;
    static formatTransactionsForPrompt(transactions: UserTransaction[], _context: any): string;
    static formatGoalsForPrompt(goals: UserGoal[], _context: any): string;
    static formatAssetsSummary(assets: any[]): string;
    static formatPassivesSummary(passives: any[]): string;
    static formatDebtsSummary(debts: any[]): string;
    static formatBillsSummary(bills: any[]): string;
    static formatCardsSummary(cards: any[], invoices?: any[]): string;
    static formatPatrimonioVisaoGerencial(assets: any[], passives: any[]): string;
    static formatSimulationsForPrompt(simulations: UserSimulation[], _context: any): string;
    private static filterRelevantTransactions;
    private static generateTransactionSummary;
    private static generateDataSummary;
    private static mapGoalCategory;
}
export declare const NEXUS_TX_CAPS: Record<string, {
    days: number;
    max: number;
}>;
export declare function txCapsByPlan(plan?: string): {
    days: number;
    max: number;
};
export declare const MAX_PROMPT_SEGMENT_CHARS = 4000;
export declare function truncatePromptSegment(text: string, max?: number): string;
export declare const MAX_GOALS_LISTED = 20;
