import type { CourseModule } from '~types';

export const module01: CourseModule = {
  id: 'modulo-01-investidor',
  title: 'O Pré-Requisito Sagrado: Dívidas Zero Antes de Começar',
  slug: 'o-pre-requisito-sagrado-dividas-zero',
  description:
    'Entenda por que tentar investir enquanto carrega dívidas de juros altos é carregar água com uma peneira, e aprenda a resgatar seu Saldo Livre Real.',
  objective:
    'Compreender a matemática dos juros negativos, diagnosticar passivos onerosos e estabelecer o Saldo Livre Real como a única base legítima para investir.',
  order: 1,
  badgeLabel: 'Fundação Limpa',
  lessons: [
    {
      id: 'm1-aula-01-inv',
      title: 'A Matemática Inegociável: Por Que É Proibido Investir Devendo',
      slug: 'a-matematica-inegociavel-por-que-e-proibido-investir-devendo',
      durationMinutes: 8,
      objective:
        'Confrontar as taxas do mercado financeiro e provar numericamente por que quitar juros altos sempre antecede o primeiro investimento.',
      blocks: [
        {
          type: 'principle',
          title: 'A Ordem dos Fatores Financeiros',
          statement:
            'Nenhum investimento legal no planeta rende, de forma consistente, mais do que os juros que o banco cobra de você no rotativo do cartão ou no cheque especial. Quem investe devendo está apenas subsidiando o lucro do banco.',
          context:
            'No mercado de capitais, um retorno de 10% a 13% ao ano em renda fixa é considerado excelente. Enquanto isso, o rotativo do cartão de crédito no Brasil cobra taxas que superam 440% ao ano (cerca de 15% ao mês).',
          practicalRule:
            'Se você possui dívidas de juros compostos caros (cartão, cheque especial, empréstimo pessoal predatório), seu melhor investimento com retorno garantido de até 400% é estancar e amortizar essa dívida.',
        },
        {
          type: 'text',
          title: 'A Armadilha Psicológica do “Investidor Endividado”',
          content:
            'Muitas pessoas são seduzidas pelo apelo estético de dizer “sou um investidor”. Elas guardam R$ 200 ou R$ 500 todo mês em um CDB ou compram ações, mas mantêm uma fatura de cartão parcelada ou entram todo fim de mês no limite da conta corrente.\n\nEssa divisão mental cria uma ilusão de progresso, mas nos bastidores a matemática destrói o patrimônio de forma brutal.',
        },
        {
          type: 'case-study',
          title: 'O Investidor Iludido vs. O Estrategista Soberano',
          subtitle:
            'Comparativo real em 12 meses de quem tenta investir devendo versus quem zera o passivo antes de alocar.',
          scenarios: [
            {
              title: 'Cenário A: O Investidor Iludido',
              badge: 'Destruição Patrimonial',
              badgeType: 'danger',
              points: [
                'Aplica R$ 500/mês em um CDB que rende ~1% ao mês (12,68% a.a.).',
                'Mantém uma dívida de R$ 3.000 rolando no cartão a 13% ao mês.',
                'Em 12 meses: aportou R$ 6.000 e ganhou ~R$ 410 de rendimentos brutos.',
                'Em 12 meses: a dívida de R$ 3.000 explodiu para impressionantes R$ 13.000+ com juros compostos negativos.',
              ],
              highlightedResult:
                'Resultado: O patrimônio líquido encolheu mais de R$ 6.500 no ano. O investidor empobreceu trabalhando duro.',
            },
            {
              title: 'Cenário B: O Estrategista Soberano',
              badge: 'Recuperação & Força',
              badgeType: 'success',
              points: [
                'Congela novas compras no cartão e direciona os R$ 500/mês integralmente para o passivo.',
                'Renegocia o saldo devedor à vista ou parcela em taxa fixa baixa (ex: 2% a.m.).',
                'Em 6 meses zera completamente o compromisso e elimina R$ 400 mensais de juros que iam para o banco.',
                'A partir do 7º mês, aporta R$ 900/mês livres em ativos que trabalham exclusivamente para si.',
              ],
              highlightedResult:
                'Resultado: Dívida zero, paz de espírito e capacidade de aporte 80% maior para toda a vida.',
            },
          ],
          takeaway:
            'Amortizar uma dívida que custa 10% ao mês equivale a garantir um rendimento líquido de 10% ao mês sem risco algum. Não existe oportunidade no mercado que supere isso.',
        },
        {
          type: 'bullets',
          title: 'Termômetro de Prontidão: Você Pode Começar a Investir?',
          items: [
            '**Cartão de Crédito 100% Pago**: Você paga a fatura integralmente em dia sem recorrer ao parcelamento ou ao pagamento mínimo?',
            '**Cheque Especial Intocado**: Sua conta corrente opera sem entrar no limite há pelo menos 60 dias?',
            '**Sem Empréstimos Predatórios**: Você não possui consignados impagáveis, carnês de juros abusivos ou pendências judiciais?',
            '**Fluxo Previsível**: Suas receitas mensais superam suas despesas fixas de sobrevivência?',
          ],
        },
        {
          type: 'tool-cta',
          tool: 'debt-calculator',
          title: 'Diagnostique seus passivos no FPI',
          content:
            'Se você possui qualquer pendência ou parcelamento em aberto, cadastre suas dívidas agora no simulador para enxergar o custo real dos juros e traçar seu plano de ataque antes de investir.',
          buttonLabel: 'Abrir Gestor de Dívidas',
          prompt: 'Quero listar minhas dívidas, entender o Custo Efetivo Total (CET) e traçar uma rota de quitação acelerada.',
        },
      ],
    },
    {
      id: 'm1-aula-02-inv',
      title: 'Dívida Boa vs. Dívida Ruim e o Resgate do Saldo Livre Real',
      slug: 'divida-boa-vs-divida-ruim-e-o-saldo-livre-real',
      durationMinutes: 7,
      objective:
        'Diferenciar dívidas estruturadas de dívidas destrutivas e compreender o Saldo Livre Real como métrica central de liberdade.',
      blocks: [
        {
          type: 'text',
          title: 'Existe Dívida Aceitável?',
          content:
            'Nem toda dívida é idêntica em destruição de valor, mas para o investidor iniciante a regra prática é manter a vida o mais desavancada possível.\n\nPodemos dividir os passivos em dois grupos claros:\n\n1. **Dívidas Destrutivas (Dívidas de Consumo)**: Cartão de crédito, cheque especial, empréstimos pessoais para pagar festas, roupas, eletrônicos ou cobrir buracos do mês. Possuem juros altíssimos e financiam itens que perdem valor imediatamente.\n2. **Dívidas Estruturadas de Longo Prazo**: Financiamentos habitacionais com taxas reguladas pelo Sistema Financeiro de Habitação (SFH), subsidiadas ou atreladas à TR. Nessas dívidas, desde que a parcela caiba com folga no orçamento, é possível conciliar a amortização com o início dos investimentos de proteção.',
        },
        {
          type: 'principle',
          title: 'A Filosofia do Saldo Livre Real',
          statement:
            'Saldo em conta corrente não é riqueza. Riqueza é o que sobra após você honrar todas as suas obrigações do mês, suas parcelas futuras e a proteção do seu custo de vida. Isso é o Saldo Livre Real.',
          practicalRule:
            'Nunca comprometa mais de 30% da sua renda líquida com parcelas de financiamentos estruturados. Tudo o que ultrapassa essa marca rouba sua agilidade e te coloca na zona de fragilidade.',
        },
        {
          type: 'checklist',
          title: 'Checklist de Auditoria Inicial do Investidor',
          items: [
            'Liste todas as faturas de cartão de crédito e some os valores ainda a vencer nos próximos meses.',
            'Verifique a taxa de juros anual (CET) de cada contrato de financiamento ou empréstimo ativo.',
            'Corte imediatamente qualquer serviço recorrente ou assinatura que você não utilizou nos últimos 30 dias.',
            'Estabeleça que a fatura do cartão será paga sempre no valor total e em débito automático, se possível.',
            'Calcule a sua margem de Saldo Livre Real antes de tomar qualquer decisão de investimento.',
          ],
        },
        {
          type: 'quiz',
          question:
            'Um usuário tem R$ 2.000 na conta corrente e uma dívida de R$ 1.800 no rotativo do cartão cobrando 14% ao mês. Um amigo recomendou aplicar esses R$ 2.000 em uma ação promissora. Qual é a conduta financeiramente soberana?',
          options: [
            'Investir os R$ 2.000 na ação, porque se ela dobrar de valor ele pagará a dívida com folga.',
            'Quitar imediatamente os R$ 1.800 do rotativo do cartão, eliminando os juros devastadores, e começar a investir com a folga gerada nos próximos meses.',
            'Deixar a dívida prescrever após 5 anos e colocar todo o dinheiro na poupança.',
            'Pagar apenas o valor mínimo do cartão (R$ 300) e investir os R$ 1.700 restantes em criptomoedas.',
          ],
          correctIndex: 1,
          feedbackCorrect:
            'Exato! Quitar o cartão garante um retorno equivalente a 14% ao mês (mais de 400% ao ano) livre de impostos e sem nenhum risco. Nenhuma ação ou aplicação no mundo entrega essa certeza.',
          feedbackIncorrect:
            'Atenção à matemática: nenhuma ação ou investimento oferece retorno certo de 14% ao mês. Enquanto você aposta na ação, o cartão cresce como uma bola de neve incontrolável. A prioridade absoluta é estancar o sangramento.',
        },
      ],
    },
  ],
};
