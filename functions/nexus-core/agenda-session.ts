/**
 * AGENDA SESSION - Estado estruturado de diálogo para continuidade entre turnos.
 *
 * O Nexus interpreta cada mensagem isolada. Quando uma interpretação termina em
 * clarificação (faltou um dado), este módulo persiste o contexto JÁ RESOLVIDO
 * (data, recorrência, horário, título) em users/{uid}/agenda/_nexus/sessions/{sessionId}
 * com TTL curto — assim o próximo turno não depende 100% do LLM re-derivar o que
 * já foi estabelecido.
 *
 * Segurança: a sessão é apenas memória temporária de diálogo. Nenhuma regra de
 * autenticação, propriedade, confirmação em 2 passos (pending -> commit) ou
 * limite do Firestore muda por causa dela. Nunca é um caminho de escrita direta.
 */

import { getFirestore } from 'firebase-admin/firestore';

import { sanitizeForFirestore } from '../nexusAgendaCommit';
import type {
  AgendaFilter,
  AgendaIntent,
  DateResolution,
  RecurrenceSpec,
} from './agenda-intent-schema';

/** Vida útil da sessão de diálogo antes de ser considerada expirada. */
export const SESSION_TTL_MS = 10 * 60 * 1000;

/**
 * Estado "já estabelecido" de uma conversa. Campos resolvidos pelo backend
 * (nunca inventados pelo LLM), preenchidos a cada turno de clarificação e
 * mesclados com o contexto anterior em `mergeSessionContext`.
 */
export interface AgendaSessionContext {
  sessionId: string;
  uid: string;
  intent: AgendaIntent;
  title?: string;
  date?: DateResolution;
  startTime?: string;
  endTime?: string;
  recurrence?: RecurrenceSpec;
  limitDate?: DateResolution;
  maxSlots?: boolean;
  filter?: AgendaFilter;
  location?: string | null;
  participants?: string[] | null;
  notes?: string | null;
  /** Campos ainda pendentes de resposta no fluxo atual. */
  missing: string[];
  createdAtMs: number;
  /** Instante de expiração (epoch ms). Reescrito a cada persistência. */
  expiresAtMs: number;
}

/** Contrato de persistência de sessão usado pela interpretação. */
export interface SessionStore {
  read(uid: string, sessionId: string): Promise<AgendaSessionContext | null>;
  write(context: AgendaSessionContext): Promise<void>;
}

export async function readSessionContext(
  db: ReturnType<typeof getFirestore>,
  uid: string,
  sessionId: string,
): Promise<AgendaSessionContext | null> {
  const ref = db.collection(`users/${uid}/agenda/_nexus/sessions`).doc(sessionId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return null;

  const data = snapshot.data() as Record<string, unknown> | undefined;
  if (!data) return null;

  const createdAtMs = Number(data.createdAtMs ?? 0);
  // Expiração ativa: usa o expiresAtMs gravado; documentos legados sem o campo
  // caem no fallback createdAtMs + TTL. Contexto expirado é tratado como nulo
  // mesmo com o documento ainda presente no Firestore.
  const expiresAtMs = Number(data.expiresAtMs ?? (createdAtMs ? createdAtMs + SESSION_TTL_MS : 0));
  if (!createdAtMs || !expiresAtMs || Date.now() > expiresAtMs) {
    await ref.delete().catch(() => undefined);
    return null;
  }

  return data as unknown as AgendaSessionContext;
}

export async function writeSessionContext(
  db: ReturnType<typeof getFirestore>,
  context: AgendaSessionContext,
): Promise<void> {
  // Expiração sempre recalculada a partir do momento da escrita.
  const payload: AgendaSessionContext = {
    ...context,
    expiresAtMs: Date.now() + SESSION_TTL_MS,
  };
  await db.collection(`users/${context.uid}/agenda/_nexus/sessions`).doc(context.sessionId).set(
    sanitizeForFirestore(payload) as Record<string, unknown>,
  );
}