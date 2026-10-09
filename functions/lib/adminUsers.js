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
exports.listAdminUsers = void 0;
exports.calculateAbandonmentScore = calculateAbandonmentScore;
exports.resolveAdminUserTier = resolveAdminUserTier;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const adminPixAudit_1 = require("./adminPixAudit");
function assertAdmin(request) {
    const email = request.auth?.token?.email?.toLowerCase();
    if (!request.auth || !email || email !== adminPixAudit_1.ADMIN_EMAIL.toLowerCase()) {
        logger.warn(`[adminUsers] Acesso negado para usuário não admin: ${email || 'não autenticado'}`);
        throw new https_1.HttpsError('permission-denied', 'Acesso restrito ao administrador do sistema.');
    }
    return email;
}
function calculateAbandonmentScore(params) {
    const { daysSinceLastActive, launchCount } = params;
    if (daysSinceLastActive >= 30) {
        return { score: 6, label: 'Abandono Pleno (30d+)' };
    }
    if (daysSinceLastActive >= 14 && launchCount === 0) {
        return { score: 6, label: 'Abandono Pleno (Sem uso)' };
    }
    if (daysSinceLastActive >= 22) {
        return { score: 5, label: 'Abandono Iminente' };
    }
    if (daysSinceLastActive >= 15) {
        return { score: 4, label: 'Risco Alto' };
    }
    if (daysSinceLastActive >= 10) {
        return { score: 3, label: 'Risco Moderado' };
    }
    if (daysSinceLastActive >= 6) {
        return { score: 2, label: 'Atenção Leve' };
    }
    if (daysSinceLastActive >= 3) {
        return { score: 1, label: 'Estável' };
    }
    if (launchCount >= 5 || params.hasFinancialProfile) {
        return { score: 0, label: 'Usuário Pleno' };
    }
    return { score: 1, label: 'Iniciante Ativo' };
}
function resolveAdminUserTier(params) {
    const normalizedEmail = params.email?.toLowerCase().trim();
    const sub = params.subscription;
    const directTier = params.directTier;
    const directPlan = params.directPlan;
    const billingMain = params.billingMain;
    let tier = 'free';
    let planName = 'Gratuito';
    if (normalizedEmail && normalizedEmail === adminPixAudit_1.ADMIN_EMAIL.toLowerCase()) {
        tier = 'premium';
        planName = 'Plano Premium (Soberano Leo)';
    }
    else if (directTier === 'premium' ||
        sub?.tier === 'premium' ||
        sub?.planId?.includes('premium') ||
        (typeof sub?.plan === 'string' && sub.plan.includes('premium')) ||
        directPlan === 'premium') {
        tier = 'premium';
        planName = 'Plano Premium';
    }
    else if (directTier === 'pro' ||
        sub?.tier === 'pro' ||
        sub?.planId?.includes('pro') ||
        (typeof sub?.plan === 'string' && sub.plan.includes('pro')) ||
        directPlan === 'pro') {
        tier = 'pro';
        planName = 'Plano Pro';
    }
    else if (billingMain && billingMain.status === 'active') {
        if (billingMain.tier === 'premium') {
            tier = 'premium';
            planName = 'Plano Premium';
        }
        else if (billingMain.tier === 'pro') {
            tier = 'pro';
            planName = 'Plano Pro';
        }
    }
    const billingStatus = sub?.status || billingMain?.status || (tier !== 'free' ? 'active' : 'free');
    const isAnnual = sub?.cycle === 'annual' ||
        billingMain?.billingCycle === 'annual' ||
        sub?.planId?.includes('annual') ||
        sub?.planId?.includes('anual') ||
        (typeof sub?.plan === 'string' && (sub.plan.includes('annual') || sub.plan.includes('anual')));
    const billingCycle = sub?.cycle || billingMain?.billingCycle || (isAnnual ? 'annual' : 'monthly');
    return {
        tier,
        planName,
        billingStatus,
        billingCycle,
    };
}
exports.listAdminUsers = (0, https_1.onCall)({
    region: 'us-central1',
    cors: true,
    timeoutSeconds: 60,
}, async (request) => {
    assertAdmin(request);
    const db = (0, firestore_1.getFirestore)();
    const usersSnap = await db.collection('users').get();
    const now = Date.now();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const authMap = new Map();
    try {
        const uidsToFetch = usersSnap.docs
            .filter((d) => !d.data().email || !d.data().displayName)
            .map((d) => d.id);
        if (uidsToFetch.length > 0) {
            const auth = (0, auth_1.getAuth)();
            const batchSize = 100;
            for (let i = 0; i < uidsToFetch.length; i += batchSize) {
                const chunk = uidsToFetch.slice(i, i + batchSize).map((uid) => ({ uid }));
                const getResult = await auth.getUsers(chunk);
                for (const u of getResult.users) {
                    authMap.set(u.uid, {
                        email: u.email,
                        displayName: u.displayName,
                    });
                }
            }
        }
    }
    catch (authErr) {
        logger.warn('[adminUsers] Aviso ao buscar dados do Firebase Auth:', authErr);
    }
    const usersList = [];
    const summary = {
        totalUsers: 0,
        byTier: { free: 0, pro: 0, premium: 0 },
        activeUsers: 0,
        inactiveUsers: 0,
        abandonedCount: 0,
        averageAbandonmentScore: 0,
    };
    let scoreSum = 0;
    for (const doc of usersSnap.docs) {
        const data = doc.data();
        const uid = doc.id;
        const authData = authMap.get(uid);
        const email = data.email || authData?.email || null;
        const displayName = data.displayName || authData?.displayName || data.nickname || null;
        let billingMainData = null;
        try {
            const billingSnap = await db.collection('users').doc(uid).collection('billing').doc('main').get();
            if (billingSnap.exists) {
                billingMainData = billingSnap.data();
            }
        }
        catch {
        }
        const { tier, planName, billingStatus, billingCycle } = resolveAdminUserTier({
            email,
            directTier: data.tier,
            directPlan: data.plan,
            subscription: data.subscription,
            billingMain: billingMainData,
        });
        const createdAtRaw = data.createdAt;
        const createdAtDate = createdAtRaw instanceof firestore_1.Timestamp
            ? createdAtRaw.toDate()
            : (createdAtRaw ? new Date(createdAtRaw) : new Date(0));
        const createdAtIso = createdAtDate.getTime() > 0 ? createdAtDate.toISOString() : null;
        const lastActiveRaw = data.lastActiveAt;
        const lastActiveDate = lastActiveRaw instanceof firestore_1.Timestamp
            ? lastActiveRaw.toDate()
            : (lastActiveRaw ? new Date(lastActiveRaw) : createdAtDate);
        const lastActiveIso = lastActiveDate.getTime() > 0 ? lastActiveDate.toISOString() : null;
        const daysSinceLastActive = lastActiveDate.getTime() > 0
            ? Math.max(0, Math.floor((now - lastActiveDate.getTime()) / MS_PER_DAY))
            : 999;
        const launchCount = typeof data.launchCount === 'number' ? data.launchCount : 0;
        const hasFinancialProfile = Boolean(data.financialProfile?.monthlyIncome || data.financialProfile?.marcoZero);
        const onboardingCompleted = Boolean(data.onboardingCompleted);
        const { score, label } = calculateAbandonmentScore({
            daysSinceLastActive,
            launchCount,
            hasFinancialProfile,
        });
        const isActive = daysSinceLastActive <= 14;
        usersList.push({
            uid,
            email: email || null,
            displayName: displayName || null,
            tier,
            billingStatus,
            billingCycle,
            planName,
            createdAt: createdAtIso,
            lastActiveAt: lastActiveIso,
            daysSinceLastActive,
            launchCount,
            hasFinancialProfile,
            onboardingCompleted,
            abandonmentScore: score,
            abandonmentLabel: label,
            isActive,
        });
        summary.totalUsers++;
        summary.byTier[tier]++;
        if (isActive)
            summary.activeUsers++;
        else
            summary.inactiveUsers++;
        if (score >= 5)
            summary.abandonedCount++;
        scoreSum += score;
    }
    usersList.sort((a, b) => b.daysSinceLastActive - a.daysSinceLastActive);
    summary.averageAbandonmentScore = summary.totalUsers > 0
        ? Number((scoreSum / summary.totalUsers).toFixed(1))
        : 0;
    return {
        success: true,
        summary,
        users: usersList,
    };
});
//# sourceMappingURL=adminUsers.js.map