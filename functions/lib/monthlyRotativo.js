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
exports.monthlyRotativoInterest = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const rotativoMath_1 = require("./rotativoMath");
const presenceHelpers_1 = require("./presenceHelpers");
const rotativoInterestHistory_1 = require("./rotativoInterestHistory");
function formatCompetence(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}
exports.monthlyRotativoInterest = (0, scheduler_1.onSchedule)({
    schedule: '0 6 1 * *',
    timeZone: 'America/Sao_Paulo',
    timeoutSeconds: 300,
    memory: '256MiB',
}, async () => {
    const db = (0, firestore_1.getFirestore)();
    const now = new Date();
    const nowMs = now.getTime();
    const competence = formatCompetence(now);
    const startedAt = firestore_1.Timestamp.now();
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let totalInterestApplied = 0;
    let notifiedUserCount = 0;
    const errors = [];
    logger.info(`[monthlyRotativoInterest] Iniciando competência ${competence}`);
    const rotativoSnap = await db.collectionGroup('dividas')
        .where('originType', '==', 'rotativo_cartao')
        .get();
    const userDebtsMap = new Map();
    rotativoSnap.forEach(doc => {
        const uid = doc.ref.path.split('/')[1];
        if (!userDebtsMap.has(uid))
            userDebtsMap.set(uid, []);
        userDebtsMap.get(uid).push(doc);
    });
    for (const [uid, debtDocs] of userDebtsMap) {
        let userInterestTotal = 0;
        let userDebtCount = 0;
        let userDebtNames = [];
        try {
            for (const debtDoc of debtDocs) {
                const data = debtDoc.data();
                const debtId = debtDoc.id;
                const debt = {
                    id: debtId,
                    originType: data.originType,
                    saldoDevedor: data.saldoDevedor ?? 0,
                    taxaMensal: data.taxaMensal ?? 0,
                    lastInterestAppliedAt: data.lastInterestAppliedAt,
                };
                const result = (0, rotativoMath_1.computeInterestForDebt)(debt, now);
                if (!result) {
                    skippedCount++;
                    continue;
                }
                try {
                    await db.runTransaction(async (tx) => {
                        const ref = db.collection('users').doc(uid).collection('dividas').doc(debtId);
                        const snap = await tx.get(ref);
                        if (!snap.exists) {
                            errors.push(`${uid}/${debtId}: documento não encontrado na transação`);
                            errorCount++;
                            return;
                        }
                        const fresh = snap.data();
                        const freshSaldo = fresh.saldoDevedor ?? 0;
                        const freshTaxa = fresh.taxaMensal ?? 0;
                        const freshLastApplied = fresh.lastInterestAppliedAt;
                        if (fresh.originType !== 'rotativo_cartao') {
                            skippedCount++;
                            return;
                        }
                        if (freshSaldo <= 0 || freshTaxa <= 0) {
                            skippedCount++;
                            return;
                        }
                        const stillNeedsInterest = (0, rotativoMath_1.computeInterestForDebt)({ id: debtId, originType: 'rotativo_cartao', saldoDevedor: freshSaldo, taxaMensal: freshTaxa, lastInterestAppliedAt: freshLastApplied }, now);
                        if (!stillNeedsInterest) {
                            skippedCount++;
                            return;
                        }
                        tx.update(ref, {
                            saldoDevedor: freshSaldo + stillNeedsInterest.interest,
                            lastInterestAppliedAt: now.toISOString(),
                        });
                        const jurosRecord = (0, rotativoInterestHistory_1.prepareScheduledInterestRecord)(db, uid, {
                            debtId,
                            debtName: fresh.nome ?? 'Rotativo',
                            competence,
                            principal: freshSaldo,
                            taxaMensal: freshTaxa,
                            interestAmount: stillNeedsInterest.interest,
                            newBalance: freshSaldo + stillNeedsInterest.interest,
                            monthsLost: stillNeedsInterest.monthsLost,
                        });
                        tx.set(jurosRecord.ref, jurosRecord.data);
                        processedCount++;
                        totalInterestApplied += stillNeedsInterest.interest;
                        userInterestTotal += stillNeedsInterest.interest;
                        userDebtCount++;
                        if (data.nome && typeof data.nome === 'string') {
                            userDebtNames.push(data.nome);
                        }
                    });
                }
                catch (txErr) {
                    const msg = txErr instanceof Error ? txErr.message : String(txErr);
                    errors.push(`${uid}/${debtId}: ${msg}`);
                    errorCount++;
                }
            }
            if (userInterestTotal > 0) {
                const primaryName = userDebtNames[0] ?? 'dívida rotativa';
                const suffix = userDebtCount > 1
                    ? ` e ${userDebtCount - 1} outra${userDebtCount - 1 > 1 ? 's' : ''} dívida${userDebtCount - 1 > 1 ? 's' : ''}`
                    : '';
                await (0, presenceHelpers_1.createEvent)(db, uid, nowMs, {
                    eventType: 'rotativo.interest_applied',
                    persona: 'debts',
                    urgency: 'medium',
                    message: {
                        title: 'Juros do rotativo aplicados',
                        body: `R$ ${userInterestTotal.toFixed(2)} em juros foram aplicados ao saldo de ${primaryName}${suffix}.`,
                        ctaLabel: 'Ver dívidas',
                    },
                    deepLink: '/minhas-dividas',
                    channel: 'in_app',
                    cooldownHours: 720,
                    expiresInHours: 720,
                    payload: {
                        competence,
                        totalInterest: Math.round(userInterestTotal * 100) / 100,
                        debtCount: userDebtCount,
                    },
                });
                notifiedUserCount++;
            }
        }
        catch (userErr) {
            const msg = userErr instanceof Error ? userErr.message : String(userErr);
            errors.push(`${uid}: ${msg}`);
            errorCount++;
        }
    }
    const finishedAt = firestore_1.Timestamp.now();
    const logEntry = {
        type: 'monthlyRotativoInterest',
        competence,
        startedAt,
        finishedAt,
        processedCount,
        skippedCount,
        errorCount,
        totalInterestApplied: Math.round(totalInterestApplied * 100) / 100,
        notifiedUserCount,
        errors: errors.length > 0 ? errors.slice(0, 50) : null,
    };
    await db.collection('_schedulerLogs').add(logEntry);
    logger.info(`[monthlyRotativoInterest] Concluído: ${processedCount} processadas, ` +
        `${skippedCount} ignoradas, ${errorCount} erros, ` +
        `R$ ${totalInterestApplied.toFixed(2)} em juros aplicados, ` +
        `${notifiedUserCount} usuários notificados`);
});
//# sourceMappingURL=monthlyRotativo.js.map