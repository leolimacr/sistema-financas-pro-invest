import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export interface PixAuditItem {
  id: string;
  transactionId: string;
  rawTransactionId?: string;
  userId: string;
  userEmail: string | null;
  planId: string;
  planName: string;
  tier: string;
  cycle: string;
  amount: number;
  requiredAmount?: number;
  recipientName: string;
  payerName: string | null;
  bankOrigin: string | null;
  bankDestination: string | null;
  receiptDate: string | null;
  confidence: number;
  status: 'pending_review' | 'confirmed' | 'revoked' | 'auto_confirmed' | 'underpaid' | 'refunded';
  effectiveStatus: 'pending_review' | 'confirmed' | 'revoked' | 'auto_confirmed' | 'underpaid' | 'refunded';
  refundStatus?: 'waiting_pix_key' | 'refund_pending' | 'refunded' | null;
  refundPixKey?: string | null;
  refundPixKeyType?: string | null;
  refundRequestedAt?: string | null;
  refundedAt?: string | null;
  createdAt: string | null;
  deadline: string | null;
  hasReceiptImage: boolean;
  receiptBase64?: string | null;
  mimeType?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  revocationReason?: string | null;
}

export interface ListPixAuditResponse {
  success: boolean;
  items: PixAuditItem[];
}

export interface ReviewPixAuditRequest {
  transactionId: string;
  action: 'confirm' | 'revoke';
  revocationReason?: string;
}

export interface ReviewPixAuditResponse {
  success: boolean;
  action: 'confirm' | 'revoke';
  message: string;
}

export interface RequestPixRefundRequest {
  transactionId: string;
  refundPixKey: string;
  refundPixKeyType?: string;
}

export interface RequestPixRefundResponse {
  success: boolean;
  message: string;
}

export interface CompletePixRefundRequest {
  transactionId: string;
}

export interface CompletePixRefundResponse {
  success: boolean;
  message: string;
}

/**
 * Busca a fila de auditoria Pix para o administrador autorizado
 */
export async function fetchPixAuditQueue(): Promise<PixAuditItem[]> {
  const fn = httpsCallable<void, ListPixAuditResponse>(functions, 'listPixAuditQueue');
  const result = await fn();
  return result.data?.items || [];
}

/**
 * Aplica a decisão de confirmação ou revogação com 1 clique
 */
export async function executePixAuditDecision(
  payload: ReviewPixAuditRequest
): Promise<ReviewPixAuditResponse> {
  const fn = httpsCallable<ReviewPixAuditRequest, ReviewPixAuditResponse>(
    functions,
    'reviewPixAudit'
  );
  const result = await fn(payload);
  return result.data;
}

/**
 * Registra a Chave Pix enviada pelo usuário para receber a devolução de valor menor
 */
export async function requestPixRefund(
  payload: RequestPixRefundRequest
): Promise<RequestPixRefundResponse> {
  const fn = httpsCallable<RequestPixRefundRequest, RequestPixRefundResponse>(
    functions,
    'requestPixRefund'
  );
  const result = await fn(payload);
  return result.data;
}

/**
 * Acionado pelo Leo no painel de auditoria para confirmar que o Pix de devolução foi efetuado
 */
export async function executeCompletePixRefund(
  payload: CompletePixRefundRequest
): Promise<CompletePixRefundResponse> {
  const fn = httpsCallable<CompletePixRefundRequest, CompletePixRefundResponse>(
    functions,
    'completePixRefund'
  );
  const result = await fn(payload);
  return result.data;
}
