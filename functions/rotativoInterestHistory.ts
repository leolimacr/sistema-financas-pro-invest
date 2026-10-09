import { getFirestore, Timestamp } from 'firebase-admin/firestore';

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

const COLLECTION = 'jurosRotativos';

export function buildJurosRotativoId(
  debtId: string,
  competence: string,
  source: JurosRotativoSource,
): string {
  return `${debtId}_${competence}_${source}`;
}

export function prepareScheduledInterestRecord(
  db: ReturnType<typeof getFirestore>,
  uid: string,
  params: {
    debtId: string;
    debtName: string;
    competence: string;
    principal: number;
    taxaMensal: number;
    interestAmount: number;
    newBalance: number;
    monthsLost: number;
  },
): { ref: FirebaseFirestore.DocumentReference; data: JurosRotativoData } {
  const id = buildJurosRotativoId(params.debtId, params.competence, 'scheduled_interest');
  const ref = db.collection('users').doc(uid).collection(COLLECTION).doc(id);
  return {
    ref,
    data: {
      debtId: params.debtId,
      debtName: params.debtName,
      competence: params.competence,
      appliedAt: Timestamp.now(),
      source: 'scheduled_interest',
      principal: params.principal,
      taxaMensal: params.taxaMensal,
      interestAmount: params.interestAmount,
      newBalance: params.newBalance,
      monthsLost: params.monthsLost,
      reverted: false,
      revertedAt: null,
    },
  };
}
