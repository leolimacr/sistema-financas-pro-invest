import type { CourseModule } from '~types';

export const module02: CourseModule = {
  id: 'modulo-02',
  title: 'Levantando suas dívidas sem travar',
  slug: 'levantando-suas-dividas-sem-travar',
  description: 'Como listar e organizar seus débitos sem desespero.',
  objective:
    'Ajudar a pessoa a mapear suas dívidas mesmo quando faltam taxa, contrato, parcelas ou saldo exato.',
  order: 2,
  badgeLabel: 'Encarei meus números',
  lessons: [
    {
      id: 'm2-aula-01',
      title: 'Onde suas dívidas costumam estar',
      slug: 'onde-suas-dividas-costumam-estar',
      durationMinutes: 4,
      objective: 'Mostrar os principais tipos e origens de dívida para o público brasileiro.',
      blocks: [
        {
          type: 'text',
          content:
            'Antes de listar dívidas, é útil saber onde elas costumam aparecer. Muita gente esquece de dívida de crediário, fatura parcelada ou cheque especial porque esses valores somem na correria.',
        },
        {
          type: 'bullets',
          title: 'Os principais lugares onde sua dívida pode estar',
          items: [
            'Cartão de crédito — fatura aberta, parcelamentos e rotativo.',
            'Cheque especial — saldo negativo na conta.',
            'Empréstimo pessoal — banco, financeira ou app de crédito.',
            'Financiamento — carro, moto ou imóvel.',
            'Crediário ou carnê — loja física ou on-line.',
            'Contas atrasadas — energia, água, internet, aluguel.',
            'Dívidas com familiares ou amigos.',
            'Parcelamentos do celular, assinaturas em atraso.',
          ],
        },
        {
          type: 'checklist',
          title: 'Marque os tipos que se aplicam a você agora',
          items: [
            'Cartão de crédito',
            'Cheque especial',
            'Empréstimo pessoal',
            'Financiamento de veículo',
            'Financiamento imobiliário',
            'Crediário ou carnê de loja',
            'Conta de serviço atrasada',
            'Dívida com pessoa próxima',
          ],
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Marque os tipos que se aplicam à sua situação. Isso já é o começo do seu levantamento.',
        },
      ],
    },
    {
      id: 'm2-aula-02',
      title: 'O mapa mínimo da dívida',
      slug: 'o-mapa-minimo-da-divida',
      durationMinutes: 5,
      objective:
        'Ensinar a estrutura básica de registro de uma dívida com apenas 5 campos essenciais.',
      blocks: [
        {
          type: 'text',
          content:
            'Você não precisa de planilha complicada. Para começar, cada dívida precisa de 5 informações básicas. Se você tiver só 3 dessas 5, já vale registrar.',
        },
        {
          type: 'bullets',
          title: 'Os 5 campos do mapa mínimo',
          items: [
            '1. Nome ou credor — quem você deve (banco, loja, pessoa).',
            '2. Valor aproximado — quanto você estima que deve.',
            '3. Situação — em dia, atrasada ou em negociação.',
            '4. Parcela ou custo mensal — quanto paga por mês nessa dívida.',
            '5. Urgência — baixa, média ou alta.',
          ],
        },
        {
          type: 'analogy',
          title: 'Analogia simples',
          content:
            'Pense nessa tabela como o mapa do terreno antes de começar a construção. Você não precisa do terreno perfeito para fazer o mapa, precisa do mapa para entender o terreno.',
        },
        {
          type: 'tool-cta',
          tool: 'debt-calculator',
          title: 'Leve suas dívidas para a Calculadora',
          content:
            'Depois de preencher seu mapa mínimo, traga os dados para a Calculadora de Dívidas e veja o peso de cada uma.',
          buttonLabel: 'Abrir Calculadora de Dívidas',
        },
      ],
    },
    {
      id: 'm2-aula-03',
      title: 'O que fazer quando faltam dados',
      slug: 'o-que-fazer-quando-faltam-dados',
      durationMinutes: 4,
      objective:
        'Eliminar a paralisia de quem não tem todos os dados e mostrar como estimar e completar informações.',
      blocks: [
        {
          type: 'text',
          content:
            'Não saber o saldo exato de uma dívida não impede você de começar o plano. O importante é registrar o que você sabe e marcar o que ainda precisa confirmar.',
        },
        {
          type: 'bullets',
          title: 'Como recuperar informações que faltam',
          items: [
            'Abra o app do banco ou da financeira e veja o extrato.',
            'Procure o e-mail de boleto ou cobrança mais recente.',
            'Verifique SMS de cobrança no celular.',
            'Ligue para a central de atendimento e peça o saldo atualizado.',
            'Consulte o Serasa ou o Registrato do Banco Central se necessário.',
          ],
        },
        {
          type: 'checklist',
          title: 'Para cada dívida, marque o que você já tem',
          items: [
            'Sei o nome do credor',
            'Sei o valor aproximado',
            'Sei se está atrasada',
            'Sei o valor da parcela',
            'Sei a taxa de juros',
          ],
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Separe as dívidas em duas listas: "já sei o suficiente para registrar" e "preciso confirmar". Não bloqueie as primeiras por causa das segundas.',
        },
        {
          type: 'quote',
          content:
            'Informação incompleta com ação supera informação perfeita sem movimento.',
        },
        {
          type: 'tool-cta',
          tool: 'debt-manager',
          title: 'Cadastre suas Dívidas no Finanças Pro Invest',
          content:
            'Use o Gestor de Dívidas do seu painel para salvar os credores e valores que você já sabe. O sistema consolida seus dados com total segurança e privacidade.',
          buttonLabel: 'Abrir Gestor de Dívidas',
        },
      ],
    },
    {
      id: 'm2-aula-04',
      title: 'Separando dívida urgente de dívida barulhenta',
      slug: 'separando-divida-urgente-de-divida-barulhenta',
      durationMinutes: 4,
      objective:
        'Ensinar a distinguir urgência real de pressão emocional gerada por cobrança.',
      blocks: [
        {
          type: 'text',
          content:
            'Nem toda dívida que faz mais barulho é a mais perigosa. Às vezes um credor que manda mensagem todo dia tem uma dívida bem menos urgente do que outra que nunca te mandou nada.',
        },
        {
          type: 'bullets',
          title: 'O que define urgência real',
          items: [
            'Ameaça de corte de serviço essencial (luz, água, internet).',
            'Risco de perder um bem importante (carro, casa).',
            'Juros muito altos que fazem o saldo crescer rapidamente.',
            'Protestos ou ações judiciais em andamento.',
          ],
        },
        {
          type: 'bullets',
          title: 'O que pode parecer urgente mas talvez não seja',
          items: [
            'Cobrança frequente por mensagem ou ligação.',
            'Tom agressivo do credor.',
            'Dívida pequena de loja que ainda não impacta o essencial.',
            'Parcelamento de compra que ainda está em dia.',
          ],
        },
        {
          type: 'analogy',
          title: 'Analogia simples',
          content:
            'Alarme alto nem sempre indica o maior incêndio. Aprenda a olhar para a chama, não para o volume do barulho.',
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Para cada dívida do seu mapa, dê uma nota: 1 (pode esperar), 2 (preciso de atenção), 3 (urgente de verdade).',
        },
      ],
    },
    {
      id: 'm2-aula-05',
      title: 'Montando sua lista inicial',
      slug: 'montando-sua-lista-inicial',
      durationMinutes: 4,
      objective:
        'Consolidar tudo em um primeiro mapa completo e reduzir o caos de informações espalhadas.',
      blocks: [
        {
          type: 'text',
          content:
            'Agora é hora de juntar tudo em um único lugar. A lista pode estar incompleta, com estimativas e lacunas. O que importa é que ela exista e esteja visível.',
        },
        {
          type: 'bullets',
          title: 'Dicas para montar a lista',
          items: [
            'Não filtre nada: coloque todas as dívidas que lembrar.',
            'Use valores aproximados onde não tiver o exato.',
            'Marque o que ainda precisa confirmar com um asterisco.',
            'Evite guardar na cabeça: o papel ou o app libera espaço mental.',
          ],
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Finalize sua lista inicial com pelo menos 3 dívidas. Mesmo que incompleta, essa lista já é o início do seu plano.',
        },
        {
          type: 'tool-cta',
          tool: 'debt-calculator',
          title: 'Sua lista está pronta? Leve para a Calculadora.',
          content:
            'Com os dados que você já tem, a Calculadora de Dívidas mostra o peso de cada uma e ajuda a visualizar o total.',
          buttonLabel: 'Abrir Calculadora de Dívidas',
        },
        {
          type: 'quiz',
          question: 'O que impede a maioria das pessoas de listar as dívidas?',
          options: [
            'Falta de tempo.',
            'Medo, vergonha e espera por dados perfeitos.',
            'Dificuldade com tecnologia.',
          ],
          correctIndex: 1,
          feedbackCorrect:
            'Isso mesmo. O bloqueio costuma ser emocional, não técnico. Dados incompletos já são suficientes para começar.',
          feedbackIncorrect:
            'Na maioria dos casos, o bloqueio é emocional: medo de olhar, vergonha da situação e espera por dados perfeitos que raramente chegam juntos.',
        },
      ],
    },
  ],
};
