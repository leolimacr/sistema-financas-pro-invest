import type { CourseModule } from '~types';

export const module04: CourseModule = {
  id: 'modulo-04',
  title: 'O que pagar primeiro',
  slug: 'o-que-pagar-primeiro',
  description: 'Como reorganizar seu orçamento para criar fôlego financeiro.',
  objective:
    'Ensinar critérios simples de prioridade para proteger a sobrevivência, reduzir dano e organizar a sequência de ataque às dívidas.',
  order: 4,
  badgeLabel: 'Defini minhas prioridades',
  lessons: [
    {
      id: 'm4-aula-01',
      title: 'Primeiro, proteja sua vida básica',
      slug: 'primeiro-proteja-sua-vida-basica',
      durationMinutes: 4,
      objective:
        'Mostrar que o plano de saída começa garantindo o essencial, não com heroísmo financeiro.',
      blocks: [
        {
          type: 'text',
          content:
            'Antes de decidir qual dívida atacar primeiro, você precisa garantir o básico da sua vida. Um plano que deixa você sem comida, sem luz ou sem trabalho para pagar dívida não é um bom plano.',
        },
        {
          type: 'bullets',
          title: 'O essencial intocável',
          items: [
            'Alimentação básica da família.',
            'Aluguel ou prestação da moradia.',
            'Energia elétrica.',
            'Água.',
            'Transporte para o trabalho.',
            'Internet ou celular se for necessário para trabalhar ou estudar.',
            'Medicamentos de uso contínuo.',
          ],
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Faça uma lista dos seus gastos essenciais mensais. Some tudo. Esse é o valor mínimo que não pode ser cortado.',
        },
        {
          type: 'quote',
          content:
            'Proteger o essencial não é fraqueza. É a base para qualquer plano funcionar.',
        },
      ],
    },
    {
      id: 'm4-aula-02',
      title: 'Dívida cara, dívida perigosa e dívida negociável',
      slug: 'divida-cara-divida-perigosa-e-divida-negociavel',
      durationMinutes: 5,
      objective:
        'Criar um sistema simples de categorização para ajudar na priorização.',
      blocks: [
        {
          type: 'text',
          content:
            'Nem toda dívida merece o mesmo tipo de atenção. Para priorizar bem, você precisa separar as suas dívidas em três categorias simples.',
        },
        {
          type: 'bullets',
          title: 'As três categorias',
          items: [
            'Cara — juros muito altos que fazem o saldo crescer rápido (rotativo, cheque especial).',
            'Perigosa — ameaça um bem essencial ou serviço básico (financiamento de carro usado para trabalhar, energia).',
            'Negociável — ainda está em dia ou tem margem para acordo sem urgência imediata.',
          ],
        },
        {
          type: 'analogy',
          title: 'Analogia simples',
          content:
            'Nem toda pedra na mochila pesa igual. Algumas cortam as costas agora. Outras são pesadas, mas dá para reorganizar depois.',
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Abra seu mapa de dívidas e coloque uma etiqueta ao lado de cada uma: Cara, Perigosa ou Negociável.',
        },
      ],
    },
    {
      id: 'm4-aula-03',
      title: 'Como escolher a primeira dívida do plano',
      slug: 'como-escolher-a-primeira-divida-do-plano',
      durationMinutes: 5,
      objective:
        'Apresentar duas estratégias clássicas de priorização e ajudar o aluno a escolher a mais adequada para seu caso.',
      blocks: [
        {
          type: 'text',
          content:
            'Existem duas estratégias mais conhecidas para escolher por onde começar. Cada uma funciona melhor em contextos diferentes.',
        },
        {
          type: 'bullets',
          title: 'Estratégia 1 — Avalanche (para quem quer gastar menos)',
          items: [
            'Ataca primeiro a dívida com maior taxa de juros.',
            'Economiza mais dinheiro no total.',
            'Exige mais paciência porque a dívida mais cara pode ser a maior.',
            'Ideal para quem já tem disciplina ou a dívida cara é pequena.',
          ],
        },
        {
          type: 'bullets',
          title: 'Estratégia 2 — Bola de neve (para quem precisa de motivação)',
          items: [
            'Ataca primeiro a dívida de menor valor.',
            'Gera vitória rápida e sensação de progresso.',
            'Ajuda a manter o plano mesmo quando parece difícil.',
            'Ideal para quem precisa de tração emocional para continuar.',
          ],
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Escolha sua estratégia e justifique em uma frase. Depois aponte sua "dívida-alvo número 1".',
        },
        {
          type: 'tool-cta',
          tool: 'debt-calculator',
          title: 'Simule sua estratégia na Calculadora Soberana',
          content:
            'Importe suas dívidas reais com 1 clique na Calculadora de Dívidas do app para comparar amortizações extras, ver meses de vida economizados e calcular exatamente quantos juros você vai poupar.',
          buttonLabel: 'Simular na Calculadora de Dívidas',
        },
      ],
    },
    {
      id: 'm4-aula-04',
      title: 'Método simples de priorização',
      slug: 'metodo-simples-de-priorizacao',
      durationMinutes: 4,
      objective:
        'Apresentar um método de quatro passos para montar a sequência de prioridades sem paralisia.',
      blocks: [
        {
          type: 'text',
          content:
            'Muita gente trava porque tenta resolver tudo ao mesmo tempo. O método abaixo simplifica a decisão em quatro perguntas.',
        },
        {
          type: 'bullets',
          title: 'Os quatro passos',
          items: [
            'Passo 1 — Separei meus gastos essenciais?',
            'Passo 2 — Identifiquei minhas dívidas explosivas (caras ou perigosas)?',
            'Passo 3 — Avaliei o que pode ser negociado sem urgência?',
            'Passo 4 — Escolhi uma prioridade principal e uma secundária para este mês?',
          ],
        },
        {
          type: 'quote',
          content:
            'Você não precisa de um plano perfeito. Precisa de um plano que você consiga seguir.',
        },
        {
          type: 'tool-cta',
          tool: 'nexus-ai',
          title: 'Ainda em dúvida sobre qual dívida priorizar?',
          content:
            'Compartilhe sua lista com o Nexus e peça ajuda para definir a ordem.',
          buttonLabel: 'Abrir Nexus AI',
          prompt:
            'Estas são minhas dívidas: [descreva aqui]. Meus gastos essenciais mensais somam R$ [valor]. Me ajude a definir uma ordem simples de prioridade, explicando em linguagem fácil.',
        },
      ],
    },
    {
      id: 'm4-aula-05',
      title: 'Seu ranking pessoal de ataque',
      slug: 'seu-ranking-pessoal-de-ataque',
      durationMinutes: 4,
      objective:
        'Consolidar todas as decisões do módulo em um ranking claro de prioridade.',
      blocks: [
        {
          type: 'text',
          content:
            'Chegou o momento de transformar o caos em ordem. Vamos montar o seu ranking pessoal de prioridades, com até 3 posições.',
        },
        {
          type: 'bullets',
          title: 'Seu ranking de ataque',
          items: [
            'Prioridade 1 — dívida que você vai atacar com toda a atenção este mês.',
            'Prioridade 2 — dívida que está monitorando ou vai negociar em breve.',
            'Prioridade 3 — dívida que pode esperar um pouco mais com mínimo de atenção.',
          ],
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Escreva o nome das 3 dívidas nos lugares correspondentes. Salve isso em algum lugar que você veja com frequência.',
        },
        {
          type: 'quiz',
          question:
            'Qual dessas dívidas deve ter a maior prioridade de ataque?',
          options: [
            'A que tem o maior número de cobranças por mensagem.',
            'A que ameaça um serviço essencial ou tem juros muito altos.',
            'A mais antiga, independente do valor.',
          ],
          correctIndex: 1,
          feedbackCorrect:
            'Correto. O critério é impacto real: juros altos ou ameaça ao essencial.',
          feedbackIncorrect:
            'O critério de prioridade não é volume de cobrança nem tempo de dívida, mas o dano real que ela causa: juros altos ou risco ao essencial.',
        },
      ],
    },
  ],
};
