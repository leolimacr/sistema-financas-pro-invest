process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

import { initializeApp } from 'firebase-admin/app';
initializeApp();

export { askAiAdvisor } from './askAiAdvisor';
export { generateDebtPlan } from './generateDebtPlan';
export { dailyPresenceCheck } from './presenceCheck';
export { monthlyRotativoInterest } from './monthlyRotativo';
export { getAssetQuote } from './getAssetQuote';
export { getMarketData } from './marketData';
export { handleStripeWebhook } from './handleStripeWebhook';
export { createCheckoutSession } from './createCheckoutSession';
export { expireCanceledSubscriptions } from './schedulerExpireCanceled';
export { createPortalSession } from './createPortalSession';
export { nexusAgendaInterpret } from './nexusAgendaInterpret';
export { nexusAgendaCommit } from './nexusAgendaCommit';
export { nexusAgendaUndo } from './nexusAgendaUndo';
export { createAsaasPixSubscription } from './createAsaasPixSubscription';
export { handleAsaasWebhook } from './handleAsaasWebhook';
export { verifyPixReceipt } from './verifyPixReceipt';
export { listPixAuditQueue, reviewPixAudit, requestPixRefund, completePixRefund } from './adminPixAudit';
export { listAdminUsers } from './adminUsers';
