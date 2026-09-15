import type { CourseModule } from '~types';

export const module03: CourseModule = {
  id: 'modulo-03-investidor',
  title: 'A Tríade do Investidor e o Efeito Bola de Neve dos Juros Compostos',
  slug: 'a-triade-do-investidor-e-juros-compostos',
  description:
    'Compreenda as três forças da equação de riqueza (Aporte, Tempo e Taxa), descubra onde focar sua energia e veja a matemática real da bola de neve exponencial.',
  objective:
    'Dominar a equação patrimonial, entender por que o aporte mensal é o motor primário da riqueza e vivenciar o ponto de inflexão dos juros compostos.',
  order: 3,
  badgeLabel: 'Mestre do Tempo',
  lessons: [
    {
      id: 'm3-aula-01-inv',
      title: 'A Tríade Sagrada: Aporte, Tempo e Taxa',
      slug: 'a-triade-sagrada-aporte-tempo-e-taxa',
      durationMinutes: 8,
      objective:
        'Identificar onde está o controle real do investidor e por que focar em aumentar os aportes supera a obsessão por taxas mirabolantes.',
      blocks: [
        {
          type: 'principle',
          title: 'O Foco Inteligente da Riqueza',
          statement:
            'Nos primeiros anos da sua jornada, 80% do seu resultado financeiro virá exclusivamente do valor dos seus aportes mensais. O tempo é o multiplicador invisível e a taxa é apenas o lubrificante da engrenagem. Quem gasta 10 horas por semana caçando o ativo que rende 0,5% a mais, em vez de focar em aumentar a sua renda ativa para aportar mais, está jogando o jogo errado.',
          practicalRule:
            'Aporte = Seu Controle Direto. Tempo = Sua Paciência. Taxa = O Mercado. Foque 90% da sua energia naquilo que você controla: seu Saldo Livre Real e a consistência dos seus aportes.',
        },
        {
          type: 'text',
          title: 'A Ilusão da "Taxa Milagrosa"',
          content:
            'Um dos maiores erros do investidor iniciante é acreditar que investir é sobre “adivinhar a próxima ação que vai multiplicar por 10x”. Esse comportamento aproxima as finanças de um cassino.\n\nInvestidores profissionais pensam diferente: eles sabem que o patrimônio se constrói na disciplina de poupar todo mês com folga, investir com segurança e deixar os juros compostos agirem no tempo.',
        },
        {
          type: 'case-study',
          title: 'A Força do Aporte vs. A Obsessão pela Taxa (Horizonte de 10 Anos)',
          subtitle: 'Comparativo real mostrando como a capacidade de poupar bate promessas de alta rentabilidade.',
          scenarios: [
            {
              title: 'Perfil Especulador: Taxa Alta, Aporte Pequeno',
              badge: 'Alto Risco & Frustração',
              badgeType: 'danger',
              points: [
                'Gasta tempo com day trade e promessas de 20% ao ano.',
                'Gasta quase tudo o que ganha e consegue aportar apenas R$ 200/mês.',
                'Após 10 anos de estresse e risco severo: acumulou ~R$ 76.000.',
              ],
              highlightedResult: 'Acúmulo modesto obtido com alto desgaste emocional e enorme risco de ruína.',
            },
            {
              title: 'Perfil Estrategista: Taxa Racional, Aporte Consistente',
              badge: 'Solidez e Volume',
              badgeType: 'success',
              points: [
                'Aplica em ativos sólidos e diversificados rendendo 10% a.a.',
                'Focou em se qualificar no trabalho, gerando renda e aportando R$ 1.200/mês.',
                'Após 10 anos com paz de espírito: acumulou mais de R$ 245.000.',
              ],
              highlightedResult: 'Patrimônio mais de 3 vezes superior com zero noites de sono perdidas.',
            },
          ],
          takeaway:
            'O volume do seu aporte é o acelerador do seu patrimônio. Não existe mágica: ganhe mais, gaste com inteligência e aporte todo mês.',
        },
        {
          type: 'bullets',
          title: 'O Ritual Soberano do "Pague-se Primeiro"',
          items: [
            '**Nunca espere o fim do mês para investir o que "sobrar"**: Quem espera sobrar nunca investe, porque o dinheiro se expande para preencher todo o orçamento disponível.',
            '**Aporte no dia do recebimento**: No momento em que seu salário ou remuneração entrar na conta corrente, transfira a quantia definida do seu aporte para sua conta de investimentos.',
            '**Viva com o restante**: Ao automatizar o aporte no primeiro dia, você ajusta seus gastos automaticamente ao dinheiro restante sem culpa.',
          ],
        },
      ],
    },
    {
      id: 'm3-aula-02-inv',
      title: 'A Matemática da Bola de Neve: O Ponto de Inflexão',
      slug: 'a-matematica-da-bola-de-neve-o-ponto-de-inflexao',
      durationMinutes: 8,
      objective:
        'Compreender o efeito exponencial do tempo e o momento em que os rendimentos do patrimônio superam o salário do investidor.',
      blocks: [
        {
          type: 'text',
          title: 'Por Que o Começo Parece Tão Devagar?',
          content:
            'A função dos juros compostos é exponencial, não linear. Isso significa que nos primeiros anos a linha do gráfico parece quase reta e plana. Você aporta R$ 500 todo mês e, no primeiro ano, seus juros são de poucas dezenas de reais.\n\nEssa é a fase do deserto: onde a maioria das pessoas desiste achando que “investir não vale a pena”. Mas quem mantém a disciplina ultrapassa o **Ponto de Inflexão**, onde a mágica dos juros sobre juros começa a acelerar de forma vertiginosa.',
        },
        {
          type: 'case-study',
          title: 'As 3 Fases da Bola de Neve (Aporte de R$ 800/mês a 10% a.a.)',
          subtitle: 'A evolução de um investidor consistente ao longo de 25 anos.',
          scenarios: [
            {
              title: 'Fase 1: O Esforço do Braço (Anos 1 a 5)',
              badge: '85% do Bolso',
              badgeType: 'info',
              points: [
                'Patrimônio acumulado: ~R$ 61.000.',
                'Do seu próprio bolso (aportes): R$ 48.000.',
                'Juros gerados pelo capital: R$ 13.000.',
                'Sensação: o trabalho duro é responsável por quase todo o resultado.',
              ],
            },
            {
              title: 'Fase 2: O Ponto de Inflexão (Anos 5 a 15)',
              badge: 'Equilíbrio Dinâmico',
              badgeType: 'warning',
              points: [
                'Patrimônio acumulado: ~R$ 330.000.',
                'Do seu bolso: R$ 144.000.',
                'Juros compostos gerados: R$ 186.000.',
                'Sensação: o dinheiro agora gera sozinho mais dinheiro do que o seu próprio aporte anual.',
              ],
            },
            {
              title: 'Fase 3: A Avalanche da Liberdade (Anos 15 a 25)',
              badge: '75% Juros Puros',
              badgeType: 'success',
              points: [
                'Patrimônio acumulado: ~R$ 1.050.000 (Mais de 1 Milhão de Reais).',
                'Do seu bolso: apenas R$ 240.000.',
                'Juros compostos gerados: impressionantes R$ 810.000.',
                'Sensação: seu patrimônio é um trabalhador incansável que nunca dorme e paga todos os seus custos de vida.',
              ],
            },
          ],
          takeaway:
            'O tempo recompensa a consistência. Quem começa mais cedo precisa de muito menos esforço financeiro para atingir a independência.',
        },
        {
          type: 'tool-cta',
          tool: 'compound-interest',
          title: 'Simule sua própria curva de juros no FPI',
          content:
            'Acesse a calculadora de juros compostos, insira seu valor de aporte mensal e veja em quanto tempo seu patrimônio ultrapassa os R$ 100 mil, R$ 500 mil e R$ 1 milhão.',
          buttonLabel: 'Abrir Calculadora de Juros Compostos',
          prompt: 'Quero simular meus aportes mensais no longo prazo e encontrar meu ponto de inflexão.',
        },
      ],
    },
  ],
};
