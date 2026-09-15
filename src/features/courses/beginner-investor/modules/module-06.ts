import type { CourseModule } from '~types';

export const module06: CourseModule = {
  id: 'modulo-06-investidor',
  title: 'Estratégia Antifrágil: Alocação em 4 Motores e Diversificação Global',
  slug: 'estrategia-antifragil-e-alocacao-global',
  description:
    'Aprenda a montar uma carteira antifrágil dividida em 4 motores estruturais — incluindo proteção internacional em dólar — e domine o rebalanceamento inteligente sem estresse.',
  objective:
    'Compreender o método de alocação de ativos em 4 motores, a importância da exposição global em moeda forte, o rebalanceamento por novos aportes e o checklist final do investidor.',
  order: 6,
  badgeLabel: 'Investidor Soberano',
  lessons: [
    {
      id: 'm6-aula-01-inv',
      title: 'O Método dos 4 Motores e a Proteção em Dólar',
      slug: 'o-metodo-dos-4-motores-e-a-protecao-em-dolar',
      durationMinutes: 9,
      objective:
        'Aprender a arquitetura da carteira antifrágil, desmistificar o investimento internacional e blindar o patrimônio contra o risco-país.',
      blocks: [
        {
          type: 'principle',
          title: 'A Lei da Antifragilidade Global',
          statement:
            'O Brasil representa menos de 2% de todo o Produto Interno Bruto do planeta. Concentrar 100% dos seus investimentos no Brasil significa apostar toda a sua vida em uma única moeda emergente e em um único risco político. Ter uma fatia dos seus ativos atrelada ao Dólar e às maiores corporações mundiais não é capricho de milionário: é preservação soberana da sua família.',
          practicalRule:
            'Uma carteira inteligente é desenhada para nunca depender de um único cenário econômico. Quando um ativo cai, outro sobe, garantindo crescimento constante com volatilidade controlada.',
        },
        {
          type: 'text',
          title: 'Os 4 Motores de Alocação de Ativos',
          content:
            'Em vez de tentar adivinhar qual será o melhor investimento do próximo ano (o que é impossível), os maiores gestores do mundo distribuem o patrimônio em 4 grandes motores complementares:\n\n1. **Motor 1: Caixa e Liquidez (Ex: 25%)**: Tesouro Selic e CDBs pós-fixados. Fornece serenidade psicológica, cumpre o papel de reserva de oportunidade e aproveita ciclos de juros altos.\n2. **Motor 2: Renda Fixa Inflação (Ex: 25%)**: Títulos Tesouro IPCA+. Garante que uma parte robusta do seu dinheiro cresça sempre acima do aumento do custo de vida brasileiro.\n3. **Motor 3: Ativos Reais Brasil (Ex: 25%)**: Ações de empresas brasileiras consolidadas e Fundos Imobiliários. Gera dividendos, aluguéis mensais isentos e sociedade no crescimento nacional.\n4. **Motor 4: Ativos Internacionais em Dólar (Ex: 25%)**: ETFs que replicam as maiores empresas do mundo (como o S&P 500 via IVVB11 ou mercados globais via WRLD11). Se o Real desvalorizar, sua fatia em moeda forte dispara e equilibra o seu patrimônio.',
        },
        {
          type: 'case-study',
          title: 'O Teste de Estresse da Carteira nos Ciclos Econômicos',
          subtitle: 'Como a alocação em 4 motores se comporta em diferentes ambientes de mercado.',
          scenarios: [
            {
              title: 'Cenário 1: Crise Política e Desvalorização do Real',
              badge: 'Proteção Cambial Ativa',
              badgeType: 'info',
              points: [
                'As ações brasileiras sofrem queda no curto prazo.',
                'O Dólar dispara de R$ 5,00 para R$ 6,00.',
                'O Motor Internacional valoriza 20% e compensa a oscilação do mercado local.',
              ],
              highlightedResult: 'Equilíbrio: Seu patrimônio total mantém estabilidade e poder de compra global.',
            },
            {
              title: 'Cenário 2: Inflação Alta e Juros em Elevação',
              badge: 'Blindagem de Taxa',
              badgeType: 'warning',
              points: [
                'O custo de vida e os preços de alimentos sobem.',
                'O Motor de Caixa passa a render 12% a 14% ao ano sem risco.',
                'O Motor IPCA+ corrige automaticamente o saldo pela inflação oficial.',
              ],
              highlightedResult: 'Garantia: O investidor não empobrece enquanto o país enfrenta alta de preços.',
            },
          ],
          takeaway:
            'A diversificação inteligente transforma qualquer crise em uma oportunidade natural de rebalanceamento.',
        },
      ],
    },
    {
      id: 'm6-aula-02-inv',
      title: 'Rebalanceamento Periódico e o Checklist do Investidor Soberano',
      slug: 'rebalanceamento-periodico-e-o-checklist-do-investidor-soberano',
      durationMinutes: 8,
      objective:
        'Aprender a rebalancear a carteira comprando na baixa com novos aportes e consolidar o aprendizado da jornada com o checklist definitivo.',
      blocks: [
        {
          type: 'text',
          title: 'A Mecânica Elegante do Rebalanceamento',
          content:
            'Como fazer para “comprar na baixa e vender na alta” sem precisar de bola de cristal?\n\nA resposta é o **Rebalanceamento por Aportes**. Digamos que sua meta seja ter 25% em cada um dos 4 motores. Com o passar dos meses, o mercado de ações sobe e atinge 30%, enquanto o motor de Renda Fixa caiu para 20%.\n\nEm vez de vender suas ações e pagar imposto de renda, você simplesmente direciona os novos aportes mensais para o motor que está abaixo da meta (a Renda Fixa). Dessa forma, você adquire ativos que estão temporariamente defasados e mantém o equilíbrio sem girar a carteira à toa.',
        },
        {
          type: 'checklist',
          title: 'O Checklist Inegociável do Investidor Soberano',
          items: [
            'Dívidas Onerosas Zeradas: Cartão de crédito 100% em dia, limite da conta desativado e zero pendências com juros altos.',
            'Base de Proteção Calibrada: Reserva de 6 a 12 meses do custo de vida essencial guardada em Tesouro Selic ou CDB 100% CDI.',
            'Ritual do Pague-se Primeiro: O aporte é realizado no dia do recebimento do salário ou receita, sem esperar “sobras”.',
            'Carteira Antifrágil em 4 Motores: Capital distribuído em Liquidez, Proteção IPCA+, Sociedade em Negócios/FIIs e Proteção Global em Dólar.',
            'Foco no Longo Prazo: Zero especulação, zero apostas esportivas, zero day trade e total controle emocional diante da volatilidade.',
            'Acompanhamento Periódico no FPI: Revisão mensal do Saldo Livre Real e rebalanceamento semestral por novos aportes.',
          ],
        },
        {
          type: 'quiz',
          question:
            'Como um investidor que segue o método de alocação de ativos deve proceder quando uma classe da sua carteira (ex: ações) passa por uma queda temporária de mercado?',
          options: [
            'Vender todas as ações imediatamente para evitar que o patrimônio caia ainda mais.',
            'Utilizar os próximos aportes mensais para comprar mais dessa classe que está barata, aproveitando os preços baixos para rebalancear a carteira.',
            'Parar de investir e deixar todo o dinheiro na conta corrente.',
            'Fazer apostas arriscadas para tentar recuperar a perda em poucos dias.',
          ],
          correctIndex: 1,
          feedbackCorrect:
            'Brilhante! O rebalanceamento por aportes permite comprar excelentes ativos na baixa sem precisar adivinhar o momento exato do mercado.',
          feedbackIncorrect:
            'Cuidado com a emoção: vender na baixa é realizar prejuízo e travar perdas. O investidor soberano aproveita os novos aportes para comprar ativos com desconto e reequilibrar seus 4 motores.',
        },
        {
          type: 'tool-cta',
          tool: 'nexus-ai',
          title: 'Converse com o Nexus sobre sua carteira soberana',
          content:
            'Agora que você domina os fundamentos reais do investidor, converse com o Nexus para planejar suas metas patrimoniais e simular a divisão dos seus 4 motores no FPI.',
          buttonLabel: 'Consultar Nexus IA',
          prompt: 'Concluí o curso Investidor Soberano. Quero que você avalie meu momento atual entre dívidas, reserva de emergência e alocação nos 4 motores.',
        },
      ],
    },
  ],
};
