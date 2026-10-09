import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { NexusIdentity } from './nexus-core/identity';
import type { UserDataResult } from './nexus-core/data-integrator';
import { DataIntegrator } from './nexus-core/data-integrator';
import { MultiModelRouter } from './nexus-core/MultiModelRouter';
import { NexusDebtPlanRequestSchema } from './src/debtPlan.types';
import {
  GEMINI_API_KEY as GEMINI_API_KEY_SECRET,
  OPENROUTER_API_KEY as OPENROUTER_API_KEY_SECRET,
  GROQ_API_KEY as GROQ_API_KEY_SECRET,
  MISTRAL_API_KEY as MISTRAL_API_KEY_SECRET,
} from './secrets';

// ============================================
// FUNÇÃO: generateDebtPlan (Simulador ? Nexus)
// ============================================

export const generateDebtPlan = onCall(
  {
    memory: "512MiB",
    timeoutSeconds: 300,
    region: "us-central1",
    secrets: [
      GEMINI_API_KEY_SECRET,
      OPENROUTER_API_KEY_SECRET,
      GROQ_API_KEY_SECRET,
      MISTRAL_API_KEY_SECRET,
    ],
  },
  
  async (request) => {
    // TRATAMENTO MANUAL DE PREFLIGHT (OPTIONS)
    if (request.rawRequest && request.rawRequest.method === 'OPTIONS') {
      const res = request.rawRequest.res;
      if (res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(204).send();
        return;
      }
    }

    try {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Login necessário.");
      }

      // 1) Validar payload de entrada
      const parseResult = NexusDebtPlanRequestSchema.safeParse(request.data);
      if (!parseResult.success) {
        logger.error("[generateDebtPlan] Payload inválido:", parseResult.error.flatten());
        // Agora o erro inclui os detalhes do Zod
        throw new HttpsError(
          "invalid-argument",
          "Dados inválidos: " + JSON.stringify(parseResult.error.flatten())
        );
      }

      const userId = request.auth.uid;

      // 2) Preparar router e chaves
      const geminiApiKey = process.env.GEMINI_API_KEY as string;
      const groqApiKey = process.env.GROQ_API_KEY as string;
      const openrouterApiKey = process.env.OPENROUTER_API_KEY as string;

      const router = MultiModelRouter.getInstance();
      router.updateApiKeys({
        gemini: geminiApiKey,
        groq: groqApiKey,
        openrouter: openrouterApiKey,
      });

      // 3) Montar system prompt específico para plano de dívidas
      const dados = parseResult.data;
      const ctx = dados.perfilContexto;
      const patrimonio = dados.patrimonioContexto;
      const oportunidade = dados.custoOportunidadeContexto;

      const estabilidadeLabel =
        ctx?.estabilidade === 'estavel' ? 'Estável (renda fixa e previsível)' :
        ctx?.estabilidade === 'volatil' ? 'Volátil (renda imprevisível, risco alto)' :
        ctx?.estabilidade === 'regular' ? 'Regular (renda com alguma variação)' :
        'Não informada';

      const reservaStatus = ctx
        ? `R$ ${ctx.reservaAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de reserva atual (meta: ${ctx.metaReservaEmMeses} meses de renda)`
        : 'Não informada';

      const patrimonioStatus = patrimonio
        ? `Total de investimentos financeiros: R$ ${patrimonio.valorTotalInvestimentosFinanceiros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${patrimonio.valorDisponivelAcimaReserva != null ? ` | Disponível acima da reserva: R$ ${patrimonio.valorDisponivelAcimaReserva.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}${patrimonio.valorPatrimonioLiquido != null ? ` | Patrimônio líquido: R$ ${patrimonio.valorPatrimonioLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}`
        : 'Não informado';

      const oportunidadeStatus = oportunidade
        ? `Selic: ${oportunidade.selicAno ?? 'n/d'}% a.a. | CDI: ${oportunidade.cdiAno ?? 'n/d'}% a.a. | Retorno líquido estimado: ${oportunidade.retornoLiquidoEstimadoAno ?? 'n/d'}% a.a. | Estratégia sugerida: ${oportunidade.estrategiaSugerida ?? 'n/d'}`
        : 'Não informado';

        const nomeUsuario = ((request.auth.token?.name || request.auth.token?.email || "Investidor") as string).split(' ')[0];

        // Buscar dados consolidados do usuário (inclui transações recentes do Gerenciador)
        let userData: UserDataResult = {
          goals: [],
          recentTransactions: [],
          simulations: [],
          summary: '',
          hasData: false,
          dataStatus: 'empty',
        };

        try {
          // Para plano de dívidas, use uma janela padrão de 6 meses (aprox. 180 dias)
          const userPlan = '6m';
          userData = await DataIntegrator.gatherUserData(userId, userPlan);
          logger.info(`[generateDebtPlan] DataIntegrator retornou ${userData.recentTransactions.length} transações recentes para plano de dívidas.`);
        } catch (dataError: any) {
          logger.error("[generateDebtPlan] Falha ao buscar dados do usuário via DataIntegrator:", dataError);
        }

        const userDataSintetico = {
          hasData: userData.hasData,
          summary: userData.summary || "",
        };

        const systemPromptEtapa1 = `${NexusIdentity.getSystemPrompt(
          nomeUsuario,
          {},
          "",
          "",
          "",
          "",
          dados.patrimonioContexto ? JSON.stringify(dados.patrimonioContexto) : "",
          "",
          "",
          true,
          userDataSintetico,
          ""
        )}

# MISSÃO ESPECIAL: PLANO DE QUITAÇÃO DE DÍVIDAS

Você está sendo acionado para montar um plano de quitação de dívidas personalizado para ${nomeUsuario}.
Responda exclusivamente em português do Brasil. Nenhuma palavra em inglês.
Escreva como um consultor financeiro humano escreveria para um cliente real.
Use linguagem natural, clara, prática e consultiva.
Não retorne JSON.

Não use nomes de campos, marcadores técnicos nem estrutura de banco.
## FORMATAÇÃO DE SAÍDA — OBRIGATÓRIA

A resposta será exibida na tela e impressa em PDF pelo navegador.

Por isso:
- NÃO use markdown
- NÃO use tabelas com barras verticais (pipe)
- NÃO use negrito, #, ##, ###, bullets com asterisco (*) ou qualquer sintaxe markdown
- NÃO use blocos visuais dependentes de renderização markdown
- Escreva em texto limpo, com frases curtas e subtítulos simples

Formato desejado:
TÍTULO EM TEXTO NORMAL
Linha em branco
Subtítulo simples
Texto corrido
Linha em branco
Outro subtítulo
Texto corrido

Se quiser listar itens, use hífen normal ou numeração simples, mas sem qualquer sintaxe especial de markdown.

## CALIBRAÇÃO EMOCIONAL — OBRIGATÓRIO

O plano começa com um parágrafo humano — antes de qualquer listagem de dívidas.

Regras:
- Identifique ao menos um ponto financeiro positivo REAL do usuário nos dados (reserva, patrimônio, renda estável, dívidas abaixo da renda). Cite o número.
- Se a situação for pesada (dívidas altas, pouca reserva), o tom é de acolhimento e encorajamento baseado nos pontos fortes reais.
- Se a situação for confortável, o tom é de oportunidade.
- Nunca abra com números negativos ou lista de dívidas.
- Este parágrafo deve soar como a primeira frase de um consultor humano numa reunião presencial — não como introdução de relatório.
- Máximo de 4 linhas. Depois disso, vá direto para a análise.

## USO OBRIGATÓRIO DO GERENCIADOR FINANCEIRO

Você tem acesso não só às dívidas e ao patrimônio, mas também ao GERENCIADOR FINANCEIRO do Finanças Pro Invest.

Isso significa que, além da renda declarada, você enxerga:

- entradas do período (salários, extras, etc.)
- saídas por categoria (moradia, alimentação, transporte, dízimo, etc.)
- saldo disponível e padrão de gastos recente

REGRAS OBRIGATÓRIAS:

1. SEMPRE considere o fluxo de caixa real recente antes de sugerir antecipação de dívidas.
2. Se o padrão de despesas estiver alto e o saldo final estiver apertado, seja mais conservador na sugestão de quanto da sobra mensal pode ir para antecipação.
3. Se o usuário mantiver saldo positivo consistente e despesas estáveis, você pode sugerir um valor de antecipação um pouco mais agressivo, deixando claro que é baseado no comportamento real observado.
4. Use exemplos concretos na análise:
   - “Nos últimos meses, suas entradas ficaram em torno de R$ X e as saídas em torno de R$ Y, deixando uma sobra média de aproximadamente R$ Z.”
5. Nunca assuma uma sobra teórica máxima (renda - parcelas) sem confrontar com o comportamento de gastos observado no Gerenciador Financeiro.
6. Se houver poucos lançamentos ou dados insuficientes, deixe isso claro no texto e adote uma postura mais conservadora na antecipação, SEM pedir para o usuário “montar o plano por conta própria”.

PROIBIDO — estas frases nunca devem aparecer no texto:
- "Agradeço a oportunidade"
- "Espero que essas recomendações sejam úteis"
- "não hesite em entrar em contato"
- "Se tiver alguma dúvida"
- "Lembre-se de que é fundamental"
- "nos próximos 7 dias"
- "nos próximos 30 dias"
- "nos próximos 90 dias"
- qualquer frase de encerramento genérica de e-mail corporativo
- "cada situação é única"
- "consultar um assessor"
- "assessor de investimentos certificado"
- "registrado na CVM"
- "recomendável consultar"
- "análise detalhada da situação financeira do usuário"
- qualquer frase que delegue ao usuário o que o Nexus deve fazer
- qualquer parágrafo final de resumo que repita o que já foi dito no plano
- "sua renda estável e a reserva adequada permitem"
- "abordagem agressiva, mas equilibrada"

FORMATO OBRIGATÓRIO — siga este exemplo de estrutura e tom (adapte os números ao usuário real):

[Nome], sua renda mensal é de R$ X. Suas parcelas somam R$ Y, o que deixa R$ Z disponíveis por mês. Sua reserva de R$ W cobre [N] meses de despesas — isso é [adequado / insuficiente / confortável]. Seu patrimônio líquido é de R$ P.

Cada dívida analisada:

[Nome da dívida 1] — saldo R$ X | taxa 2,03% a.m.
O retorno líquido de renda fixa hoje é 1,04% a.m. (Selic 14,75% com IR). Como 2,03% > 1,04%, vale quitar agressivamente — cada real nessa dívida rende mais do que investido. Com R$ Z de sobra, você pode liquidar essa dívida em [N] meses pagando R$ X a mais por mês. Se puder antecipar as últimas parcelas agora, elas custam muito menos do que a parcela atual — elimine de trás pra frente.

[Nome da dívida 2] — saldo R$ X | taxa 0,69% a.m.
O retorno líquido de renda fixa (1,04% a.m.) é maior do que o custo dessa dívida. Não vale antecipar — seu dinheiro rende mais investido do que quitando esse financiamento. Mantenha as parcelas normais.

O que fazer agora — esta semana:
[ação concreta e específica, com valor e dívida nomeados]

O que mudar — este mês:
[decisão financeira específica ao cenário deste usuário]

Revisão em 3 meses:
[o que verificar nos números reais deste usuário em 3 meses]

— Nexus, analista de cenários financeiros do Finanças Pro Invest

IMPORTANTE: o exemplo acima é apenas de estrutura e tom — use os dados reais do usuário, não os números do exemplo.

O texto deve cobrir obrigatoriamente:
- Leitura da situação atual: renda, sobra mensal (renda - soma das parcelas), reserva e patrimônio
- Dívida prioritária e motivo objetivo
- Decisão para cada dívida: quitar agressivamente, amortizar, manter parcelas, renegociar ou não antecipar
- Para cada dívida: comparar explicitamente a taxa mensal da dívida com o retorno líquido mensal de renda fixa e concluir se vale ou não antecipar
- Valores concretos: quanto sobra por mês, quanto destinar de extra, e OBRIGATORIAMENTE dois cenários de quitação para cada dívida cuja taxa supere o retorno líquido de renda fixa: (1) pagando só a parcela atual — quantos meses restam; (2) pagando a parcela + o valor extra calculado sobre a sobraMensalReal — quantos meses restam e quanto economiza em juros.
- Ações desta semana (imediatas)
- Mudança de comportamento este mês
- Revisão estratégica em 3 meses
- Alertas importantes e cuidados

Regras:
- Nunca entregue um plano genérico
- Use exatamente os nomes das dívidas fornecidas
- Não confunda patrimônio passivo com dívidas
- Se houver reserva adequada, não recomende aumentar reserva sem necessidade
- Se houver vantagem em preservar liquidez ou manter investimentos, diga isso claramente
- Se a taxa da dívida for menor que o retorno líquido de renda fixa, conclua explicitamente que não vale antecipar
- Se a taxa da dívida for maior que o retorno líquido de renda fixa, conclua explicitamente que vale quitar agressivamente
- Quando houver financiamento parcelado, oriente a antecipar as últimas parcelas todo mês — elas custam muito menos que a parcela atual e eliminam juro futuro
- Você é o plano — nunca devolva ao usuário a tarefa de elaborar um plano
- Seja direto, humano e útil
`;

        // 4) Mensagem "user" com os dados da simulação
        const userMessage = `
      A seguir estão os dados reais de um usuário do Finanças Pro Invest.

      INSTRUÇÕES DE ANÁLISE:
      - Considere renda, reserva, estabilidade, patrimônio, custo de oportunidade e todas as dívidas ao mesmo tempo.
      - Não trate automaticamente financiamento barato ou dívida garantida como prioridade de quitação antecipada.
      - Se houver contexto econômico favorável à liquidez ou ao investimento conservador, explique isso de forma explícita.
      - Não devolva JSON nesta etapa. Responda como texto de consultoria.
      - Em patrimonioPassivo, não trate bens patrimoniais como dívidas. Dívidas são apenas financiamentos, empréstimos e saldos devedores.
      - Se patrimônio ativo, reserva ou renda não forem suficientes para uma quitação acelerada sem perda de segurança, deixe isso claro.
      - Se fizer mais sentido manter parcelas de alguma dívida, diga isso explicitamente.

      PERFIL DO USUÁRIO:
      - Nome: ${nomeUsuario}
      - Estabilidade de renda: ${estabilidadeLabel}
      - Reserva de emergência: ${reservaStatus}
      - Renda mensal declarada: ${dados.simulacao.rendaMensalEstimada
        ? `R$ ${dados.simulacao.rendaMensalEstimada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : 'Não informada'}

      PATRIMÔNIO E INVESTIMENTOS:
      - Contexto patrimonial: ${patrimonioStatus}

      CONTEXTO DE CUSTO DE OPORTUNIDADE:
      - Contexto econômico e estratégico: ${oportunidadeStatus}

      DÍVIDAS CADASTRADAS:
      ${dados.dividas.map((d, i) => {
        let debtInfo = `${i + 1}. ${d.nome} — Saldo: R$ ${d.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Taxa: ${d.taxaJurosMes}% a.m.${d.parcelaMensal ? ` | Parcela atual: R$ ${d.parcelaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}${d.ehGarantida ? ' | Dívida garantida: sim' : ''}${d.atrasoEmDias ? ` | Atraso: ${d.atrasoEmDias} dias` : ''}${d.observacoes ? ` | Observações: ${d.observacoes}` : ''}`;
        
        // Adicionar informações de reajuste/séries se existirem
        if (d.adjustmentConfig && d.adjustmentConfig.type !== 'fixed' && d.adjustmentConfig.series && d.adjustmentConfig.series.length > 0) {
          const config = d.adjustmentConfig;
          const series = config.series!; // Non-null assertion since we checked above
          if (config.type === 'annual_percent' && config.annualPercentRate) {
            debtInfo += ` | Reajuste anual: ${config.annualPercentRate}% a.a.`;
          }
          debtInfo += ` | Séries (${series.length}): ` + series.map((s, si) => 
            `Série ${si + 1} (${s.year}): ${s.installmentsCount}x de R$ ${s.installmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${s.adjustmentRate ? ` (reajuste ${s.adjustmentRate}%)` : ''}`
          ).join('; ');
          if (d.currentSeriesIndex !== undefined && d.currentSeriesIndex < series.length) {
            const currentSeries = series[d.currentSeriesIndex];
            debtInfo += ` | Série atual: ${d.currentSeriesIndex + 1} (${currentSeries.year})`;
          }
          if (d.nextAdjustmentDate) {
            debtInfo += ` | Próximo reajuste: ${new Date(d.nextAdjustmentDate).toLocaleDateString('pt-BR')}`;
          }
        }
        
        return debtInfo;
      }).join('\n')}

      CAIXA REAL DO USUÁRIO — USE ESTES NÚMEROS COMO BASE PRINCIPAL:
      - Renda mensal declarada: ${typeof dados.simulacao.rendaMensalEstimada === 'number'
        ? `R$ ${dados.simulacao.rendaMensalEstimada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : 'Não informada'}
      - Despesas mensais médias já apuradas no Gerenciador: ${typeof dados.simulacao.despesasMensaisMedias === 'number'
        ? `R$ ${dados.simulacao.despesasMensaisMedias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : 'Não informado'}
      - Parcelas mensais atuais das dívidas: ${typeof dados.simulacao.totalParcelasMensais === 'number'
        ? `R$ ${dados.simulacao.totalParcelasMensais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : 'Não informado'}
      - Sobra mensal real já calculada: ${typeof dados.simulacao.sobraMensalReal === 'number'
        ? `R$ ${dados.simulacao.sobraMensalReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : 'Não informada'}
      - Janela usada para apurar despesas: ${typeof dados.simulacao.janelaAnaliseDias === 'number'
        ? `${dados.simulacao.janelaAnaliseDias} dias`
        : 'Não informada'}

      RESUMO REAL DE LANÇAMENTOS DO GERENCIADOR (últimos 6 meses aproximados):
      ${
        userData && userData.recentTransactions && userData.recentTransactions.length > 0
          ? (() => {
              const incomes = userData.recentTransactions.filter(t => t.type === 'income');
              const expenses = userData.recentTransactions.filter(t => t.type === 'expense');

              const totalIncomes = incomes.reduce((acc, t) => acc + (t.amount || 0), 0);
              const totalExpenses = expenses.reduce((acc, t) => acc + (t.amount || 0), 0);

              const byCategory: Record<string, number> = {};
              for (const t of expenses) {
                const cat = (t.category || 'Outros').trim();
                byCategory[cat] = (byCategory[cat] || 0) + (t.amount || 0);
              }

              const topCategories = Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([cat, val]) => `${cat}: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
                .join(' | ');

              return `
      - Entradas totais no período: R$ ${totalIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      - Saídas totais no período: R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      - Principais categorias de despesa: ${topCategories || 'não foi possível identificar categorias principais'}
              `;
            })()
          : `
      - Não há lançamentos suficientes no Gerenciador para este período. Adote postura conservadora nas sugestões de pagamento extra e deixe isso claro no texto.
            `
      }

      INDICAÇÃO OBJETIVA PARA O PLANO:
      - Se despesasMensaisMedias existir, então as despesas do usuário JÁ FORAM IDENTIFICADAS.
      - Se sobraMensalReal existir, então a sobra mensal do usuário JÁ FOI CALCULADA.
      - NUNCA diga que é preciso identificar, levantar, descobrir, mapear ou calcular as despesas antes de recomendar o pagamento extra.
      - NUNCA diga que a sobra mensal real ainda precisa ser conhecida quando ela já estiver informada acima.
      - Você DEVE citar explicitamente os valores de despesasMensaisMedias, totalParcelasMensais e sobraMensalReal no diagnóstico e na recomendação prática.
      - O valor sugerido para pagamento extra deve partir da sobraMensalReal, com postura conservadora.

      DADOS COMPLEMENTARES DA SIMULAÇÃO:
      - Total de dívidas: R$ ${dados.simulacao.totalDividas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      - Prazo estimado atual: ${typeof dados.simulacao.prazoEstimadoQuitacaoAtual === 'number'
        ? `${dados.simulacao.prazoEstimadoQuitacaoAtual} meses`
        : 'Não informado'}
      - Prazo estimado otimizado: ${typeof dados.simulacao.prazoEstimadoQuitacaoOtimizado === 'number'
        ? `${dados.simulacao.prazoEstimadoQuitacaoOtimizado} meses`
        : 'Não informado'}
      - Economia estimada de juros: ${typeof dados.simulacao.economiaEstimadaJuros === 'number'
        ? `R$ ${dados.simulacao.economiaEstimadaJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : 'Não informada'}

      REGRAS FINAIS:
      - Cite as dívidas pelo nome exato
      - Não devolva recomendações genéricas
      - Se houver despesasMensaisMedias, totalParcelasMensais e sobraMensalReal na simulação, trate esses números como a base principal do caixa real do usuário
      - Quando existir despesasMensaisMedias, NUNCA diga que não tem o valor exato das despesas
      - Quando existir despesasMensaisMedias, NUNCA assuma cenário típico, valor médio inventado, estimativa genérica ou número hipotético de despesas
      - Quando existir sobraMensalReal, NÃO trate renda mensal menos parcelas como sobra final disponível
      - Renda mensal menos parcelas pode aparecer apenas como referência intermediária, mas a recomendação principal deve ser construída sobre a sobraMensalReal
      - Quando houver diferença entre renda mensal declarada e sobra mensal real, explique isso com clareza, mostrando que as despesas recorrentes reduzem a capacidade real de amortização
      - O valor sugerido para pagamento extra deve sair prioritariamente da sobraMensalReal, com postura conservadora e sem comprometer a reserva mínima do perfil
      - Para cada dívida, compare a taxa mensal com o retorno líquido mensal de renda fixa e conclua explicitamente se vale ou não antecipar
      - Estime os meses para quitação da dívida prioritária: cenário normal (só parcela) vs. cenário com pagamento extra
      - Quando houver financiamento parcelado, inclua a orientação de antecipar as últimas parcelas mensalmente
      - Estruture as ações em três blocos: (1) esta semana, (2) este mês, (3) em 3 meses — cada um com ações específicas aos números do usuário
      - Ao final, assine como: Nexus, analista de cenários financeiros do Finanças Pro Invest
      - Responda em texto natural de consultoria, sem JSON
      `;
      
      const messages = [
        { role: "user" as const, content: userMessage },
      ];
      
      // 5) CHAMADA ÚNICA — Plano consultivo em markdown
      logger.info(`[generateDebtPlan] Chamada única — plano consultivo para userId=${userId}`);

      const llmResponse = await router.routeRequest(messages, systemPromptEtapa1);
      const planoMarkdownBruto =
        typeof llmResponse === "string"
          ? llmResponse
          : (llmResponse as any)?.content || "";

      const planoMarkdown = planoMarkdownBruto
        .replace(/\uFFFD/g, "")
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      logger.info("[generateDebtPlan] PLANO_MARKDOWN_GERADO", {
        provider: (llmResponse as any)?.provider,
        model: (llmResponse as any)?.model,
        tamanho: planoMarkdown.length,
        preview: planoMarkdown.slice(0, 500),
      });

      if (!planoMarkdown || planoMarkdown.length < 120) {
        throw new HttpsError(
          "internal",
          "O Nexus não conseguiu gerar um plano completo neste momento."
        );
      }

      const now = new Date();
      const dataHoraTitulo = now.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const tituloPlano = `Plano de quitação - ${dataHoraTitulo}`;

      const db = getFirestore();
      await db
        .collection("users")
        .doc(userId)
        .collection("nexusDebtPlans")
        .add({
          title: tituloPlano,
          planMarkdown: planoMarkdown,
          createdAt: now,
          updatedAt: now,
        });

      return {
        success: true,
        format: "markdown",
        planoMarkdown,
        generatedAt: now.toISOString(),
        model: (llmResponse as any)?.model,
        provider: (llmResponse as any)?.provider,
      };
    } catch (error: any) {
      logger.error("[generateDebtPlan] Erro:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Erro interno ao gerar o plano de quitação."
      );
    }
  }
);
