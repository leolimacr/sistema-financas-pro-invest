import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { computeEntitlements } from './src/helpers/computeEntitlements';
import { getAsaas } from './src/lib/getAsaas';

const db = getFirestore();

interface AsaasWebhookBody {
  event: string;
  payment?: {
    id: string;
    customer: string;
    subscription?: string;
    value: number;
    billingType: string;
    status: string;
    description?: string;
    externalReference?: string;
    paymentDate?: string;
    clientPaymentDate?: string;
    dueDate?: string;
  };
}

async function isEventProcessed(eventId: string): Promise<boolean> {
  const snap = await db.collection('_asaasEvents').doc(eventId).get();
  return snap.exists;
}

async function markEventProcessed(eventId: string, eventType: string, userId: string): Promise<void> {
  await db.collection('_asaasEvents').doc(eventId).set({
    processedAt: Timestamp.now(),
    type: eventType,
    userId,
  });
}

async function resolveUserId(payment: NonNullable<AsaasWebhookBody['payment']>): Promise<string | null> {
  // 1. Diretamente no externalReference do pagamento
  if (payment.externalReference && payment.externalReference.trim()) {
    return payment.externalReference.trim();
  }

  // 2. Se houver subscription, consulta os detalhes da assinatura no Asaas
  if (payment.subscription) {
    try {
      const client = getAsaas();
      const sub = await client.getSubscription(payment.subscription);
      if (sub?.externalReference && sub.externalReference.trim()) {
        return sub.externalReference.trim();
      }
    } catch (err) {
      logger.warn(`[resolveUserId] Falha ao consultar assinatura ${payment.subscription}:`, err);
    }
  }

  // 3. Fallback: consulta em users onde pending_asaas possui este paymentId ou subscriptionId
  try {
    const queryPending = await db.collectionGroup('billing')
      .where('paymentId', '==', payment.id)
      .limit(1)
      .get();

    if (!queryPending.empty) {
      const parentUser = queryPending.docs[0].ref.parent.parent;
      if (parentUser) return parentUser.id;
    }

    if (payment.subscription) {
      const querySub = await db.collectionGroup('billing')
        .where('subscriptionId', '==', payment.subscription)
        .limit(1)
        .get();

      if (!querySub.empty) {
        const parentUser = querySub.docs[0].ref.parent.parent;
        if (parentUser) return parentUser.id;
      }
    }
  } catch (err) {
    logger.warn('[resolveUserId] Falha na busca por pending_asaas:', err);
  }

  return null;
}

export const handleAsaasWebhook = onRequest(
  {
    cors: false,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // Validação de token secreto do webhook se configurado no ambiente
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (webhookToken) {
      const incomingToken = req.headers['asaas-access-token'];
      if (incomingToken !== webhookToken) {
        logger.warn('[handleAsaasWebhook] Token de webhook inválido ou ausente.');
        res.status(401).send('Unauthorized');
        return;
      }
    }

    const body = req.body as AsaasWebhookBody;
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
    const now = Timestamp.now();

    // Determina o tier com base no valor ou descrição
    const isPremium = payment.value >= 35 || (payment.description && payment.description.toLowerCase().includes('premium'));
    const isAnnual = payment.value >= 150 || (payment.description && payment.description.toLowerCase().includes('anual'));
    const tier: 'pro' | 'premium' = isPremium ? 'premium' : 'pro';
    const cycle: 'monthly' | 'annual' = isAnnual ? 'annual' : 'monthly';

    // Calcula a vigência: 32 dias para mensal, 368 dias para anual (com 2 dias de tolerância)
    const durationDays = isAnnual ? 368 : 32;
    const periodEndMs = Date.now() + durationDays * 24 * 60 * 60 * 1000;
    const currentPeriodEnd = Timestamp.fromMillis(periodEndMs);

    const batch = db.batch();

    switch (eventType) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED': {
        const entitlements = computeEntitlements(tier, 'active');

        // 1. Atualiza users/{userId}/billing/main
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

        // 2. Atualiza users/{userId} para compatibilidade com o legado
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
  }
);
