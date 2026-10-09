"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.completePixRefund = exports.requestPixRefund = exports.reviewPixAudit = exports.listPixAuditQueue = exports.ADMIN_EMAIL = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const mailService_1 = require("./mailService");
exports.ADMIN_EMAIL = 'leolimacr@hotmail.com';
function assertAdmin(request) {
    const email = request.auth?.token?.email?.toLowerCase();
    if (!request.auth || !email || email !== exports.ADMIN_EMAIL.toLowerCase()) {
        logger.warn(`[adminPixAudit] Acesso negado para usuário não admin: ${email || 'não autenticado'}`);
        throw new https_1.HttpsError('permission-denied', 'Acesso restrito ao administrador do sistema.');
    }
    return email;
}
exports.listPixAuditQueue = (0, https_1.onCall)({
    region: 'us-central1',
    cors: true,
}, async (request) => {
    assertAdmin(request);
    const db = (0, firestore_1.getFirestore)();
    const snapshot = await db
        .collection('_pixAuditQueue')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
    const now = Date.now();
    const items = [];
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const deadlineMillis = data.deadline instanceof firestore_1.Timestamp
            ? data.deadline.toMillis()
            : (data.deadline ? new Date(data.deadline).getTime() : 0);
        const createdAtIso = data.createdAt instanceof firestore_1.Timestamp
            ? data.createdAt.toDate().toISOString()
            : (data.createdAt ? new Date(data.createdAt).toISOString() : null);
        const deadlineIso = data.deadline instanceof firestore_1.Timestamp
            ? data.deadline.toDate().toISOString()
            : (data.deadline ? new Date(data.deadline).toISOString() : null);
        let effectiveStatus = data.status || 'pending_review';
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
            refundRequestedAt: data.refundRequestedAt instanceof firestore_1.Timestamp ? data.refundRequestedAt.toDate().toISOString() : null,
            refundedAt: data.refundedAt instanceof firestore_1.Timestamp ? data.refundedAt.toDate().toISOString() : null,
            createdAt: createdAtIso,
            deadline: deadlineIso,
            hasReceiptImage: Boolean(data.receiptBase64),
            receiptBase64: data.receiptBase64 || null,
            mimeType: data.mimeType || 'image/jpeg',
            reviewedAt: data.reviewedAt instanceof firestore_1.Timestamp ? data.reviewedAt.toDate().toISOString() : null,
            reviewedBy: data.reviewedBy || null,
            revocationReason: data.revocationReason || null,
        });
    }
    return { success: true, items };
});
exports.reviewPixAudit = (0, https_1.onCall)({
    region: 'us-central1',
    cors: true,
}, async (request) => {
    const adminEmail = assertAdmin(request);
    const { transactionId, action, revocationReason } = (request.data || {});
    if (!transactionId || !action || !['confirm', 'revoke'].includes(action)) {
        throw new https_1.HttpsError('invalid-argument', 'Identificador de transação e ação válida ("confirm" ou "revoke") são obrigatórios.');
    }
    const db = (0, firestore_1.getFirestore)();
    const cleanTxId = transactionId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const queueDocRef = db.collection('_pixAuditQueue').doc(cleanTxId);
    const queueDoc = await queueDocRef.get();
    if (!queueDoc.exists) {
        throw new https_1.HttpsError('not-found', `Transação de auditoria "${cleanTxId}" não encontrada.`);
    }
    const queueData = queueDoc.data();
    const userId = queueData.userId;
    if (action === 'confirm') {
        await queueDocRef.update({
            status: 'confirmed',
            reviewedAt: firestore_1.FieldValue.serverTimestamp(),
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
        batch.update(queueDocRef, {
            status: 'revoked',
            revocationReason: reason,
            reviewedAt: firestore_1.FieldValue.serverTimestamp(),
            reviewedBy: adminEmail,
        });
        if (userId) {
            const billingRef = db.doc(`users/${userId}/billing/main`);
            batch.set(billingRef, {
                tier: 'free',
                status: 'revoked',
                revokedAt: firestore_1.FieldValue.serverTimestamp(),
                revokedBy: adminEmail,
                revocationReason: reason,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            }, { merge: true });
            const userRef = db.doc(`users/${userId}`);
            batch.set(userRef, {
                tier: 'free',
                subscription: {
                    tier: 'free',
                    plan: 'free',
                    planId: 'free',
                    status: 'revoked',
                    revokedAt: firestore_1.FieldValue.serverTimestamp(),
                    revokedBy: adminEmail,
                    revocationReason: reason,
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                },
            }, { merge: true });
            const notificationRef = db.collection(`users/${userId}/notifications`).doc();
            batch.set(notificationRef, {
                type: 'pix_revocation',
                title: 'Assinatura Pix Revogada',
                message: `Sua assinatura via Pix foi revogada: ${reason}. Seu plano foi rebaixado para Gratuito. Caso tenha realizado o pagamento, entre em contato com nosso suporte com o comprovante.`,
                revocationReason: reason,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
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
    throw new https_1.HttpsError('invalid-argument', 'Ação desconhecida.');
});
exports.requestPixRefund = (0, https_1.onCall)({
    region: 'us-central1',
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado.');
    }
    const userId = request.auth.uid;
    const { transactionId, refundPixKey, refundPixKeyType } = (request.data || {});
    if (!transactionId || !refundPixKey || !refundPixKey.trim()) {
        throw new https_1.HttpsError('invalid-argument', 'ID da transação e Chave Pix para devolução são obrigatórios.');
    }
    const cleanTxId = transactionId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const db = (0, firestore_1.getFirestore)();
    const queueDocRef = db.collection('_pixAuditQueue').doc(cleanTxId);
    const queueDoc = await queueDocRef.get();
    if (!queueDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Transação não encontrada.');
    }
    const data = queueDoc.data();
    if (data.userId !== userId) {
        throw new https_1.HttpsError('permission-denied', 'Você não tem permissão para alterar esta transação.');
    }
    await queueDocRef.update({
        refundPixKey: refundPixKey.trim(),
        refundPixKeyType: refundPixKeyType || 'chave_pix',
        refundStatus: 'refund_pending',
        refundRequestedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    logger.info(`[requestPixRefund] Chave Pix para devolução cadastrada pelo usuário ${userId} para transação ${cleanTxId}: ${refundPixKey.trim()}`);
    return {
        success: true,
        message: 'Sua chave Pix foi registrada com sucesso. A devolução será efetuada em até 2 dias úteis após conferência bancária.',
    };
});
exports.completePixRefund = (0, https_1.onCall)({
    region: 'us-central1',
    cors: true,
}, async (request) => {
    const adminEmail = assertAdmin(request);
    const { transactionId } = (request.data || {});
    if (!transactionId) {
        throw new https_1.HttpsError('invalid-argument', 'ID da transação é obrigatório.');
    }
    const cleanTxId = transactionId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const db = (0, firestore_1.getFirestore)();
    const queueDocRef = db.collection('_pixAuditQueue').doc(cleanTxId);
    const queueDoc = await queueDocRef.get();
    if (!queueDoc.exists) {
        throw new https_1.HttpsError('not-found', 'Transação não encontrada.');
    }
    const data = queueDoc.data();
    await queueDocRef.update({
        status: 'refunded',
        effectiveStatus: 'refunded',
        refundStatus: 'refunded',
        refundedAt: firestore_1.FieldValue.serverTimestamp(),
        refundedBy: adminEmail,
    });
    if (data.userEmail) {
        try {
            await (0, mailService_1.sendPixRefundCompletedNotification)({
                to: data.userEmail,
                name: data.payerName || undefined,
                amountRefunded: Number(data.amount) || 0,
                pixKey: data.refundPixKey || 'Chave Pix informada',
            });
        }
        catch (mailErr) {
            logger.error('[completePixRefund] Erro ao enviar e-mail de devolução concluída:', mailErr);
        }
    }
    logger.info(`[completePixRefund] Devolução da transação ${cleanTxId} concluída pelo admin ${adminEmail}`);
    return {
        success: true,
        message: 'Devolução confirmada com sucesso e e-mail automático enviado ao usuário.',
    };
});
//# sourceMappingURL=adminPixAudit.js.map