export interface CompoundInterestProjection {
    finalBalance: number;
    totalInterest: number;
}
export declare function computeRotativoMonthlyInterest(saldoDevedor: number, taxaMensal: number): number;
export declare function projectRotativoCompoundInterest(saldoDevedor: number, taxaMensal: number, meses: number): CompoundInterestProjection;
export declare function hasInterestBeenAppliedThisMonth(lastAppliedAt: string | undefined | null, now?: Date): boolean;
export interface RotativoDebtData {
    id: string;
    originType?: string;
    saldoDevedor: number;
    taxaMensal: number;
    lastInterestAppliedAt?: string;
}
export declare function computeInterestForDebt(debt: RotativoDebtData, now: Date): {
    interest: number;
    monthsLost: number;
} | null;
