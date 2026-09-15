import type { CourseModule } from '~types';

export const module02: CourseModule = {
  id: 'modulo-02-investidor',
  title: 'A Base de Proteção: Reserva de Emergência Calibrada à Renda',
  slug: 'a-base-de-protecao-reserva-calibrada',
  description:
    'Aprenda a calcular e dimensionar sua reserva de emergência entre 6 e 12 meses de acordo com a solidez da sua fonte de renda, e saiba exatamente onde alocá-la com liquidez imediata.',
  objective:
    'Dominar o conceito de Base de Proteção, aplicar a matriz de solidez profissional (concursado, CLT ou autônomo/PJ) e escolher os ativos corretos para liquidez diária.',
  order: 2,
  badgeLabel: 'Base Blindada',
  lessons: [
    {
      id: 'm2-aula-01-inv',
      title: 'A Função Vital da Reserva: Comprar Paz e Blindar o Futuro',
      slug: 'a-funcao-vital-da-reserva-comprar-paz-e-blindar-o-futuro',
      durationMinutes: 7,
      objective:
        'Entender por que a reserva não tem função de multiplicar patrimônio, mas sim de atuar como seguro antifrágil da vida.',
      blocks: [
        {
          type: 'principle',
          title: 'A Regra da Tranquilidade Financeira',
          statement:
            'A reserva de emergência não existe para enriquecer você nem para bater recordes de rentabilidade. Ela existe para comprar noites de sono e impedir que imprevistos da vida forcem você a liquidar seus investimentos no pior momento de mercado.',
          context:
            'Quem não possui reserva de emergência é um investidor frágil: diante do primeiro problema de saúde, quebra mecânica ou perda de renda, precisará vender seus ativos com deságio ou voltar correndo para as dívidas do cartão de crédito.',
          practicalRule:
            'A reserva é calculada sempre com base no seu CUSTO DE VIDA ESSENCIAL mensal (moradia, comida, saúde, contas básicas), e nunca sobre o seu salário bruto ou gastos supérfluos.',
        },
        {
          type: 'case-study',
          title: 'O Choque da Realidade: O Investidor sem Reserva vs. com Reserva',
          subtitle:
            'O impacto de uma emergência de saúde de R$ 8.000 em dois perfis distintos.',
          scenarios: [
            {
              title: 'Perfil Frágil: Investiu tudo sem reserva',
              badge: 'Resgate Forçado',
              badgeType: 'danger',
              points: [
                'Colocou todo o dinheiro em ações e fundos imobiliários atraído pelos dividendos.',
                'O mercado entra em correção e suas cotas caem 20% no trimestre.',
                'Surge uma despesa médica urgente de R$ 8.000.',
                'Obrigado a vender suas ações em plena baixa histórica, realizando um prejuízo definitivo de milhares de reais.',
              ],
              highlightedResult:
                'Consequência: Perda definitiva de capital e trauma do mercado de ações.',
            },
            {
              title: 'Perfil Soberano: Base de Proteção Completa',
              badge: 'Imunidade Financeira',
              badgeType: 'success',
              points: [
                'Possui sua reserva de emergência integral em Tesouro Selic com liquidez imediata.',
                'Suas ações e fundos também caem 20% no mesmo trimestre, mas permanecem intocados.',
                'Paga o procedimento médico à vista no débito usando a reserva em D+0.',
                'Continua com as cotas valorizando no longo prazo e recompõe a reserva gradualmente nos meses seguintes.',
              ],
              highlightedResult:
                'Consequência: Zero prejuízo no portfólio, controle emocional e serenidade absoluta.',
            },
          ],
          takeaway:
            'A reserva de emergência é o que permite ao investidor manter a mente fria quando o mercado financeiro entra em tempestade.',
        },
        {
          type: 'checklist',
          title: 'O que entra no seu Custo de Vida Essencial?',
          items: [
            'Aluguel / Condomínio / Financiamento Habitacional ou IPTU',
            'Alimentação básica de supermercado (sem delivery e restaurantes caros)',
            'Contas de consumo fundamentais: luz, água, gás, internet essencial',
            'Plano de saúde e medicamentos de uso contínuo',
            'Transporte necessário para trabalhar (combustível ou passe público)',
            'Escola dos filhos ou despesas básicas inegociáveis',
          ],
        },
      ],
    },
    {
      id: 'm2-aula-02-inv',
      title: 'A Matriz de Solidez de Renda: 6, 9 ou 12 Meses',
      slug: 'a-matriz-de-solidez-de-renda-6-9-ou-12-meses',
      durationMinutes: 9,
      objective:
        'Aplicar a calibração precisa do tamanho da reserva conforme a estabilidade da fonte de renda profissional do investidor.',
      blocks: [
        {
          type: 'principle',
          title: 'A Lei da Proporcionalidade do Risco de Renda',
          statement:
            'O tamanho da sua reserva de emergência deve ser proporcional à volatilidade da sua receita. Quanto mais instável for a sua profissão, maior deve ser o seu escudo de sobrevivência.',
          practicalRule:
            'Concursados: 6 meses de custo essencial. Funcionários CLT em empresas privadas: 9 meses. Profissionais liberais, autônomos, empresários e PJs: 12 meses inegociáveis.',
        },
        {
          type: 'text',
          title: 'Por Que Essa Diferenciação É Tão Crítica?',
          content:
            'Muitos livros antigos recomendam genericamente “guarde 3 a 6 meses”. No mercado de trabalho contemporâneo, isso pode ser perigosamente insuficiente:\n\n1. **Servidor Público Concursado (6 Meses)**: Possui estabilidade constitucional/estatutária. A probabilidade de corte de renda abrupto é quase nula. Sua reserva serve para emergências de saúde, reparos de bens essenciais ou atrasos operacionais. 6 meses cobrem qualquer imprevisto com folga.\n2. **Trabalhador CLT em Empresa Particular (9 Meses)**: Está exposto à demissão sem aviso prévio. No Brasil, o tempo médio de recolocação em cargos médios e seniores varia entre 6 e 9 meses. Ter 9 meses garante que a família não precise rebaixar seu padrão às pressas nem aceitar qualquer proposta humilhante por desespero.\n3. **Profissional Liberal, Autônomo, Freelancer ou PJ (12 Meses)**: A renda é variável, clientes podem rescindir contratos em bloco e crises econômicas afetam diretamente o faturamento. Não há FGTS ou seguro-desemprego. Ter 12 meses de cobertura é a única garantia de sustentabilidade sem falência.',
        },
        {
          type: 'case-study',
          title: 'A Matriz Aplicada na Prática: 3 Casos Reais',
          subtitle: 'Dimensionamento exato da Base de Proteção segundo a realidade profissional.',
          scenarios: [
            {
              title: 'Mariana · Servidora Pública Estadual',
              badge: 'Reserva: 6 Meses',
              badgeType: 'info',
              points: [
                'Estabilidade concursada garantida por lei.',
                'Custo de vida essencial familiar: R$ 4.500/mês.',
                'Cálculo: R$ 4.500 × 6 meses = R$ 27.000.',
              ],
              highlightedResult: 'Alvo de Reserva: R$ 27.000 em liquidez diária.',
            },
            {
              title: 'Carlos · Analista de Sistemas CLT (Privada)',
              badge: 'Reserva: 9 Meses',
              badgeType: 'warning',
              points: [
                'Contrato CLT sujeito a reestruturações e demissões corporativas.',
                'Custo de vida essencial: R$ 5.000/mês.',
                'Cálculo: R$ 5.000 × 9 meses = R$ 45.000.',
              ],
              highlightedResult: 'Alvo de Reserva: R$ 45.000 garantindo 9 meses de busca tranquila por novo cargo.',
            },
            {
              title: 'Lucas · Designer Freelancer / PJ',
              badge: 'Reserva: 12 Meses',
              badgeType: 'danger',
              points: [
                'Faturamento flutuante, sem direitos trabalhistas ou rescisão.',
                'Custo de vida essencial: R$ 3.800/mês.',
                'Cálculo: R$ 3.800 × 12 meses = R$ 45.600.',
              ],
              highlightedResult: 'Alvo de Reserva: R$ 45.600 blindando 1 ano inteiro de sobrevivência digna.',
            },
          ],
          takeaway:
            'Descubra o seu perfil e nunca comece a comprar ativos de risco antes de ter essa meta estabelecida e em construção acelerada.',
        },
      ],
    },
    {
      id: 'm2-aula-03-inv',
      title: 'Onde Alocar a Reserva (e Onde Jamais Colocá-la)',
      slug: 'onde-alocar-a-reserva-e-onde-jamais-coloca-la',
      durationMinutes: 8,
      objective:
        'Conhecer os ativos que cumprem os critérios de liquidez diária e segurança máxima, e os ativos proibidos para a reserva.',
      blocks: [
        {
          type: 'text',
          title: 'O Tripé de Ouro da Reserva de Emergência',
          content:
            'Para que um investimento sirva como Base de Proteção, ele PRECISA atender simultaneamente a três requisitos inegociáveis:\n\n1. **Liquidez Imediata (D+0 ou D+1)**: Você deve conseguir resgatar o dinheiro na mesma hora ou no máximo no dia útil seguinte.\n2. **Baixo Risco de Crédito**: O emissor do título precisa ser o governo federal ou uma instituição bancária sólida com garantia do Fundo Garantidor de Créditos (FGC).\n3. **Volatilidade Nula**: O saldo nunca pode amanhecer menor do que estava ontem. Não pode haver oscilação negativa de mercado.',
        },
        {
          type: 'bullets',
          title: 'Os Únicos Ativos Recomendados para a Reserva',
          items: [
            '**Tesouro Selic**: O ativo mais seguro do Brasil, 100% garantido pelo Tesouro Nacional. Rende a taxa Selic diária e tem liquidez imediata com resgate no mesmo dia (nos horários do Tesouro Direto).',
            '**CDB de Liquidez Diária a 100% do CDI**: Emitido por bancos consolidados, com rentabilidade diária e garantia do FGC de até R$ 250 mil por CPF.',
            '**Contas Remuneradas Reguladas com Liquidez**: Contas de instituições autorizadas pelo Banco Central que remuneram 100% do CDI sobre o saldo com resgate instantâneo.',
          ],
        },
        {
          type: 'bullets',
          title: 'Ativos Terminantemente Proibidos para a Reserva',
          items: [
            '❌ **Ações e Fundos Imobiliários (FIIs)**: Oscilam todos os dias. Você pode precisar do dinheiro em um mês de queda severa.',
            '❌ **Tesouro Prefixado ou Tesouro IPCA+ Longo**: Se você vender antes do vencimento, sofre marcação a mercado e pode perder até 30% do capital.',
            '❌ **Criptomoedas e Debêntures**: Altíssima volatilidade ou risco de calote corporativo.',
            '❌ **Fundos Multimercado ou Ações com Carência (D+30)**: Demoram semanas para pagar o resgate, inviabilizando uma urgência médica ou quebra.',
            '❌ **Poupança Tradicional**: Rende substancialmente menos que o Tesouro Selic e só paga rendimento no dia do aniversário (se sacar no dia 29, perde o mês todo).',
          ],
        },
        {
          type: 'quiz',
          question:
            'Qual das seguintes opções representa uma estratégia adequada e profissional para alocar a sua reserva de emergência?',
          options: [
            'Aplicar 100% em ações de empresas pagadoras de dividendos para receber renda passiva todo mês.',
            'Deixar a quantia necessária em Tesouro Selic ou CDB de liquidez diária 100% do CDI, garantindo segurança e resgate imediato.',
            'Comprar títulos do Tesouro IPCA+ com vencimento em 2045 para aproveitar as altas taxas de juros.',
            'Guardar notas de papel físico debaixo do colchão para evitar qualquer contato com o sistema bancário.',
          ],
          correctIndex: 1,
          feedbackCorrect:
            'Perfeito! O Tesouro Selic e o CDB de liquidez diária garantem proteção contra perdas, previsibilidade e disponibilidade em emergências.',
          feedbackIncorrect:
            'Incorreto. Ações e títulos IPCA+ longos oscilam com o mercado e geram perdas se resgatados no momento errado. A reserva exige previsibilidade e liquidez diária.',
        },
        {
          type: 'tool-cta',
          tool: 'budget-tool',
          title: 'Calcule sua Base de Proteção no Gerenciador',
          content:
            'Abra o painel financeiro do FPI para consolidar seu custo essencial mensal e verificar automaticamente o progresso da sua Base de Proteção.',
          buttonLabel: 'Ir para o Gerenciador',
          prompt: 'Quero calibrar minha Base de Proteção somando meus gastos essenciais e definindo a meta de meses.',
        },
      ],
    },
  ],
};
