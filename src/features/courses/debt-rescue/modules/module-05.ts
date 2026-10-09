import type { CourseModule } from '~types';

export const module05: CourseModule = {
  id: 'modulo-05',
  title: 'Estratégias práticas para sair do aperto',
  slug: 'estrategias-praticas-para-sair-do-aperto',
  description: 'Técnicas de negociação e priorização de pagamentos.',
  objective:
    'Transformar diagnóstico em ação: negociar com calma, cortar gastos com inteligência, abrir espaço no orçamento e evitar novas armadilhas.',
  order: 5,
  badgeLabel: 'Entrei em modo ação',
  lessons: [
    {
      id: 'm5-aula-01',
      title: 'Como negociar sem vergonha',
      slug: 'como-negociar-sem-vergonha',
      durationMinutes: 5,
      objective:
        'Dar ao aluno um roteiro prático e emocional para negociar dívidas com objetividade.',
      blocks: [
        {
          type: 'text',
          content:
            'Negociar uma dívida não é humilhação. É um processo legítimo que acontece todos os dias entre credores e devedores. O credor também prefere receber algo do que não receber nada.',
        },
        {
          type: 'bullets',
          title: 'Princípios para negociar bem',
          items: [
            'Seja objetivo: explique que quer regularizar, mas precisa de uma condição que caiba.',
            'Não revele o valor máximo que consegue pagar de imediato.',
            'Peça sempre duas opções: à vista e parcelado.',
            'Anote tudo: data, nome do atendente, proposta recebida.',
            'Não aceite pressão para decidir na hora.',
          ],
        },
        {
          type: 'quote',
          content:
            'Script base de negociação: "Tenho interesse em regularizar, mas preciso de uma condição que eu realmente consiga pagar. Qual a melhor opção à vista e qual a melhor opção parcelada?"',
        },
        {
          type: 'bullets',
          title: 'Canais Oficiais e Direitos no Brasil',
          items: [
            '**Registrato do Banco Central**: Consulte gratuitamente todas as dívidas e contas no seu CPF no sistema oficial do Bacen.',
            '**Serasa Limpa Nome & Acordo Certo**: Feirões onde credores oferecem descontos de até 80% a 95% para liquidação à vista.',
            '**Portabilidade de Crédito**: Você tem direito garantido por lei de transferir sua dívida para outro banco com taxa de juros menor.',
            '**Desenrola Brasil**: Plataforma federal com faixas de renegociação e subsídio de juros para dívidas bancárias e de varejo.',
          ],
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Escolha uma dívida da sua lista, anote o contato do credor e use o script acima na próxima ligação ou chat.',
        },
        {
          type: 'tool-cta',
          tool: 'nexus-ai',
          title: 'Quer treinar a negociação antes?',
          content:
            'Use o Nexus para simular uma conversa de negociação e se preparar.',
          buttonLabel: 'Abrir Nexus AI',
          prompt:
            'Vou negociar uma dívida de [tipo] no valor de R$ [valor] com [credor]. Me ajude a me preparar com uma lista de perguntas e argumentos para conseguir o melhor acordo possível.',
        },
      ],
    },
    {
      id: 'm5-aula-02',
      title: 'O que perguntar antes de aceitar um acordo',
      slug: 'o-que-perguntar-antes-de-aceitar-um-acordo',
      durationMinutes: 4,
      objective:
        'Fornecer um checklist de segurança para avaliação de propostas de acordo.',
      blocks: [
        {
          type: 'text',
          content:
            'Antes de dizer "aceito", você precisa de respostas claras para pelo menos 5 perguntas. Aceitar um acordo sem essas respostas é como assinar um contrato no escuro.',
        },
        {
          type: 'checklist',
          title: 'Perguntas obrigatórias antes de fechar acordo',
          items: [
            'Qual é o valor total que vou pagar ao final do acordo?',
            'Qual é o número de parcelas e o valor de cada uma?',
            'Existe valor de entrada? Quanto?',
            'Se eu atrasar uma parcela, o que acontece com o acordo?',
            'Vou receber um documento de quitação quando terminar?',
          ],
        },
        {
          type: 'analogy',
          title: 'Analogia simples',
          content:
            'Acordo sem perguntas é contrato no escuro. Você não compra carro sem ver o interior. Não aceite acordo sem saber o que está dentro.',
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Imprima ou salve este checklist e use antes de fechar qualquer negociação.',
        },
      ],
    },
    {
      id: 'm5-aula-03',
      title: 'Cortes que ajudam de verdade',
      slug: 'cortes-que-ajudam-de-verdade',
      durationMinutes: 5,
      objective:
        'Ajudar a identificar cortes realistas que criam espaço no orçamento sem punir a qualidade de vida de forma insustentável.',
      blocks: [
        {
          type: 'text',
          content:
            'Cortar gastos é necessário, mas o objetivo não é punir a sua vida. É criar um respiro mensal que permita pagar dívidas sem entrar em colapso. Cortes exagerados costumam durar pouco.',
        },
        {
          type: 'bullets',
          title: 'Cortes que costumam ajudar mais',
          items: [
            'Assinaturas que você não usa com regularidade.',
            'Delivery e alimentação fora de casa acima do necessário.',
            'Compras por impulso ou "só porque estava em promoção".',
            'Gastos com entretenimento que podem ser substituídos por opções gratuitas.',
            'Renovações automáticas que você esqueceu.',
          ],
        },
        {
          type: 'bullets',
          title: 'O que evitar ao cortar',
          items: [
            'Cortar saúde e medicamentos.',
            'Cortar transporte necessário para trabalhar.',
            'Cortar tudo de uma vez e travar no primeiro mês difícil.',
            'Usar corte como punição em vez de estratégia.',
          ],
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Escolha 3 cortes realistas que você consegue fazer neste mês sem comprometer o essencial. Anote o quanto vai economizar.',
        },
      ],
    },
    {
      id: 'm5-aula-04',
      title: 'Como parar de cavar um buraco novo',
      slug: 'como-parar-de-cavar-um-buraco-novo',
      durationMinutes: 5,
      objective:
        'Identificar comportamentos e armadilhas que geram novas dívidas enquanto a pessoa tenta sair das antigas.',
      blocks: [
        {
          type: 'text',
          content:
            'De nada adianta pagar uma dívida e criar outra ao mesmo tempo. Parte da saída do buraco é identificar o que fez você entrar nele e quais armadilhas ainda existem no caminho.',
        },
        {
          type: 'bullets',
          title: 'Armadilhas comuns para quem está endividado',
          items: [
            'Empréstimo para pagar dívida — em geral troca uma dívida cara por outra igualmente cara.',
            'Crédito fácil em app — pode ter taxas altíssimas escondidas.',
            'Parcelamento "sem juros" de loja — nem sempre é vantagem real.',
            'Oferta de refinanciamento — precisa ser avaliada com critério.',
            'Promessa de saída rápida — se parece mágica, provavelmente é golpe.',
          ],
        },
        {
          type: 'bullets',
          title: 'Gatilhos emocionais que levam a gastar mais',
          items: [
            'Comprar para se sentir melhor em momentos de estresse.',
            'Comprar para acompanhar comparações sociais.',
            'Não planejar e deixar o improviso decidir.',
            'Confundir "parcelado" com "grátis".',
          ],
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Marque 2 armadilhas que mais te pegaram no passado. Escreva uma frase de alerta para cada uma.',
        },
      ],
    },
    {
      id: 'm5-aula-05',
      title: 'Montando sua primeira meta de 30 dias',
      slug: 'montando-sua-primeira-meta-de-30-dias',
      durationMinutes: 5,
      objective:
        'Transformar o diagnóstico em um compromisso concreto e possível para o próximo mês.',
      blocks: [
        {
          type: 'text',
          content:
            'Um plano de 12 meses é importante, mas o que vai te mover agora é o compromisso dos próximos 30 dias. Meta curta é mais forte que plano genial de longo prazo que fica parado.',
        },
        {
          type: 'bullets',
          title: 'Os 3 compromissos da meta de 30 dias',
          items: [
            '1. Pagar — qual dívida você vai atacar ou manter em dia neste mês?',
            '2. Negociar — qual dívida você vai contatar para tentar um acordo?',
            '3. Cortar — qual gasto vai reduzir para abrir espaço no orçamento?',
          ],
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Escreva sua meta de 30 dias com esses 3 compromissos. Seja específico: nome da dívida, valor estimado, data alvo.',
        },
        {
          type: 'tool-cta',
          tool: 'nexus-ai',
          title: 'Quer ajuda para montar sua meta?',
          content:
            'Use o Nexus para criar uma meta de 30 dias realista com base na sua situação.',
          buttonLabel: 'Abrir Nexus AI',
          prompt:
            'Minhas principais dívidas são: [liste aqui]. Minha renda mensal aproximada é R$ [valor] e meus gastos essenciais somam R$ [valor]. Monte comigo uma meta de 30 dias com 3 compromissos: o que pagar, o que negociar e o que cortar.',
        },
        {
          type: 'quiz',
          question: 'Qual é a melhor abordagem para começar a sair das dívidas?',
          options: [
            'Resolver todas as dívidas ao mesmo tempo no primeiro mês.',
            'Montar uma meta pequena e possível para os próximos 30 dias.',
            'Esperar a situação melhorar para então começar a planejar.',
          ],
          correctIndex: 1,
          feedbackCorrect:
            'Isso mesmo. Metas curtas e possíveis criam movimento real. Movimento real cria confiança.',
          feedbackIncorrect:
            'Resolver tudo de uma vez costuma gerar exaustão. Esperar piora a situação. O melhor começo é uma meta pequena e honesta para 30 dias.',
        },
      ],
    },
  ],
};
