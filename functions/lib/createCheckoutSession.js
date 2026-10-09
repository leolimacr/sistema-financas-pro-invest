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
exports.createCheckoutSession = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const prices_1 = require("./src/config/prices");
const getStripe_1 = require("./src/lib/getStripe");
const secrets_1 = require("./secrets");
const db = (0, firestore_1.getFirestore)();
async function getOrCreateCustomer(uid, email) {
    const snapshot = await db.collection('stripeCustomers')
        .where('uid', '==', uid)
        .limit(1)
        .get();
    if (!snapshot.empty) {
        return snapshot.docs[0].id;
    }
    const customer = await (0, getStripe_1.getStripe)().customers.create({
        email: email ?? undefined,
        metadata: { userId: uid },
    });
    await db.collection('stripeCustomers').doc(customer.id).set({
        uid,
        email: email ?? null,
        createdAt: new Date().toISOString(),
    });
    return customer.id;
}
exports.createCheckoutSession = (0, https_1.onCall)({
    secrets: [secrets_1.STRIPE_SECRET_KEY],
}, async (request) => {
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const uid = auth.uid;
    const { planId, successUrl, cancelUrl } = request.data;
    if (!planId || !prices_1.PLAN_IDS.includes(planId)) {
        throw new https_1.HttpsError('invalid-argument', `Invalid planId. Must be one of: ${prices_1.PLAN_IDS.join(', ')}`);
    }
    if (!successUrl || !cancelUrl) {
        throw new https_1.HttpsError('invalid-argument', 'successUrl and cancelUrl are required');
    }
    const email = auth.token?.email ?? null;
    const customerId = await getOrCreateCustomer(uid, email);
    const isProd = process.env.NODE_ENV === 'production'
        || process.env.FUNCTIONS_EMULATOR === undefined;
    const priceId = (0, prices_1.resolvePriceId)(planId, isProd);
    const mapping = (0, prices_1.resolvePriceMapping)(priceId);
    try {
        const session = await (0, getStripe_1.getStripe)().checkout.sessions.create({
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            customer: customerId,
            client_reference_id: uid,
            subscription_data: {
                metadata: {
                    userId: uid,
                    tier: mapping?.tier ?? 'pro',
                    billingCycle: mapping?.billingCycle ?? 'monthly',
                },
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
        });
        logger.info(`Checkout session created for user ${uid}: ${session.id}`);
        return { sessionUrl: session.url, sessionId: session.id };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create checkout session';
        logger.error(`Error creating checkout for user ${uid}: ${message}`);
        throw new https_1.HttpsError('internal', message);
    }
});
//# sourceMappingURL=createCheckoutSession.js.map