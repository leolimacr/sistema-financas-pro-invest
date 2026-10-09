import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendPixRefundCompletedNotification } from './mailService';

export const ADMIN_EMAIL = 'leolimacr@hotmail.com';

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

export interface ReviewPixAuditPayload {
  transactionId: string;
  action: 'confirm' | 'revoke';
  revocationReason?: string;
}

function assertAdmin(request: any): string {
  const email = request.auth?.token?.email?.toLowerCase();
  if (!request.auth || !email || email !== ADMIN_EMAIL.toLowerCase()) {
    logger.warn(`[adminPixAudit] Acesso negado para usuário não admin: ${email || 'não autenticado'}`);
    throw new HttpsError('permission-denied', 'Acesso restrito ao administrador do sistema.');
  }
  return email;
}

/**
 * Lista a fila de auditoria Pix com cálculo de inércia (3 dias corridos)
 */
export const listPixAuditQueue = onCall(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request) => {
    assertAdmin(request);

    const db = getFirestore();
    const snapshot = await db
      .collection('_pixAuditQueue')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const now = Date.now();
    const items: PixAuditItem[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const deadlineMillis = data.deadline instanceof Timestamp 
        ? data.deadline.toMillis() 
        : (data.deadline ? new Date(data.deadline).getTime() : 0);
      
      const createdAtIso = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate().toISOString() 
        : (data.createdAt ? new Date(data.createdAt).toISOString() : null);

      const deadlineIso = data.deadline instanceof Timestamp 
        ? data.deadline.toDate().toISOString() 
        : (data.deadline ? new Date(data.deadline).toISOString() : null);

      let effectiveStatus = data.status || 'pending_review';

      // Regra da 3ª Via: Inércia / Não Fazer Nada
      // Se passaram 3 dias sem ação manual e ainda estava pending_review, é considerado auto_confirmed
      if (effectiveStatus === 'pending_review' && deadlineMillis > 0 && now >= deadlineMillis) {
        effectiveStatus = 'auto_confirmed';
      }

      items.push({
        id: doc.id,
        transactionId: data.transactionId || doc.id,
        rawTransactionId: data.rawTransactionId || null,
        userId: data.userId || '',
        userEmail: data.userEmail || null,
        planId: data.planId || '',
        planName: data.planName || 'Plano Pro/Premium',
        tier: data.tier || 'pro',
        cycle: data.cycle || 'monthly',
        amount: Number(data.amount) || 0,
        requiredAmount: data.requiredAmount ? Number(data.requiredAmount) : undefined,
        recipientName: data.recipientName || '',
        payerName: data.payerName || null,
        bankOrigin: data.bankOrigin || null,
        bankDestination: data.bankDestination || null,
        receiptDate: data.receiptDate || null,
        confidence: Number(data.confidence) || 1,
        status: data.status || 'pending_review',
        effectiveStatus,
        refundStatus: data.refundStatus || null,
        refundPixKey: data.refundPixKey || null,
        refundPixKeyType: data.refundPixKeyType || null,
        refundRequestedAt: data.refundRequestedAt instanceof Timestamp ? data.refundRequestedAt.toDate().toISOString() : null,
        refundedAt: data.refundedAt instanceof Timestamp ? data.refundedAt.toDate().toISOString() : null,
        createdAt: createdAtIso,
        deadline: deadlineIso,
        hasReceiptImage: Boolean(data.receiptBase64),
        receiptBase64: data.receiptBase64 || null,
        mimeType: data.mimeType || 'image/jpeg',
        reviewedAt: data.reviewedAt instanceof Timestamp ? data.reviewedAt.toDate().toISOString() : null,
        reviewedBy: data.reviewedBy || null,
        revocationReason: data.revocationReason || null,
      });
    }

    return { success: true, items };
  }
);

/**
 * Aplica decisão administrativa na esteira Pix (Confirmar ou Revogar)
 */
export const reviewPixAudit = onCall(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request) => {
    const adminEmail = assertAdmin(request);
    const { transactionId, action, revocationReason } = (request.data || {}) as ReviewPixAuditPayload;

    if (!transactionId || !action || !['confirm', 'revoke'].includes(action)) {
      throw new HttpsError('invalid-argument', 'Identificador de transação e ação válida ("confirm" ou "revoke") são obrigatórios.');
    }

    const db = getFirestore();
    const cleanTxId = transactionId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const queueDocRef = db.collection('_pixAuditQueue').doc(cleanTxId);
    const queueDoc = await queueDocRef.get();

    if (!queueDoc.exists) {
      throw new HttpsError('not-found', `Transação de auditoria "${cleanTxId}" não encontrada.`);
    }

    const queueData = queueDoc.data()!;
    const userId = queueData.userId;

    if (action === 'confirm') {
      await queueDocRef.update({
        status: 'confirmed',
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: adminEmail,
      });

      logger.info(`[reviewPixAudit] Transação ${cleanTxId} confirmada manualmente pelo administrador ${adminEmail}`);

      return {
        success: true,
        action: 'confirm',
        message: 'Pagamento confirmado com sucesso. A assinatura permanece ativa.',
      };
    }

    if (action === 'revoke') {
      const reason = (revocationReason || '').trim() || 'Transferência Pix não identificada no extrato bancário.';
      const batch = db.batch();

      // 1. Atualiza o status na fila de auditoria
      batch.update(queueDocRef, {
        status: 'revoked',
        revocationReason: reason,
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: adminEmail,
      });

      // 2. Rebaixa a assinatura no billing/main do usuário
      if (userId) {
        const billingRef = db.doc(`users/${userId}/billing/main`);
        batch.set(
          billingRef,
          {
            tier: 'free',
            status: 'revoked',
            revokedAt: FieldValue.serverTimestamp(),
            revokedBy: adminEmail,
            revocationReason: reason,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        // 3. Rebaixa o perfil principal do usuário
        const userRef = db.doc(`users/${userId}`);
        batch.set(
          userRef,
          {
            tier: 'free',
            subscription: {
              tier: 'free',
              plan: 'free',
              planId: 'free',
              status: 'revoked',
              revokedAt: FieldValue.serverTimestamp(),
              revokedBy: adminEmail,
              revocationReason: reason,
              updatedAt: FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );

        // 4. Cria notificação in-app para o usuário
        const notificationRef = db.collection(`users/${userId}/notifications`).doc();
        batch.set(notificationRef, {
          type: 'pix_revocation',
          title: 'Assinatura Pix Revogada',
          message: `Sua assinatura via Pix foi revogada: ${reason}. Seu plano foi rebaixado para Gratuito. Caso tenha realizado o pagamento, entre em contato com nosso suporte com o comprovante.`,
          revocationReason: reason,
          createdAt: FieldValue.serverTimestamp(),
          read: false,
        });
      }

      await batch.commit();

      logger.warn(`[reviewPixAudit] Assinatura revogada para transação ${cleanTxId} do usuário ${userId} por ${adminEmail}: ${reason}`);

      return {
        success: true,
        action: 'revoke',
        message: 'Assinatura revogada com sucesso. O usuário foi rebaixado para o plano Gratuito e notificado.',
      };
    }

    throw new HttpsError('invalid-argument', 'Ação desconhecida.');
  }
);

export interface RequestPixRefundPayload {
  transactionId: string;
  refundPixKey: string;
  refundPixKeyType?: string;
}

/**
 * Endpoint para o usuário registrar a Chave Pix onde deseja receber o estorno de valor menor
 */
export const requestPixRefund = onCall(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    const userId = request.auth.uid;
    const { transactionId, refundPixKey, refundPixKeyType } = (request.data || {}) as RequestPixRefundPayload;

    if (!transactionId || !refundPixKey || !refundPixKey.trim()) {
      throw new HttpsError('invalid-argument', 'ID da transação e Chave Pix para devolução são obrigatórios.');
    }

    const cleanTxId = transactionId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const db = getFirestore();
    const queueDocRef = db.collection('_pixAuditQueue').doc(cleanTxId);
    const queueDoc = await queueDocRef.get();

    if (!queueDoc.exists) {
      throw new HttpsError('not-found', 'Transação não encontrada.');
    }

    const data = queueDoc.data()!;
    if (data.userId !== userId) {
      throw new HttpsError('permission-denied', 'Você não tem permissão para alterar esta transação.');
    }

    await queueDocRef.update({
      refundPixKey: refundPixKey.trim(),
      refundPixKeyType: refundPixKeyType || 'chave_pix',
      refundStatus: 'refund_pending',
      refundRequestedAt: FieldValue.serverTimestamp(),
    });

    logger.info(`[requestPixRefund] Chave Pix para devolução cadastrada pelo usuário ${userId} para transação ${cleanTxId}: ${refundPixKey.trim()}`);

    return {
      success: true,
      message: 'Sua chave Pix foi registrada com sucesso. A devolução será efetuada em até 2 dias úteis após conferência bancária.',
    };
  }
);

export interface CompletePixRefundPayload {
  transactionId: string;
}

/**
 * Endpoint para o Leo (administrador) confirmar que o Pix de devolução foi efetuado na conta
 * Dispara automaticamente um e-mail de confirmação para o usuário
 */
export const completePixRefund = onCall(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request) => {
    const adminEmail = assertAdmin(request);
    const { transactionId } = (request.data || {}) as CompletePixRefundPayload;

    if (!transactionId) {
      throw new HttpsError('invalid-argument', 'ID da transação é obrigatório.');
    }

    const cleanTxId = transactionId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const db = getFirestore();
    const queueDocRef = db.collection('_pixAuditQueue').doc(cleanTxId);
    const queueDoc = await queueDocRef.get();

    if (!queueDoc.exists) {
      throw new HttpsError('not-found', 'Transação não encontrada.');
    }

    const data = queueDoc.data()!;

    await queueDocRef.update({
      status: 'refunded',
      effectiveStatus: 'refunded',
      refundStatus: 'refunded',
      refundedAt: FieldValue.serverTimestamp(),
      refundedBy: adminEmail,
    });

    // Dispara e-mail automático para o usuário confirmando o Pix de devolução
    if (data.userEmail) {
      try {
        await sendPixRefundCompletedNotification({
          to: data.userEmail,
          name: data.payerName || undefined,
          amountRefunded: Number(data.amount) || 0,
          pixKey: data.refundPixKey || 'Chave Pix informada',
        });
      } catch (mailErr: any) {
        logger.error('[completePixRefund] Erro ao enviar e-mail de devolução concluída:', mailErr);
      }
    }

    logger.info(`[completePixRefund] Devolução da transação ${cleanTxId} concluída pelo admin ${adminEmail}`);

    return {
      success: true,
      message: 'Devolução confirmada com sucesso e e-mail automático enviado ao usuário.',
    };
  }
);

