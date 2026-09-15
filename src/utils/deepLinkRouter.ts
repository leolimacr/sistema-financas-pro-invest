/**
 * Motor Soberano de Resolução de Deep Links e Rotas de Notificação
 * Garante que qualquer termo, evento ou link externo conduza com precisão
 * cirúrgica para o destino correto no app Finanças Pro Invest.
 */

export function resolveAppRoute(target?: string | null, eventType?: string | null): string {
  const cleanTarget = (target || '').trim();
  const cleanType = (eventType || '').trim().toLowerCase();

  // 1. Esquema customizado de URL nativo do app (financaspro://...)
  if (cleanTarget.startsWith('financaspro://')) {
    const rawPath = cleanTarget.replace(/^financaspro:\/\//, '');
    const cleanPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    return resolveAppRoute(cleanPath, eventType);
  }

  // 2. Se já for uma rota canônica da aplicação (/app/...)
  if (cleanTarget.startsWith('/app/')) {
    return cleanTarget;
  }

  // 3. Esquema especial de URL nativa (ex: app://mark-bill-paid/:id)
  if (cleanTarget.startsWith('app://mark-bill-paid/')) {
    return '/app/controla';
  }

  // 3. Normalização de apelidos conhecidos de ferramentas e telas
  const normalized = cleanTarget.toLowerCase().replace(/^\/+/, '');

  switch (normalized) {
    // Agenda
    case 'agenda':
    case 'app/agenda':
    case 'compromissos':
    case 'calendario':
      return '/app/agenda';

    // Controla / Despesas / Lançamentos / Contas Recorrentes
    case 'controla':
    case 'manager':
    case 'despesas':
    case 'despesa':
    case 'lancamentos':
    case 'lancamento':
    case 'gastos':
    case 'contas':
    case 'app/controla':
      return '/app/controla';

    // Ações de novo lançamento
    case 'transaction-form':
    case 'novo-lancamento':
    case 'nova-despesa':
    case 'registrar':
      return '/app/controla?action=new-transaction';

    // Cartões e Faturas
    case 'cartoes':
    case 'cartao':
    case 'faturas':
    case 'fatura':
      return '/app/controla?tab=cartoes';

    // Minhas Dívidas
    case 'minhas-dividas':
    case 'dividas':
    case 'divida':
    case 'app/minhas-dividas':
      return '/app/minhas-dividas';

    // Investimentos e Aportes
    case 'investimentos':
    case 'investimento':
    case 'aportes':
    case 'aporte':
    case 'carteira':
    case 'app/investimentos':
      return '/app/investimentos';

    // Patrimônio / Passivos
    case 'patrimonio':
    case 'passivos':
    case 'bens':
    case 'app/passivos':
      return '/app/passivos';

    // Metas
    case 'metas':
    case 'meta':
    case 'objetivos':
    case 'app/metas':
      return '/app/metas';

    // IA / Consultor Nexus
    case 'ia':
    case 'chat':
    case 'nexus':
    case 'consultor':
    case 'advisor':
    case 'app/ia':
      return '/app/ia';

    // Central / Home
    case 'central':
    case 'home':
    case 'app/central':
    case 'app/home':
      return '/app/central';

    // Dashboard
    case 'dashboard':
    case 'app/dashboard':
      return '/app/dashboard';

    // Explorar
    case 'explorar':
    case 'app/explorar':
      return '/app/explorar';

    // Mais / Configurações
    case 'mais':
    case 'settings':
    case 'configuracoes':
    case 'app/mais':
      return '/app/mais';

    // Planos / Pricing
    case 'pricing':
    case 'planos':
    case 'upgrade':
    case 'app/mais/pricing':
      return '/app/mais/pricing';

    default:
      break;
  }

  // Se o target for um caminho com barra iniciado por barra (ex: /metas/123 ou /investimentos?tab=...)
  if (cleanTarget.startsWith('/')) {
    if (cleanTarget.startsWith('/metas')) return '/app' + cleanTarget;
    if (cleanTarget.startsWith('/investimentos')) return '/app' + cleanTarget;
    if (cleanTarget.startsWith('/patrimonio')) return '/app/passivos';
    if (cleanTarget.startsWith('/cartoes')) return '/app/controla?tab=cartoes';
    if (cleanTarget.startsWith('/controla')) return '/app' + cleanTarget;
    if (cleanTarget.startsWith('/agenda')) return '/app' + cleanTarget;
    if (cleanTarget.startsWith('/minhas-dividas')) return '/app' + cleanTarget;
    if (cleanTarget.startsWith('/central')) return '/app' + cleanTarget;
    return cleanTarget;
  }

  // 4. Se não há target ou foi irreconhecível, deduz inteligentemente pelo eventType
  if (cleanType) {
    if (cleanType.startsWith('agenda.') || cleanType.includes('alarm')) {
      return '/app/agenda';
    }
    if (
      cleanType.startsWith('finance.') || 
      cleanType.startsWith('recurring_bill') || 
      cleanType.includes('transaction') ||
      cleanType.includes('despesa') ||
      cleanType.includes('bill')
    ) {
      return '/app/controla';
    }
    if (cleanType.startsWith('debt.') || cleanType.includes('divida')) {
      return '/app/minhas-dividas';
    }
    if (cleanType.startsWith('wealth.aport') || cleanType.includes('invest')) {
      return '/app/investimentos';
    }
    if (cleanType.startsWith('wealth.goal') || cleanType.includes('goal') || cleanType.includes('meta')) {
      return '/app/metas';
    }
    if (cleanType.startsWith('wealth.') || cleanType.includes('patrimonio') || cleanType.includes('passive')) {
      return '/app/passivos';
    }
    if (cleanType.startsWith('nexus.') || cleanType.includes('insight') || cleanType.includes('advisor')) {
      return '/app/ia';
    }
    if (cleanType.includes('daily_reminder') || cleanType.includes('reengagement')) {
      return '/app/controla?action=new-transaction';
    }
  }

  // Fallback seguro: Central do aplicativo
  return '/app/central';
}
