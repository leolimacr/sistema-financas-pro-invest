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
exports.handleStripeWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const normalizeSubscription_1 = require("./src/helpers/normalizeSubscription");
const computeEntitlements_1 = require("./src/helpers/computeEntitlements");
const getStripe_1 = require("./src/lib/getStripe");
const secrets_1 = require("./secrets");
const db = (0, firestore_1.getFirestore)();
async function isEventProcessed(eventId) {
    const doc = await db.collection('_stripeEvents').doc(eventId).get();
    return doc.exists;
}
async function markEventProcessed(eventId, eventType, userId) {
    await db.collection('_stripeEvents').doc(eventId).set({
        processedAt: firestore_1.Timestamp.now(),
        type: eventType,
        userId,
    });
}
async function resolveUserIdFromCustomer(customer) {
    if (!customer)
        return null;
    const customerId = typeof customer === 'string' ? customer : customer.id;
    try {
        const c = await (0, getStripe_1.getStripe)().customers.retrieve(customerId);
        return c.deleted ? null : c.metadata?.userId ?? null;
    }
    catch {
        return null;
    }
}
function getLegacyPlanId(tier, billingCycle) {
    if (tier === 'free')
        return 'free';
    if (tier === 'pro')
        return 'pro_monthly';
    if (billingCycle === 'annual')
        return 'premium_annual';
    return 'premium_monthly';
}
async function writeBillingAndLegacy(userId, billingData, legacyPlanId) {
    const userRef = db.collection('users').doc(userId);
    const batch = db.batch();
    const entitlements = (0, computeEntitlements_1.computeEntitlements)(billingData.tier, billingData.status);
    batch.set(userRef.collection('billing').doc('main'), {
        ...billingData,
        entitlements,
    }, { merge: true });
    const legacyStatus = billingData.status === 'trialing' ? 'trialing' :
        billingData.status === 'past_due' ? 'past_due' :
            billingData.status === 'canceled' ? 'canceled' : 'active';
    batch.set(userRef, {
        plan: billingData.tier,
        subscription: {
            status: legacyStatus,
            planId: legacyPlanId,
            currentPeriodEnd: billingData.currentPeriodEnd,
        },
    }, { merge: true });
    await batch.commit();
}
async function handleSubscriptionLifecycle(subscription, eventId, eventType) {
    let userId = subscription.metadata?.userId ?? null;
    if (!userId) {
        userId = await resolveUserIdFromCustomer(subscription.customer);
    }
    if (!userId)
        return;
    const billingData = (0, normalizeSubscription_1.normalizeSubscription)(subscription, userId);
    const legacyPlanId = getLegacyPlanId(billingData.tier, billingData.billingCycle);
    await writeBillingAndLegacy(userId, billingData, legacyPlanId);
    await markEventProcessed(eventId, eventType, userId);
}
async function handleDeleted(subscription, eventId) {
    let userId = subscription.metadata?.userId ?? null;
    if (!userId) {
        userId = await resolveUserIdFromCustomer(subscription.customer);
    }
    if (!userId)
        return;
    const billingData = (0, normalizeSubscription_1.normalizeDeletedSubscription)(subscription);
    const userRef = db.collection('users').doc(userId);
    const batch = db.batch();
    batch.set(userRef.collection('billing').doc('main'), {
        ...billingData,
        entitlements: (0, computeEntitlements_1.computeEntitlements)(billingData.tier, billingData.status),
    }, { merge: true });
    const legacyPlanId = getLegacyPlanId(billingData.tier, billingData.billingCycle);
    batch.set(userRef, {
        subscription: {
            status: 'canceled',
            planId: legacyPlanId,
            currentPeriodEnd: billingData.currentPeriodEnd,
        },
    }, { merge: true });
    await batch.commit();
    await markEventProcessed(eventId, 'customer.subscription.deleted', userId);
}
async function handleInvoiceEvent(invoice, eventType, eventId) {
    const sub = invoice.parent?.subscription_details?.subscription;
    if (!sub)
        return;
    const subscriptionId = typeof sub === 'string' ? sub : sub.id;
    let userId = typeof sub !== 'string' ? sub.metadata?.userId ?? null : null;
    if (!userId) {
        try {
            const fullSub = await (0, getStripe_1.getStripe)().subscriptions.retrieve(subscriptionId);
            userId = fullSub.metadata?.userId ?? await resolveUserIdFromCustomer(fullSub.customer);
        }
        catch {
            return;
        }
    }
    if (!userId)
        return;
    const userRef = db.collection('users').doc(userId);
    const billingRef = userRef.collection('billing').doc('main');
    const status = eventType === 'invoice.paid' ? 'active' : 'past_due';
    await billingRef.set({
        status,
        providerStatusRaw: status,
        updatedAt: firestore_1.Timestamp.now(),
    }, { merge: true });
    await markEventProcessed(eventId, eventType, userId);
}
exports.handleStripeWebhook = (0, https_1.onRequest)({ secrets: [secrets_1.STRIPE_WEBHOOK_SECRET, secrets_1.STRIPE_SECRET_KEY] }, async (req, res) => {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        res.status(400).send('Missing stripe-signature header');
        return;
    }
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        logger.error('STRIPE_WEBHOOK_SECRET not configured');
        res.status(500).send('Webhook secret not configured');
        return;
    }
    let event;
    try {
        event = (0, getStripe_1.getStripe)().webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid signature';
        logger.error(`Stripe webhook signature verification failed: ${message}`);
        res.status(401).send({ error: message });
        return;
    }
    if (await isEventProcessed(event.id)) {
        res.status(200).json({ received: true, idempotent: true });
        return;
    }
    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionLifecycle(event.data.object, event.id, event.type);
                break;
            case 'customer.subscription.deleted':
                await handleDeleted(event.data.object, event.id);
                break;
            case 'invoice.paid':
            case 'invoice.payment_failed':
                await handleInvoiceEvent(event.data.object, event.type, event.id);
                break;
            default:
                logger.info(`Unhandled Stripe event type: ${event.type}`);
        }
        res.status(200).json({ received: true });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`Error processing webhook event ${event.id}: ${message}`);
        res.status(500).json({ error: message });
    }
});
//# sourceMappingURL=handleStripeWebhook.js.map