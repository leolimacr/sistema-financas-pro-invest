import { firestore } from '../firebase';
import { collection, doc, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';

export type JurosRotativoSource = 'conversion' | 'manual_interest' | 'scheduled_interest';

export interface JurosRotativoRecord {
  debtId: string;
  debtName: string;
  competence: string;
  appliedAt: Timestamp;
  source: JurosRotativoSource;
  principal: number;
  taxaMensal: number;
  interestAmount: number;
  newBalance: number;
  monthsLost: number;
  reverted: boolean;
  revertedAt: Timestamp | null;
}

const COLLECTION = 'jurosRotativos';

export function buildJurosRotativoId(
  debtId: string,
  competence: string,
  source: JurosRotativoSource,
): string {
  return `${debtId}_${competence}_${source}`;
}

// ─── Transaction helpers (retornam ref + data para tx.set) ───────

export function prepareConversionRecord(
  userId: string,
  params: {
    debtId: string;
    debtName: string;
    competence: string;
    principal: number;
    taxaMensal: number;
  },
) {
  const id = buildJurosRotativoId(params.debtId, params.competence, 'conversion');
  const ref = doc(firestore, 'users', userId, COLLECTION, id);
  return {
    ref,
    data: {
      debtId: params.debtId,
      debtName: params.debtName,
      competence: params.competence,
      appliedAt: Timestamp.now(),
      source: 'conversion' as const,
      principal: params.principal,
      taxaMensal: params.taxaMensal,
      interestAmount: 0,
      newBalance: params.principal,
      monthsLost: 0,
      reverted: false,
      revertedAt: null,
    },
  };
}

export function prepareManualInterestRecord(
  userId: string,
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
) {
  const id = buildJurosRotativoId(params.debtId, params.competence, 'manual_interest');
  const ref = doc(firestore, 'users', userId, COLLECTION, id);
  return {
    ref,
    data: {
      debtId: params.debtId,
      debtName: params.debtName,
      competence: params.competence,
      appliedAt: Timestamp.now(),
      source: 'manual_interest' as const,
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

export function prepareRevertMark(
  userId: string,
  debtId: string,
  competence: string,
) {
  const id = buildJurosRotativoId(debtId, competence, 'conversion');
  const ref = doc(firestore, 'users', userId, COLLECTION, id);
  return {
    ref,
    data: {
      reverted: true,
      revertedAt: Timestamp.now(),
    },
  };
}

// ─── Query helpers ────────────────────────────────────────────────

export async function getInterestHistory(
  userId: string,
  options?: {
    debtId?: string;
    startCompetence?: string;
    endCompetence?: string;
    includeReverted?: boolean;
  },
): Promise<(JurosRotativoRecord & { id: string })[]> {
  const constraints: any[] = [];

  if (options?.debtId) {
    constraints.push(where('debtId', '==', options.debtId));
  }
  if (options?.startCompetence) {
    constraints.push(where('competence', '>=', options.startCompetence));
  }
  if (options?.endCompetence) {
    constraints.push(where('competence', '<=', options.endCompetence));
  }
  constraints.push(orderBy('competence', 'asc'), orderBy('appliedAt', 'asc'));

  const ref = collection(firestore, 'users', userId, COLLECTION);
  const q = query(ref, ...constraints, limit(24));
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => ({ ...d.data(), id: d.id } as JurosRotativoRecord & { id: string }));

  if (options?.includeReverted) return all;
  return all.filter((r) => !r.reverted);
}

export interface PeriodAggregate {
  competence: string;
  totalInterest: number;
  debtCount: number;
  records: (JurosRotativoRecord & { id: string })[];
}

export async function getAggregateByPeriod(
  userId: string,
  startCompetence: string,
  endCompetence: string,
): Promise<PeriodAggregate[]> {
  const records = await getInterestHistory(userId, { startCompetence, endCompetence });

  const grouped = new Map<string, (JurosRotativoRecord & { id: string })[]>();
  for (const r of records) {
    const list = grouped.get(r.competence) ?? [];
    list.push(r);
    grouped.set(r.competence, list);
  }

  const result: PeriodAggregate[] = [];
  for (const [competence, recs] of grouped) {
    result.push({
      competence,
      totalInterest: recs.reduce((s, r) => s + r.interestAmount, 0),
      debtCount: new Set(recs.map((r) => r.debtId)).size,
      records: recs,
    });
  }
  return result.sort((a, b) => a.competence.localeCompare(b.competence));
}

export async function getTotalInterestForDebt(
  userId: string,
  debtId: string,
): Promise<number> {
  const records = await getInterestHistory(userId, { debtId });
  return records.reduce((s, r) => s + r.interestAmount, 0);
}
