/**
 * FPI Voice Guide — linguagem de estado, não de registro.
 *
 * Convenção de vocabulário:
 * - Rotina (rótulo do número): Dinheiro do Mês
 * - Comando (rótulo do número): Folga do Mês
 * - Explicativo operacional: Dinheiro que sobra
 * - Institucional / estratégico: Saldo Livre Real
 */

export type VoiceMode = 'rotina' | 'comando';

/** Termo institucional — landing, onboarding conceitual, Central estratégica, glossário Nexus */
export const INSTITUTIONAL_TERM = 'Saldo Livre Real' as const;

/** Rótulos operacionais (UI) */
export const OPERATIONAL_HERO_COMANDO = 'Saldo Total Disponível' as const;
export const OPERATIONAL_HERO_ROTINA = 'Dinheiro do Mês' as const;
export const OPERATIONAL_HELPER = 'Dinheiro que sobra' as const;

export function getHeroLabel(commandMode?: boolean): string {
  return commandMode ? OPERATIONAL_HERO_COMANDO : OPERATIONAL_HERO_ROTINA;
}

export function getHeroHelperText(commandMode?: boolean, heroValue?: number, protectionShortfall?: number): string {
  if (!commandMode) return 'O fluxo das suas movimentações registradas neste mês.';
  
  const isNegative = (heroValue || 0) < 0;
  
  if (isNegative) {
    return 'Atenção: seus compromissos imediatos superam seu saldo em conta. Priorize regularizar as contas essenciais.';
  }
  
  if ((protectionShortfall || 0) > 0) {
    return 'Seu caixa cobre com segurança seus compromissos do mês e seus recursos estão alocados para fortalecer sua reserva de proteção.';
  }
  
  return 'Estrutura segura: suas contas estão cobertas e sua reserva de proteção está 100% blindada.';
}

/** Rótulo em minúsculas para impacto de lançamento e mensagens inline */
export function getImpactTargetLabel(commandMode?: boolean): string {
  return commandMode ? 'folga do mês' : 'dinheiro do mês';
}

export interface FlowLabels {
  income: string;
  expense: string;
  incomeSingular: string;
  expenseSingular: string;
  incomeFilter: string;
  expenseFilter: string;
  monthHero: string;
  flowChart: string;
  compositionTitle: string;
  registerCta: string;
  firstLaunchHint: string;
  emptyLaunchHint: string;
}

const ROTINA: FlowLabels = {
  income: 'Entradas',
  expense: 'Saídas',
  incomeSingular: 'Entrada',
  expenseSingular: 'Saída',
  incomeFilter: 'Entradas',
  expenseFilter: 'Saídas',
  monthHero: OPERATIONAL_HERO_ROTINA,
  flowChart: 'Visão de fluxo',
  compositionTitle: 'Onde seu dinheiro foi',
  registerCta: 'Lançar dinheiro',
  firstLaunchHint: 'Anote sua primeira entrada para calcularmos o que sobra de verdade no seu mês.',
  emptyLaunchHint: 'Anote o que entrou ou saiu — o sistema calcula seu Saldo Livre Real a partir daí.',
};

const COMANDO: FlowLabels = {
  income: 'Entradas',
  expense: 'Contas e Saídas',
  incomeSingular: 'Entrada',
  expenseSingular: 'Conta ou Saída',
  incomeFilter: 'Entradas',
  expenseFilter: 'Contas',
  monthHero: OPERATIONAL_HERO_COMANDO,
  flowChart: 'Pressão nas contas',
  compositionTitle: 'Onde o dinheiro pesa',
  registerCta: 'Lançar movimento',
  firstLaunchHint: 'Anote o que entrou para calcularmos sua folga real.',
  emptyLaunchHint: 'Cada movimento muda sua folga real — anote para enxergar sua verdadeira margem.',
};

export function getFlowLabels(commandMode?: boolean): FlowLabels {
  return commandMode ? COMANDO : ROTINA;
}

/** Copy universal — todas as camadas e planos */
export const FPI_COPY = {
  sovereignMargin: OPERATIONAL_HERO_COMANDO,
  freeBalance: OPERATIONAL_HELPER,
  monthBalance: OPERATIONAL_HERO_ROTINA,
  freedomDeficit: 'Faltando para fechar o mês',
  structureProtected: 'Dinheiro de segurança',
  launches: 'Lançamentos',
  launch: 'Lançamento',
  consistency: 'Hábito de anotar',
  noDebtsTitle: 'Tudo em dia',
  noDebtsBody:
    'Nenhuma dívida cadastrada. Continue anotando para aumentar sua folga do mês.',
  creditImpact:
    'Compra no cartão — seu dinheiro de hoje não muda, mas suas contas futuras aumentam.',
  creditOrganize: 'Organize suas contas no cartão',
  controlaSubtitle: 'Sua visão do mês, folga e como está o seu caminho.',
  homeEcossistemaDividas:
    'Anote o que entra e sai para o Nexus ajudar você a sair das dívidas.',
  homeEcossistemaGeral:
    'Anote suas movimentações para o Nexus entender sua vida financeira.',
  onboardingHome:
    'Este é seu painel de controle. Comece anotando o que você recebeu ou gastou.',
  settingsRoutine: 'Rotina e Controle',
  presenceInactive:
    'Você não anota nada faz tempo. O Nexus precisa de dados novos para te ajudar.',
  presenceInactiveDays: (days: number) =>
    `Você não anota nada há ${days} dias. Vamos atualizar?`,
  planStable: 'Tudo sob controle — suas contas estão em dia.',
  quickActionTitle: 'Anotar agora',
  quickActionSubtitle: 'Mantenha o controle',
  patrimonyEvolutionSubtitle: 'Como seu dinheiro cresceu ao longo do tempo.',
  debtEmptyRadar: 'Sem dívidas no radar',
  homeControlaDetail: 'Visão do mês, o que você gastou e como está o seu caminho.',
  presenceInactiveCta: 'Anotar agora',
  presencePlanTightened: 'As contas apertaram o seu mês',
  averagesExpenseOnly: 'Média de gastos por categoria · apenas contas',
  averagesNeedData:
    'Para calcular médias, precisamos de mais tempo de uso ou de contas cadastradas.',
} as const;

/** Títulos da Central por plano — superfície de Evolução */
export function getCentralHeroCopy(isPremium: boolean, isPro: boolean) {
  if (isPremium) {
    return {
      title: 'Sua evolução financeira, conectada.',
      description:
        'Estágio da jornada, prioridade de agora e leitura do que seus dados indicam — sem repetir a rotina do mês.',
    };
  }
  if (isPro) {
    return {
      title: 'Do mês ao longo prazo.',
      description:
        'Você já tem histórico na rotina. Aqui entram reserva, estrutura e o próximo passo estratégico.',
    };
  }
  return {
    title: 'O que vem depois da rotina.',
    description:
      'A Central mostra onde você está na jornada e o que priorizar para evoluir além do dia a dia.',
  };
}

/** Rótulo do estágio exibido na dobra da Central */
export function getCentralJourneyStage(params: {
  hasLaunches: boolean;
  hasFinancialProfile: boolean;
  hasPremium: boolean;
}): { stage: string; hint: string } {
  if (!params.hasLaunches) {
    return { stage: 'Início', hint: 'A base ainda depende da rotina no Controla.' };
  }
  if (!params.hasFinancialProfile) {
    return { stage: 'Rotina', hint: 'Hábito em formação — estrutura estratégica em aberto.' };
  }
  if (!params.hasPremium) {
    return { stage: 'Estrutura', hint: 'Perfil mapeado — estratégia ampla disponível no Premium.' };
  }
  return { stage: 'Estratégia', hint: 'Módulos conectados — priorize o que muda seu patrimônio.' };
}

/** Base de Proteção — superfície de segurança estrutural */
export const BASE_PROTECAO = {
  title: 'Base de Proteção',
  subtitle: 'O dinheiro que protege seu estilo de vida antes de qualquer plano maior.',
  totalLabel: 'Total protegido hoje',
  safetyTimeLabel: 'Tempo de Segurança',
  safetyTimeSuffix: 'meses',
  cta: 'Ajustar Base de Proteção',
  drawerTitle: 'Ajustar Base de Proteção',
  save: 'Salvar Base de Proteção',
  saving: 'Salvando...',
  emptyStateTitle: 'Sua base de proteção ainda não foi configurada',
  emptyStateDescription:
    'Sem ela, o Saldo Livre na sua Home não reflete o que está realmente protegido. Defina seu Colchão Emergencial e Reserva de Emergência para enxergar sua verdadeira margem de segurança.',

  /** Bloco 1 — Colchão Emergencial */
  colchaoBlockTitle: 'Colchão Emergencial',
  colchaoBlockSubtitle: 'Primeira camada de proteção imediata — amortece a rotina e imprevistos antes de usar a reserva.',
  colchaoMetaLabel: 'Meta do Colchão Emergencial',
  colchaoMetaPlaceholder: 'R$ 0,00',
  colchaoMetaHelp: 'Quanto você quer manter na conta para meses de aperto.',
  colchaoMetaHelpExpanded:
    'O Colchão Emergencial é a sua proteção de liquidez imediata. Ele cobre meses em que as contas do mês superam as entradas — evitando que você precise mexer na Reserva de Emergência para pequenos desajustes. Pense nele como o amortecedor entre o dia a dia e a reserva.',
  colchaoSaldoLabel: 'Saldo do Colchão Emergencial',
  colchaoSaldoPlaceholder: 'R$ 0,00',
  colchaoSaldoHelp: 'Quanto você tem disponível hoje na conta para essa proteção.',
  colchaoSaldoHelpExpanded:
    'É o dinheiro que você já mantém livre na conta corrente ou de acesso imediato, separado para funcionar como amortecedor entre o mês corrente e a reserva.',

  /** Bloco 2 — Reserva de Emergência */
  reservaBlockTitle: 'Reserva de Emergência',
  reservaBlockSubtitle: 'Reserva para grandes imprevistos — usada quando o Colchão Emergencial não basta.',
  reservaMetaLabel: 'Meta da Reserva de Emergência',
  reservaMetaPlaceholder: 'R$ 0,00',
  reservaMetaHelp: 'Quanto você quer ter guardado para emergências reais.',
  reservaMetaHelpExpanded:
    'A reserva de emergência protege você em imprevistos graves — perda de renda, despesa médica urgente ou reparo emergencial. Uma referência comum é de 3 a 12 meses do seu custo de vida essencial.',
  reservaSaldoLabel: 'Saldo da Reserva de Emergência',
  reservaSaldoPlaceholder: 'R$ 0,00',
  reservaSaldoHelp: 'Quanto você já tem separado hoje.',
  reservaSaldoHelpExpanded:
    'Inclua aqui apenas dinheiro com liquidez real — que você consegue usar em até 1 dia útil. Poupança, conta corrente ou resgate imediato. Não inclua investimentos de longo prazo, previdência ou bens.',

  disclaimer:
    'Considere aqui apenas dinheiro que você pode acessar rapidamente se a vida apertar. Esta base é usada para calcular sua segurança financeira na Home.',
} as const;

/** Cockpit / Home hero por contexto */
export function getCockpitControlaCopy(commandMode?: boolean) {
  return commandMode
    ? `Controle seu dinheiro focando no ${OPERATIONAL_HELPER} após as contas essenciais.`
    : 'Anote o dia a dia — comece simples e ganhe controle com o tempo.';
}

/** Labels e ajudas expandidas para Disponibilidade Real e composições */
export const DISPONIBILIDADE_REAL = {
  heroLabelComando: 'Saldo Total Disponível',
  heroLabelRotina: 'Dinheiro do Mês',
  heroHelpComando:
    'Total de recursos disponíveis hoje em conta corrente e benefícios.',
  heroHelpComandoNegativo:
    'Seus compromissos imediatos superam o saldo em conta. Priorize o pagamento das contas essenciais.',
  heroHelpRotina:
    'Suas entradas menos suas saídas deste mês. Cartão e contas futuras não entram aqui.',
  saldoAtualLabel: 'Saldo atual',
  saldoAtualHelp: 'Todas as receitas menos todas as despesas desde o início dos lançamentos.',
  saldoAtualCreditCard: 'Faturas do cartão em aberto',
  saldoAtualAfterCredit: 'Saldo já com as faturas descontadas',
  comprasCreditoMes: 'Compras no crédito',
  comprasCreditoHelp: 'Pela data da compra, não o valor da próxima fatura',
  saldoMaisConservador: 'Saldo mais seguro para gastar',
  saldoConsideraApenas:
    'As compras no crédito aparecem na movimentação do período, mas só impactam o saldo quando a fatura é paga.',
  cartaoLabel: 'Cartão de crédito',
  cartaoHelp: 'Total das faturas a vencer no período.',
  contasLabel: 'Contas a pagar',
  contasHelp: 'Contas recorrentes cadastradas que ainda vencem.',
  faltaColchaoLabel: 'Falta no Colchão Emergencial',
  faltaColchaoHelp: 'Quanto ainda falta para atingir sua meta do Colchão Emergencial.',
  faltaReservaLabel: 'Falta na Reserva de Emergência',
  faltaReservaHelp: 'Quanto ainda falta para atingir sua meta de Reserva de Emergência.',
  totalFaltasLabel: 'Falta proteger',
  totalFaltasHelp: 'Soma do que ainda falta para completar o Colchão Emergencial e a Reserva de Emergência.',
  composicaoDisponibilidadeReal:
    'Dívidas não entram neste cálculo. São tratadas separadamente no módulo de Gestão de Dívidas.',
  composicaoTitle: 'Composição desde o início dos lançamentos',
  totalEmAberto: 'Total em aberto',
  entradasLabel: 'Entradas',
  saidasDinheiroLabel: 'Saídas em dinheiro',
  saldoMesLabel: 'Saldo do mês',
  movimentacaoPeriodoHelp: 'Valores deste período, pela data dos lançamentos',
  comprasCreditoDisclosureTotal: 'Total',
} as const;

export function getHeroHelpTextDisponibilidade(heroValue: number): string {
  return heroValue < 0
    ? DISPONIBILIDADE_REAL.heroHelpComandoNegativo
    : DISPONIBILIDADE_REAL.heroHelpComando;
}

/** Nexus — consultor, briefing e sugestões guiadas */
export const NEXUS_COPY = {
  advisorTitle: 'Nexus — Seu Consultor Inteligente',
  advisorPlaceholder: 'Pergunte ao Nexus sobre seu dinheiro, contas ou planos...',
  briefingSubtitle: 'O Nexus analisou suas contas e sua folga do mês.',
  briefingVoiceHint:
    'Use palavras simples — prefira folga do mês, contas, dinheiro que sobra e custo de vida.',
  briefingCtaExamples: '[Ver Dívidas], [Dinheiro de Reserva], [Revisar Contas]',
  recurringIntroTitle: 'Organize suas contas',
  recurringIntroBody:
    'Ao cadastrar contas fixas (aluguel, luz, netflix), o sistema já sabe quanto vai sobrar no fim do mês. Assim você gasta sem medo.',
  hubActions: [
    {
      group: 'Dívidas',
      actions: [
        'Qual dívida devo pagar primeiro?',
        'Como faço para sair das dívidas mais rápido?',
        'O que fazer nos próximos 7 dias para aliviar o bolso?',
        'Quanto estou perdendo de juros sem perceber?',
      ],
    },
    {
      group: 'Folga e Contas',
      actions: [
        'Onde meu dinheiro está indo embora?',
        'Como faço para sobrar mais dinheiro no mês?',
        'Como aumentar minha folga do mês?',
        'Quais contas eu deveria revisar ou cortar?',
      ],
    },
    {
      group: 'Patrimônio e investimentos',
      actions: [
        'O que você acha dos meus investimentos?',
        'Meu dinheiro está rendendo bem ou está parado?',
        'Como organizar melhor onde guardo meu dinheiro?',
        'Estou correndo muito risco?',
      ],
    },
    {
      group: 'Liberdade financeira',
      actions: [
        'O que mais me impede de ter dinheiro sobrando hoje?',
        'O que eu faço agora: pago dívidas, guardo reserva ou invisto?',
        'Quanto eu preciso guardar por mês para viver de renda no futuro?',
      ],
    },
  ] as const,

  /** Introspecção do Nexus — texto exibido no primeiro contato */
  introTitle: 'Nexus • Consultor Inteligente',
  introBody:
    'Ele lê sua rotina financeira — entradas, saídas, contas e folga do mês — e destaca o que merece atenção, padrões que você não vê e o próximo passo com base nos seus dados.',
  introScopeFree: 'No plano Free, ele analisa seu mês atual. Cada lançamento alimenta a leitura.',
  introScopePro: 'No Pro, ele cruza também seu histórico completo e sugere ações com base na sua trajetória.',
  introScopePremium:
    'No Premium, ele conecta investimentos, dívidas e patrimônio em uma visão integrada.',
  introCtaOpen: 'Abrir Nexus',
  introDismissLabel: 'Entendi',
} as const;

/** Intro do Nexus por plano — texto único com base no tier */
export function getNexusIntroScope(effectiveTier: 'free' | 'pro' | 'premium'): string {
  if (effectiveTier === 'premium') return NEXUS_COPY.introScopePremium;
  if (effectiveTier === 'pro') return NEXUS_COPY.introScopePro;
  return NEXUS_COPY.introScopeFree;
}
