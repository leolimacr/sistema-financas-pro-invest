import type { CourseModule } from '~types';

export const module01: CourseModule = {
  id: 'modulo-01',
  title: 'Respirar antes de resolver',
  slug: 'respirar-antes-de-resolver',
  description: 'O primeiro passo psicológico e técnico para sair das dívidas.',
  objective:
    'Reduzir a vergonha, quebrar a paralisia e mostrar que dá para começar com os dados que a pessoa já tem.',
  order: 1,
  badgeLabel: 'Dei o primeiro passo',
  lessons: [
    {
      id: 'm1-aula-01',
      title: 'Você não é o seu extrato',
      slug: 'voce-nao-e-o-seu-extrato',
      durationMinutes: 4,
      objective:
        'Separar identidade pessoal da situação financeira atual.',
      blocks: [
        {
          type: 'text',
          title: 'Antes de qualquer número',
          content:
            'Estar endividado não significa que você fracassou. Significa que sua vida financeira entrou em desordem e agora precisa de método, não de culpa.',
        },
        {
          type: 'bullets',
          title: 'O que costuma travar muita gente',
          items: [
            'Vergonha de olhar as contas.',
            'Medo de descobrir que a situação está pior do que parecia.',
            'Sensação de que já passou tempo demais.',
            'Cansaço mental para lidar com boletos, apps e cobranças.',
          ],
        },
        {
          type: 'quote',
          content:
            'Seu problema é financeiro. Sua identidade não é a sua dívida.',
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Escreva esta frase em algum lugar visível: “Hoje eu vou olhar para a minha situação sem me atacar.”',
        },
        {
          type: 'analogy',
          title: 'Analogia simples',
          content:
            'Pense nas dívidas como pedras em uma mochila. O curso não vai fingir que a mochila está leve. Ele vai ajudar você a tirar uma pedra por vez.',
        },
      ],
    },
    {
      id: 'm1-aula-02',
      title: 'Começar incompleto ainda é começar',
      slug: 'comecar-incompleto-ainda-e-comecar',
      durationMinutes: 4,
      objective:
        'Mostrar que a pessoa pode iniciar o plano mesmo sem saber todos os detalhes das dívidas.',
      blocks: [
        {
          type: 'text',
          content:
            'Muita gente adia esse momento porque acha que precisa ter todos os contratos, taxas e saldos exatos. Não precisa. Você pode começar com o que já sabe e completar depois.',
        },
        {
          type: 'bullets',
          title: 'O que já basta para começar',
          items: [
            'Nome da dívida ou do banco.',
            'Valor aproximado.',
            'Se está atrasada ou não.',
            'Se parece pequena, média ou pesada.',
          ],
        },
        {
          type: 'action',
          title: 'Ação prática de hoje',
          content:
            'Anote agora 3 dívidas ou contas que você lembra de cabeça, mesmo que os valores estejam aproximados.',
        },
        {
          type: 'analogy',
          title: 'Analogia simples',
          content:
            'Um mapa rabiscado ainda ajuda mais do que caminhar no escuro.',
        },
      ],
    },
    {
      id: 'm1-aula-03',
      title: 'O que este curso vai resolver',
      slug: 'o-que-este-curso-vai-resolver',
      durationMinutes: 3,
      objective:
        'Alinhar expectativa e mostrar a lógica da jornada.',
      blocks: [
        {
          type: 'bullets',
          title: 'Neste curso, você vai',
          items: [
            'Levantar suas dívidas mesmo com dados parciais.',
            'Entender por que algumas dívidas crescem tão rápido.',
            'Aprender a definir prioridades.',
            'Montar um plano realista de curto prazo.',
          ],
        },
        {
          type: 'bullets',
          title: 'Neste curso, você não vai encontrar',
          items: [
            'Promessa milagrosa.',
            'Pressão para “ficar rico”.',
            'Aula complicada com economês.',
            'Julgamento moral sobre sua situação.',
          ],
        },
        {
          type: 'quiz',
          question: 'Qual é a proposta central deste curso?',
          options: [
            'Fazer você enriquecer rápido.',
            'Ajudar você a organizar, priorizar e agir.',
            'Ensinar investimentos avançados antes de tudo.',
          ],
          correctIndex: 1,
          feedbackCorrect:
            'Exatamente. O foco aqui é clareza, método e próximos passos possíveis.',
          feedbackIncorrect:
            'Ainda não. O foco do curso é organizar a situação, priorizar dívidas e construir um plano viável.',
        },
      ],
    },
    {
      id: 'm1-aula-04',
      title: 'A regra dos próximos passos pequenos',
      slug: 'a-regra-dos-proximos-passos-pequenos',
      durationMinutes: 3,
      objective:
        'Trocar a ideia de resolver tudo por uma lógica de pequenas vitórias.',
      blocks: [
        {
          type: 'text',
          content:
            'Quem está endividado costuma querer resolver tudo de uma vez ou desistir antes de começar. O melhor caminho geralmente está no meio: passos pequenos, consistentes e repetidos.',
        },
        {
          type: 'checklist',
          title: 'Seu compromisso mínimo',
          items: [
            'Separar 20 minutos nesta semana para olhar suas dívidas.',
            'Não tentar resolver tudo em um dia.',
            'Registrar o que já sabe.',
            'Continuar para o próximo módulo.',
          ],
        },
        {
          type: 'tool-cta',
          tool: 'nexus-ai',
          title: 'Use o Nexus para destravar',
          content:
            'Se você estiver travado e não souber nem por onde começar, o Nexus pode ajudar a organizar suas ideias.',
          buttonLabel: 'Abrir Nexus AI',
          prompt:
            'Estou endividado e me sinto travado para começar. Me ajude a dar o primeiro passo sem julgamento e com uma orientação simples.',
        },
      ],
    },
  ],
};
