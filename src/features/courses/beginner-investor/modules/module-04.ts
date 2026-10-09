import type { CourseModule } from '~types';

export const module04: CourseModule = {
  id: 'modulo-04-investidor',
  title: 'Renda Fixa Descomplicada: Empréstimo Inteligente e Blindagem IPCA+',
  slug: 'renda-fixa-descomplicada-e-blindagem-ipca',
  description:
    'Vire o jogo do sistema financeiro: torne-se o credor de bancos e governos, domine os títulos públicos e privados e blinde seu poder de compra contra a inflação histórica.',
  objective:
    'Compreender a dinâmica de títulos de renda fixa (Tesouro, CDBs, LCIs/LCAs), a tabela regressiva de IR, a proteção do FGC e o papel vital do IPCA+.',
  order: 4,
  badgeLabel: 'Credor Estratégico',
  lessons: [
    {
      id: 'm4-aula-01-inv',
      title: 'Da Poupança ao Tesouro Direto, CDBs e LCIs/LCAs',
      slug: 'da-poupanca-ao-tesouro-direto-cdbs-e-lcis',
      durationMinutes: 9,
      objective:
        'Aprender a mecânica dos títulos de renda fixa e diferenciar pós-fixados, prefixados e títulos indexados à inflação.',
      blocks: [
        {
          type: 'principle',
          title: 'A Mudança de Lado na Mesa',
          statement:
            'Investir em renda fixa não é mágica: é simplesmente inverter seu papel na economia. Você deixa de ser o cliente que paga juros ao banco para se tornar o credor que empresta dinheiro e recebe juros remunerados de bancos, governos e empresas.',
          practicalRule:
            'Para prazos curtos (até 2 anos) ou reserva: use pós-fixados (100% Selic/CDI). Para prazos longos (acima de 5 anos): use títulos híbridos atrelados à inflação (Tesouro IPCA+). Evite prefixados longos se você não domina marcação a mercado.',
        },
        {
          type: 'text',
          title: 'Os 3 Grandes Emissores de Renda Fixa',
          content:
            'Quando você aplica em renda fixa, está emprestando dinheiro com uma promessa formal de devolução acrescida de juros. Dependendo de quem pega emprestado, o título recebe um nome:\n\n1. **Tesouro Direto (Empréstimo ao Governo Federal)**: É o credor mais seguro de um país, pois o governo tem o poder de emitir a moeda e cobrar impostos. Títulos: Tesouro Selic, Tesouro IPCA+ e Tesouro Prefixado.\n2. **CDBs (Empréstimo a Bancos)**: O banco capta seu recurso para emprestar a terceiros. Em troca, te paga uma porcentagem do CDI (Certificado de Depósito Interbancário). Contam com proteção do FGC.\n3. **LCI e LCA (Letras de Crédito Imobiliário e do Agronegócio)**: Você financia diretamente o agro ou o setor de imóveis. O grande atrativo: são 100% isentas de Imposto de Renda para pessoas físicas.',
        },
        {
          type: 'case-study',
          title: 'O Perigo da Ilusão Nominal: Rendimento Falso vs. Rendimento Real',
          subtitle: 'Como a inflação pode destruir o valor de um investimento aparentemente lucrativo.',
          scenarios: [
            {
              title: 'Cenário A: Aplicação em Prefixado a 9% com Inflação a 8%',
              badge: 'Ganho Quase Nulo',
              badgeType: 'warning',
              points: [
                'O investidor comemora que o dinheiro rendeu 9% no papel.',
                'A inflação oficial do período foi de 8%.',
                'O governo ainda cobra Imposto de Renda sobre os 9% nominais.',
              ],
              highlightedResult: 'Ganho Real Líquido: Zero ou negativo. O poder de compra não aumentou.',
            },
            {
              title: 'Cenário B: Tesouro IPCA+ 6% ao Ano',
              badge: 'Poder de Compra Blindado',
              badgeType: 'success',
              points: [
                'O título garante a variação total da inflação do período (IPCA).',
                'Paga um adicional líquido real de 6% ao ano acima da inflação.',
                'Se a inflação explodir para 12%, o título paga 18%. Se cair para 3%, paga 9%.',
              ],
              highlightedResult: 'Ganho Real Garantido: Seu patrimônio cresce 6% a mais do que o custo de vida todo ano.',
            },
          ],
          takeaway:
            'No Brasil, país com histórico de inflação persistente, títulos atrelados ao IPCA+ são a âncora soberana para construir patrimônio que nunca perde valor de compra.',
        },
        {
          type: 'tool-cta',
          tool: 'inflation',
          title: 'Simule a Blindagem do seu Patrimônio contra a Inflação',
          content:
            'Use a ferramenta Impacto da Inflação do Finanças Pro Invest para calcular exatamente quanto o seu dinheiro perderia de poder de compra ao longo dos anos se ficasse parado, e veja como títulos IPCA+ protegem seu capital real.',
          buttonLabel: 'Abrir Simulador de Inflação',
        },
      ],
    },
    {
      id: 'm4-aula-02-inv',
      title: 'Imposto de Renda Regressivo, Prazos e o FGC',
      slug: 'imposto-de-renda-regressivo-prazos-e-o-fgc',
      durationMinutes: 7,
      objective:
        'Dominar a tributação dos seus rendimentos, entender a proteção legal do FGC e selecionar prazos eficientes.',
      blocks: [
        {
          type: 'text',
          title: 'A Tabela Regressiva: O Tempo É Seu Aliado Tributário',
          content:
            'Ao contrário de outros produtos, a Renda Fixa no Brasil premia a paciência do investidor. Quanto mais tempo seu dinheiro fica investido sem resgate, menor é a mordida do Imposto de Renda sobre o LUCRO (o imposto nunca incide sobre o que você colocou do bolso, apenas sobre o que rendeu):\n\n• **Até 180 dias (6 meses)**: Alíquota máxima de **22,5%**\n• **De 181 a 360 dias (1 ano)**: Alíquota de **20,0%**\n• **De 361 a 720 dias (2 anos)**: Alíquota de **17,5%**\n• **Acima de 720 dias (mais de 2 anos)**: Alíquota mínima de **15,0%**\n\nIsso significa que resgatar aplicações de renda fixa a cada 3 meses para trocar de banco é dar dinheiro de presente para o Leão da Receita Federal.',
        },
        {
          type: 'bullets',
          title: 'O Fundo Garantidor de Créditos (FGC): O Que Você Deve Saber',
          items: [
            '**Garantia de até R$ 250.000 por CPF e por instituição financeira**: Se o banco que emitiu seu CDB ou LCI quebrar, o FGC devolve seu capital investido mais os juros acumulados até o teto.',
            '**Teto Global de R$ 1.000.000**: Válido para a soma de bancos diferentes, com carência de 4 anos após um acionamento.',
            '**Tesouro Direto não precisa do FGC**: O risco do Tesouro Nacional é o risco soberano do país. O governo é mais seguro do que qualquer banco privado.',
          ],
        },
        {
          type: 'quiz',
          question:
            'Após quanto tempo de investimento em um título de Renda Fixa tributável (como CDB ou Tesouro Selic) o investidor atinge a alíquota mínima de Imposto de Renda de 15%?',
          options: [
            'Após 30 dias de aplicação.',
            'Após 180 dias (6 meses).',
            'Após 720 dias (exatamente mais de 2 anos).',
            'Títulos de renda fixa nunca pagam imposto de renda.',
          ],
          correctIndex: 2,
          feedbackCorrect:
            'Exato! Acima de 720 dias você atinge o patamar mínimo histórico de 15% de imposto sobre os lucros.',
          feedbackIncorrect:
            'Atenção à tabela regressiva: o menor imposto (15%) só é concedido para quem mantém a aplicação por mais de 720 dias (2 anos).',
        },
      ],
    },
  ],
};
