import type { CourseModule } from '~types';

export const module03: CourseModule = {
  id: 'modulo-03',
  title: 'Entendendo por que a dívida cresce',
  slug: 'entendendo-por-que-a-divida-cresce',
  description: 'Entenda os mecanismos que fazem a dívida crescer.',
  objective:
    'Explicar em linguagem simples como os juros funcionam, por que o mínimo do cartão engana e o que faz uma dívida virar bola de neve.',
  order: 3,
  badgeLabel: 'Entendi onde o dinheiro vaza',
  lessons: [
    {
      id: 'm3-aula-01',
      title: 'Juros: o vazamento que não para',
      slug: 'juros-o-vazamento-que-nao-para',
      durationMinutes: 5,
      objective:
        'Desmistificar juros compostos de forma simples e mostrar como eles afetam dívidas do cotidiano.',
      blocks: [
        {
          type: 'text',
          content:
            'Juros são o custo de usar dinheiro que não é seu. Quando você pega crédito ou atrasa uma conta, o credor cobra um percentual pelo tempo que o dinheiro ficou com você. O problema é que esse percentual incide sobre o saldo crescente, não sobre o valor original.',
        },
        {
          type: 'bullets',
          title: 'Como os juros compostos funcionam na prática',
          items: [
            'Mês 1: você deve R$ 1.000.',
            'Com 10% de juros ao mês: no mês 2 passa para R$ 1.100.',
            'No mês 3 os 10% incidem sobre R$ 1.100: vira R$ 1.210.',
            'Em 12 meses, sem pagar nada, esse valor chega a quase R$ 3.138.',
          ],
        },
        {
          type: 'analogy',
          title: 'Analogia simples',
          content:
            'Juros altos são como um cano furado embaixo da pia. Você pode continuar enchendo o balde, mas ele nunca vai ficar cheio enquanto o furo existir.',
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Olhe para o seu mapa de dívidas e marque quais parecem "cano furado": aquelas que crescem mesmo quando você não usa mais.',
        },
      ],
    },
    {
      id: 'm3-aula-02',
      title: 'Cartão e mínimo: por que parece pequeno e pesa tanto',
      slug: 'cartao-e-minimo-por-que-parece-pequeno-e-pesa-tanto',
      durationMinutes: 5,
      objective:
        'Mostrar o impacto real de pagar apenas o mínimo do cartão e o custo do rotativo.',
      blocks: [
        {
          type: 'text',
          content:
            'Pagar o mínimo da fatura do cartão parece resolver o problema do mês, mas é uma das situações mais caras do crédito brasileiro. Quando você paga menos que o total da fatura, o saldo restante entra no chamado crédito rotativo.',
        },
        {
          type: 'bullets',
          title: 'O que acontece quando você paga o mínimo',
          items: [
            'O saldo não pago vai para o rotativo com juros altíssimos.',
            'Na próxima fatura, esse saldo já veio acrescido.',
            'Você pode acabar pagando o dobro ou mais do que comprou.',
            'A sensação de "controle" na fatura esconde o crescimento silencioso da dívida.',
          ],
        },
        {
          type: 'quote',
          content:
            'O valor pequeno na fatura pode esconder um custo muito maior na próxima.',
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Verifique nos últimos 3 meses: você pagou o total, o parcial ou o mínimo das suas faturas de cartão? Marque honestamente.',
        },
        {
          type: 'tool-cta',
          tool: 'nexus-ai',
          title: 'Não sabe quanto está pagando de juros no cartão?',
          content:
            'Use o Nexus para simular o impacto do mínimo no seu caso.',
          buttonLabel: 'Abrir Nexus AI',
          prompt:
            'Tenho uma dívida de cartão de crédito de R$ [valor]. Estou pagando o mínimo. Me mostre de forma simples quanto vou pagar ao longo dos próximos 6 e 12 meses se continuar assim.',
        },
      ],
    },
    {
      id: 'm3-aula-03',
      title: 'Empréstimo, cheque especial e parcelamentos',
      slug: 'emprestimo-cheque-especial-e-parcelamentos',
      durationMinutes: 5,
      objective:
        'Diferenciar os principais tipos de dívida e mostrar qual costuma pesar mais.',
      blocks: [
        {
          type: 'text',
          content:
            'Nem toda dívida funciona igual. Entender o tipo ajuda a saber qual é a mais urgente e qual estratégia usar para cada uma.',
        },
        {
          type: 'bullets',
          title: 'Tipos comuns e suas características',
          items: [
            'Rotativo do cartão — juros mensais muito altos, cresce rápido.',
            'Cheque especial — taxa elevada, mas pode ser menor que o rotativo.',
            'Empréstimo pessoal — parcela fixa, prazo definido, juros variáveis.',
            'Financiamento — longa duração, bem como garantia, mas tem regras de retomada.',
            'Parcelamento de compra — geralmente tem prazo definido e juros embutidos no preço.',
            'Crediário — similar ao parcelamento, mas com contrato formal de loja.',
          ],
        },
        {
          type: 'analogy',
          title: 'Analogia simples',
          content:
            'Nem todo vazamento é igual. Alguns pingam devagar. Outros estouram o encanamento. Conhecer o tipo te ajuda a fechar o mais perigoso primeiro.',
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'No seu mapa de dívidas, classifique cada uma pelo tipo: rotativo, cheque especial, empréstimo, financiamento ou parcelamento.',
        },
      ],
    },
    {
      id: 'm3-aula-04',
      title: 'Quando uma renegociação ajuda — e quando piora',
      slug: 'quando-uma-renegociacao-ajuda-e-quando-piora',
      durationMinutes: 5,
      objective:
        'Ensinar a avaliar propostas de acordo sem aceitar qualquer condição por impulso.',
      blocks: [
        {
          type: 'text',
          content:
            'Renegociar uma dívida pode ser a saída certa — ou pode piorar o problema se você aceitar um acordo que não consegue cumprir. O que parece desconto nem sempre significa custo menor no total.',
        },
        {
          type: 'bullets',
          title: 'Quando renegociar costuma ajudar',
          items: [
            'A taxa de juros cai de forma real.',
            'A parcela cabe no seu orçamento mensal.',
            'O prazo é razoável sem prolongar demais o peso.',
            'Você tem como manter sem recorrer a outro crédito.',
          ],
        },
        {
          type: 'bullets',
          title: 'Sinais de que o acordo pode ser ruim',
          items: [
            'Parcela baixa, mas prazo muito longo e total alto.',
            'Entrada que você não tem condições de pagar.',
            'Taxa de juros não foi informada ou está confusa.',
            'Pressão para assinar imediatamente sem tempo de pensar.',
          ],
        },
        {
          type: 'analogy',
          title: 'Analogia simples',
          content:
            'Um acordo ruim é como uma roupa de liquidação que não serve: parece barato, mas você acaba gastando mais para consertar depois.',
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Antes de aceitar qualquer acordo, pergunte: cabe no meu mês? Reduz o dano real? Consigo manter por todo o prazo?',
        },
      ],
    },
    {
      id: 'm3-aula-05',
      title: 'O custo do atraso invisível',
      slug: 'o-custo-do-atraso-invisivel',
      durationMinutes: 4,
      objective:
        'Mostrar que dívida não pesa só no bolso, mas também no bem-estar mental e nas decisões do dia a dia.',
      blocks: [
        {
          type: 'text',
          content:
            'Muita gente foca só nos números e esquece do peso emocional da dívida. Pesquisas mostram que endividamento crônico está ligado a mais estresse, menos foco, mais impulsividade e piora na qualidade do sono.',
        },
        {
          type: 'bullets',
          title: 'O custo invisível do atraso',
          items: [
            'Multa e juros — o custo financeiro direto.',
            'Restrição de crédito — dificuldade de acesso a financiamentos futuros.',
            'Ansiedade e estresse constante.',
            'Tomada de decisão prejudicada pelo peso emocional.',
            'Sensação de paralisia: "não adianta tentar".',
          ],
        },
        {
          type: 'quote',
          content:
            'Resolver uma dívida não é só aliviar o bolso. É recuperar espaço na cabeça.',
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Escreva o nome da dívida que mais te tira o sono. Ela vai entrar no centro do seu plano.',
        },
        {
          type: 'quiz',
          question:
            'Você pagou apenas o mínimo do cartão durante 3 meses seguidos. O que acontece com o saldo?',
          options: [
            'O saldo diminui normalmente.',
            'O saldo cresce com juros sobre o valor não pago.',
            'O saldo congela até você conseguir pagar o total.',
          ],
          correctIndex: 1,
          feedbackCorrect:
            'Exato. O saldo não pago entra no rotativo e cresce com juros sobre juros a cada mês.',
          feedbackIncorrect:
            'Na prática, o saldo cresce. O valor não pago entra no rotativo e rende juros compostos a cada mês.',
        },
      ],
    },
  ],
};
