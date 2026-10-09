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
exports.expireCanceledSubscriptions = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const MAX_BATCH_SIZE = 500;
exports.expireCanceledSubscriptions = (0, scheduler_1.onSchedule)('every 6 hours', async () => {
    const db = (0, firestore_1.getFirestore)();
    const now = firestore_1.Timestamp.now();
    let totalExpired = 0;
    let lastDoc = null;
    let hasMore = true;
    while (hasMore) {
        let query = db.collectionGroup('billing')
            .where('status', '==', 'canceled')
            .where('currentPeriodEnd', '<', now)
            .orderBy('currentPeriodEnd')
            .limit(MAX_BATCH_SIZE);
        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }
        const snapshot = await query.get();
        if (snapshot.empty)
            break;
        const batch = db.batch();
        let batchCount = 0;
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.tier === 'free')
                return;
            if (!data.currentPeriodEnd)
                return;
            batch.update(doc.ref, {
                status: 'expired',
                updatedAt: now,
            });
            batchCount++;
            totalExpired++;
        });
        if (batchCount > 0) {
            await batch.commit();
        }
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        hasMore = snapshot.docs.length >= MAX_BATCH_SIZE;
    }
    if (totalExpired > 0) {
        logger.info(`Scheduler: expired ${totalExpired} canceled subscriptions`);
    }
});
//# sourceMappingURL=schedulerExpireCanceled.js.map