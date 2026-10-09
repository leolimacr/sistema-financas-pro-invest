"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptBuilder = void 0;
const identity_1 = require("./identity");
const action_registry_1 = require("./action-registry");
class PromptBuilder {
    static buildSystemPrompt(options) {
        const { userName, context, marketData, userData, assetsSummary, passivesSummary, patrimonioVisaoGerencialStr, debtsSummary, billsSummary, cardsSummary, isFirst, historyDescription, avoidRepetition, isUserCorrection, transactionsForPrompt, goalsForPrompt, financialFactsSection } = options;
        const safeUserName = (userName || "Investidor").split(' ')[0];
        const isCashflowRequest = context.intent === 'cashflow_query';
        const isPatrimonyRequest = context.intent === 'patrimony_query';
        const isDebtPlanRequest = context.intent === 'debt_plan_query';
        const focusInstructions = isCashflowRequest && !isPatrimonyRequest
            ? `\n# FOCO OBRIGATÓRIO DESTA RESPOSTA\nO usuário está pedindo análise de lançamentos, receitas, despesas, saldo, orçamento ou fluxo de caixa.\nPriorize TRANSAÇÕES e METAS.\nNÃO troque esta análise por análise patrimonial.\nSó mencione ativos ou passivos se o usuário pedir explicitamente ou se isso for indispensável para esclarecer algo.`
            : isPatrimonyRequest && !isCashflowRequest
                ? `\n# FOCO OBRIGATÓRIO DESTA RESPOSTA\nO usuário está pedindo análise patrimonial.\nPriorize ATIVOS e PASSIVOS patrimoniais do app.\nNÃO trate passivos patrimoniais como dívidas, salvo se o usuário mencionar explicitamente dívida, saldo devedor, financiamento, parcelas, juros ou obrigação em aberto.`
                : '';
        let systemPrompt = `${identity_1.NexusIdentity.getSystemPrompt(safeUserName, context, marketData, transactionsForPrompt, goalsForPrompt, "", assetsSummary, passivesSummary, patrimonioVisaoGerencialStr, isFirst, userData, historyDescription)}${debtsSummary}${billsSummary || ''}${cardsSummary || ''}${financialFactsSection || ''}${focusInstructions}`;
        if (isDebtPlanRequest) {
            systemPrompt += `
      
# PROTOCOLO OBRIGATÓRIO: PLANO DE QUITAÇÃO
1. USE A RENDA DECLARADA: O usuário informou que ganha R$ ${userData.financialProfile?.monthlyIncome || 'não informado'}. Use este valor como base de fôlego, ignorando médias históricas.
2. USE AS PARCELAS: O valor de cada parcela já está no resumo de dívidas acima. NUNCA peça esse dado.
3. RESERVA DE EMERGÊNCIA: A meta do usuário é de ${userData.financialProfile?.emergencyReserveTarget || 6} meses. Considere o saldo atual de R$ ${userData.financialProfile?.emergencyReserveCurrent || 0}.
4. FORMATO DE SAÍDA: Use obrigatoriamente blocos visuais (Cards) com ícones para: Diagnóstico, Plano de Ação, Próximos Passos.
5. NÃO FAÇA PERGUNTAS INICIAIS: Se você já tem a renda, as parcelas e a reserva, gere o plano imediatamente.`;
        }
        let enhancedSystemPrompt = `${systemPrompt}${avoidRepetition}

# 🔎 IMPORTANTE: BUSCA NA WEB

Se você NÃO SOUBER a resposta ou precisar de dados atualizados externos, RESPONDA EXATAMENTE assim:

[BUSCAR_WEB: sua query de busca aqui]

## SEMPRE use [BUSCAR_WEB] para:
- Taxa Selic, IPCA, CDI, inflação (atual/recente)
- Notícias econômicas ou do mercado financeiro
- **Máxima histórica** de qualquer ativo (BTC, ETH, ações, etc)
- **Recorde, all-time high, ATH** de qualquer ativo
- Comparações históricas ("BTC em 2020", "preço do BTC em X data")
- Decisões do Copom, Banco Central
- PIB, desemprego, indicadores econômicos
- Eventos econômicos recentes
- **SEMPRE que o usuário CORRIGIR algum dado seu**

## NUNCA use [BUSCAR_WEB] para:
- Cotações BTC/ETH/ações B3 (você já tem esses dados)
- Conceitos gerais ("O que é CDB?", "Como funciona ação?")
- Análise dos dados do usuário

${isUserCorrection ? `
**ATENÇÃO:** O usuário está CORRIGINDO uma informação que você deu. Você DEVE buscar na web para validar e admitir o erro se estiver errado.
**CORREÇÃO DO USUÁRIO:** Com base nos resultados da busca, reconheça o erro educadamente e forneça a informação correta. Exemplo: "Você está correto, ${safeUserName}. Cometi um erro ao citar dados desatualizados. A informação correta é..."
` : ""}`;
        if (isDebtPlanRequest) {
            enhancedSystemPrompt += `

# 🏆 REGRA DE OURO (PROTOCOLO DE QUITAÇÃO) - PRIORIDADE MÁXIMA
1. RENDA: Use R$ ${userData.financialProfile?.monthlyIncome || 'não informado'} como a renda mensal do usuário.
2. PARCELAS: O valor de cada parcela está no sumário de dívidas acima. Use-os para o cálculo de fluxo de caixa.
3. RESERVA: Meta de ${userData.financialProfile?.emergencyReserveTarget || 6} meses. Saldo atual: R$ ${userData.financialProfile?.emergencyReserveCurrent || 0}.
4. NÃO PERGUNTE: Se os dados acima existem, NÃO peça renda ou parcelas. Gere o plano agora.
5. FORMATO: Responda obrigatoriamente usando os Cards Visuais do sistema (Diagnóstico, Plano de Ação, Próximos Passos).`;
        }
        enhancedSystemPrompt += action_registry_1.ActionManager.getInstructionMenu();
        return enhancedSystemPrompt;
    }
}
exports.PromptBuilder = PromptBuilder;
//# sourceMappingURL=prompt-builder.js.map