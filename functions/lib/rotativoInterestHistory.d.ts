import { getFirestore } from 'firebase-admin/firestore';
type JurosRotativoSource = 'conversion' | 'manual_interest' | 'scheduled_interest';
export interface JurosRotativoData {
    debtId: string;
    debtName: string;
    competence: string;
    appliedAt: FirebaseFirestore.Timestamp;
    source: JurosRotativoSource;
    principal: number;
    taxaMensal: number;
    interestAmount: number;
    newBalance: number;
    monthsLost: number;
    reverted: boolean;
    revertedAt: null;
}
export declare function buildJurosRotativoId(debtId: string, competence: string, source: JurosRotativoSource): string;
export declare function prepareScheduledInterestRecord(db: ReturnType<typeof getFirestore>, uid: string, params: {
    debtId: string;
    debtName: string;
    competence: string;
    principal: number;
    taxaMensal: number;
    interestAmount: number;
    newBalance: number;
    monthsLost: number;
}): {
    ref: FirebaseFirestore.DocumentReference;
    data: JurosRotativoData;
};
export {};
