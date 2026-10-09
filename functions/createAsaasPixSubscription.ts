import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { ASAAS_PLANS } from './src/config/asaasConfig';
import { getAsaas } from './src/lib/getAsaas';

const db = getFirestore();

interface RequestData {
  planId: string;
  customer: {
    name: string;
    cpfCnpj: string;
    phone?: string;
  };
}

export const createAsaasPixSubscription = onCall(
  {
    cors: true,
  },
  async (request) => {
    const auth = request.auth;
    if (!auth) {
      throw new HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    const uid = auth.uid;
    const email = auth.token?.email || '';

    const data = request.data as RequestData;
    if (!data?.planId || !ASAAS_PLANS[data.planId]) {
      throw new HttpsError('invalid-argument', 'Plano inválido ou não informado.');
    }

    const planConfig = ASAAS_PLANS[data.planId];
    const customerData = data.customer;

    if (!customerData?.name || !customerData?.cpfCnpj) {
      throw new HttpsError('invalid-argument', 'Nome completo e CPF são obrigatórios para emissão do Pix.');
    }

    const cleanedCpf = customerData.cpfCnpj.replace(/\D/g, '');
    if (cleanedCpf.length !== 11 && cleanedCpf.length !== 14) {
      throw new HttpsError('invalid-argument', 'CPF ou CNPJ inválido.');
    }

    const apiKey = process.env.ASAAS_API_KEY;
    const isProd = process.env.NODE_ENV === 'production' || process.env.FUNCTIONS_EMULATOR === undefined;

    // Se não houver API key configurada (ex: ambiente de testes local/mock dev), gera payload mock
    if (!apiKey) {
      logger.warn(`[createAsaasPixSubscription] ASAAS_API_KEY ausente. Gerando resposta mock para testes de ${uid}`);
      const mockPaymentId = `pay_mock_${Date.now()}`;
      const mockSubscriptionId = `sub_mock_${Date.now()}`;
      const mockPixPayload = `00020101021226830014br.gov.bcb.pix2561pix.asaas.com/qr/v2/${mockPaymentId}5204000053039865405${planConfig.value.toFixed(2)}5802BR5920FINANCAS PRO INVEST6009SAO PAULO62070503***6304MOCK`;
      // QR Code PNG base64 de 1x1 pixel ou placeholder transparente
      const mockImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      await db.collection('users').doc(uid).collection('billing').doc('pending_asaas').set({
        subscriptionId: mockSubscriptionId,
        paymentId: mockPaymentId,
        planId: data.planId,
        tier: planConfig.tier,
        cycle: planConfig.cycle,
        value: planConfig.value,
        createdAt: Timestamp.now(),
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
      const client = getAsaas(apiKey, isProd);

      // 1. Cria ou recupera o cliente no Asaas
      logger.info(`[createAsaasPixSubscription] Criando/buscando cliente Asaas para uid=${uid}`);
      const asaasCustomer = await client.createOrGetCustomer({
        name: customerData.name,
        cpfCnpj: cleanedCpf,
        email: email || `${uid}@app.financasproinvest.com.br`,
        phone: customerData.phone,
        externalReference: uid,
      });

      // 2. Data de vencimento: hoje (YYYY-MM-DD)
      const now = new Date();
      const nextDueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // 3. Cria a assinatura Pix
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

      // 4. Busca os pagamentos gerados para a assinatura
      const payments = await client.getSubscriptionPayments(subscription.id);
      if (!payments || payments.length === 0) {
        throw new Error('Nenhuma cobrança foi gerada para esta assinatura.');
      }

      const currentPayment = payments[0];

      // 5. Gera o QR Code Pix e Copia e Cola
      const pixData = await client.getPaymentPixQrCode(currentPayment.id);

      // 6. Grava registro pendente para auditoria no Firestore
      await db.collection('users').doc(uid).collection('billing').doc('pending_asaas').set({
        subscriptionId: subscription.id,
        paymentId: currentPayment.id,
        customerId: asaasCustomer.id,
        planId: data.planId,
        tier: planConfig.tier,
        cycle: planConfig.cycle,
        value: planConfig.value,
        createdAt: Timestamp.now(),
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar assinatura no Asaas.';
      logger.error(`[createAsaasPixSubscription] Erro ao criar assinatura para ${uid}:`, msg);
      throw new HttpsError('internal', msg);
    }
  }
);
