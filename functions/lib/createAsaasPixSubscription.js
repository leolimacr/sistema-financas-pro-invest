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
exports.createAsaasPixSubscription = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const asaasConfig_1 = require("./src/config/asaasConfig");
const getAsaas_1 = require("./src/lib/getAsaas");
const db = (0, firestore_1.getFirestore)();
exports.createAsaasPixSubscription = (0, https_1.onCall)({
    cors: true,
}, async (request) => {
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado.');
    }
    const uid = auth.uid;
    const email = auth.token?.email || '';
    const data = request.data;
    if (!data?.planId || !asaasConfig_1.ASAAS_PLANS[data.planId]) {
        throw new https_1.HttpsError('invalid-argument', 'Plano inválido ou não informado.');
    }
    const planConfig = asaasConfig_1.ASAAS_PLANS[data.planId];
    const customerData = data.customer;
    if (!customerData?.name || !customerData?.cpfCnpj) {
        throw new https_1.HttpsError('invalid-argument', 'Nome completo e CPF são obrigatórios para emissão do Pix.');
    }
    const cleanedCpf = customerData.cpfCnpj.replace(/\D/g, '');
    if (cleanedCpf.length !== 11 && cleanedCpf.length !== 14) {
        throw new https_1.HttpsError('invalid-argument', 'CPF ou CNPJ inválido.');
    }
    const apiKey = process.env.ASAAS_API_KEY;
    const isProd = process.env.NODE_ENV === 'production' || process.env.FUNCTIONS_EMULATOR === undefined;
    if (!apiKey) {
        logger.warn(`[createAsaasPixSubscription] ASAAS_API_KEY ausente. Gerando resposta mock para testes de ${uid}`);
        const mockPaymentId = `pay_mock_${Date.now()}`;
        const mockSubscriptionId = `sub_mock_${Date.now()}`;
        const mockPixPayload = `00020101021226830014br.gov.bcb.pix2561pix.asaas.com/qr/v2/${mockPaymentId}5204000053039865405${planConfig.value.toFixed(2)}5802BR5920FINANCAS PRO INVEST6009SAO PAULO62070503***6304MOCK`;
        const mockImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        await db.collection('users').doc(uid).collection('billing').doc('pending_asaas').set({
            subscriptionId: mockSubscriptionId,
            paymentId: mockPaymentId,
            planId: data.planId,
            tier: planConfig.tier,
            cycle: planConfig.cycle,
            value: planConfig.value,
            createdAt: firestore_1.Timestamp.now(),
            isMock: true,
        });
        return {
            success: true,
            subscriptionId: mockSubscriptionId,
            paymentId: mockPaymentId,
            pixQrCodeImage: mockImageBase64,
            pixPayload: mockPixPayload,
            expirationDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            value: planConfig.value,
            planName: planConfig.name,
            tier: planConfig.tier,
        };
    }
    try {
        const client = (0, getAsaas_1.getAsaas)(apiKey, isProd);
        logger.info(`[createAsaasPixSubscription] Criando/buscando cliente Asaas para uid=${uid}`);
        const asaasCustomer = await client.createOrGetCustomer({
            name: customerData.name,
            cpfCnpj: cleanedCpf,
            email: email || `${uid}@app.financasproinvest.com.br`,
            phone: customerData.phone,
            externalReference: uid,
        });
        const now = new Date();
        const nextDueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        logger.info(`[createAsaasPixSubscription] Criando assinatura Asaas ${planConfig.tier} para customer=${asaasCustomer.id}`);
        const subscription = await client.createSubscription({
            customer: asaasCustomer.id,
            billingType: 'PIX',
            value: planConfig.value,
            nextDueDate,
            cycle: planConfig.cycle === 'annual' ? 'ANNUALLY' : 'MONTHLY',
            description: planConfig.description,
            externalReference: uid,
        });
        const payments = await client.getSubscriptionPayments(subscription.id);
        if (!payments || payments.length === 0) {
            throw new Error('Nenhuma cobrança foi gerada para esta assinatura.');
        }
        const currentPayment = payments[0];
        const pixData = await client.getPaymentPixQrCode(currentPayment.id);
        await db.collection('users').doc(uid).collection('billing').doc('pending_asaas').set({
            subscriptionId: subscription.id,
            paymentId: currentPayment.id,
            customerId: asaasCustomer.id,
            planId: data.planId,
            tier: planConfig.tier,
            cycle: planConfig.cycle,
            value: planConfig.value,
            createdAt: firestore_1.Timestamp.now(),
            pixPayload: pixData.payload,
            expirationDate: pixData.expirationDate,
            isMock: false,
        });
        return {
            success: true,
            subscriptionId: subscription.id,
            paymentId: currentPayment.id,
            pixQrCodeImage: pixData.encodedImage,
            pixPayload: pixData.payload,
            expirationDate: pixData.expirationDate,
            value: planConfig.value,
            planName: planConfig.name,
            tier: planConfig.tier,
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao processar assinatura no Asaas.';
        logger.error(`[createAsaasPixSubscription] Erro ao criar assinatura para ${uid}:`, msg);
        throw new https_1.HttpsError('internal', msg);
    }
});
//# sourceMappingURL=createAsaasPixSubscription.js.map