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
exports.handleAsaasWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const computeEntitlements_1 = require("./src/helpers/computeEntitlements");
const getAsaas_1 = require("./src/lib/getAsaas");
const db = (0, firestore_1.getFirestore)();
async function isEventProcessed(eventId) {
    const snap = await db.collection('_asaasEvents').doc(eventId).get();
    return snap.exists;
}
async function markEventProcessed(eventId, eventType, userId) {
    await db.collection('_asaasEvents').doc(eventId).set({
        processedAt: firestore_1.Timestamp.now(),
        type: eventType,
        userId,
    });
}
async function resolveUserId(payment) {
    if (payment.externalReference && payment.externalReference.trim()) {
        return payment.externalReference.trim();
    }
    if (payment.subscription) {
        try {
            const client = (0, getAsaas_1.getAsaas)();
            const sub = await client.getSubscription(payment.subscription);
            if (sub?.externalReference && sub.externalReference.trim()) {
                return sub.externalReference.trim();
            }
        }
        catch (err) {
            logger.warn(`[resolveUserId] Falha ao consultar assinatura ${payment.subscription}:`, err);
        }
    }
    try {
        const queryPending = await db.collectionGroup('billing')
            .where('paymentId', '==', payment.id)
            .limit(1)
            .get();
        if (!queryPending.empty) {
            const parentUser = queryPending.docs[0].ref.parent.parent;
            if (parentUser)
                return parentUser.id;
        }
        if (payment.subscription) {
            const querySub = await db.collectionGroup('billing')
                .where('subscriptionId', '==', payment.subscription)
                .limit(1)
                .get();
            if (!querySub.empty) {
                const parentUser = querySub.docs[0].ref.parent.parent;
                if (parentUser)
                    return parentUser.id;
            }
        }
    }
    catch (err) {
        logger.warn('[resolveUserId] Falha na busca por pending_asaas:', err);
    }
    return null;
}
exports.handleAsaasWebhook = (0, https_1.onRequest)({
    cors: false,
}, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (webhookToken) {
        const incomingToken = req.headers['asaas-access-token'];
        if (incomingToken !== webhookToken) {
            logger.warn('[handleAsaasWebhook] Token de webhook inválido ou ausente.');
            res.status(401).send('Unauthorized');
            return;
        }
    }
    const body = req.body;
    const eventType = body?.event;
    const payment = body?.payment;
    if (!eventType || !payment) {
        logger.info('[handleAsaasWebhook] Payload sem evento ou pagamento. Ignorado.');
        res.status(200).send({ received: true });
        return;
    }
    const eventId = `${payment.id}_${eventType}`;
    if (await isEventProcessed(eventId)) {
        logger.info(`[handleAsaasWebhook] Evento já processado anteriormente: ${eventId}`);
        res.status(200).send({ received: true, alreadyProcessed: true });
        return;
    }
    logger.info(`[handleAsaasWebhook] Recebido evento ${eventType} para pagamento ${payment.id}`);
    const userId = await resolveUserId(payment);
    if (!userId) {
        logger.warn(`[handleAsaasWebhook] Não foi possível identificar o userId para o pagamento ${payment.id}`);
        res.status(200).send({ received: true, userNotFound: true });
        return;
    }
    const userRef = db.collection('users').doc(userId);
    const now = firestore_1.Timestamp.now();
    const isPremium = payment.value >= 35 || (payment.description && payment.description.toLowerCase().includes('premium'));
    const isAnnual = payment.value >= 150 || (payment.description && payment.description.toLowerCase().includes('anual'));
    const tier = isPremium ? 'premium' : 'pro';
    const cycle = isAnnual ? 'annual' : 'monthly';
    const durationDays = isAnnual ? 368 : 32;
    const periodEndMs = Date.now() + durationDays * 24 * 60 * 60 * 1000;
    const currentPeriodEnd = firestore_1.Timestamp.fromMillis(periodEndMs);
    const batch = db.batch();
    switch (eventType) {
        case 'PAYMENT_RECEIVED':
        case 'PAYMENT_CONFIRMED': {
            const entitlements = (0, computeEntitlements_1.computeEntitlements)(tier, 'active');
            batch.set(userRef.collection('billing').doc('main'), {
                tier,
                status: 'active',
                billingCycle: cycle,
                provider: 'asaas',
                providerCustomerId: payment.customer,
                providerSubscriptionId: payment.subscription || null,
                providerPaymentId: payment.id,
                currentPeriodStart: now,
                currentPeriodEnd,
                entitlements,
                updatedAt: now,
            }, { merge: true });
            batch.set(userRef, {
                plan: tier,
                subscription: {
                    status: 'active',
                    planId: `${tier}_${cycle}`,
                    currentPeriodEnd,
                },
            }, { merge: true });
            break;
        }
        case 'PAYMENT_OVERDUE': {
            batch.set(userRef.collection('billing').doc('main'), {
                status: 'past_due',
                updatedAt: now,
            }, { merge: true });
            batch.set(userRef, {
                'subscription.status': 'past_due',
            }, { merge: true });
            break;
        }
        case 'SUBSCRIPTION_DELETED':
        case 'PAYMENT_DELETED': {
            batch.set(userRef.collection('billing').doc('main'), {
                status: 'canceled',
                updatedAt: now,
            }, { merge: true });
            batch.set(userRef, {
                'subscription.status': 'canceled',
            }, { merge: true });
            break;
        }
        default:
            logger.info(`[handleAsaasWebhook] Evento ${eventType} não altera entitlements.`);
            break;
    }
    await batch.commit();
    await markEventProcessed(eventId, eventType, userId);
    logger.info(`[handleAsaasWebhook] Sucesso: atualizado billing de ${userId} para tier=${tier} (evento=${eventType})`);
    res.status(200).send({ received: true, processed: true, userId });
});
//# sourceMappingURL=handleAsaasWebhook.js.map