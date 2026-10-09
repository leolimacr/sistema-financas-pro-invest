import type { CourseModule } from '~types';

export const module05: CourseModule = {
  id: 'modulo-05-investidor',
  title: 'Renda Variável: Sociedade em Grandes Negócios e Renda Imobiliária',
  slug: 'renda-variavel-sociedade-e-fiis',
  description:
    'Abandone a mentalidade de apostador: aprenda a se tornar sócio de empresas gigantescas e lucrativas e receba aluguéis mensais isentos de imposto através de Fundos Imobiliários.',
  objective:
    'Entender a essência de ações como sociedade em negócios consolidados, desmistificar a volatilidade de curto prazo e montar fluxos de renda passiva com FIIs.',
  order: 5,
  badgeLabel: 'Sócio Estrategista',
  lessons: [
    {
      id: 'm5-aula-01-inv',
      title: 'Ações: Pensar Como Dono, Não Como Apostador',
      slug: 'acoes-pensar-como-dono-nao-como-apostador',
      durationMinutes: 9,
      objective:
        'Compreender o conceito de sociedade empresarial, diferenciar volatilidade de risco permanente e focar no lucro das empresas.',
      blocks: [
        {
          type: 'principle',
          title: 'A Mentalidade do Sócio Soberano',
          statement:
            'Comprar uma ação não é comprar um bilhete de loteria que sobe ou desce no celular. É adquirir uma fração real de uma empresa de grande porte, com funcionários, produtos consolidados e lucros recorrentes. Quem se comporta como dono torce pelo crescimento da empresa e não entra em pânico com oscilações diárias da bolsa.',
          practicalRule:
            'No curto prazo, a bolsa de valores é uma máquina de votação baseada em histeria e boatos. No longo prazo, a bolsa é uma balança de precisão: a cotação da ação sempre acompanha o lucro da empresa.',
        },
        {
          type: 'text',
          title: 'As 2 Vias de Remuneração do Acionista',
          content:
            'Quando você é sócio de uma empresa listada na Bolsa de Valores (B3), você ganha dinheiro de duas maneiras concretas:\n\n1. **Valorização das Cotas**: À medida que a empresa fatura mais, abre novas filiais ou inova, seu valor de mercado cresce. Quem comprou as ações por R$ 20 anos atrás pode vê-las cotadas a R$ 60 ou R$ 100 hoje.\n2. **Dividendos e Juros sobre Capital Próprio (JCP)**: Por lei, as empresas brasileiras são obrigadas a distribuir uma fatia dos seus lucros líquidos diretamente na conta corrente dos seus acionistas. Esse dinheiro cai limpo na sua conta para você reinvestir ou usufruir.',
        },
        {
          type: 'case-study',
          title: 'A Histeria da Cotação vs. A Realidade do Lucro',
          subtitle: 'Como o investidor inteligente aproveita momentos de queda de mercado.',
          scenarios: [
            {
              title: 'Cenário do Especulador Afobado',
              badge: 'Pânico & Prejuízo',
              badgeType: 'danger',
              points: [
                'Comprou ações de um grande banco por R$ 30.',
                'Sai uma notícia política alarmista e a ação cai para R$ 24 em uma semana.',
                'Em pânico de “perder tudo”, vende correndo no fundo do poço.',
              ],
              highlightedResult: 'Prejuízo realizado de R$ 6 por ação por falta de estômago e método.',
            },
            {
              title: 'Cenário do Sócio Consciente',
              badge: 'Oportunidade Soberana',
              badgeType: 'success',
              points: [
                'Sabe que o banco continua lucrando bilhões de reais e pagando dividendos normais.',
                'Enxerga a queda temporária de R$ 30 para R$ 24 como uma grande liquidação.',
                'Usa seu aporte mensal para comprar mais ações com desconto, aumentando sua fatia de dividendos.',
              ],
              highlightedResult: 'Acumula mais ações baratas e acelera dramaticamente sua renda passiva no longo prazo.',
            },
          ],
          takeaway:
            'Volatilidade não é perda definitiva. Perda só existe se você vender seus ativos na hora errada ou comprar empresas podres sem fundamento.',
        },
      ],
    },
    {
      id: 'm5-aula-02-inv',
      title: 'Fundos Imobiliários (FIIs): Renda Passiva Mensal Sem Inquilino',
      slug: 'fundos-imobiliarios-fiis-renda-passiva-mensal',
      durationMinutes: 8,
      objective:
        'Entender o funcionamento dos FIIs, as vantagens sobre imóveis físicos tradicionais e a mecânica de reinvestimento automático.',
      blocks: [
        {
          type: 'text',
          title: 'O Que É um Fundo Imobiliário?',
          content:
            'Um Fundo de Investimento Imobiliário (FII) é um condomínio de investidores que reúne recursos para comprar ou construir imóveis de altíssimo padrão: galpões logísticos alugados para gigantes do varejo, lajes corporativas na Av. Faria Lima, hospitais e shopping centers.\n\nEm vez de precisar de R$ 500 mil para comprar um apartamento e lidar com corretor, inquilino inadimplente e IPTU, você compra cotas a partir de R$ 10 ou R$ 100 e tem direito a receber uma fatia proporcional de todos os aluguéis arrecadados.',
        },
        {
          type: 'bullets',
          title: 'Vantagens dos FIIs em Relação ao Imóvel Físico',
          items: [
            '**Isenção de Imposto de Renda**: Os rendimentos mensais distribuídos por FIIs para pessoas físicas são 100% isentos de IR.',
            '**Liquidez Imediata**: Se você precisar do dinheiro, vende suas cotas na bolsa com poucos cliques e recebe em 2 dias úteis.',
            '**Diversificação Imediata**: Com apenas R$ 500 você pode se tornar cotista de dezenas de galpões e prédios com inquilinos multinacionais.',
            '**Zero Dor de Cabeça**: Sem reformas de encanamento, sem reuniões de condomínio e sem cobrança judicial de inquilinos.',
          ],
        },
        {
          type: 'principle',
          title: 'O Número Mágico dos FIIs',
          statement:
            'O momento mais emocionante na jornada do investidor em FIIs é quando ele atinge o “Número Mágico”: a quantidade de cotas necessária para que os aluguéis mensais recebidos sejam suficientes para comprar uma nova cota inteira sem tirar um único centavo do bolso.',
          practicalRule:
            'Reinvista 100% dos seus proventos enquanto estiver na fase de acúmulo. Isso cria um circuito perpétuo de multiplicação patrimonial.',
        },
        {
          type: 'tool-cta',
          tool: 'dividends',
          title: 'Simule sua Renda Passiva e seu Número Mágico',
          content:
            'Acesse o Simulador de Dividendos do Finanças Pro Invest para calcular quando seus proventos mensais de FIIs e ações pagarão suas despesas de vida e descobrir exatamente seu Número Mágico com efeito bola de neve.',
          buttonLabel: 'Abrir Simulador de Dividendos',
        },
      ],
    },
  ],
};
