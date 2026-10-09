import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

interface ContextualAction {
  id: string;
  label: string;
  route: string;
  icon?: string;
}

interface NexusHistoryItem {
  role: string;
  text: string;
}

interface NexusContextInput {
  transactions?: unknown[];
  simulations?: unknown;
  goals?: unknown[];
  assets?: unknown[];
  passives?: unknown[];
  debts?: unknown[];
  currentTool?: string;
  [key: string]: unknown;
}

export interface NexusDecisionObject {
  observedFact: string;
  analyzedPeriod: string;
  confidenceLevel: 'alta' | 'media' | 'baixa';
  sourcesUsed: string[];
  assumptions: string[];
  impact: string;
  invalidatingCondition?: string;
  suggestedActions: ContextualAction[];
}

export interface AiResponse {
  answer: string;
  actions?: ContextualAction[];
  analysisBasis?: NexusAnalysisBasis;
  decisionObject?: NexusDecisionObject;
  deterministicFacts?: any;
  metadata?: {
    hasEmergencyReserve: boolean;
    userPlan: string;
  };
}

export interface NexusAnalysisBasis {
  generatedAt: string;
  dataStatus: 'ok' | 'empty' | 'error';
  sources: string[];
  period: string;
  limitations: string[];
}

export const useAiAgent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendToNexus = async (
    prompt: string,
    context: NexusContextInput,
    userName: string,
    history: NexusHistoryItem[],
    isFirstInteraction: boolean
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // Referência à função no Backend (functions/index.ts)
      const askAi = httpsCallable(functions, 'askAiAdvisor');

      const result = await askAi({
        prompt,
        context, // Transações e saldo
        userName,
        history,
        isFirstInteraction
      });

      const data = result.data as {
        success: boolean;
        answer: string;
        context?: {
          actions?: ContextualAction[];
          analysisBasis?: NexusAnalysisBasis;
          decisionObject?: NexusDecisionObject;
          deterministicFacts?: any;
          metadata?: AiResponse['metadata'];
        }
      };

      if (!data.success) throw new Error("Falha na resposta da IA");

      return {
        answer: data.answer,
        actions: data.context?.actions,
        analysisBasis: data.context?.analysisBasis,
        decisionObject: data.context?.decisionObject,
        deterministicFacts: data.context?.deterministicFacts,
        metadata: data.context?.metadata
      } as AiResponse;
    } catch (err: unknown) {
      console.error("Erro no Nexus AI:", err);
      // Tratamento amigável de erros do Firebase (incl. cota N3: resource-exhausted)
      const message = err instanceof Error ? err.message : String(err);
      const msg = message.includes('resource-exhausted')
        ? "Limite de mensagens do plano atingido."
        : "O Nexus está processando muitos dados. Tente novamente.";
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { sendToNexus, isLoading, error };
};
