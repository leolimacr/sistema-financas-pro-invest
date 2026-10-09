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
exports.verifyPixReceipt = exports.resolveMatchingPlan = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const secrets_1 = require("./secrets");
const clients_1 = require("./clients");
const pixManualConfig_1 = require("./src/config/pixManualConfig");
Object.defineProperty(exports, "resolveMatchingPlan", { enumerable: true, get: function () { return pixManualConfig_1.resolveMatchingPlan; } });
const mailService_1 = require("./mailService");
exports.verifyPixReceipt = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60,
    secrets: [secrets_1.GEMINI_API_KEY],
}, async (request) => {
    if (request.rawRequest && request.rawRequest.method === 'OPTIONS') {
        const res = request.rawRequest.res;
        if (res) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.status(204).send();
            return;
        }
    }
    try {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'É necessário estar autenticado para validar o comprovante.');
        }
        const userId = request.auth.uid;
        const { base64File, mimeType, planId } = request.data;
        if (!base64File || !mimeType || !planId) {
            throw new https_1.HttpsError('invalid-argument', 'Arquivo, tipo MIME e identificador do plano são obrigatórios.');
        }
        const targetPlan = pixManualConfig_1.PIX_CONFIG.plans[planId];
        if (!targetPlan) {
            throw new https_1.HttpsError('invalid-argument', `Plano "${planId}" inválido.`);
        }
        if (base64File.length > 7 * 1024 * 1024) {
            throw new https_1.HttpsError('invalid-argument', 'O arquivo do comprovante é muito grande. O limite é de 5MB.');
        }
        const cleanBase64 = base64File.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
        const db = (0, firestore_1.getFirestore)();
        const attemptsRef = db.collection(`users/${userId}/receipt_attempts`);
        const oneDayAgo = firestore_1.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
        const recentAttempts = await attemptsRef.where('createdAt', '>=', oneDayAgo).get();
        if (recentAttempts.size >= 10) {
            throw new https_1.HttpsError('resource-exhausted', 'Você atingiu o limite de 10 tentativas de validação de comprovante hoje. Entre em contato com o suporte caso precise de auxílio.');
        }
        await attemptsRef.add({
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            planId,
            mimeType,
        });
        let auditData;
        if (!process.env.GEMINI_API_KEY && process.env.NODE_ENV === 'test') {
            auditData = {
                isPixReceipt: true,
                amount: targetPlan.price,
                recipientName: pixManualConfig_1.PIX_CONFIG.recipientName,
                payerName: 'Usuário Teste',
                date: new Date().toISOString(),
                transactionId: `E000TEST_${Date.now()}`,
                bankOrigin: 'Banco Teste',
                bankDestination: pixManualConfig_1.PIX_CONFIG.bankName,
                confidence: 0.99,
            };
        }
        else {
            try {
                const genAI = (0, clients_1.getGenAI)();
                const prompt = `Você é um auditor forense bancário especialista no Sistema de Pagamentos Brasileiro (Pix / Banco Central do Brasil).
Sua tarefa é analisar o documento (imagem ou PDF) anexo e extrair com total precisão os dados do comprovante Pix.

Retorne EXCLUSIVAMENTE um objeto JSON válido com este formato:
{
  "isPixReceipt": boolean (true se for inequivocamente um comprovante de transferência Pix concluída/realizada),
  "amount": number | null (valor transferido em Reais como número decimal, ex: 19.90 ou 199.00),
  "recipientName": string | null (nome do favorecido/destinatário do Pix),
  "payerName": string | null (nome do pagador/remetente),
  "date": string | null (data e hora da transferência em formato ISO 8601 ou YYYY-MM-DD),
  "transactionId": string | null (ID da transação Pix / Código de Autenticação / Protocolo bancário / ID do Banco Central E2E que começa frequentemente com "E" e possui letras/números),
  "bankOrigin": string | null (instituição financeira de origem do pagador),
  "bankDestination": string | null (instituição financeira de destino do favorecido),
  "confidence": number (de 0 a 1 indicando o nível de certeza da leitura),
  "rejectionReason": string | null (se não for comprovante ou estiver ilegível, descreva resumidamente o motivo)
}

Regras:
1. Se o documento for um agendamento (não realizado ainda) ou boleto, "isPixReceipt" deve ser false.
2. Seja tolerante a formatos de layout de diferentes bancos (Nubank, Itaú, Bradesco, Inter, Mercado Pago, C6, Santander, etc.).
3. Extraia o código ID de transação ou autenticação completo sem truncar.`;
                const imagePart = {
                    inlineData: {
                        data: cleanBase64,
                        mimeType,
                    },
                };
                const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
                let lastError = null;
                let parsedResult = null;
                for (const modelName of candidateModels) {
                    try {
                        const model = genAI.getGenerativeModel({
                            model: modelName,
                            generationConfig: {
                                responseMimeType: 'application/json',
                                temperature: 0.1,
                            },
                        });
                        const result = await model.generateContent([prompt, imagePart]);
                        const responseText = result.response.text();
                        parsedResult = JSON.parse(responseText);
                        logger.info(`[verifyPixReceipt] Auditoria via Gemini concluída com sucesso pelo modelo "${modelName}"`);
                        break;
                    }
                    catch (modelErr) {
                        lastError = modelErr;
                        logger.warn(`[verifyPixReceipt] Modelo "${modelName}" falhou: ${modelErr.message}. Tentando próximo candidato se houver...`);
                    }
                }
                if (!parsedResult) {
                    throw lastError || new Error('Nenhum modelo Gemini conseguiu processar o documento.');
                }
                auditData = parsedResult;
            }
            catch (err) {
                logger.error(`[verifyPixReceipt] Erro ao invocar Gemini: ${err.message}`, { err });
                throw new https_1.HttpsError('invalid-argument', `Não foi possível analisar o comprovante por IA: ${err.message || 'Verifique a nitidez da imagem e tente novamente.'}`);
            }
        }
        logger.info(`[verifyPixReceipt] Auditoria concluída para usuário ${userId}:`, auditData);
        if (!auditData.isPixReceipt) {
            const reason = auditData.rejectionReason || 'O documento enviado não foi reconhecido como um comprovante Pix concluído.';
            throw new https_1.HttpsError('invalid-argument', reason);
        }
        if (typeof auditData.amount !== 'number' || auditData.amount <= 0) {
            throw new https_1.HttpsError('invalid-argument', 'Não foi possível identificar o valor transferido no comprovante. Envie uma foto mais nítida ou o PDF oficial.');
        }
        if (!auditData.recipientName || !(0, pixManualConfig_1.validateRecipientName)(auditData.recipientName, pixManualConfig_1.PIX_CONFIG.recipientName)) {
            throw new https_1.HttpsError('invalid-argument', `O favorecido no comprovante ("${auditData.recipientName || 'Desconhecido'}") não confere com o nome cadastrado da favorecida (${pixManualConfig_1.PIX_CONFIG.recipientName}).`);
        }
        const rawTxId = auditData.transactionId?.trim() || `TX_${Date.now()}`;
        const cleanTxId = rawTxId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const resolution = (0, pixManualConfig_1.resolveMatchingPlan)(planId, auditData.amount);
        if (!resolution) {
            logger.warn(`[verifyPixReceipt] Valor inferior identificado para usuário ${userId}: R$ ${auditData.amount} enviado, R$ ${targetPlan.price} requerido`);
            const auditQueueRef = db.collection('_pixAuditQueue').doc(cleanTxId);
            await auditQueueRef.set({
                transactionId: cleanTxId,
                rawTransactionId: rawTxId,
                userId,
                userEmail: request.auth.token.email || null,
                planId,
                planName: targetPlan.name,
                tier: targetPlan.tier,
                cycle: targetPlan.cycle,
                amount: auditData.amount,
                requiredAmount: targetPlan.price,
                recipientName: auditData.recipientName,
                payerName: auditData.payerName || null,
                bankOrigin: auditData.bankOrigin || null,
                bankDestination: auditData.bankDestination || null,
                receiptDate: auditData.date || null,
                confidence: auditData.confidence,
                status: 'underpaid',
                effectiveStatus: 'underpaid',
                refundStatus: 'waiting_pix_key',
                refundPixKey: null,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                receiptBase64: cleanBase64.length <= 750000 ? cleanBase64 : null,
                mimeType: cleanBase64.length <= 750000 ? mimeType : null,
            }, { merge: true });
            if (request.auth.token.email) {
                try {
                    await (0, mailService_1.sendPixUnderpaidNotification)({
                        to: request.auth.token.email,
                        name: auditData.payerName || undefined,
                        amountPaid: auditData.amount,
                        planName: targetPlan.name,
                        planPrice: targetPlan.price,
                    });
                }
                catch (mailErr) {
                    logger.error('[verifyPixReceipt] Falha ao enviar e-mail de underpaid:', mailErr);
                }
            }
            throw new https_1.HttpsError('invalid-argument', JSON.stringify({
                code: 'UNDERPAID',
                amountPaid: auditData.amount,
                requiredAmount: targetPlan.price,
                transactionId: cleanTxId,
                payerName: auditData.payerName || null,
                planName: targetPlan.name,
                message: `O valor no comprovante (R$ ${auditData.amount.toFixed(2).replace('.', ',')}) é inferior ao valor do plano ${targetPlan.name} (R$ ${targetPlan.price.toFixed(2).replace('.', ',')}).`,
            }));
        }
        const effectivePlan = resolution.plan;
        const effectivePlanId = resolution.planId;
        if (resolution.isAutoUpgraded) {
            logger.info(`[verifyPixReceipt] Auto-upgrade executado para usuário ${userId}: solicitado "${planId}", ativado "${effectivePlanId}" por valor R$ ${auditData.amount}`);
        }
        const processedReceiptRef = db.collection('_processedPixReceipts').doc(cleanTxId);
        const existingDoc = await processedReceiptRef.get();
        if (existingDoc.exists) {
            const existingData = existingDoc.data();
            const isSameUser = existingData?.userId === userId;
            if (isSameUser) {
                throw new https_1.HttpsError('already-exists', 'Você já utilizou este mesmo comprovante anteriormente. Caso sua assinatura não esteja ativa, aguarde alguns segundos ou atualize a página.');
            }
            else {
                throw new https_1.HttpsError('already-exists', 'Este comprovante bancário já foi utilizado por outra conta e não pode ser reaproveitado.');
            }
        }
        const now = new Date();
        const periodDays = effectivePlan.cycle === 'yearly' ? 365 : 30;
        const currentPeriodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);
        const batch = db.batch();
        batch.set(processedReceiptRef, {
            transactionId: cleanTxId,
            rawTransactionId: rawTxId,
            userId,
            planId: effectivePlanId,
            requestedPlanId: planId,
            tier: effectivePlan.tier,
            cycle: effectivePlan.cycle,
            amount: auditData.amount,
            recipientName: auditData.recipientName,
            payerName: auditData.payerName || null,
            bankOrigin: auditData.bankOrigin || null,
            bankDestination: auditData.bankDestination || null,
            receiptDate: auditData.date || null,
            confidence: auditData.confidence,
            verifiedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        const auditDeadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const auditQueueRef = db.collection('_pixAuditQueue').doc(cleanTxId);
        batch.set(auditQueueRef, {
            transactionId: cleanTxId,
            rawTransactionId: rawTxId,
            userId,
            userEmail: request.auth.token.email || null,
            planId: effectivePlanId,
            planName: effectivePlan.name,
            tier: effectivePlan.tier,
            cycle: effectivePlan.cycle,
            amount: auditData.amount,
            recipientName: auditData.recipientName,
            payerName: auditData.payerName || null,
            bankOrigin: auditData.bankOrigin || null,
            bankDestination: auditData.bankDestination || null,
            receiptDate: auditData.date || null,
            confidence: auditData.confidence,
            status: 'pending_review',
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            deadline: firestore_1.Timestamp.fromDate(auditDeadline),
            receiptBase64: cleanBase64.length <= 750000 ? cleanBase64 : null,
            mimeType: cleanBase64.length <= 750000 ? mimeType : null,
        });
        const billingRef = db.doc(`users/${userId}/billing/main`);
        batch.set(billingRef, {
            tier: effectivePlan.tier,
            status: 'active',
            currentPeriodEnd: firestore_1.Timestamp.fromDate(currentPeriodEnd),
            planId: effectivePlanId,
            paymentMethod: 'pix_receipt_ai',
            lastTransactionId: cleanTxId,
            amount: auditData.amount,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        const userRef = db.doc(`users/${userId}`);
        batch.set(userRef, {
            tier: effectivePlan.tier,
            subscription: {
                tier: effectivePlan.tier,
                plan: effectivePlan.tier,
                planId: effectivePlanId,
                status: 'active',
                currentPeriodEnd: firestore_1.Timestamp.fromDate(currentPeriodEnd),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        }, { merge: true });
        await batch.commit();
        logger.info(`[verifyPixReceipt] Assinatura ${effectivePlan.name} ativada com sucesso para usuário ${userId} até ${currentPeriodEnd.toISOString()}`);
        return {
            success: true,
            verifiedData: {
                planName: effectivePlan.name,
                tier: effectivePlan.tier,
                cycle: effectivePlan.cycle,
                amount: auditData.amount,
                recipientName: auditData.recipientName,
                transactionId: cleanTxId,
                currentPeriodEnd: currentPeriodEnd.toISOString(),
                isAutoUpgraded: resolution.isAutoUpgraded,
                upgradeMessage: resolution.message,
            },
        };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        logger.error('[verifyPixReceipt] Erro não tratado na validação de comprovante:', { error });
        throw new https_1.HttpsError('invalid-argument', `Falha na validação do comprovante: ${error?.message || 'Verifique se o arquivo é válido e tente novamente.'}`);
    }
});
//# sourceMappingURL=verifyPixReceipt.js.map