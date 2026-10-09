/**
 * ACTION REGISTRY - Catálogo Canônico de Ações Contextuais do Nexus
 * Garante que o modelo não invente rotas ou payloads inválidos.
 *
 * N8: rotas alinhadas ao roteador real (AppRoutes `/app/*`). As rotas
 * antigas (`/dividas`, `/reserva`, `/extrato`) não existiam — o clique caía
 * no fallback `*` (redirect para `/`). Reserva e extrato vivem no Controla
 * (Etapa 6 pode refinar destinos quando houver telas dedicadas).
 */
export interface ContextualAction {
  id: string;
  label: string;
  route: string;
  icon?: string;
}

export interface NexusDecisionObject {
  /** Diagnóstico ou fato central observado nos números do usuário */
  observedFact: string;
  /** Período ou recorte temporal apurado */
  analyzedPeriod: string;
  /** Nível de confiança analítica com base na completude dos dados */
  confidenceLevel: 'alta' | 'media' | 'baixa';
  /** Fontes internas apuradas */
  sourcesUsed: string[];
  /** Suposições assumidas pelo Nexus na análise */
  assumptions: string[];
  /** Impacto estimado na saúde financeira ou patrimonial */
  impact: string;
  /** Condição que invalidaria esta recomendação */
  invalidatingCondition?: string;
  /** Ações contextuais canônicas acionáveis em 1 clique */
  suggestedActions: ContextualAction[];
}

export const ACTION_REGISTRY: Record<string, ContextualAction> = {
  'NAV_DEBTS': {
    id: 'NAV_DEBTS',
    label: 'Ver minhas dívidas',
    route: '/app/minhas-dividas',
    icon: 'credit_card'
  },
  'NAV_DEBT_SIMULATOR': {
    id: 'NAV_DEBT_SIMULATOR',
    label: 'Calculadora de Dívidas',
    route: '/app/ferramentas/dividas',
    icon: 'calculator'
  },
  'NAV_RESERVE': {
    id: 'NAV_RESERVE',
    label: 'Configurar reserva / colchão',
    route: '/app/central#base-protecao',
    icon: 'shield'
  },
  'NAV_GOALS': {
    id: 'NAV_GOALS',
    label: 'Criar / ajustar metas',
    route: '/app/metas',
    icon: 'target'
  },
  'NAV_COMPOUND': {
    id: 'NAV_COMPOUND',
    label: 'Simulador de Juros Compostos',
    route: '/app/ferramentas/juros',
    icon: 'trending_up'
  },
  'NAV_FIRE': {
    id: 'NAV_FIRE',
    label: 'Calculadora de Independência (FIRE)',
    route: '/app/ferramentas/fire',
    icon: 'flame'
  },
  'NAV_INFLATION': {
    id: 'NAV_INFLATION',
    label: 'Ver Impacto da Inflação',
    route: '/app/ferramentas/inflacao',
    icon: 'percent'
  },
  'NAV_DIVIDENDS': {
    id: 'NAV_DIVIDENDS',
    label: 'Simulador de Dividendos',
    route: '/app/ferramentas/dividendos',
    icon: 'wallet'
  },
  'NAV_CASH_VS_INSTALL': {
    id: 'NAV_CASH_VS_INSTALL',
    label: 'Comparar À Vista ou Parcelado',
    route: '/app/ferramentas/compra-avista-parcelado',
    icon: 'shopping_cart'
  },
  'NAV_CASHFLOW': {
    id: 'NAV_CASHFLOW',
    label: 'Abrir Controla (lançamentos)',
    route: '/app/controla',
    icon: 'account_balance'
  },
  'NAV_CENTRAL': {
    id: 'NAV_CENTRAL',
    label: 'Central Soberana',
    route: '/app/central',
    icon: 'compass'
  },
  'NAV_AGENDA': {
    id: 'NAV_AGENDA',
    label: 'Agenda Financeira',
    route: '/app/agenda',
    icon: 'calendar'
  },
  'NAV_COURSES': {
    id: 'NAV_COURSES',
    label: 'Acessar Trilhas de Formação',
    route: '/app/explorar',
    icon: 'book_open'
  }
};

export class ActionManager {
  /**
   * Extrai e valida ações de uma string de resposta.
   * Formato esperado: [ACTION:ID]
   */
  static extractActions(text: string): { cleanText: string; actions: ContextualAction[] } {
    const actionRegex = /\[ACTION:(.*?)\]/g;
    const foundActions: ContextualAction[] = [];
    
    const cleanText = text.replace(actionRegex, (_match, actionId) => {
      const id = actionId.trim();
      if (ACTION_REGISTRY[id]) {
        foundActions.push(ACTION_REGISTRY[id]);
      }
      return ''; // Remove a tag do texto final
    }).trim();

    return {
      cleanText,
      actions: foundActions
    };
  }

  /**
   * Converte a resposta bruta do modelo e a base analítica em um Objeto de Decisão Estruturado.
   * Suporta tanto saídas em JSON estruturado quanto texto livre com tags canônicas [ACTION:ID].
   */
  static parseDecision(
    rawText: string,
    basis?: {
      period?: string;
      sources?: string[];
      dataStatus?: 'ok' | 'empty' | 'error';
      limitations?: string[];
    }
  ): { cleanText: string; actions: ContextualAction[]; decision: NexusDecisionObject } {
    let cleanText = rawText;
    const actions: ContextualAction[] = [];
    let customFact: string | undefined;
    let customImpact: string | undefined;
    let customConfidence: 'alta' | 'media' | 'baixa' | undefined;
    let customAssumptions: string[] = [];
    let customInvalidatingCondition: string | undefined;

    const trimmed = rawText.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed.answer === 'string') cleanText = parsed.answer;
        else if (typeof parsed.text === 'string') cleanText = parsed.text;

        if (typeof parsed.observedFact === 'string') customFact = parsed.observedFact;
        if (typeof parsed.impact === 'string') customImpact = parsed.impact;
        if (['alta', 'media', 'baixa'].includes(parsed.confidenceLevel)) {
          customConfidence = parsed.confidenceLevel;
        }
        if (Array.isArray(parsed.assumptions)) {
          customAssumptions = parsed.assumptions.filter((a: unknown) => typeof a === 'string');
        }
        if (typeof parsed.invalidatingCondition === 'string') {
          customInvalidatingCondition = parsed.invalidatingCondition;
        }

        if (typeof parsed.actionId === 'string' && ACTION_REGISTRY[parsed.actionId]) {
          actions.push(ACTION_REGISTRY[parsed.actionId]);
        }
        if (Array.isArray(parsed.actions)) {
          for (const item of parsed.actions) {
            const id = typeof item === 'string' ? item : item?.id;
            if (id && ACTION_REGISTRY[id] && !actions.some((a) => a.id === id)) {
              actions.push(ACTION_REGISTRY[id]);
            }
          }
        }
      } catch {
        // Prossegue com extração textual
      }
    }

    const textExtraction = this.extractActions(cleanText);
    cleanText = textExtraction.cleanText;
    for (const act of textExtraction.actions) {
      if (!actions.some((a) => a.id === act.id)) {
        actions.push(act);
      }
    }

    let observedFact = customFact;
    if (!observedFact) {
      const firstLine = cleanText
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.length > 10 && !l.startsWith('#')) || '';
      observedFact = firstLine.replace(/^[*_#0-9.)\-\s]+/, '').trim();
      if (!observedFact) {
        observedFact = 'Diagnóstico financeiro consolidado apurado no período.';
      }
    }

    let confidenceLevel: 'alta' | 'media' | 'baixa' = customConfidence || 'media';
    if (!customConfidence) {
      if (basis?.dataStatus === 'ok' && (basis?.sources?.length ?? 0) >= 2) {
        confidenceLevel = 'alta';
      } else if (basis?.dataStatus === 'empty') {
        confidenceLevel = 'baixa';
      }
    }

    let impact = customImpact;
    if (!impact) {
      if (actions.some((a) => a.id === 'NAV_DEBTS' || a.id === 'NAV_DEBT_SIMULATOR')) {
        impact = 'Redução de juros e aceleração da quitação de obrigações caras.';
      } else if (actions.some((a) => a.id === 'NAV_RESERVE')) {
        impact = 'Blindagem contra oscilações e proteção da estabilidade imediata.';
      } else if (actions.some((a) => a.id === 'NAV_CASHFLOW')) {
        impact = 'Recuperação do equilíbrio de caixa e contenção de vazamentos na rotina.';
      } else if (actions.some((a) => a.id === 'NAV_GOALS' || a.id === 'NAV_COMPOUND')) {
        impact = 'Crescimento estrutural e avanço consistente na formação patrimonial.';
      } else {
        impact = 'Preservação da soberania financeira e governabilidade do patrimônio.';
      }
    }

    const assumptions = customAssumptions.length > 0 ? customAssumptions : [
      'Padrão de receitas e despesas cadastrado mantém-se representativo.',
      'Ausência de obrigações externas ou endividamentos não lançados.',
    ];

    const invalidatingCondition = customInvalidatingCondition ||
      'Entrada extraordinária de recursos, despesas imprevistas relevantes ou novas dívidas contraídas invalidam esta projeção.';

    const decision: NexusDecisionObject = {
      observedFact,
      analyzedPeriod: basis?.period || 'mês corrente',
      confidenceLevel,
      sourcesUsed: basis?.sources || [],
      assumptions,
      impact,
      invalidatingCondition,
      suggestedActions: actions,
    };

    return {
      cleanText,
      actions,
      decision,
    };
  }

  /**
   * Retorna o menu de instruções para o PromptBuilder.
   */
  static getInstructionMenu(): string {
    return `
# 🛠️ CONTEXTUAL ACTIONS (PROTOCOLO OBRIGATÓRIO DE AÇÃO EM 1 CLIQUE)
Se o seu diagnóstico sugerir uma ação direta do usuário ou o uso de um simulador/módulo, você DEVE incluir exatamente UMA tag de ação ao final da resposta.
Use apenas os IDs permitidos abaixo. NUNCA invente novos IDs ou rotas.

Ações Canônicas Permitidas:
- Se sugerir revisar/ver dívidas: [ACTION:NAV_DEBTS]
- Se sugerir simular amortização acelerada ou quitação de dívidas: [ACTION:NAV_DEBT_SIMULATOR]
- Se sugerir configurar/ver reserva ou colchão emergencial: [ACTION:NAV_RESERVE]
- Se sugerir criar ou acompanhar metas de curto/médio prazo: [ACTION:NAV_GOALS]
- Se sugerir simular crescimento patrimonial ou aportes com juros: [ACTION:NAV_COMPOUND]
- Se sugerir calcular tempo para liberdade ou independência financeira: [ACTION:NAV_FIRE]
- Se sugerir analisar perda de poder de compra ou inflação: [ACTION:NAV_INFLATION]
- Se sugerir simulação de renda passiva ou dividendos: [ACTION:NAV_DIVIDENDS]
- Se sugerir decisão de compra entre à vista ou parcelar com CDI: [ACTION:NAV_CASH_VS_INSTALL]
- Se sugerir conferir extrato, lançar receitas/despesas ou organizar caixa: [ACTION:NAV_CASHFLOW]
- Se sugerir visão executiva, posição global ou cockpit: [ACTION:NAV_CENTRAL]
- Se sugerir agendar contas, vencimentos ou alarmes: [ACTION:NAV_AGENDA]
- Se sugerir estudar, trilha de educação financeira ou cursos: [ACTION:NAV_COURSES]

Exemplo de uso:
"Sua margem permite antecipar a quitação da dívida mais cara. [ACTION:NAV_DEBT_SIMULATOR]"
`;
  }
}
