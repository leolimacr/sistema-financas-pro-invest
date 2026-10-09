/**
 * Motor Soberano de Resolução de Deep Links e Rotas de Notificação
 * Garante que qualquer termo, evento ou link externo conduza com precisão
 * cirúrgica para o destino correto no app Finanças Pro Invest.
 */

export function resolveAppRoute(target?: string | null, eventType?: string | null): string {
  const cleanTarget = (target || '').trim();
  const cleanType = (eventType || '').trim().toLowerCase();

  // 0. URLs HTTP/HTTPS completas dos domínios oficiais da aplicação
  if (/^https?:\/\//i.test(cleanTarget)) {
    try {
      const parsedUrl = new URL(cleanTarget);
      const host = parsedUrl.hostname.toLowerCase();
      if (
        host.includes('financasproinvest.com.br') ||
        host.includes('financas-pro-invest.web.app') ||
        host.includes('financas-pro-invest.firebaseapp.com') ||
        host.includes('localhost')
      ) {
        const relativePath = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
        if ((relativePath === '/' || relativePath === '') && !cleanType) {
          return '/app/central';
        }
        return resolveAppRoute(relativePath, eventType);
      }
    } catch {
      /* fallback */
    }
  }

  // 1. Esquema customizado de URL nativo do app (financaspro://... ou financaspro:/...)
  if (cleanTarget.startsWith('financaspro:')) {
    const rawPath = cleanTarget.replace(/^financaspro:\/*/, '');
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

  // Extrai query string para preservar parâmetros de contexto (ex: agenda?view=week&highlight=abc)
  const queryIndex = cleanTarget.indexOf('?');
  const pathWithoutQuery = queryIndex !== -1 ? cleanTarget.substring(0, queryIndex) : cleanTarget;
  const queryString = queryIndex !== -1 ? cleanTarget.substring(queryIndex) : '';

  // 4. Normalização de apelidos conhecidos de ferramentas e telas
  const normalized = pathWithoutQuery.toLowerCase().replace(/^\/+/, '');

  const appendQuery = (route: string) => {
    if (!queryString) return route;
    return route.includes('?') ? `${route}&${queryString.slice(1)}` : `${route}${queryString}`;
  };

  switch (normalized) {
    // Agenda
    case 'agenda':
    case 'app/agenda':
    case 'compromissos':
    case 'calendario':
      return appendQuery('/app/agenda');

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
      return appendQuery('/app/controla');

    // Ações de novo lançamento
    case 'transaction-form':
    case 'novo-lancamento':
    case 'nova-despesa':
    case 'registrar':
      return appendQuery('/app/controla?action=new-transaction');

    // Cartões e Faturas
    case 'cartoes':
    case 'cartao':
    case 'faturas':
    case 'fatura':
      return appendQuery('/app/controla?tab=cartoes');

    // Minhas Dívidas
    case 'minhas-dividas':
    case 'dividas':
    case 'divida':
    case 'app/minhas-dividas':
      return appendQuery('/app/minhas-dividas');

    // Investimentos e Aportes
    case 'investimentos':
    case 'investimento':
    case 'aportes':
    case 'aporte':
    case 'carteira':
    case 'app/investimentos':
      return appendQuery('/app/investimentos');

    // Patrimônio / Passivos
    case 'patrimonio':
    case 'passivos':
    case 'bens':
    case 'app/passivos':
      return appendQuery('/app/passivos');

    // Metas
    case 'metas':
    case 'meta':
    case 'objetivos':
    case 'app/metas':
      return appendQuery('/app/metas');

    // IA / Consultor Nexus
    case 'ia':
    case 'chat':
    case 'nexus':
    case 'consultor':
    case 'advisor':
    case 'app/ia':
      return appendQuery('/app/ia');

    // Central / Home
    case 'central':
    case 'home':
    case 'app/central':
    case 'app/home':
      return appendQuery('/app/central');

    // Dashboard / Relatórios
    case 'dashboard':
    case 'app/dashboard':
    case 'relatorio':
    case 'relatorios':
    case 'relatório':
    case 'relatórios':
    case 'report':
    case 'reports':
    case 'fechamento':
    case 'resumo':
      return appendQuery('/app/dashboard');

    // Explorar
    case 'explorar':
    case 'app/explorar':
      return appendQuery('/app/explorar');

    // Mais / Configurações
    case 'mais':
    case 'settings':
    case 'configuracoes':
    case 'app/mais':
      return appendQuery('/app/mais');

    // Planos / Pricing
    case 'pricing':
    case 'planos':
    case 'upgrade':
    case 'app/mais/pricing':
      return appendQuery('/app/mais/pricing');

    default:
      break;
  }

  // Tratamento da raiz '/' quando não há eventType
  if (cleanTarget === '/' && !cleanType) {
    return '/app/central';
  }

  // Se o target for um caminho iniciado por barra (ex: /metas/123, /nexus?context=..., /patrimonio)
  if (cleanTarget.startsWith('/')) {
    // Normalização de metas individuais /metas/:id -> /app/metas?highlight=:id
    const metaMatch = cleanTarget.match(/^\/metas\/([^?]+)(\?.*)?$/);
    if (metaMatch) {
      const goalId = metaMatch[1];
      const extraQ = metaMatch[2] ? `&${metaMatch[2].slice(1)}` : '';
      return `/app/metas?highlight=${encodeURIComponent(goalId)}${extraQ}`;
    }

    if (cleanTarget.startsWith('/metas')) return appendQuery('/app/metas');
    if (cleanTarget.startsWith('/nexus')) return appendQuery('/app/ia');
    if (cleanTarget.startsWith('/investimentos')) return appendQuery('/app/investimentos');
    if (cleanTarget.startsWith('/patrimonio')) return appendQuery('/app/passivos');
    if (cleanTarget.startsWith('/cartoes')) return appendQuery('/app/controla?tab=cartoes');
    if (cleanTarget.startsWith('/controla')) return appendQuery('/app/controla');
    if (cleanTarget.startsWith('/agenda')) return appendQuery('/app/agenda');
    if (cleanTarget.startsWith('/minhas-dividas')) return appendQuery('/app/minhas-dividas');
    if (cleanTarget.startsWith('/central')) return appendQuery('/app/central');
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
