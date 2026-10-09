import { Capacitor } from '@capacitor/core';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../firebase';
import { PresenceEventService } from './PresenceEventService';

export interface VipInterestData {
  userId: string;
  email: string;
  name?: string;
  whatsapp?: string;
  tier: 'pro' | 'premium';
  cycle: 'monthly' | 'yearly';
}

/**
 * Produtos configurados para Google Play Billing (quando as contas de desenvolvedor
 * e recebimento forem ativadas no Google Play Console).
 */
export const PLAY_STORE_PRODUCT_IDS = {
  pro_monthly: 'fpi_pro_monthly',
  pro_yearly: 'fpi_pro_yearly',
  premium_monthly: 'fpi_premium_monthly',
  premium_yearly: 'fpi_premium_yearly',
} as const;

/**
 * Flag controladora de prontidão comercial:
 * Mantida estritamente em `false` até a ativação das contas comerciais na Play Store / Stripe.
 * Permite alternar via variável de ambiente quando o momento de abertura chegar.
 */
export function isBillingReady(): boolean {
  return import.meta.env.VITE_BILLING_ENABLED === 'true';
}

/**
 * Registra o interesse de um usuário na Lista VIP de Lançamento no Firestore
 * e emite confirmação na mesa do Sininho.
 */
export async function registerVipInterest(data: VipInterestData): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  const platform = isNative ? 'android' : 'web';
  const now = new Date();
  const docId = `${data.tier}_${data.cycle}_${now.getTime()}`;

  const payload = {
    userId: data.userId,
    email: data.email.trim(),
    name: (data.name || '').trim(),
    whatsapp: (data.whatsapp || '').trim(),
    tier: data.tier,
    cycle: data.cycle,
    platform,
    registeredAt: serverTimestamp(),
    status: 'interested',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };

  // 1. Grava o documento no histórico de interesse do usuário
  const userVipRef = doc(collection(firestore, `users/${data.userId}/vip_interest`), docId);
  await setDoc(userVipRef, payload);

  // 2. Atualiza o resumo no documento principal do usuário para fácil consulta
  const userRootRef = doc(firestore, `users/${data.userId}`);
  await setDoc(
    userRootRef,
    {
      vipWaitlist: {
        tier: data.tier,
        cycle: data.cycle,
        email: data.email.trim(),
        registeredAt: serverTimestamp(),
        status: 'active',
      },
    },
    { merge: true }
  );

  // 3. Notificação discreta e segura no Sininho
  const tierLabel = data.tier === 'premium' ? 'Premium' : 'Pro';
  const cycleLabel = data.cycle === 'yearly' ? 'anual' : 'mensal';

  await PresenceEventService.create({
    uid: data.userId,
    eventType: 'billing.vip_waitlist',
    persona: 'wealth',
    urgency: 'low',
    message: {
      title: `Vaga Garantida na Lista VIP (${tierLabel})`,
      body: `Você está na lista prioritária para o plano ${tierLabel} (${cycleLabel}). Avisaremos você em primeira mão assim que as assinaturas forem liberadas com condições exclusivas de lançamento.`,
      ctaLabel: 'Ver Detalhes',
    },
    deepLink: 'pricing',
    cooldownHours: 24,
    expiresInHours: 720, // 30 dias
    resourceId: `vip_${data.tier}`,
  });
}

/**
 * Inicialização desacoplada do Google Play Billing nativo para o momento comercial futuro.
 */
export async function purchaseViaGooglePlay(productId: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Google Play Billing só está disponível no app Android nativo.');
  }

  try {
    const { NativePurchases } = await import('@capgo/native-purchases');
    await NativePurchases.purchaseProduct({
      productIdentifier: productId,
      planIdentifier: productId,
      productType: 1, // SUBSCRIPTION
    });
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[PurchaseService] Falha ou cancelamento na compra Play Store:', error);
    }
    throw error;
  }
}
