import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createNexusReserve } from '../services/goalService';
import { payInvoice } from '../services/payInvoiceService';
import { convertToDebt } from '../services/rotativoService';
import type { NexusInsightAction } from '../services/nexusInsightEngine';
import { NotificationService } from '../services/NotificationService';
import { trackActionCompleted, trackActionFailed } from '../services/nexusAnalyticsService';
import { getLocalDateString } from '../utils/dateHelpers';

export const useNexusActions = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const queryClient = useQueryClient();

  const executeAction = async (userId: string, insightId: string, action: NexusInsightAction, priority?: string) => {
    if (!userId) return { success: false, error: 'User not authenticated' };
    
    setIsExecuting(true);
    try {
      // Feedback de execução registrado via analytics (sem log de console em produção).
      
      if (action.type === 'reserve' && action.payload) {
        await createNexusReserve(
          userId,
          action.payload.title || 'Reserva Nexus',
          action.payload.value || 0,
          action.payload.targetDate || getLocalDateString()
        );

        // Feedback de notificação contextual
        try {
          await NotificationService.dispatch({
            category: 'wealth_goal',
            title: 'Reserva Confirmada',
            body: `Guardamos a intenção de R$ ${(action.payload.value || 0).toFixed(2).replace('.', ',')} para sua fatura.`,
          });
        } catch (e) {
          console.warn('[NexusAction] Falha ao despachar notificação (ambiente web?):', e);
        }

        setIsExecuting(false);
        trackActionCompleted(insightId, priority || 'media', action.type);
        return { success: true, amount: action.payload.value };
      }

      if (action.type === 'convert_rotativo' && action.payload?.cardId) {
        // OverdueInvoiceInfo exige todos os campos: valida antes de chamar
        // (payloads vindos do LLM/eventos podem chegar incompletos).
        const p = action.payload;
        const cardId = p.cardId;
        if (!cardId || !p.cardName || !p.invoiceId || !p.periodEnd || p.remainingAmount === undefined || !p.dueDate) {
          setIsExecuting(false);
          trackActionFailed(insightId, priority || 'alta', action.type, 'Dados da fatura incompletos para conversão.');
          return { success: false, error: 'Dados da fatura incompletos para conversão.' };
        }
        const result = await convertToDebt(userId, {
          cardId,
          cardName: p.cardName,
          invoiceId: p.invoiceId,
          periodEnd: p.periodEnd,
          remainingAmount: p.remainingAmount,
          dueDate: p.dueDate,
        });

        setIsExecuting(false);
        if (result.success) {
          await queryClient.invalidateQueries({ queryKey: ['debts', userId] });
          await queryClient.invalidateQueries({ queryKey: ['invoices', userId] });
          trackActionCompleted(insightId, priority || 'alta', action.type);
          return { success: true, debtId: result.debtId };
        }
        throw new Error(result.error);
      }

      if (action.type === 'pay_invoice' && action.payload?.cardId) {
        const result = await payInvoice({
          userId,
          cardId: action.payload.cardId,
          cardName: action.payload.cardName || 'Cartão',
          amount: action.payload.amount || 0,
          invoiceId: action.payload.invoiceId,
          periodEnd: action.payload.periodEnd,
          queryClient,
        });

        setIsExecuting(false);
        if (result.success) {
          trackActionCompleted(insightId, priority || 'media', action.type);
          return { success: true };
        }
        throw new Error(result.error);
      }

      if (action.type === 'attack_debt') {
        setIsExecuting(false);
        return {
          success: false,
          status: 'navigation_required' as const,
          error: 'A priorização da dívida precisa ser revisada na tela de estratégia.',
          debtId: action.payload?.debtId,
        };
      }

      setIsExecuting(false);
      // Não existe confirmação de negócio para os demais tipos. Reportar
      // explicitamente a necessidade de navegar evita que a interface mostre
      // uma operação como concluída quando apenas há uma recomendação.
      return {
        success: false,
        status: 'navigation_required' as const,
        error: 'Esta recomendação precisa ser concluída na área indicada.',
      };
    } catch (error) {
      console.error('[NexusAction] Erro ao executar ação:', error);
      setIsExecuting(false);
      const errMsg = error instanceof Error ? error.message : String(error);
      trackActionFailed(insightId, priority || 'media', action.type, errMsg);
      return { success: false, error };
    }
  };

  return { executeAction, isExecuting };
};
