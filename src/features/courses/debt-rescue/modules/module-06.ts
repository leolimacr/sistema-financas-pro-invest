import type { CourseModule } from '~types';

export const module06: CourseModule = {
  id: 'modulo-06',
  title: 'Manutenção e recomeço',
  slug: 'manutencao-e-recomeco',
  description: 'O caminho para a liberdade e como evitar novas dívidas.',
  objective:
    'Consolidar hábitos mínimos, celebrar o progresso conquistado e preparar a transição para uma vida financeira mais estável.',
  order: 6,
  badgeLabel: 'Tenho um caminho',
  lessons: [
    {
      id: 'm6-aula-01',
      title: 'Seu plano escrito de saída',
      slug: 'seu-plano-escrito-de-saida',
      durationMinutes: 5,
      objective:
        'Ajudar o aluno a consolidar todas as decisões do curso em um documento simples e claro.',
      blocks: [
        {
          type: 'text',
          content:
            'Um plano escrito não precisa ser sofisticado. Ele precisa ser claro o suficiente para que você saiba, sem hesitar, o que fazer quando o mês apertar.',
        },
        {
          type: 'bullets',
          title: 'O que o seu plano de saída deve ter',
          items: [
            'Lista de dívidas com valores e urgência.',
            'Ranking de prioridade: dívida 1, 2 e 3.',
            'Gastos essenciais mensais.',
            'Valor disponível por mês para pagar dívidas.',
            'Meta dos próximos 30 dias.',
            'Data de revisão do plano.',
          ],
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Preencha o modelo do Plano de Saída em 1 página. Pode começar simples. O importante é ter por escrito.',
        },
        {
          type: 'tool-cta',
          tool: 'nexus-ai',
          title: 'Quer que o Nexus monte seu plano junto com você?',
          content:
            'Compartilhe os dados que você já tem e o Nexus ajuda a montar um plano de saída claro.',
          buttonLabel: 'Abrir Nexus AI',
          prompt:
            'Quero montar meu plano de saída das dívidas. Tenho as seguintes dívidas: [liste aqui]. Meus gastos essenciais são R$ [valor] e consigo separar R$ [valor] por mês para pagar dívidas. Me ajude a montar um plano simples e possível.',
        },
      ],
    },
    {
      id: 'm6-aula-02',
      title: 'Como acompanhar sem obsessão',
      slug: 'como-acompanhar-sem-obsessao',
      durationMinutes: 4,
      objective:
        'Ensinar uma rotina mínima de acompanhamento financeiro que não gere mais ansiedade do que resolve.',
      blocks: [
        {
          type: 'text',
          content:
            'Acompanhar as dívidas é necessário, mas você não precisa olhar para os números todo dia. Uma revisão semanal curta é mais do que suficiente para manter o plano no trilho.',
        },
        {
          type: 'bullets',
          title: 'Sua rotina mínima de acompanhamento',
          items: [
            'Um dia fixo por semana — 15 minutos para revisar o que foi pago e o que está por vir.',
            'Atualizar o saldo das dívidas prioritárias.',
            'Verificar se a meta de 30 dias está no caminho.',
            'Registrar qualquer mudança relevante.',
          ],
        },
        {
          type: 'analogy',
          title: 'Analogia simples',
          content:
            'Você não precisa pesar a mochila a cada hora. Basta verificar de tempos em tempos se ela está ficando mais leve.',
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Escolha um dia fixo da semana como seu "dia financeiro" e coloque no calendário agora.',
        },
      ],
    },
    {
      id: 'm6-aula-03',
      title: 'Recaídas, imprevistos e ajustes',
      slug: 'recaidas-imprevistos-e-ajustes',
      durationMinutes: 4,
      objective:
        'Normalizar imprevistos e recaídas como parte do processo e ensinar a retomar o plano rapidamente.',
      blocks: [
        {
          type: 'text',
          content:
            'Imprevistos acontecem. Um mês difícil não apaga o progresso que você construiu. O que define o resultado não é a ausência de tropeços, mas a velocidade com que você retoma.',
        },
        {
          type: 'bullets',
          title: 'Como agir quando o plano desanda',
          items: [
            'Não entre em espiral de culpa — o mês ruim já aconteceu.',
            'Avalie o tamanho do impacto: foi pontual ou vai arrastar outros meses?',
            'Ajuste o plano de forma realista, sem drama.',
            'Retome a meta de 30 dias com os novos números.',
            'Se precisar, renegocie um prazo com o credor.',
          ],
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Escreva um "plano B" de bolso: o que você vai fazer se um mês for muito difícil. Ter isso escrito reduz o pânico quando acontecer.',
        },
        {
          type: 'quote',
          content:
            'Perfeição não é o objetivo. Consistência é.',
        },
      ],
    },
    {
      id: 'm6-aula-04',
      title: 'O que fazer depois que a poeira baixar',
      slug: 'o-que-fazer-depois-que-a-poeira-baixar',
      durationMinutes: 4,
      objective:
        'Mostrar os primeiros hábitos financeiros saudáveis para a fase pós-crise.',
      blocks: [
        {
          type: 'text',
          content:
            'Quando as dívidas começarem a diminuir, você vai sentir um alívio real. É exatamente nesse momento que muita gente recai, porque o alívio às vezes vira descuido. O próximo passo é construir uma base mais sólida.',
        },
        {
          type: 'bullets',
          title: 'Primeiros hábitos da fase de reconstrução',
          items: [
            'Criar uma reserva de emergência mínima — mesmo que seja R$ 50 por mês no início.',
            'Organizar contas fixas e variáveis em categorias simples.',
            'Evitar parcelamentos desnecessários.',
            'Manter a revisão semanal, mesmo depois que as dívidas sumirem.',
            'Não voltar a usar crédito rotativo sem necessidade real.',
          ],
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Escolha um hábito financeiro que você quer começar assim que tiver um pouco mais de respiro. Anote o nome do hábito e o valor mínimo necessário para começá-lo.',
        },
      ],
    },
    {
      id: 'm6-aula-05',
      title: 'Da sobrevivência para a construção',
      slug: 'da-sobrevivencia-para-a-construcao',
      durationMinutes: 5,
      objective:
        'Criar uma ponte emocional e prática entre o fim do curso de resgate e o início da jornada de construção financeira.',
      blocks: [
        {
          type: 'text',
          title: 'Você chegou ao fim da parte mais difícil',
          content:
            'Lidar com dívida exige coragem. Não a coragem dos filmes, mas a coragem de olhar para uma situação dolorosa, enfrentar os números e continuar em frente mesmo sem certeza de quanto tempo vai levar.',
        },
        {
          type: 'bullets',
          title: 'O que você construiu ao longo deste curso',
          items: [
            'Um mapa das suas dívidas com dados reais.',
            'Critérios claros para saber o que pagar primeiro.',
            'Estratégias práticas de negociação e corte.',
            'Um plano de 30 dias com compromissos concretos.',
            'Uma rotina mínima de acompanhamento.',
          ],
        },
        {
          type: 'quote',
          content:
            'Você não precisa vencer tudo de uma vez. Precisa continuar.',
        },
        {
          type: 'text',
          title: 'O próximo nível',
          content:
            'Quando a poeira baixar e as dívidas estiverem sob controle, o próximo passo é evoluir para a construção: reserva de emergência, organização patrimonial, metas financeiras e, mais adiante, investimentos básicos. Esse é o caminho que o Finanças Pro Invest vai continuar te acompanhando.',
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Marque qual será o seu próximo tema quando sentir que a base está mais organizada: reserva de emergência, metas de curto prazo, organização mensal ou investimentos básicos.',
        },
        {
          type: 'tool-cta',
          tool: 'nexus-ai',
          title: 'Pronto para o próximo nível?',
          content:
            'O Nexus pode ajudar você a dar o primeiro passo na fase de construção quando você sentir que está preparado.',
          buttonLabel: 'Abrir Nexus AI',
          prompt:
            'Conclui o curso de saída das dívidas e estou começando a ter um pouco mais de controle. Quero dar o próximo passo financeiro. Me ajude a entender por onde começar: reserva de emergência, organização mensal ou investimentos básicos?',
        },
      ],
    },
  ],
};
