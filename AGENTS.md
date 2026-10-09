## Goal
- Conduct three successive audits of the Finanças Pro Invest repository: (1) comprehensive global audit, (2) deep surgical audit of the sovereign financial core, (3) audit of UX layer, navigation hierarchy, and product surfaces.

## Constraints & Preferences
- Be factual, evidence-based, minucioso; never give business strategy recommendations; always cite file paths, functions, components, and types; never invent behavior not supported by code.

## Progress
### Done
- **NEXUS INTELIGENTE: FRENTE 4 — MOTOR DETERMINÍSTICO DE FATOS CONTÁBEIS NO BACKEND** (implementado 2026-10-09):
  - **Objetivo**: Erradicar de forma definitiva as alucinações aritméticas e generalizações vagas no Nexus AI. Fatos, cálculos, proporções e severidades são calculados deterministicamente pelo motor do sistema em TypeScript puro antes de qualquer invocação aos modelos LLM, delegando à IA estritamente o papel de interpretar com autoridade silenciosa, clareza radical e bom senso.
  - **Arquitetura & Fundamentos**:
    - **Motor Contábil Soberano (`functions/nexus-core/financial-facts.ts`)**:
      - Classe `FinancialFactsEngine` com método universal `computeFacts(params)`:
        - *Fluxo de Caixa*: calcula entradas totais, saídas totais, saldo real apurado e taxa percentual de queima (`burnRatePercent`).
        - *Proteção e Reserva*: calcula meses de cobertura real da reserva com base no custo de vida estimado e classifica o estado (`blindada`, `em_formacao`, `vulneravel` ou `nao_configurada`).
        - *Endividamento e Taxas*: apura saldo devedor consolidado, soma das parcelas mensais, percentual de comprometimento da renda (`incomeCommitmentPercent`), identifica a dívida mais cara com respectiva taxa mensal e classifica a severidade (`critica`, `atencao`, `sob_controle` ou `sem_dividas`).
        - *Compromissos Imediatos e Margem*: consolida contas fixas + faturas + parcelas e deduz a margem operacional projetada em BRL.
        - *Patrimônio Consolidado*: apura bens patrimoniais, investimentos e patrimônio líquido consolidado.
        - *Narrativas Factuais*: gera lista de fatos auditáveis com valores formatados em moeda BRL (`narrativeFacts`).
      - Método `formatForPrompt(facts)`: gera a seção institucional `# 🏛️ FATOS CONTÁBEIS DETERMINÍSTICOS (CÁLCULOS FECHADOS DO MOTOR SOBERANO)`.
    - **Injeção no Prompt de Sistema (`PromptBuilder.ts` & `askAiAdvisor.ts`)**:
      - `askAiAdvisor.ts`: invoca `FinancialFactsEngine.computeFacts` com dados reais (transações, metas, dívidas, bens, contas, cartões, faturas e perfil financeiro) e passa `financialFactsSection` para `PromptBuilder`.
      - `prompt-builder.ts`: injeta a seção de cálculos fechados com instrução mandatória proibindo os modelos de recalcular ou inventar números.
      - Retorno de `askAiAdvisor.ts`: anexa `deterministicFacts` ao contexto de resposta para consumo e auditoria pelo app.
    - **Consumo no Hook do Cliente (`useAiAgent.ts`)**:
      - Atualizada a interface `AiResponse` e o método `sendToNexus` para expor `deterministicFacts`.
  - **Validação & Testes**:
    - Nova suíte de testes `functions/__tests__/nexus-core/financialFacts.test.ts`: **5/5 testes aprovados** (cobrindo parâmetros vazios, fluxo com taxa de queima, endividamento com taxa abusiva, cobertura da reserva e compromissos imediatos com margem projetada).
    - Suíte `functions/__tests__/nexus-core/`: **19/19 testes aprovados** (100% nas 4 suítes: `financialFacts.test.ts`, `actionRegistry.test.ts`, `multiModelRouter.test.ts` e `identity.test.ts`).
    - Suíte `src/hooks/__tests__/useAiAgent.test.ts`: **4/4 testes aprovados** (100%).
    - Suítes de integração do frontend: **42/42 testes aprovados** (`nexusInsightEngine.test.ts`, `NexusActionButton.test.tsx` e `insightResponseObserver.test.ts`).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 51.98s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada com sucesso em 1.714s.

- **NEXUS INTELIGENTE: FRENTE 3 — RASTREABILIDADE QUANTITATIVA FIEL ("POR QUE O NEXUS DISSE ISSO" COM NÚMEROS REAIS NO CHAT E COCKPIT)** (implementado 2026-10-09):
  - **Objetivo**: Erradicar a opacidade nas recomendações do Nexus e transformar a rastreabilidade matemática em superfície ativa do produto. Em vez de emitir alertas subjetivos sem fundamentação, o sistema agora expõe sob demanda os números exatos apurados, as fontes internas consultadas, o período contábil e as premissas adotadas tanto nos cards de insights da Home/Cockpit quanto no Chat e Briefing Estratégico.
  - **Arquitetura & Fundamentos**:
    - **Modelagem de Rastreabilidade Contábil (`nexusInsightEngine.ts`)**:
      - Interfaces `NexusTraceability` e `NexusTraceabilityMetric`: tipam `reason` (resumo factual), `period` (recorte temporal), `evaluatedAt` (timestamp ISO), `metrics` (vetor de rótulos e valores em BRL/percentuais) e `sources` (fontes auditadas).
      - Função universal `buildInsightTraceability(id, ctx)`: deriva com exatidão contábil os fatos geradores:
        - *Déficit de Liberdade*: apura valor do déficit, saldo livre e colchão inicial.
        - *Fechamento de Fatura & Pressão*: expõe valor estimado da fatura em BRL, dias até o fechamento e montante do colchão.
        - *Folga Apertada*: detalha saldo livre atual, margem mínima segura (15% da estrutura) e estrutura protegida.
        - *Orçamento & Teto de Gastos*: calcula percentual consumido, valor orçado vs gasto e dias decorridos.
        - *Dívidas & Juros*: apura saldo devedor consolidado, taxa mensal mais onerosa e quantidade de obrigações ativas.
        - *Capital Ocioso & Entradas*: quantifica excedente em relação ao colchão e receitas avulsas recentes.
      - Injeção automática em `prepareInsight`, integrando rastreabilidade em todos os fluxos de `getPrioritizedInsight` e `getCentralInsights`.
    - **Superfície Reativa no Cockpit (`AppCockpit.tsx`)**:
      - Estado reativo `expandedTraceInsightId`: gerencia expansão individual por card.
      - Botão e acordeão interativo `Por que o Nexus disse isso? ▾`: revela o resumo factual, badges com métricas e valores numéricos em BRL/mono, além do período e fontes auditadas.
    - **Superfície no Chat e Briefing Estratégico (`AiAdvisor.tsx` & `NexusBriefingView.tsx`)**:
      - Seção expansível nativa (`details/summary`) no card de Decisão Estratégica: permite ao usuário inspecionar imediatamente o recorte temporal, as fontes internas auditadas e a lista de premissas contábeis adotadas pelo motor analítico.
  - **Validação & Testes**:
    - Suíte `nexusInsightEngine.test.ts` expandida de 17 para **20/20 testes aprovados** (+3 novos testes validando a geração de rastreabilidade para faturas, déficit de liberdade e dívidas com taxas).
    - Suíte global: **41/41 testes aprovados** (100% nas 6 suítes: `nexusInsightEngine.test.ts`, `multiModelRouter.test.ts`, `actionRegistry.test.ts`, `useAiAgent.test.ts`, `NexusActionButton.test.tsx` e `identity.test.ts`).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 8s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada com sucesso em 2.25s.

- **NEXUS INTELIGENTE: FRENTE 2 — CONTRATO DE DECISÃO ESTRUTURADO (NEXUS DECISION OBJECT & AÇÕES TIPADAS)** (implementado 2026-10-09):
  - **Objetivo**: Substituir o paradigma frágil de inferência por expressões regulares em texto livre (`[ACTION:ID]`) por um contrato de dados rigoroso, canônico e auditável (`NexusDecisionObject`). Garantir que cada diagnóstico estratégico emitido pelo Nexus contenha obrigatoriamente: fato observado, período analisado, fontes internas apuradas, suposições adotadas, nível de confiança analítica, impacto estimado, condição de invalidação e ações executáveis em 1 clique.
  - **Arquitetura & Fundamentos**:
    - **Contrato Canônico `NexusDecisionObject` (`action-registry.ts`)**:
      - Definida a interface `NexusDecisionObject` tipando `observedFact`, `analyzedPeriod`, `confidenceLevel` ('alta' | 'media' | 'baixa'), `sourcesUsed`, `assumptions`, `impact`, `invalidatingCondition` e `suggestedActions: ContextualAction[]`.
      - Método universal `ActionManager.parseDecision(rawText, basis)`: motor híbrido que suporta nativamente tanto payloads JSON estruturados (`response_format: { type: 'json_object' }`) quanto texto livre com tags de ação canônicas, extraindo o fato observado da primeira asserção contábil, calculando o nível de confiança com base na integridade das fontes (`basis.dataStatus` e volume de fontes) e derivando o impacto financeiro de acordo com a categoria da recomendação (`NAV_DEBTS`, `NAV_RESERVE`, `NAV_CASHFLOW`, `NAV_GOALS`, etc.).
    - **Governança do Roteador Multi-Modelo (`MultiModelRouter.ts`)**:
      - `options?.responseFormat === 'json'`: proteção cirúrgica contra falhas no Groq (onde `json_object` é restrito à presença explícita de "json" no corpo da mensagem), ativando modo estruturado estritamente quando solicitado.
    - **Integração no Backend Cloud Functions (`askAiAdvisor.ts`)**:
      - Invocação de `ActionManager.parseDecision(finalAnswer, analysisBasis)` após resolução do modelo, anexando `decisionObject` diretamente ao contexto de resposta retornado ao cliente.
    - **Consumo Reativo no Frontend (`useAiAgent.ts`, `AiAdvisor.tsx` & `NexusBriefingView.tsx`)**:
      - Hook `useAiAgent`: tipa e extrai `decisionObject` do payload da resposta.
      - Componente `AiAdvisor.tsx`: renderiza card visual de *Decisão Estratégica* com badge de confiança, fato contábil central, impacto financeiro esperado e advertência destacada de condição de invalidação.
      - Componente `NexusBriefingView.tsx`: armazena `decisionObject` no estado do briefing e renderiza o card institucional de governança estratégica imediatamente acima da base de análise.
  - **Validação & Testes**:
    - Nova suíte de testes `functions/__tests__/nexus-core/actionRegistry.test.ts`: **7/7 testes aprovados** (cobrindo extração de tags, derivação de impacto e confiança em texto livre, parsing de JSON estruturado e resiliência a JSONs malformados).
    - Suíte `functions/__tests__/nexus-core/`: **14/14 testes aprovados** (100%).
    - Suíte `useAiAgent.test.ts`: **4/4 testes aprovados** (+1 novo teste validando a propagação do `decisionObject`).
    - Suíte `insightResponseObserver.test.ts` e `NexusActionButton.test.tsx`: **22/22 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 14s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada com sucesso em 3.215s.

- **CARTEIRA SOBERANA: PRECISÃO ANALÍTICA DA BLINDAGEM DE LIQUIDEZ E ERRADICAÇÃO DE FALSO POSITIVO DE RESERVA DE EMERGÊNCIA NO NEXUS COPILOT** (implementado 2026-10-08):
  - **Objetivo**: Corrigir o falso positivo reportado pelo investidor em que o Nexus Copilot na Carteira de Investimentos (`/app/carteira`) emitia a advertência "Reserva de Emergência Vulnerável", mesmo com a Reserva e o Colchão de Liquidez 100% constituídos e apresentando excedente real de +R$ 18.450,65 na Central de Soberania Financeira (`/app/central`).
  - **Causa-Raiz Contábil & Ponto Cego**:
    - **Injeção de Perfil Incompleta em `PortfolioPage.tsx`**: Invocava `useSovereignSnapshot(transactions)` sem repassar `effectiveUserMeta`. Como resultado, `financialProfile` retornava indefinido, zerando as metas de proteção (`sovereign.reserveTarget = 0` e `sovereign.reserveCoverage = 0`).
    - **Confusão de Unidade Monetária vs Razão Percentual**: A condição de alerta avaliava `(sovereign?.reserveCoverage ?? 1) < 0.5`. O autor tratou `reserveCoverage` como uma fração normalizada (0..1), quando no motor `useSovereignSnapshot` ela representa o valor monetário exato em Reais (BRL) blindado (`Math.min(remainingForReserve, reserveTarget)`). Com meta zerada pela ausência de `userMeta`, a cobertura ficava em R$ 0,00, fazendo `0 < 0.5` avaliar para `true` e disparando o alerta incondicionalmente para todos os usuários.
  - **Arquitetura & Fundamentos**:
    - **Injeção do Contexto de Usuário (`PortfolioPage.tsx`)**:
      - `const effectiveUserMeta = propUserMeta !== undefined ? propUserMeta : authUserMeta`: repassado para `useSovereignSnapshot(transactions, effectiveUserMeta)`, restaurando o acesso ao perfil financeiro, metas de reserva (`reserveTarget`), colchão (`colchaoTarget`) e saldo livre real (`sovereignFreeBalance`).
    - **Função Analítica Soberana `isEmergencyReserveVulnerable` (`nexusPortfolioAdvisor.ts`)**:
      - Tipagem `SovereignProtectionSnapshotLike`: desacopla o motor de recomendações do hook React.
      - Avalia a cobertura relativa percentual: `target = totalProtectionTarget || reserveTarget`.
      - Se `target <= 0`: retorna `false` (respeita a autoridade silenciosa, sem inventar alarmes quando o investidor não definiu metas).
      - Se `covered / target < vulnerabilityThreshold` (padrão 50%): sinaliza vulnerabilidade apenas se a reserva efetiva estiver de fato abaixo da metade da meta estabelecida.
      - No cenário do investidor (meta de R$ 55.000,00 coberta a 100% com saldo livre positivo), a cobertura é 1.0 (>= 0.5), suprimindo o alerta espúrio e liberando o Nexus para sugerir aportes com o saldo livre excedente (`insight-free-balance-available`).
  - **Validação & Testes**:
    - Suíte `nexusPortfolioAdvisor.test.ts` expandida de 9 para **13/13 testes aprovados** (+4 novos testes cobrindo `isEmergencyReserveVulnerable` com snapshot nulo, metas zeradas, reserva excedente como a do investidor e reserva vulnerável <50%).
    - Suíte `PortfolioNexusCard.test.tsx`: **7/7 testes aprovados**.
    - Suíte `PortfolioDashboardView.test.tsx`: **29/29 testes aprovados**.
    - 17/17 suítes Vitest da Carteira Soberana aprovadas e **152/152 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 2m 29s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada com sucesso em 9.27s.

- **CARTEIRA SOBERANA: CORREÇÃO DA NAVEGAÇÃO DO NEXUS COPILOT ("VER RESERVA", "VER CENTRAL" E "VER POSIÇÃO")** (implementado 2026-10-08):
  - **Objetivo**: Corrigir a inoperância do botão `Ver Reserva ↗` (e `Ver Central ↗` / `Ver Posição ↗`) exibido no card de recomendações estratégicas do Nexus Copilot (`PortfolioNexusCard.tsx`) quando a Reserva de Emergência está vulnerável ou quando há déficit de liquidez.
  - **Causa-Raiz**:
    - O manipulador `onClick` em `PortfolioNexusCard.tsx` apenas tratava as categorias `REBALANCE`, `OPPORTUNITY_CASH`, `TAX` e `CALIBRATION`. A categoria `LIQUIDITY_SHIELD` (usada pelo aviso "Reserva de Emergência Vulnerável" e "Blindagem de Liquidez") caía no vazio (*no-op*).
    - A interface `PortfolioNexusCardProps` e o container `PortfolioDashboardView` não possuíam callbacks nem repasse de navegação para a Reserva ou Central.
  - **Arquitetura & Fundamentos**:
    - **Navegação em `PortfolioNexusCard.tsx`**:
      - Adicionados callbacks `onNavigateToReserve`, `onNavigateToCentral` e `onOpenPositionDetails` à interface `PortfolioNexusCardProps`.
      - O manipulador `onClick` agora executa `onNavigateToReserve?.()` para `insight-liquidity-shield-reserve` e `onNavigateToCentral?.()` para `insight-liquidity-shield-negative`, além de abrir a gaveta de detalhes do ativo para `CONCENTRATION`.
    - **Ponte em `PortfolioDashboardView.tsx` & `PortfolioPage.tsx`**:
      - `PortfolioDashboardViewProps` expandido com `onNavigateToReserve` e `onNavigateToCentral`.
      - `PortfolioPage.tsx` utiliza `useNavigate` e direciona `onNavigateToReserve` para `/app/central` com `{ focusSection: 'base-protecao' }` e hash `#base-protecao`.
    - **Auto-scroll para `#base-protecao` em `AppCockpit.tsx`**:
      - `useEffect` da Central atualizado para detectar `location.state.focusSection` e hash `#base-protecao`, rolando a tela suavemente até a seção da Base de Proteção / Reserva de Emergência.
  - **Validação & Testes**:
    - Suíte `PortfolioNexusCard.test.tsx` expandida de 4 para **7/7 testes aprovados** (+3 novos testes cobrindo `Ver Reserva`, `Ver Central` e `Ver Posição`).
    - Suíte `PortfolioDashboardView.test.tsx` expandida de 28 para **29/29 testes aprovados** (+1 novo teste validando `onNavigateToReserve`).
    - 17/17 suítes Vitest da Carteira Soberana aprovadas e **148/148 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 27s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada com sucesso em 3.168s.

- **CARTEIRA SOBERANA: HARMONIZAÇÃO MATEMÁTICA DE METAS DE CAIXA E ELIMINAÇÃO DO PONTO CEGO DE DISCREPÂNCIA NO DASHBOARD** (implementado 2026-10-08):
  - **Objetivo**: Corrigir a assimetria apontada pelo investidor em que, após calibrar e equilibrar as metas da carteira em exatos 100,00% no modal panorâmico (`PortfolioTargetsModal.tsx`), o Dashboard continuava exibindo o alerta amarelo de discrepância (`A soma das metas cadastradas é 99,0% (divergência de -1,0%)`), persistindo mesmo após recarregar a página (F5).
  - **Causa-Raiz & Ponto Cego Contábil**:
    - O modal `PortfolioTargetsModal` somava todos os ativos da carteira (`assets.reduce`), totalizando 100,00% (22 ativos de risco com 99,0% + 1 ativo de caixa com 1,0%).
    - O hook `usePortfolio.ts` invocava `computePortfolioAllocation(riskAssets, cashAssets, false)` com o terceiro parâmetro (`includeCashInTargets`) hardcoded como `false`.
    - Como resultado, o motor contábil em `portfolioMath.ts` expurgava sumariamente o ativo de caixa da lista de validação (`allApplicableAssets = assets`), avaliando apenas os ativos de risco (99,0%) e sinalizando divergência falsa de -1,0%.
  - **Arquitetura & Fundamentos**:
    - **Harmonização Dinâmica em `usePortfolio.ts`**:
      - `hasCashTarget`: detecta dinamicamente se algum ativo de caixa possui meta percentual atribuída (`targetPercentage > 0`).
      - `isTotalSumValidWithCash`: valida se a soma das metas de todas as posições da carteira fecha perfeitamente em 100% (`Math.abs(totalTargetsAll - 100) < 0.005`).
      - `shouldIncludeCashInTargets = hasCashTarget || isTotalSumValidWithCash`: passa `true` para `computePortfolioAllocation`, integrando o ativo de caixa tanto no universo de metas validadas quanto no denominador patrimonial consolidado.
      - Quando a soma fecha em 100,00% no modal, o Dashboard valida os mesmos 100,00% com paridade matemática perfeita, erradicando o banner amarelo instantaneamente e mantendo a consistência mesmo após F5.
  - **Validação & Testes**:
    - Suíte `usePortfolio.test.tsx` expandida de 8 para **9/9 testes aprovados** (+1 novo teste validando a inclusão de caixa nas metas e `isTargetSumValid = true`).
    - 26/26 suítes Vitest da Carteira Soberana aprovadas e **277/277 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 19s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada com sucesso em 1.513s.

- **CARTEIRA SOBERANA: BOTÃO DE SALVAMENTO DO 1º TÍTULO, HIERARQUIA DA META ALOCATIVA E BOTÕES DINÂMICOS NO MODAL DE EDIÇÃO DE ATIVOS (ASSETMODAL)** (implementado 2026-10-08):
  - **Objetivo**: Atender à solicitação e modelo mental do investidor eliminando a incerteza de persistência do primeiro título antes da adição de novos vencimentos. Implementado o botão dedicado `Salvar Dados deste Título` (`btn-confirm-primary-cert`) imediatamente após os parâmetros da Marcação na Curva e antes do bloco de Composição, reposicionada a `Meta na Carteira (%)` estrategicamente logo abaixo da gestão de vencimentos com legenda contextual de meta compartilhada, extinto o duplo sinal `+ +` e dinamizados todos os botões e textos de exemplo de acordo com a espécie do título (`getFixedIncomeKindInfo`).
  - **Arquitetura & Fundamentos**:
    - **Botão de Salvamento / Confirmação do 1º Título (`AssetModal.tsx`)**:
      - `btn-confirm-primary-cert`: posicionado na barra de ação logo após o seletor `Saldo Bruto / Saldo Líquido` e antes de `+ Adicionar Novo Vencimento`.
      - `handleConfirmPrimaryCertificate`: consolida os campos preenchidos nos inputs principais (nome, ticker, instituição, taxa, indexador, aplicação, vencimento e saldo/preço manual) diretamente como `1º Título (Principal)` no array `certificates`, exibindo feedback visual temporário `✓ Salvo na meta!`.
    - **Reposicionamento Estratégico da Meta na Carteira (%) (`AssetModal.tsx`)**:
      - `asset-target-section`: deslocada para ficar imediatamente abaixo da seção de Composição de Títulos / Vencimentos.
      - Apresentação em card dedicado com badge percentual (`X% do Patrimônio`), input numérico destacado e legenda adaptativa (`Meta única compartilhada aplicada ao conjunto de vencimentos deste ativo`).
    - **Extinção de Textos Fixos e Duplicidade Visual**:
      - Eliminado o prefixo duplicado `+ + Adicionar Novo Vencimento` (agora ícone `Plus` + `assetKind.addAnotherButton`).
      - Texto de exemplo do card atualizado dinamicamente para referenciar a espécie real do título (`outro vencimento de Tesouro IPCA+`, `outro vencimento de Tesouro Selic`, etc.).
  - **Validação & Testes**:
    - Suíte `AssetModal.test.tsx` expandida de 11 para **12/12 testes aprovados** (+1 novo teste cobrindo a confirmação do 1º título antes da composição e o posicionamento da meta).
    - 17/17 suítes Vitest da Carteira Soberana aprovadas e **144/144 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 21s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada com sucesso em 1.807s.

- **CARTEIRA SOBERANA: RECONHECIMENTO DINÂMICO DE ATIVOS DE RENDA FIXA NA CALIBRAÇÃO GUIADA NEXUS E EXTINÇÃO DE TEXTOS FIXOS ("ADICIONAR OUTRO CDB")** (implementado 2026-10-08):
  - **Objetivo**: Corrigir a assimetria apontada pelo investidor na Calibração Guiada Nexus (`AssetCalibrationModal.tsx`), onde títulos de outras naturezas como Tesouro Selic (`SEL 29`, `TESOU SELIC POS FIX`) exibiam o botão hardcoded `+ Adicionar outro CDB`. O sistema agora compreende a identidade específica do ativo em referência e adapta de forma dinâmica, contextual e inteligente todos os rótulos de botões, cabeçalhos de formulário, placeholders e badges percentuais, impedindo a mistura indevida de classes/tipos sob a mesma meta alocativa.
  - **Arquitetura & Fundamentos**:
    - **Classificador Soberano de Natureza de Renda Fixa (`portfolioViewUtils.ts`)**:
      - `getFixedIncomeKindInfo(name, ticker, category)`: motor de inferência heurística contábil que categoriza rigorosamente o ativo em:
        - `Tesouro Selic` (botão: `+ Adicionar outro Tesouro Selic`, indexador padrão sugerido: `SELIC`, placeholders: `SELIC 2029`, `Tesouro Selic 2029`)
        - `Tesouro IPCA+` (botão: `+ Adicionar outro Tesouro IPCA+`, indexador: `IPCA`, placeholders: `IPCA 2050`, `Tesouro IPCA+ 2050`)
        - `Tesouro Prefixado` (botão: `+ Adicionar outro Tesouro Prefixado`, indexador: `PRE`, placeholders: `PRE 2029`, `Tesouro Prefixado 2029`)
        - `Título do Tesouro / Renda+ / Educa+` (botão adaptativo correspondente)
        - `CDB` (botão: `+ Adicionar outro CDB`, indexador: `CDI`)
        - `LCI` / `LCA` (botões femininos: `+ Adicionar outra LCI` / `+ Adicionar outra LCA`, indexador: `CDI`)
        - `Debênture` (botão: `+ Adicionar outra Debênture`, indexador: `IPCA`)
        - `CRI` / `CRA` (botões: `+ Adicionar outro CRI` / `+ Adicionar outro CRA`, indexador: `IPCA`)
        - Fallback: `Título` (botão: `+ Adicionar outro Vencimento / Título`)
    - **Adaptação Contextual Soberana no Modal de Calibração (`AssetCalibrationModal.tsx`)**:
      - `assetKind = useMemo(...)`: computado dinamicamente a partir dos dados do ativo e posição selecionada.
      - Botão de Inclusão (`btn-open-add-sibling`): exibe `assetKind.addAnotherButton`.
      - Pré-preenchimento ao abrir novo vencimento (`handleOpenAddNewSibling`): sugere ticker `${ticker} ${N}`, nome `Novo ${assetKind.singular} (${instituição})` e herda o indexador do ativo base ou `assetKind.defaultIndexation`.
      - Badges de Participação: alteradas de `% do CDB` para `% desta meta` (`computedCompositionBreakdown.primaryShare}% desta meta`), preservando clareza matemática e universalidade contábil.
      - Cabeçalho do Formulário Inline: `➕ Adicionar Novo Vencimento (${assetKind.singular})` ou `✏️ Editando Título: ${siblingName || assetKind.singular}`.
      - Sugestão de Absorção de Órfãos: `Unificar neste/nesta ${assetKind.singular}`.
      - Painel de Resumo Consolidado: exibe `{assetKind.compositionTitle} sob esta Meta`.
  - **Validação & Testes**:
    - Suíte `AssetCalibrationModal.test.tsx` expandida de 16 para **17/17 testes aprovados** (+1 novo teste validando a alternância dinâmica para Tesouro Selic, sem termos fixos de CDB).
    - 17/17 suítes Vitest da Carteira Soberana aprovadas e **143/143 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 27s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada com sucesso em 3.948s.

- **CARTEIRA SOBERANA: GESTÃO NATIVA DE MÚLTIPLOS TÍTULOS E VENCIMENTOS SOB A MESMA META NO MODAL DE EDIÇÃO DE ATIVOS (ASSETMODAL)** (implementado 2026-10-08):
  - **Objetivo**: Atender à solicitação e modelo mental do investidor habilitando a gestão de múltiplos títulos/vencimentos sob a mesma meta alocativa (ex: Tesouro IPCA+ 2045 e Tesouro IPCA+ 2050 sob a meta única de 6,5%) diretamente na janela de cadastro e edição de ativos de custódia (`AssetModal.tsx`), eliminando a restrição de campos estáticos isolados e a necessidade de recorrer exclusivamente ao assistente de calibração para gerenciar títulos filhos.
  - **Arquitetura & Fundamentos**:
    - **Gerenciador Soberano Inline de Títulos / Certificados (`AssetModal.tsx`)**:
      - `isFixedIncome`: detecção automática baseada na classe (`Renda Fixa`, `CDB`, `LCI/LCA`, `Tesouro`, `Debênture`, etc.), mercado (`RF`) ou indexador contratado.
      - Estado reativo `certificates: FixedIncomeCertificate[]`: quando vazio e o usuário clica em `[+ Adicionar Novo Vencimento]`, o título preenchido no formulário principal é automaticamente preservado e promovido a `1º Título (Principal)`.
      - **Listagem Rica Homogênea**: Exibe todos os títulos vinculados com tags `1º Título (Principal)`, `2º Título`, etc., detalhando Instituição custodiante, Indexador, Taxa contratada, Data de Aplicação, Data de Vencimento, Quantidade/PU (se aplicável), Saldo (Bruto/Líquido) e botões inline de edição (`[✏️]`) e exclusão (`[🗑️]`).
      - **Formulário Inline Expansível**: Permite cadastrar ou editar títulos com suporte a dois modos de custódia:
        - `[● Títulos (Qtd / PU)]`: Quantidade fracionária (4 casas) e Preço Unitário (PU R$) com cálculo automático do total financeiro (ideal para Tesouro IPCA+, Selic ou Prefixados).
        - `[○ Saldo Total (R$)]`: Valor financeiro em reais (ideal para CDBs, LCIs, LCAs).
        - Tipo de saldo: alternância entre `Saldo Bruto` e `Saldo Líquido (pós-IR)`.
      - **Sincronização Contábil Bidirecional no `handleSubmit`**:
        - Persiste `assetToSave.fixedIncomeCertificates = certificates`.
        - Sincroniza os parâmetros do primeiro título com os campos legados do ativo base para preservar compatibilidade integral com telas de cotação e relatórios.
    - **Preservação de Certificados na Camada de Custódia (`PortfolioPositionsList.tsx`)**:
      - `getAssetForAction`: atualizado para preservar `fixedIncomeCertificates: pos.fixedIncomeCertificates` no fallback de montagem de ativo, garantindo que o modal sempre abra com a lista completa de certificados populada.
  - **Validação & Testes**:
    - Suíte `AssetModal.test.tsx` expandida de 8 para **11/11 testes aprovados** (+3 novos testes cobrindo múltiplos títulos, modo Qtd/PU fracionário e edição/exclusão inline).
    - 27/27 suítes Vitest do módulo da Carteira Soberana aprovadas e **283/283 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 51s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada com sucesso em 3.033s.

- **CALENDÁRIO DO CONTROLA: VISIBILIDADE DE GASTOS EM TELAS MÓVEIS (SEM TRUNCAMENTO) E VISÃO COMPLEMENTAR DE AGENDA DIÁRIA** (implementado 2026-10-08):
  - **Objetivo**: Atender à solicitação do investidor eliminando a perda de visibilidade e o truncamento artificial de valores nos quadradinhos do calendário mensal em dispositivos móveis (onde a largura de coluna causava corte para `"R$..."`). Implementada tipografia inteligente vertical nas células mobile e um seletor nativo de visão complementar no topo entre **Grade (Mês)** (`[📅 Grade]`) e **Agenda do Mês** (`[📋 Agenda]`), garantindo leitura imediata de todos os gastos diários sem atrito em qualquer tamanho de tela.
  - **Arquitetura & Fundamentos**:
    - **Formatação Numérica Inteligente Mobile (`expenseCalendarUtils.ts`)**:
      - `formatMobileExpenseAmount(amount, isPrivacyMode)`: utilitário contábil soberano:
        - Para valores até R$ 99,99: preserva centavos com clareza (ex: `9,90`, `45,70`).
        - Para valores de R$ 100 até R$ 9.999: arredonda centavos inteligentemente (ex: `154`, `220`, `1.450`), reduzindo a largura necessária de ~55px para ~18-24px e erradicando o truncamento em telas de 360px-390px.
        - Para valores a partir de R$ 10.000: compacta com sufixo `k` (ex: `12,5k`).
        - Modo de privacidade: mascara estritamente como `••••`.
    - **Tipografia Vertical Adaptativa nas Células (`MonthlyExpenseCalendar.tsx`)**:
      - `p-1 sm:p-2.5`: recupera 4px de área útil interna por célula na grade de 7 colunas no mobile.
      - Desktop (`hidden sm:block`): mantém o formato padrão horizontal completo (`R$ 200,00`).
      - Mobile (`flex sm:hidden`): empilha verticalmente a micro-tag `R$` (`text-[7.5px] font-black uppercase text-red-600/80 leading-none`) e o número logo abaixo (`text-[10px] font-black text-red-700 tabular-nums tracking-tighter leading-tight`), eliminando a sobreposição e o corte por reticências.
    - **Seletor de Visão Complementar Grade vs Agenda (`MonthlyExpenseCalendar.tsx`)**:
      - Adicionado seletor segmentado soberano exclusivo para mobile (`sm:hidden`):
        - `[📅 Grade (Mês)]`: mantém a tradicional visão em grade de 7 dias com a nova tipografia compacta.
        - `[📋 Agenda (N dias)]`: visualização em lista cronológica dos dias com saídas no mês, detalhando número do dia, dia da semana, badge de contagem de saídas, valor total diário e listagem discriminada de cada despesa (com descrição, categoria, badge de cartão de crédito e valor individual).
      - Ao tocar em qualquer dia na visão Agenda, abre o modal completo `DayExpensesModal` para visualização profunda e edição direta.
  - **Validação & Testes**:
    - Suíte `expenseCalendarUtils.test.ts` expandida com 5 novos testes para `formatMobileExpenseAmount` (**15/15 testes aprovados**).
    - Suíte `MonthlyExpenseCalendar.test.tsx` expandida com 2 novos testes para renderização mobile e alternância de modos de exibição (**7/7 testes aprovados**).
    - 5/5 suítes Vitest do módulo de Finanças/Controla aprovadas (**26/26 testes aprovados**, 100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 16s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada com sucesso em 0.106s.

- **CONTROLA: ISOLAMENTO EXCLUSIVO DE PARCELAS PASSADAS NA FATURA PREVISTA E ELIMINAÇÃO DE DUPLICIDADE VISUAL NO EXTRATO** (implementado 2026-10-08):
  - **Objetivo**: Atender à solicitação e modelo mental do investidor eliminando a sensação de duplicidade e a poluição visual causada pela exposição de parcelas de compras antigas (`currentInstallment > 1`, ex: `Manitol 20% (2/2)`, `Condicionador Tina (4/6)`) soltas no feed de despesas do Controla e caindo indevidamente no bloco de "Despesas Agendadas" com badge laranja. As parcelas de meses anteriores passam a pertencer exclusivamente ao escopo da fatura do cartão à qual estão vinculadas, mantendo o feed do mês focado nas compras efetivamente realizadas no período e transformando as "Faturas Previstas" em acordeões ricos e expansíveis.
  - **Arquitetura & Fundamentos**:
    - **Contrato de Dados & Data Original da Compra (`types/index.ts`, `useTransactionMutations.ts` & `dateHelpers.ts`)**:
      - `Transaction.purchaseDate?: string`: persistido nativamente na geração de parcelas em `useTransactionMutations.ts`.
      - `isPreviousInstallment(t)`: função utilitária em `dateHelpers.ts` que identifica com precisão contábil parcelas de meses anteriores (`t.installments > 1 && t.currentInstallment > 1`).
      - `getOriginalPurchaseDate(t)`: função utilitária com dedução matemática retroativa com blindagem de virada de ano e dias limite de mês (`targetMonth`, `maxDaysInTargetMonth`), calculando a data da compra física a partir de `t.date - (currentInstallment - 1) meses` para transações legadas que não tinham `purchaseDate`.
    - **Saneamento do Extrato e do Painel Mensal (`TransactionList.tsx` & `TransactionHistory.tsx`)**:
      - `TransactionList.tsx`: define `displayTransactions = transactions.filter(t => !isPreviousInstallment(t))`, garantindo que tanto a lista paginada quanto a régua de "Saídas" do mês abaixo da tabela contabilizem exclusivamente as compras e compromissos do período corrente.
      - `TransactionHistory.tsx`:
        - `futureDatedTransactions`: expurga parcelas antigas de cartão, garantindo que o bloco laranja de "Despesas agendadas" seja reservado com exclusividade para compromissos legítimos agendados pelo usuário (como IPVA ou boletos avulsos).
        - `pastTransactions`: expurga parcelas antigas de cartão do feed de compras do dia a dia.
    - **Faturas Previstas Expansíveis com Acordeão Soberano (`TransactionHistory.tsx`, `useDashboardState.ts`, `Dashboard.tsx`)**:
      - `useDashboardState.ts`: enriquece as faturas virtuais com `linkedCardId` e `linkedInvoicePeriodEnd`, viabilizando o pareamento direto O(1) no `invoiceLookup`.
      - `Dashboard.tsx`: propaga `purchaseDate`, `installments` e `currentInstallment` na matriz de transações do `invoiceLookup`.
      - `TransactionHistory.tsx`: linhas de "Faturas previstas" agora contam com clique interativo, chevron animado e expansão direta de acordeão. Ao expandir, o investidor visualiza todos os itens que compõem o valor a ser pago, com indicação clara de `Compra original: DD/MM/AAAA` nas compras parceladas, valor unitário, subtotal e botões inline de edição (`Pencil`) e exclusão (`Trash2`).
    - **Calendário de Gastos Diários (`expenseCalendarUtils.ts`)**:
      - `computeDailyExpenseMap`: atualizado para ignorar parcelas antigas (`isPreviousInstallment(t)`), erradicando picos artificiais no dia 23 de cada mês para compras feitas meses antes.
  - **Validação & Testes**:
    - Nova suíte de testes unitários: `TransactionHistory.test.tsx` (3/3 testes aprovados, cobrindo o expurgo de parcelas antigas de despesas agendadas, expansão da fatura com data original e acionamento de ações).
    - 5/5 suítes Vitest do módulo de Finanças/Controla aprovadas (**24/24 testes aprovados**, 100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 26s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada com sucesso em 2.77s.

- **CARTEIRA SOBERANA: SUPORTE A QUANTIDADE DE TÍTULOS / PU, DATA DE APLICAÇÃO E INDEXADOR SELIC EM TESOURO DIRETO E RENDA FIXA** (implementado 2026-10-07):
  - **Objetivo**: Atender à solicitação do investidor eliminando a limitação de cadastro puramente por saldo em títulos públicos (Tesouro IPCA+, Tesouro Selic, Prefixado) e outros ativos unitários de Renda Fixa (Debêntures, CRIs). O investidor agora conta com campos nativos para Quantidade de Títulos / Cotas (com suporte a frações decimais de 4 casas), Preço Unitário (PU R$), cálculo bidirecional de total financeiro, Data de Aplicação (`fixedIncomeStartDate`), indexador `SELIC` e sincronização integral da data da movimentação no livro-razão (alimentando com precisão a marcação na curva Anbima e a tabela regressiva de IR).
  - **Arquitetura & Fundamentos**:
    - **Tipagem & Contratos Contábeis (`portfolioTypes.ts`)**:
      - `FixedIncomeCertificate` expandido com `quantity?: number` e `unitPrice?: number`.
      - `FixedIncomeIndexation` totalmente suportado com `'PRE' | 'CDI' | 'IPCA' | 'SELIC'`.
      - `PortfolioMovement.date` agora recebe `fixedIncomeStartDate` no lançamento e calibração de posições iniciais (`PortfolioDashboardView.tsx`), preservando o histórico contábil e impedindo o vencimento artificial em D+0 com alíquota máxima de 22,5%.
    - **Assistente de Calibração Soberano (`AssetCalibrationModal.tsx`)**:
      - Seletor de Modelo de Custódia em Renda Fixa: `[● Títulos (Qtd / PU)]` (`btn-rf-mode-titles`) vs `[○ Saldo Total (R$)]` (`btn-rf-mode-balance`).
      - Detecção inteligente: Títulos do Tesouro Direto e Debêntures abrem automaticamente no modo de Títulos com os campos de Quantidade (`input-calibration-quantity`), PU (`input-calibration-price`) e Total (`input-calibration-total`).
      - Precisão Decimal Não Inteira: Atualizados os cálculos de inferência para manter frações de títulos (ex: 0.05 ou 1.25 títulos) com precisão de 4 casas (`toFixed(4)`), erradicando o truncamento indevido de `Math.round`.
      - Parâmetros da Curva Anbima: Adicionada opção `SELIC (% da Selic / Selic + Spread)`, campo de Data de Aplicação (`input-calibration-start-date`) e Data de Vencimento (`input-calibration-maturity-date`).
      - Gestão de Múltiplos Títulos / Títulos Irmãos: `form-add-sibling` atualizado com suporte a `input-sibling-quantity`, `input-sibling-unit-price`, `input-sibling-start-date` e opção `SELIC`.
    - **Superfícies de Visualização (`AssetDetailsDrawer.tsx` & `PortfolioPositionsList.tsx`)**:
      - Acordeão Desktop e Cards Mobile atualizados para exibir Data de Aplicação (`Aplicação: DD/MM/AAAA`) e quantidade de títulos (`Qtd: X tit.`) ao expandir os títulos vinculados à meta.
  - **Validação & Testes**:
    - 2 novos testes dedicados em `AssetCalibrationModal.test.tsx` (Testes 15 e 16) validando a calibração de Tesouro IPCA fracionário com PU e Data de Aplicação, bem como a alternância entre modos de custódia e seleção do indexador SELIC.
    - 26/26 suítes Vitest do módulo da Carteira Soberana aprovadas e **272/272 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 13s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada com sucesso em 1.51s.

- **CARTEIRA SOBERANA: LISTAGEM IMEDIATA DO 1º TÍTULO, EDIÇÃO INLINE HOMOGÊNEA E LANÇAMENTO SIMULTÂNEO DE MÚLTIPLOS CDBS SOB A MESMA META** (implementado 2026-10-07):
  - **Objetivo**: Corrigir a assimetria na caixa de lançamento e calibração de Renda Fixa/CDBs. O 1º título agora entra imediatamente na lista visível de títulos (`sibling-primary-item`) com banco, taxa, vencimento, saldo e percentual de participação, permitindo sua visualização e edição inline (`btn-edit-primary-cert`) enquanto o investidor adiciona novos CDBs/títulos sob a mesma meta percentual (preservando o modelo unificado de acordeão na custódia e sem qualquer hardcoding de metas).
  - **Arquitetura & Fundamentos**:
    - **Lista Homogênea com 1º Título Imediato (`AssetCalibrationModal.tsx`)**:
      - O 1º CDB/título é listado imediatamente no painel de títulos vinculados à meta com badge `[1º TÍTULO (PRINCIPAL)]`, exibindo Nome, Ticker, Banco/Corretora, Taxa/Indexador, Vencimento, Saldo e % de participação.
      - Adicionado botão inline `[✏️ Editar 1º Título]` (`btn-edit-primary-cert`), que abre o formulário pré-preenchido permitindo retificar nome, ticker, banco, taxa, vencimento ou saldo do título primário.
      - Durante a inclusão ou edição de novos títulos (`btn-open-add-sibling` ou `btn-edit-sibling-${idx}`), a lista com todos os títulos já cadastrados (incluindo o 1º CDB) **permanece visível acima do formulário**, permitindo que o investidor confira as datas, taxas e instituições já preenchidas ao cadastrar os próximos títulos.
    - **Sincronização Bidirecional e Preservação de Certificados**:
      - `AssetModal.tsx`: Atualizado para renderizar a lista de certificados vinculados (`asset-modal-certificates-list`) quando o ativo possuir títulos desmembrados e preservar `fixedIncomeCertificates` na submissão.
      - `AssetDetailsDrawer.tsx`: Atualizado para exibir o card analítico de certificados (`drawer-rf-certificates-card`) no Raio-X individual do ativo.
      - `PortfolioPositionsList.tsx`: Menus de ações desktop e mobile atualizados para exibir `Gerenciar Títulos` para qualquer ativo de Renda Fixa ou com certificados, direcionando fluidamente para a calibração.
  - **Validação & Testes**:
    - 3 novos testes dedicados em `AssetCalibrationModal.test.tsx` (Testes 12, 13 e 14) validando a listagem imediata do 1º CDB, a edição inline do título primário e o cadastro de novos títulos com visualização simultânea dos existentes.
    - 17/17 suítes Vitest da Carteira Soberana aprovadas e **137/137 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 43s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada com sucesso em 3.34s.

- **CARTEIRA SOBERANA: ELEVAÇÃO UNIFICADA DA CAMADA DE MODAIS E GAVETAS PARA DOMÍNIO INTEGRAL DA TELA (Z-[200]) E BLINDAGEM DE SAFE-AREA** (implementado 2026-10-06):
  - **Objetivo**: Corrigir a falha de sobreposição onde a barra superior do site (`AppHeader`, `z-[100]`) e a barra inferior mobile (`MobileBottomNav`, `z-[90]`) sobrepunham os modais e gavetas da Carteira Soberana (anteriormente em `z-50`), cortando os primeiros 64px de conteúdo (títulos, botões de fechar `(X)`, réguas de calibração de metas e botões de ação superior) e impedindo o foco operacional limpo do investidor.
  - **Arquitetura & Fundamentos**:
    - **Elevação Estrutural de Empilhamento (`z-[200]`)**:
      - Todos os 13 diálogos, modais e gavetas da Carteira Soberana foram elevados de `z-50` para `z-[200]`, assumindo domínio absoluto do viewport e renderizando seu backdrop escurecido/borrado por cima de toda a barra superior (`z-[100]`) e da barra de navegação inferior (`z-[90]`).
      - Componentes corrigidos:
        1. `AssetDetailsDrawer.tsx` (Raio-X individual do ativo)
        2. `PortfolioTargetsModal.tsx` (Calibração panorâmica de metas em tela única)
        3. `RebalanceSimulatorModal.tsx` (Simulador de aportes inteligentes)
        4. `AssetCalibrationModal.tsx` (Assistente de calibração pós-importação e tela de conclusão)
        5. `AssetModal.tsx` (Cadastro e edição manual de ativos)
        6. `MovementModal.tsx` (Lançamento de compras, vendas, aportes e proventos)
        7. `ClassTargetsModal.tsx` (Metas percentuais por classe de ativos)
        8. `PortfolioTaxModal.tsx` (Apuração fiscal de IRPF e DARF)
        9. `ImportSpreadsheetModal.tsx` (Importação de planilhas B3 / CEI)
        10. `ConnectInstitutionsModal.tsx` (Conexão Open Finance / Instituições)
        11. `ExportPortfolioModal.tsx` (Exportação aberta de custódia CSV/JSON)
        12. `ReconcileCashModal.tsx` (Auditoria e reconciliação contábil do Caixa de Oportunidade)
        13. `PortfolioDashboardView.tsx` (Modal defensivo de confirmação de exclusão de ativo)
    - **Blindagem de Safe-Area Nativa (`AssetDetailsDrawer.tsx`)**:
      - Adicionado preenchimento superior adaptativo com `pt-[max(1.25rem,calc(env(safe-area-inset-top)+1rem))]` no cabeçalho do drawer, blindando contra sobreposição de notch de câmeras frontais ou barras de status em dispositivos móveis e no app nativo Capacitor Android/iOS.
  - **Validação & Testes**:
    - 17/17 suítes Vitest da Carteira Soberana aprovadas e **134/134 testes de componentes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 17s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada com sucesso em 1.95s.

- **CARTEIRA SOBERANA: VISÃO PANORÂMICA E CALIBRAÇÃO UNIFICADA DE METAS EM TELA ÚNICA COM REATIVIDADE INSTANTÂNEA E AJUSTE RESIDUAL EM 1 CLIQUE** (implementado 2026-10-06):
  - **Objetivo**: Atender à solicitação do investidor eliminando o anti-padrão do aviso passivo de discrepância percentual das metas e acabando com a necessidade de abrir ativo por ativo para alterar metas individualmente. O investidor agora conta com um modal panorâmico unificado (`PortfolioTargetsModal`), acessível diretamente pelo clique no aviso de divergência ou pelo botão `[Metas]` da barra superior, onde visualiza todos os ativos e classes em uma única tela, com atualização imediata do total da meta em tempo real ao alterar qualquer ativo e botões inteligentes de 1 clique para absorver resíduos matemáticos (ex: +0,31% para fechar 100,00%).
  - **Arquitetura & Fundamentos**:
    - **Aviso de Discrepância Acionável com Botão Direto (`PortfolioSummaryCard.tsx`)**:
      - Banner de alerta de metas transformado em componente interativo com `onClick={onOpenTargets}`, foco por teclado (`role="button"`, `Enter/Space`), efeito hover e botão explícito `[Ajustar Metas Agora →]` (`btn-adjust-targets-from-warning`).
      - Elimina desorientação cognitiva e conduz o usuário diretamente à tela de resolução.
    - **Modal Panorâmico de Metas da Carteira (`PortfolioTargetsModal.tsx`)**:
      - **Visão Única e Panorâmica**: Lista todos os ativos da carteira agrupados por categoria (Renda Fixa, Ações Brasil, FIIs, etc.), exibindo ticker, nome, saldo em custódia (R$), percentual atual na carteira e input numérico de meta de alocação (%).
      - **Régua Dinâmica de 100% no Topo (Sticky)**: Exibe instantaneamente a soma total recalculada a cada digitação (`totalSum`), a divergência restante (`discrepancy`) e o status visual (verde para 100,00% equilibrado, âmbar quando faltar percentual e vermelho quando exceder).
      - **Subtotais Reativos por Classe**: Cada cabeçalho de categoria exibe em tempo real o subtotal da meta daquela classe (`Subtotal da Classe: XX,XX%`), permitindo balancear tanto o nível macro (classe) quanto o nível micro (ativo).
      - **Atalhos Inteligentes de 1 Clique**:
        - Botão rápido inline em cada ativo (`[+0,31%]`) para absorver o resíduo faltante diretamente naquele título sem cálculo mental.
        - Botão rápido no cabeçalho (`[⚡ Completar no maior ativo]`) para equilibrar a carteira no ativo de maior peso com um toque.
    - **Persistência Atômica em Lote (`portfolioService.ts`, `usePortfolio.ts`, `PortfolioDashboardView.tsx`)**:
      - Nova função `saveAllPortfolioAssets` com `writeBatch` do Firestore e mutação otimista no React Query `saveAllAssets`.
      - Ao salvar, todos os ativos são atualizados atomicamente, o resumo é recalculado, a discrepância é zerada e o banner de alerta desaparece automaticamente.
  - **Validação & Testes**:
    - Nova suíte de testes: `PortfolioTargetsModal.test.tsx` (5/5 testes aprovados).
    - Suíte expandida: `PortfolioDashboardView.test.tsx` (28/28 testes aprovados, incluindo teste de clique no banner e abertura do modal).
    - 26/26 suítes Vitest da Carteira Soberana aprovadas e **267/267 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 50s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada com sucesso em 5.04s.

- **CARTEIRA SOBERANA: META INTEGRAL UNIFICADA DE CDBS/RENDA FIXA COM ACORDEÃO EXPANSÍVEL DE TÍTULOS (TAXAS, VENCIMENTOS E INSTITUIÇÕES)** (implementado 2026-10-03):
  - **Objetivo**: Atender à solicitação do investidor eliminando o fracionamento da meta percentual de alocação em decimais quando múltiplos títulos de Renda Fixa (ex: múltiplos CDBs com diferentes taxas, prazos ou bancos) são cadastrados. O CDB passa a ser exibido como um ativo consolidado com seu saldo total e meta integral (ex: 6,5% sem divisões). Ao clicar no título, a área se expande em um acordeão revelando todos os CDBs/certificados cadastrados, com seus respectivos vencimentos, taxas de rentabilidade (% CDI/IPCA/Pré), instituições custodiantes e saldo.
  - **Arquitetura & Fundamentos**:
    - **Modelo de Dados & Sub-Certificados (`portfolioTypes.ts`, `portfolioMath.ts` e `usePortfolio.ts`)**:
      - `FixedIncomeCertificate`: interface contendo `id`, `name`, `ticker?`, `institution?`, `balance`, `isNetBalance?`, `indexation?`, `ratePercent?`, `startDate?`, `maturityDate?` e `createdAt?`.
      - `PortfolioAsset.fixedIncomeCertificates?: FixedIncomeCertificate[]` e `DerivedAssetPosition.fixedIncomeCertificates?: FixedIncomeCertificate[]`.
      - `replayAssetLedger`: propaga atomicamente os certificados para a posição consolidada calculada.
    - **Visualização com Acordeão Mestre-Detalhe Desktop e Mobile (`PortfolioPositionsList.tsx`)**:
      - **Tabela Desktop**: Se o ativo possuir certificados cadastrados (`fixedIncomeCertificates`), exibe o badge/botão interativo `[▼ N títulos]` (`btn-expand-certificates-${ticker}`). Ao clicar, renderiza uma sub-linha expansível (`expanded-certificates-row-${ticker}`) contendo tabela elegante com Nome/Identificação, Instituição Custodiante, Taxa/Indexador, Data de Vencimento, Saldo (Bruto/Líquido) e % de Participação na meta.
      - **Cards Mobile**: Header com botão `[▼ N títulos]` (`btn-mobile-expand-certificates-${ticker}`) e painel expansível com cards detalhados (`mobile-expanded-certificates-${ticker}`) de cada título filho.
    - **Assistente de Calibração Soberano (`AssetCalibrationModal.tsx`)**:
      - **Meta Integral Preservada**: Eliminação da divisão fracionada de `targetPercentage` em decimais. A meta informada (ex: 6,0%) é gravada integralmente no ativo primário (`updatedAsset.targetPercentage = numTarget`).
      - **Gestão de Certificados**: Múltiplos CDBs são cadastrados sob o mesmo ativo em `fixedIncomeCertificates` (unificando o título principal e os adicionais), sem criar linhas separadas que poluiriam a custódia.
      - **Painel de Composição**: Substituição da divisão de metas por um painel transparente de composição financeira do CDB (`shared-target-distribution-breakdown`), detalhando o saldo total consolidado e o percentual de participação de cada certificado.
      - **Detecção e Absorção de Títulos Avulsos**: Se o investidor já possuía títulos irmãos avulsos gerados anteriormente (ex: `CDB 2` ou `ast_sib_`), o assistente detecta e oferece o botão `[Unificar neste CDB]`, convertendo-o em certificado e passando seu ID para exclusão atômica (`absorbedAssetIds`).
    - **Persistência Atômica Coordenada (`PortfolioDashboardView.tsx`)**:
      - `handleSaveCalibration` atualizado para receber `absorbedAssetIds?: string[]` e invocar `onDeleteAsset` para limpar títulos avulsos absorvidos, mantendo a custódia perfeitamente unificada.
  - **Validação & Testes**:
    - Suítes de teste atualizadas e expandidas: `AssetCalibrationModal.test.tsx` (11/11 testes aprovados) e `PortfolioPositionsList.test.tsx` (16/16 testes aprovados, incluindo novo teste para o acordeão expansível).
    - 25/25 suítes Vitest da Carteira Soberana aprovadas e **262/262 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 17s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada em 1.63s.

- **CARTEIRA SOBERANA: SUPORTE A MÚLTIPLOS TÍTULOS (CDBS/RENDA FIXA) NA MESMA META/CATEGORIA COM DESMEMBRAMENTO DE SALDO** (implementado 2026-10-03):
  - **Objetivo**: Permitir que o investidor cadastre múltiplos certificados/títulos de Renda Fixa (ex: múltiplos CDBs com diferentes taxas, prazos ou bancos custodiantes) compartilhando a mesma meta percentual ou categoria na carteira, com suporte a desmembramento proporcional de saldo financeiro na calibração ou aporte de novos títulos independentes.
  - **Arquitetura & Fundamentos**:
    - **Assistente de Calibração Soberano (`AssetCalibrationModal.tsx`)**:
      - **Hierarquia Visual e Posicionamento da Meta**: A seção de Meta Percentual de Alocação (`section-allocation-target`) foi reposicionada estrategicamente **abaixo** de `[+ Adicionar outro CDB / Título]` e da lista de títulos irmãos. Assim, os parâmetros do CDB principal (Saldo, Tipo de Saldo, Corretora e Marcação na Curva Anbima) ficam coesos no início, seguidos pela adição de novos títulos sob a mesma meta, e encerram na Meta Percentual que governa o conjunto como um todo.
      - **Painel de Divisão Compartilhada da Meta (`shared-target-distribution-breakdown`)**: Quando múltiplos títulos de Renda Fixa compõem a mesma meta, o assistente calcula e exibe em tempo real a divisão proporcional da meta entre os títulos cadastrados com base no valor em custódia de cada um, evitando duplicidade percentual e garantindo que a soma resulte exatamente no percentual pretendido (ex: 6,0% distribuído em 5,12% para o CDB Daycoval e 0,88% para o CDB Inter).
      - Seção dedicada `section-sibling-fixed-income` para ativos de Renda Fixa (`assetClass === 'Renda Fixa'`), acessível pelo botão `[+ Adicionar outro CDB]` (`btn-add-sibling-fixed-income`).
      - Formulário inline sóbrio contendo: Código/Ticker (ex: CDB-DAYCOVAL-01), Nome do Título, Instituição Custodiante, Saldo em Custódia (R$), Seletor de Saldo Bruto/Líquido (`fixedIncomeIsNetBalance`), Indexador (CDI, IPCA, Pré-fixado), Taxa (% a.a. ou % CDI) e Data de Vencimento.
      - Opção de Desmembramento (`checkbox-sibling-split`): Permite subtrair o saldo do novo título diretamente do saldo do ativo atual (ex: repartir R$ 11.686,71 em R$ 5.000,00 no Daycoval e R$ 6.686,71 no Banco Inter), com validação contra saldos excedentes (`saldo do novo título não pode superar o saldo atual`).
      - Lista de títulos adicionais acoplada na calibração com chips informativos e ação de exclusão antes do salvamento atômico.
    - **Persistência Atômica Coordenada (`PortfolioDashboardView.tsx`)**:
      - `handleSaveCalibration` atualizado para receber `additionalAssets` além da posição calibrada primária.
      - Geração atômica de `PortfolioAsset` e respectiva `PortfolioMovement` contábil (`INITIAL_POSITION`) para cada título irmão com aplicação rigorosa das parcelas da meta percentual.
      - Gravação via `onImportBatch` garantindo atualização atômica no Firestore e cache React Query sem concorrência ou saltos de interface.
    - **Formulário de Cadastro e Edição Manual de Ativos (`AssetModal.tsx`)**:
      - Suporte nativo ao seletor segmentado `Saldo Bruto` vs `Saldo Líquido` em Renda Fixa, propagando `fixedIncomeIsNetBalance` no salvamento e edição individual.
  - **Validação & Testes**:
    - Suíte expandida: `AssetCalibrationModal.test.tsx` (11/11 testes aprovados, incluindo o teste de integração contábil e de interface para adição de múltiplos CDBs na mesma meta e distribuição proporcional).
    - 25/25 suítes Vitest da Carteira Soberana aprovadas e **261/261 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 15s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada em 1.37s.

- **CARTEIRA SOBERANA: SUPORTE A SALDO BRUTO VS LÍQUIDO (PÓS-IR) EM ATIVOS DE RENDA FIXA (CDB, TESOURO, LC) & BLINDAGEM DE ISENÇÃO (LCI, LCA, CRI, CRA)** (implementado 2026-10-03):
  - **Objetivo**: Permitir que o investidor declare se o saldo informado em custódia de Renda Fixa (ex: CDB, RDB, LC, Tesouro Direto) é Bruto ou Líquido pós-IR, garantindo que o sistema diferencie se a alíquota regressiva do Imposto de Renda (22,5% a 15%) e IOF já foi descontada ou deve ser provisionada pela curva Anbima, respeitando também a isenção tributária de pessoa física (LCI, LCA, CRI, CRA e Debêntures Incentivadas).
  - **Arquitetura & Fundamentos**:
    - **Tipagem Contábil e Posições Derivadas (`portfolioTypes.ts`)**:
      - `PortfolioAsset.fixedIncomeIsNetBalance?: boolean`: indicador no cadastro do ativo.
      - `PortfolioMovement.isNetBalance?: boolean`: atributo contábil de partida da movimentação (`INITIAL_POSITION`).
      - `DerivedAssetPosition.fixedIncomeIsNetBalance?: boolean` e `netCurrentValueBRL?: number | null`: apuração do valor líquido disponível pós-IR no livro-razão.
    - **Motor Matemático do Livro-Razão (`portfolioMath.ts` & `fixedIncomeMath.ts`)**:
      - `replayAssetLedger`: aceita `fixedIncomeIsNetBalance` e propaga o valor líquido exato calculado via marcação na curva Anbima 252 dias úteis (`FixedIncomeCurveResult.netValueBRL`) ou preserva o saldo líquido informado diretamente pelo usuário.
      - Detecção ampla de isenção de IR (`isFixedIncomeTaxExempt`) cruzando categoria, ticker e nome do ativo.
    - **Assistente de Calibração Soberano (`AssetCalibrationModal.tsx`)**:
      - Para ativos de Renda Fixa tributáveis (CDB, LC, Tesouro): seletor segmentado sóbrio `[● Saldo Bruto]` (`btn-balance-gross`) vs `[○ Saldo Líquido (após IR)]` (`btn-balance-net`), com textos explicativos transparentes sobre capitalização composta e alíquota regressiva.
      - Para ativos de Renda Fixa isentos (LCI, LCA, CRI, CRA, Debêntures Incentivadas): renderização automática do badge defensivo `[🛡️ Isento de Imposto de Renda (PF)]` sem poluir a tela com seletores desnecessários (Bruto = Líquido).
      - Salvamento atômico de ativo e movimentação sincronizado em `PortfolioDashboardView.tsx`.
    - **Visualização de Custódia Desktop e Mobile (`PortfolioPositionsList.tsx`)**:
      - Tabela Desktop: identificação visual clara sob o Valor Total: badge `[Líquido]` ou `[Bruto (Líq: R$ XX,XX)]` com tooltip analítico contendo a provisão do IR deduzido.
      - Cards Mobile: subtítulo contextual indicando `Saldo Líquido` ou `Saldo Bruto (Líq: R$ XX,XX)`.
  - **Validação & Testes**:
    - Suíte expandida: `AssetCalibrationModal.test.tsx` (10/10 testes aprovados, incluindo testes específicos para CDB com seleção de saldo líquido e LCI com badge de isenção).
    - 26/26 suítes Vitest da Carteira Soberana aprovadas e **267/267 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 12s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada em 1.95s.

- **CARTEIRA SOBERANA: RESILIÊNCIA DA ESTEIRA MULTI-PROXY DE COTAÇÕES EM TEMPO REAL (ALLORIGINS / YAHOO FINANCE), BLINDAGEM DE BADGE E AUTO-CALIBRAÇÃO DE COTAS** (implementado 2026-10-03):
  - **Objetivo**: Erradicar a falha na obtenção de cotações em tempo real no módulo Carteira (provocada pela descontinuação de proxies legados de terceiros e exigência de tokens na Brapi) e eliminar a contradição visual no assistente de calibração (`AssetCalibrationModal`), onde o badge verde exibia incorretamente valores calculados por divisão de saldo como se fossem cotações online de mercado.
  - **Arquitetura & Fundamentos**:
    - **Esteira Multi-Proxy Resiliente de Cotações (`marketQuoteEngine.ts`)**:
      - Substituição definitiva do `corsproxy.io` (que passou a exigir chave paga / 403 Forbidden) pela esteira de contingência `api.allorigins.win` (tanto na rota `/raw` quanto na rota com envelope JSON `/get`).
      - Chaveamento transparente automático em caso de oscilação ou erro HTTP.
      - Gestão inteligente do token Brapi (`getBrapiToken`): se não houver chave configurada (`VITE_BRAPI_API_KEY` ou `fpi_brapi_api_token`), pula a requisição à Brapi em desenvolvimento/produção para evitar chamadas fadadas a 401 Unauthorized, consultando o Yahoo Finance diretamente em ~1 segundo.
      - Suporte à configuração opcional de token Brapi via `localStorage` ou ambiente.
    - **Blindagem do Badge de Cotação Online (`AssetCalibrationModal.tsx`)**:
      - Restrição rigorosa: o badge `[🟢 Online: R$ XX,XX]` agora exige estritamente `autoFetchQuote && quoteFetchStatus === 'success' && unitPrice > 0`.
      - Se a cotação falhar (`quoteFetchStatus === 'failed'`), o badge verde nunca é renderizado, exibindo de forma honesta apenas o banner informativo e preservando a integridade das decisões do investidor.
      - Inicialização adaptativa de `quoteFetchStatus`: reconhece cotações de mercado prévias já calculadas ou inicia em `idle`.
      - Auto-busca reativa na abertura: se o ativo for de renda variável e não possuir cotação conhecida, o modal dispara a consulta em tempo real em segundo plano automaticamente.
  - **Validação & Testes**:
    - Suítes dedicadas expandidas: `marketQuoteEngine.test.ts` (7/7 testes aprovados) e `AssetCalibrationModal.test.tsx` (8/8 testes aprovados).
    - 26/26 suítes Vitest da Carteira Soberana aprovadas e **266/266 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 19s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada em 2.79s.

- **CARTEIRA SOBERANA: COTAÇÃO ONLINE EM TEMPO REAL, VALOR TOTAL EDITÁVEL E MODO MANUAL NO ASSISTENTE DE CALIBRAÇÃO** (implementado 2026-10-03):
  - **Objetivo**: Eliminar a lacuna de edição no assistente de calibração pós-importação da Carteira Soberana, permitindo retificar o Valor Total em Custódia diretamente e integrando a busca em tempo real da cotação do ativo na internet (B3 / Mercado) com alternância fluida entre modo automático e preço manual (`manualPrice`).
  - **Arquitetura & Fundamentos**:
    - **Tríade Matemática Sincronizada Bidirecional (`AssetCalibrationModal.tsx`)**:
      - `Quantidade de Cotas` $\times$ `Cotação / Preço Unitário (R$)` $=$ `Valor Total da Posição (R$)`.
      - **Edição Dinâmica do Valor Total (`input-calibration-total`)**: Permite que o investidor altere o valor financeiro da posição importada; se houver cotação disponível (online ou manual), o assistente recalcula instantaneamente a quantidade de cotas necessárias; se houver cotas, recalcula o preço unitário correspondente.
      - **Edição de Cotas (`input-calibration-quantity`)**: Atualiza o Valor Total automaticamente multiplicando pela cotação ativa.
      - **Edição de Preço (`input-calibration-price`)**: Atualiza o Valor Total da posição proporcionalmente.
      - Suporte nativo a ativos cadastrados puramente por saldo monetário / Renda Fixa (`!isVariableIncome`), liberando o campo de Valor Total para qualquer classe da custódia.
    - **Busca de Cotação em Tempo Real na Internet (`marketQuoteEngine.ts`)**:
      - Checkbox sóbrio `[☑] Buscar cotação em tempo real na internet` (`checkbox-auto-quote`).
      - Quando ativo: consulta a esteira multi-fallback online (`fetchPortfolioQuotes` via Brapi / Yahoo Finance / AwesomeAPI) no exato instante da calibração, exibindo badge `[🟢 Online: R$ XX,XX]` e botão de recarga `[🔄]` (`btn-refresh-online-quote`).
      - Quando desmarcado: ativa o modo `[✏️ Preço Manual]`, permitindo que o investidor fixe uma cotação arbitrária persistida em `PortfolioAsset.manualPrice` e `PortfolioAsset.manualPriceUpdatedAt`.
      - Se a cotação for automática, salva `manualPrice: null` para que o ativo continue acompanhando o mercado automaticamente no dia a dia da carteira via `usePortfolio`.
    - **Preço Médio Histórico de Aquisição Segregado (`input-calibration-hist-price`)**:
      - Permite informar o custo histórico real na movimentação contábil (`INITIAL_POSITION`) sem misturar com a cotação de mercado atual, garantindo apuração precisa do ganho de capital desde o primeiro dia.
  - **Validação & Testes**:
    - Suíte dedicada expandida: `AssetCalibrationModal.test.tsx` (7/7 testes aprovados, incluindo testes de edição do valor total, sincronização da quantidade e persistência do modo manual).
    - 25/25 suítes Vitest da Carteira Soberana aprovadas e **257/257 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 08s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada em 1.55s.

- **CARTEIRA SOBERANA: INTELIGÊNCIA GUIADA NEXUS & ASSISTENTE DE CALIBRAÇÃO PÓS-IMPORTAÇÃO (WIZARD DE COTAS, CORRETORAS EM LOTE E METAS)** (implementado 2026-10-03):
  - **Objetivo**: Resolver de ponta a ponta a desorientação do investidor após importar planilhas na Carteira Soberana (quando ativos são importados apenas com saldo financeiro ou sem cotas, instituição ou metas percentuais). O Nexus Copilot assume o papel de mentor ativo, identificando pendências cadastrais e guiando o usuário com máxima inteligência, sobriedade e eficiência — sem artificialismos ou excessos visuais.
  - **Arquitetura & Fundamentos**:
    - **Diagnóstico Algorítmico de Integridade (`nexusPortfolioAdvisor.ts`)**:
      - Função pura `auditAssetCalibration` que audita cada posição da carteira segundo regras de negócio cirúrgicas:
        - Renda Variável (Ações, FIIs, ETFs, BDRs, Cripto): exige quantidade de cotas conhecida (`!hasKnownQuantity || isBalanceOnly`).
        - Renda Fixa: exige indexador e data de vencimento para alimentar a marcação na curva Anbima.
        - Todas as classes: audita instituição custodiante informada e metas de alocação estipuladas.
        - Caixa de Oportunidade: isento de cotas ou calibração de ações (preservando a integridade contábil).
      - Insight dedicado de categoria `'CALIBRATION'` emitido pelo Nexus Copilot com ação rápida `[Calibrar Ativos]`.
    - **Assistente de Calibração Guiada (`AssetCalibrationModal.tsx`)**:
      - Modal interativo, sóbrio e acessível (`role="dialog"`, `aria-modal="true"`, fechamento por `Escape`, foco adaptativo).
      - **Cálculo Inverso Inteligente de Cotas (B3)**: Sugere automaticamente a quantidade de ações calculada a partir do saldo financeiro e da cotação de mercado (`Cotas = Saldo / Cotação`), preenchendo em 1 clique (`btn-apply-inferred-qty`).
      - **Preço Médio Unitário Histórico**: Permite informar o custo histórico real para habilitar apuração fidedigna de rentabilidade acumulada (explicando pedagogicamente por que a rentabilidade de ativos importados pode iniciar zerada).
      - **Propagação de Corretora em Lote**: Permite selecionar a instituição (chips rápidos de corretoras ou digitação livre) e aplicar a mesma corretora para todos os outros ativos pendentes em 1 único clique.
      - **Metas de Alocação (%)**: Preenchimento rápido com sugestão de divisão percentual.
      - **Atualização Coordenada Ativo + Livro-Razão**: Ao salvar, atualiza atomicamente o `PortfolioAsset` e a respectiva movimentação de `INITIAL_POSITION`, eliminando a necessidade de o usuário entender lançamentos de partidas contábeis.
    - **Sinalização Visual e Filtros Rápidos na Custódia (`PortfolioPositionsList.tsx`)**:
      - Pílula de filtro rápido `[⚠️ Pendentes (N)]` no cabeçalho de categorias, permitindo isolar instantaneamente apenas as posições incompletas.
      - Badge discreto e elegante `[⚠️ Calibrar]` ao lado do ticker na tabela desktop e nos cards mobile, com clique direto para o modal.
      - Opção `[Calibrar Ativo]` integrada ao menu contextual de ações rápidas `[...]`.
    - **Ponte Imediata no Fluxo de Importação (`ImportSpreadsheetModal.tsx`)**:
      - A tela final de sucesso da importação de planilhas detecta ativos sem cotas e oferece o atalho direto `[Calibrar com Nexus Agora]`, extinguindo o momento de dúvida pós-importação.
  - **Validação & Testes**:
    - Nova suíte dedicada: `AssetCalibrationModal.test.tsx` (4/4 testes aprovados).
    - 25/25 suítes Vitest da Carteira Soberana aprovadas e **254/254 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 08s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada em 1.73s.
    - Zero poluição visual, alta eficiência operacional e autoridade silenciosa.

- **AGENDA SOBERANA: TEMA INDEPENDENTE PARA A FOLHA PAUTADA COM SINCRONIZAÇÃO AUTOMÁTICA AO TEMA GLOBAL** (implementado 2026-10-03):
  - **Objetivo**: Permitir que o investidor selecione o tema da folha pautada do caderno da Agenda (Clara ou Escura) de forma autônoma, com sincronização automática com o tema global do Finanças Pro Invest. Sempre que o usuário alternar o modo claro/escuro da aplicação no cabeçalho ou menu geral, a folha da Agenda acompanha imediatamente a escolha global. Se o investidor quiser que a Agenda tenha uma folha diferente (ex: folha branca pautada mesmo em Modo Escuro), basta clicar no botão específico da Agenda para customizá-la.
  - **Arquitetura & Fundamentos**:
    - **Hook Reativo com Auto-Sync (`useAgendaPaperTheme.ts`)**:
      - Monitora reativamente as alterações em `resolvedTheme` do `ThemeContext` via `useEffect` e `useRef`. Ao detectar alteração no tema geral do Finanças Pro Invest, reseta o modo da folha para `'auto'` e limpa a sobreposição anterior, sincronizando a folha com o novo tema do app.
      - Armazena payload estruturado `{ mode: 'light' | 'dark', forAppTheme: ResolvedTheme }` em `localStorage` sob a chave `fpi_agenda_paper_theme`, garantindo persistência consistente na mesma sessão ou recargas.
    - **Botão Alternador no Cabeçalho da Agenda (`AgendaHub.tsx`)**:
      - Posicionado no bloco de ações superiores ao lado de pesquisa (`data-testid="agenda-paper-theme-toggle"`), com ícone `Sun` (quando a folha estiver escura) e `Moon` (quando estiver clara), tooltip descritivo e rótulo adaptativo para mobile e desktop.
    - **Escopo e Calibração Tipográfica (`AgendaDayRow.tsx` & `src/index.css`)**:
      - Definição das variáveis de pauta com isolamento (`--agenda-pauta-color: #7dd3fc` para folha clara e `rgba(56, 189, 248, 0.18)` para folha escura).
      - Rótulos dos dias (incluindo destaque de sábado em magenta e domingo em vermelho), títulos de compromissos, marcadores de horário, sinos de alarme, caixas de seleção e cards inline de adição/edição ajustam suas paletas dinamicamente em conformidade com o tema da folha, mantendo contraste WCAG AAA.
    - **Imutabilidade das Camadas Externas**: Nenhuma classe global do `ThemeContext` é alterada; todo o shell e a navegação permanecem estáveis no modo escolhido globalmente pelo usuário.
  - **Validação & Testes**:
    - Suítes dedicadas: `useAgendaPaperTheme.test.ts` (6/6 aprovados) e `AgendaHub.paperTheme.test.tsx` (5/5 aprovados, incluindo teste explícito de sincronização automática ao mudar o tema do Finanças Pro Invest).
    - Suíte geral de testes da Agenda aprovada: **15/15 arquivos de teste e 165/165 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 08s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada em 1.64s.

- **MENU MOBILE SOBERANO: FECHAMENTO POR TOQUE EXTERNO NO BACKDROP & TECLA ESCAPE** (implementado 2026-10-03):
  - **Objetivo**: Permitir que o usuário feche a prateleira de opções do menu mobile ("Menu" sanduíche) clicando ou tocando fora da gaveta (isto é, em toda a lateral esquerda escurecida), além do botão "X" superior e da seleção de rotas.
  - **Arquitetura & Fundamentos**:
    - **Backdrop Clicável Independente (`AppMobileDrawer.tsx`)**: O container raiz do drawer foi promovido a `role="dialog" aria-modal="true" aria-label="Menu Soberano"`, integrando uma camada explícita de backdrop (`data-testid="app-mobile-drawer-backdrop"`) com `onClick={onClose}` que cobre 100% da viewport atrás da prateleira.
    - **Prevenção de Falsos Fechamentos**: Adicionado `onClick={(e) => e.stopPropagation()}` no container interno da prateleira (`data-testid="app-mobile-drawer-content"`), assegurando que rolagens e toques em opções dentro do menu nunca disparem o fechamento involuntário.
    - **Acessibilidade por Teclado**: Listener de evento `keydown` interceptando a tecla `Escape` para fechar o diálogo instantaneamente.
  - **Validação & Testes**:
    - 2/2 suítes Vitest aprovadas e **16/16 testes aprovados** em `AppMobileDrawer.test.tsx` e `MobileBottomNav.test.tsx`.
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 50s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada em 4.10s.

- **SHELL SOBERANO: RESOLUÇÃO DE DUPLA BARRA DE ROLAGEM, TRAVA DE VIEWPORT E ELIMINAÇÃO DE VAZIO INFERIOR** (implementado 2026-10-03):
  - **Objetivo**: Eliminar a anomalia de duas barras verticais de rolagem simultâneas no desktop em `/app/carteira` (barra da janela/viewport vs barra interna de conteúdo), erradicando o deslocamento indevido do layout e o vão em branco inferior observado quando a barra da margem era descida até o fim.
  - **Arquitetura & Fundamentos**:
    - **Trava de Viewport no Shell Autenticado (`AppLayout.tsx`)**: Substituição de `h-screen h-[100dvh] overflow-hidden` por `fixed inset-0 overflow-hidden` na div raiz de `AppLayoutInner`. O aplicativo passa a ser rigorosamente contido nas 4 bordas do viewport (`top: 0, bottom: 0, left: 0, right: 0`), blindando o `window` contra rolagem espúria e impedindo que o layout seja empurrado para cima com exposição de fundo vazio.
    - **Harmonização do Menu Lateral Desktop (`AppDesktopNav.tsx`)**: Atualização do container para `h-full self-stretch` (removendo `h-[calc(100vh-4rem)] sticky top-16 self-start` que somava 4rem redundantes sobre o container já espaçado por `pt-16` em `AppLayout.tsx`).
    - **Calibração do Respiro Inferior (`PageShell.tsx`)**: Redução do padding inferior no desktop de `pb-24` (96px) para `pb-6` (24px) quando não houver barra de navegação móvel (`withMobileNav === false`), eliminando o espaço morto no fim da página de custódia.
    - **Isolamento de Segurança das Rotas Públicas**: Rotas públicas (`/`, `/termos`, `/privacidade`) permanecem em `PublicLayout.tsx` com rolagem fluida e irrestrita da janela.
  - **Validação & Testes**:
    - 15/15 suítes Vitest aprovadas e **115/115 testes aprovados** (100%) em `src/components/tools/portfolio`.
    - 1/1 suíte Vitest aprovada e 3/3 testes aprovados em `src/layouts`.
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 15s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada em 4.39s.

- **CARTEIRA SOBERANA: ETAPA 6 DO PLANO DIRETOR — SINERGIA SOBERANA: SALDO LIVRE REAL, BLINDAGEM DE LIQUIDEZ NO NEXUS COPILOT & PONTE DE PROVENTOS** (implementado 2026-10-01):
  - **Objetivo**: Concluir a Etapa 6 do Plano Diretor da Carteira Soberana, coroando o diferencial competitivo supremo do ecossistema: conectar a alocação de investimentos ao fluxo de vida financeira real do usuário (Saldo Livre Real da Central, proteção da Reserva de Emergência e direcionamento de dividendos para despesas correntes).
  - **Arquitetura & Fundamentos**:
    - **Aporte Inteligente Alimentado pelo Saldo Livre Real (`RebalanceSimulatorModal.tsx`)**:
      - Conexão nativa com `availableFreeBalance` derivado de `useSovereignSnapshot`.
      - Barra de sinergia soberana (`data-testid="rebalance-free-balance-bar"`) com botão de 1 clique `[💡 Usar Saldo Livre]` (`data-testid="btn-use-free-balance"`), preenchendo automaticamente o simulador de compras determinístico com o montante verdadeiramente livre do mês.
      - Alerta defensivo de liquidez (`data-testid="rebalance-free-balance-warning"`): avisa pedagogicamente quando o Saldo Livre Real for negativo ou zero, orientando a priorizar a quitação de contas fixas e a reserva de emergência antes de alocar novos recursos externos na carteira.
    - **Copilot Nexus com Blindagem de Liquidez (`nexusPortfolioAdvisor.ts` & `PortfolioNexusCard.tsx`)**:
      - Categoria formal `'LIQUIDITY_SHIELD'`.
      - Detecção de déficit orçamentário (`availableFreeBalance < 0`) e vulnerabilidade na Reserva de Emergência (`hasEmergencyReserveAlert`), recomendando a suspensão cautelar de novas compras em renda variável e foco estrito em ativos pós-fixados de liquidez imediata.
      - Recomendação ativa de aporte quando houver Saldo Livre Real positivo (`>= R$ 100,00`) e classes abaixo da meta contratada.
    - **Ponte de Saque de Proventos para o Orçamento Pessoal (`PortfolioDividendsPanel.tsx`)**:
      - Card soberano (`dividends-sovereign-bridge-card`) orientando o investidor a utilizar a Retirada Externa (`EXTERNAL_WITHDRAWAL`) no Livro Razão para transferir rendimentos acumulados no Caixa da Carteira para sua conta corrente pessoal de custeio familiar.
    - **Orquestração Reativa em `PortfolioPage.tsx`**:
      - Integração reativa de `useTransactions` e `useSovereignSnapshot`, alimentando `usePortfolio` e `PortfolioDashboardView` sem expor lógica de negócios redundante.
  - **Validação & Testes**:
    - 24/24 suítes Vitest aprovadas e **243/243 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 12s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada em 1.51s.
    - Sinergia total e zero contaminação no Saldo Livre Real.

- **CARTEIRA SOBERANA: ETAPA 5 DO PLANO DIRETOR — INTELIGÊNCIA VISUAL: GRÁFICO CIRCULAR DONUT (CLASSE E CORRETORA) & PROVENTOS PROVISIONADOS** (implementado 2026-10-01):
  - **Objetivo**: Concluir a Etapa 5 do Plano Diretor da Carteira Soberana, dotando o sistema de visualização gráfica vetorial (gráfico Donut SVG interativo por classes de ativos e por corretoras custodiantes) e esteira de proventos provisionados futuros.
  - **Arquitetura & Fundamentos**:
    - **Gráfico Donut SVG Interativo (`PortfolioAllocationDonut.tsx` & `PortfolioSummaryCard.tsx`)**:
      - Construção vetorial em SVG nativo sem bibliotecas externas pesadas, com arcos calculados matematicamente (`circumference`, `dashArray`, `dashOffset`).
      - Alternância de visão em abas (`[📊 Por Classe]` vs `[🏦 Por Corretora]`).
      - Centro interativo dinâmico exibindo Patrimônio Consolidado em repouso e valor/percentual detalhado no hover.
      - Legenda bidirecional com destaque sincronizado entre fatias do gráfico e itens da legenda.
    - **Esteira de Proventos Provisionados / Futuros (`PortfolioDividendsPanel.tsx`)**:
      - Segregação temporal precisa: Proventos Recebidos (`date <= hoje`) vs Proventos Provisionados (`date > hoje`).
      - Abas segmentadas no painel: `[🪙 Recebidos]` e `[🗓️ Provisionados / A Receber]`.
      - Banner de alerta de renda passiva futura na aba de recebidos com atalho de 1 clique.
      - Cards analíticos de curto prazo: Total Provisionado, Previsão nos Próximos 30 Dias e Próxima Liquidação.
      - Badges com contagem regressiva em dias (`Hoje`, `Amanhã`, `Em X dias`) e cronograma detalhado de recebimentos.
  - **Validação & Testes**:
    - 24/24 suítes Vitest aprovadas e **237/237 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 11s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada em 1.439s.

- **CARTEIRA SOBERANA: ETAPA 4 DO PLANO DIRETOR — PRESETS OFICIAIS DE IMPORTAÇÃO (B3, KINVO, GORILA, STATUS INVEST, XP, NUINVEST, BTG, INTER)** (implementado 2026-10-01):
  - **Objetivo**: Concluir a Etapa 4 do Plano Diretor da Carteira Soberana, permitindo importação em 1 clique de extratos e posições dos principais agentes do mercado financeiro brasileiro sem formatação manual de colunas.
  - **Arquitetura & Fundamentos**:
    - **Catálogo Oficial de Presets (`spreadsheetImporter.ts`)**: 10 presets mapeados com cabeçalhos estruturados, palavras-chave secundárias e comportamentos automáticos (`B3_NEGOCIACAO`, `B3_POSICAO`, `KINVO`, `GORILA`, `STATUS_INVEST`, `XP`, `NUINVEST`, `BTG`, `INTER` e `AUTO`).
    - **Motor Heurístico de Detecção (`detectMatchingPreset` & `applyImportPreset`)**: pontuação de similaridade e correspondência exata, preenchendo todos os seletores de colunas instantaneamente.
    - **Interface de 1-Clique (`ImportSpreadsheetModal.tsx`)**: Barra de chips de seleção rápida de modelos com alternância automática do modo de importação (`MOVEMENTS` vs `INITIAL_POSITIONS`).
  - **Validação & Testes**:
    - 23/23 suítes Vitest aprovadas e **231/231 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade.
    - `npm run build`: Compilação de produção aprovada em 1m 12s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada em 1.705s.

- **CARTEIRA SOBERANA: ETAPA 3 DO PLANO DIRETOR — MARCAÇÃO NA CURVA DE RENDA FIXA (ANBIMA 252 DIAS ÚTEIS) & RESILIÊNCIA DE COTAÇÕES** (implementado 2026-10-01):
  - **Objetivo**: Concluir a Etapa 3 do Plano Diretor da Carteira Soberana, dotando o Finanças Pro Invest de cálculo automático de rentabilidade na curva para títulos de Renda Fixa (CDB, LCI, LCA, CRI, CRA, Debêntures, Tesouro Direto) e motor de cotações resiliente com token e contingência offline.
  - **Arquitetura & Fundamentos**:
    - **Marcação na Curva Anbima 252 Dias Úteis (`portfolioMath.ts` & `fixedIncomeMath.ts`)**: Cálculo de rentabilidade na curva sem dependência de cotações externas diárias, com alíquotas regressivas de IR e IOF integradas na posição.
    - **Formulário Especializado de Renda Fixa (`AssetModal.tsx`)**: Seção inteligente de parâmetros de indexação (Prefixado, % do CDI, IPCA + Spread), data de aplicação e data de vencimento.
    - **Card Dedicado no Raio-X (`AssetDetailsDrawer.tsx`)**: Card `[drawer-rf-curve-card]` detalhando Valor Bruto, Rendimento Bruto, Provisão de IR/IOF e Valor Líquido Hoje.
  - **Validação & Testes**:
    - 22/22 suítes Vitest aprovadas e **225/225 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade.
    - `npm run build`: Compilação de produção aprovada em 1m 08s.
    - `npx cap sync android`: Sincronização nativa executada em 1.55s.
- **CARTEIRA SOBERANA: ETAPA 2 DO PLANO DIRETOR — RAIO-X INDIVIDUAL DO ATIVO, DECOMPOSIÇÃO DO RETORNO & EXTRATO DE NEGOCIAÇÕES/PROVENTOS** (implementado 2026-10-01):
  - **Objetivo**: Concluir a Etapa 2 do Plano Diretor da Carteira Soberana, dotando o Finanças Pro Invest da experiência de análise profunda no padrão institucional de plataformas líderes (Gorila e Kinvo): drawer lateral responsivo com visualização de métricas soberanas, histórico discriminado de negociações, extrato de proventos exclusivos, decomposição do retorno total e atalhos operacionais diretos.
  - **Arquitetura & Fundamentos**:
    - **Gaveta Analítica `AssetDetailsDrawer.tsx` (`src/components/tools/portfolio/modals/AssetDetailsDrawer.tsx`)**:
      - Painel lateral deslizante com backdrop blur, fechamento por `Escape`, clique externo e acessibilidade semântica (`role="dialog"`, `aria-modal="true"`).
      - **Cabeçalho Executivo**: Ticker em destaque mono, badges de mercado (`B3`, `CASH`, `RF`, `US`, `CRYPTO`), moeda estrangeira, instituição custodiante, isenção tributária (`Isento IR`) e botões rápidos de `[+ Lançar]` e `[✏️ Editar]`.
      - **Cards de Métricas Soberanas**: Posição Atual (cotas/saldo), Patrimônio Total (R$), Preço Médio e Custo Total Investido, Ganho de Capital Não Realizado e Retorno Percentual.
      - **Card de Decomposição do Retorno**: Ganho Não Realizado + Proventos Recebidos + Ganho Realizado (de alienações anteriores) + Resultado Consolidado em R$ e Yield on Cost (YoC) acumulado.
      - **Abas Internas**:
        - `[Negociações]`: Lista cronológica filtrada apenas com as compras, vendas, posições iniciais e desdobramentos do papel, com data formatada PT-BR, quantidade, preço unitário e valor líquido.
        - `[Proventos]`: Extrato detalhado de dividendos, JCP e rendimentos pagos exclusivamente pelo ativo, com notas e valores em R$.
        - `[Metas & Info]`: Meta alocada vs alocação real, classe de ativos, instituição custodiante e anotações estratégicas do investidor.
    - **Navegação & Interatividade na Custódia (`PortfolioPositionsList.tsx`)**:
      - Tickers e nomes na tabela desktop e nos cards móveis transformados em botões interativos (`btn-open-details-${ticker}` e `btn-mobile-open-details-${ticker}`) com transição ao hover.
      - Opção `[🔍 Raio-X do Ativo]` integrada ao menu contextual de ações rápidas `[...]` em ambos os layouts (desktop e mobile).
    - **Integração no Dashboard Soberano (`PortfolioDashboardView.tsx`)**:
      - Gerenciamento reativo do estado `selectedPositionForDetails` com renderização condicional do drawer e transição suave para os modais de edição e lançamento.
  - **Validação & Testes**:
    - 8/8 testes aprovados em `AssetDetailsDrawer.test.tsx`.
    - 12/12 testes aprovados em `PortfolioPositionsList.test.tsx`.
    - 26/26 testes aprovados em `PortfolioDashboardView.test.tsx`.
    - **99/99 testes aprovados** (14/14 suítes) em todo o módulo de Carteira Soberana.
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 13s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada em 1.884s.
    - Zero impacto ou contaminação no Saldo Livre Real.

- **CARTEIRA SOBERANA: ETAPA 1 DO PLANO DIRETOR — GESTÃO OPERACIONAL DE CUSTÓDIA, ORDENAÇÃO DINÂMICA, MENU DE AÇÕES RÁPIDAS & STATUS B3** (implementado 2026-10-01):
  - **Objetivo**: Concluir a Etapa 1 do Plano Diretor de Evolução da Carteira Soberana, dotando o módulo de gestão direta e operacional por ativo em linha (Edição de Metas/Instituição, Registro Imediato de Lançamento por Ativo e Exclusão com Modal Defensivo), ordenação interativa de colunas (Ticker, Quantidade, Preço Médio, Cotação, Valor Total e Retorno), e monitor de horário oficial de pregão da B3 no cabeçalho executivo.
  - **Arquitetura & Fundamentos**:
    - **Menu de Ações Rápidas por Ativo (`PortfolioPositionsList.tsx`)**:
      - Menu flutuante contextual `[...]` em cada linha da tabela desktop e em cada card da lista mobile.
      - Ação `[Editar Ativo]`: abre instantaneamente o `AssetModal` com todos os campos do ativo pré-preenchidos (`initialAsset`), sincronizado via `useEffect` reativo.
      - Ação `[Novo Lançamento]`: abre o `MovementModal` com o ativo alvo já pré-selecionado (`defaultAssetId`), acelerando o registro contábil de compras, vendas e proventos.
      - Ação `[Excluir Ativo]`: abre o modal defensivo de segurança confirmando a intenção de remoção da custódia.
    - **Ordenação Interativa de Colunas de Custódia (`PortfolioPositionsList.tsx`)**:
      - Cabeçalhos clicáveis com ciclo de 3 estados (Ascendente `ArrowUp`, Descendente `ArrowDown` e Natural `ArrowUpDown`).
      - Ordenação completa por Código/Nome (`ticker`), Quantidade (`quantity`), Custo Médio Unitário (`avgCost`), Cotação Atual (`currentPrice`), Posição Financeira Total (`totalValue`) e Ganho/Perda Não Realizado (`unrealizedPnL`).
    - **Monitor de Pregão B3 em Tempo Real (`portfolioViewUtils.ts`, `PortfolioDashboardView.tsx`)**:
      - Função pura `getB3MarketStatus` avaliando horário oficial de Brasília (10:00 às 18:00, segunda a sexta-feira, com tratamento de feriados nacionais).
      - Badge dinâmico no cabeçalho executivo (`Pregão B3: Aberto` com indicador luminoso pulsante em verde esmeralda vs `Pregão B3: Fechado` em cinza ardósia e tooltip descritivo).
    - **Modal Defensivo de Confirmação de Exclusão (`PortfolioDashboardView.tsx`)**:
      - Diálogo acessível `role="dialog"` com backdrop blur.
      - Varredura auditável de movimentações vinculadas no livro-razão (`linkedMovementsCount`).
      - Aviso visual em caso de histórico financeiro associado ao ativo antes da exclusão definitiva.
  - **Validação & Testes**:
    - 35/35 testes aprovados em `PortfolioPositionsList.test.tsx` e `PortfolioDashboardView.test.tsx`.
    - 82/82 testes aprovados em toda a suíte do módulo de Carteira Soberana.
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 08s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada em 1.549s.
    - Zero impacto ou contaminação no Saldo Livre Real.

- **CARTEIRA SOBERANA: ETAPA 4 — RENDA FIXA AVANÇADA, APURAÇÃO FISCAL (IRPF & DARF 6015) & NEXUS COPILOT DE INVESTIMENTOS** (implementado 2026-10-01):
  - **Objetivo**: Concluir a Etapa 4 do Plano Diretor da Carteira Soberana, dotando o Finanças Pro Invest de matemática avançada para títulos de Renda Fixa (marcação na curva com convenção Anbima 252 dias úteis, tabela regressiva de IR de 22,5% a 15,0%, IOF regressivo dias 1-29 e isenções LCI/LCA/CRI/CRA), módulo completo e auditável de Apuração Fiscal (IRPF) para alienações em swing trade com segregação de perdas acumuladas (Ações vs FIIs), faixa de isenção de R$ 20.000/mês e emissão com cópia em 1 clique de DARF 6015, além do Copilot Estratégico Nexus com alertas sóbrios de concentração, dispersão de classe e oportunidade de caixa.
  - **Arquitetura & Fundamentos**:
    - **Motor de Matemática de Renda Fixa (`src/core/portfolio/fixedIncomeMath.ts`)**:
      - Suporte algorítmico integral a CDB, LCI, LCA, CRI, CRA, Debêntures e Tesouro Direto.
      - Alíquotas de IR regressivo em dias corridos: 22,5% (até 180d), 20% (181-360d), 17,5% (361-720d) e 15% (>720d).
      - IOF regressivo para resgates até 29 dias (96% no 1º dia a 3% no 29º dia).
      - Identificação automática de isenção tributária para pessoa física com badges dedicados no desktop e mobile (`Isento IR`).
      - Rentabilidade na curva via capitalização composta com convenção Anbima (252 dias úteis) para taxas prefixadas, percentuais de CDI e indexados à inflação (Equação de Fisher IPCA+).
    - **Motor de Apuração Fiscal de IRPF & DARF 6015 (`src/core/portfolio/taxEngine.ts`)**:
      - Rastreamento retroativo de todas as operações de alienação (`SELL`).
      - Isenção de R$ 20.000,00 mensais de volume bruto em Ações, BDRs e ETFs (lucro sob isenção contabilizado como isento).
      - Tributação de 15% sobre o lucro líquido caso as alienações de ações superem R$ 20.000/mês.
      - Tributação de 20% sobre qualquer ganho de capital em FIIs (sem isenção).
      - Segregação estrita de prejuízos compensáveis: perdas em ações abatem apenas lucros futuros de ações; perdas em FIIs abatem apenas lucros futuros de FIIs.
      - Emissão de metadados de DARF código 6015 com vencimento no último dia útil do mês subsequente e flag de exigibilidade (`isDarfPayable` para valores >= R$ 10,00).
    - **Modal de Apuração Fiscal (`PortfolioTaxModal.tsx`)**:
      - Cards de Lucro Isento Acumulado, Prejuízo a Compensar em Ações e Prejuízo a Compensar em FIIs.
      - Seletor cronológico de competências mensais.
      - Cartão em destaque para DARF 6015 com botão de cópia instantânea para a área de transferência.
      - Tabela discriminada de cada venda do mês com preço de venda, custo médio unitário e lucro/prejuízo líquido apurado.
    - **Copilot de Investimentos Nexus (`src/core/portfolio/nexusPortfolioAdvisor.ts`, `PortfolioNexusCard.tsx`)**:
      - Alertas de risco de concentração para ativos individuais que ultrapassam 25% da carteira.
      - Alertas de desbalanceamento para classes que desviam mais de 15 pontos percentuais da meta soberana.
      - Alerta de alocação de Caixa de Oportunidade ocioso superior a 10% do patrimônio.
      - Alerta educativo de proximidade ao limite de isenção de R$ 20k em vendas no mês corrente.
  - **Validação & Testes**:
    - 26/26 suítes Vitest aprovadas e **229/229 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 07s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada em 1.62s.
    - Zero impacto ou contaminação no Saldo Livre Real.

- **CARTEIRA SOBERANA: ETAPA 3 — MOTOR DE COTAÇÕES RESILIENTE, PAINEL DE PROVENTOS & MÉTRICAS INSTITUCIONAIS** (implementado 2026-10-01):
  - **Objetivo**: Concluir a Etapa 3 do Plano Diretor da Carteira Soberana, dotando o Finanças Pro Invest de cotações de mercado em tempo real via multi-fallback com contingência de cache offline, painel completo e auditável de proventos (dividendos, JCP, rendimentos e Yield on Cost) e métricas contábeis institucionais de padrão internacional (Modified Dietz e benchmark CDI).
  - **Arquitetura & Fundamentos**:
    - **Motor Resiliente de Cotações com Multi-Fallback (`src/services/portfolio/marketQuoteEngine.ts`)**:
      - Integração com AwesomeAPI (câmbio USD/EUR e criptomoedas BTC/ETH/SOL) e Brapi API (Ações B3 e FIIs), com contingência para Yahoo Finance (`.SA`).
      - Cache em `localStorage` (`fpi_portfolio_quotes_cache`) com TTL de 15 minutos e marcação de integridade `STALE` caso a rede falhe.
      - Botão de ação rápida `[🔄 Cotações]` no cabeçalho executivo da carteira (`PortfolioDashboardView.tsx`) com indicador de carregamento e timestamp.
    - **Painel Exclusivo de Proventos & Renda Passiva (`PortfolioDividendsPanel.tsx`)**:
      - 3ª aba de navegação dedicada (`[ 🪙 Proventos & Renda Passiva ]`).
      - 4 cards analíticos: Total em Proventos acumulado, Recebido no Ano Corrente, Média Mensal (12m) e Yield on Cost (YoC) Geral.
      - Gráfico de barras com histórico visual dos últimos 6 meses.
      - Tabela de Yield on Cost por Ativo Pagador (`Proventos / Custo Médio * 100`).
      - Histórico cronológico detalhado com filtro dinâmico por ticker e badges para `Dividendo` e `JCP / Juros`.
    - **Métricas Institucionais de Performance Contábil (`usePortfolio.ts`, `PortfolioSummaryCard.tsx`)**:
      - Fórmulas contábeis de `portfolioMath.ts` integradas no resumo: Modified Dietz ponderado no tempo com comparação percentual ao CDI (ex: `288% CDI`), Ganho Orgânico Mensal em R$ e Aportes Líquidos Externos no Mês em R$.
      - Isolamento contábil estrito: desconsidera fluxos internos provindos de `PORTFOLIO_CASH` no cálculo da taxa externa de influxo.
  - **Validação & Testes**:
    - 21/21 suítes Vitest aprovadas e **196/196 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade mantida.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 10s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada em 2.10s.
    - Zero impacto ou contaminação no Saldo Livre Real.

- **CARTEIRA SOBERANA: ETAPA 2 — CATÁLOGO B3, AUTOCOMPLETE INTELIGENTE, FILTROS DE CUSTÓDIA E LIVRO RAZÃO** (implementado 2026-10-01):
  - **Objetivo**: Concluir a Etapa 2 do Plano Diretor da Carteira Soberana, elevando a experiência do usuário ao nível das principais plataformas de mercado (Gorila, Kinvo, Status Invest) mediante busca automática de tickers com autocompleção, campo e chips de corretoras custodiantes, filtros dinâmicos com modos de visão (por classe e por corretora) na custódia e paginação leve no livro-razão contábil.
  - **Arquitetura & Fundamentos**:
    - **Catálogo Curado em Memória & Autocomplete (`src/core/portfolio/tickerCatalog.ts`, `AssetModal.tsx`)**:
      - Catálogo com mais de 250 ativos líderes: Ações B3 (Ibovespa/Small Caps líquidas), FIIs (IFIX), BDRs, ETFs, ativos diretos no exterior (NYSE/Nasdaq), Criptomoedas e títulos de Renda Fixa/Caixa.
      - Função pura `searchTickerCatalog` com indexação por ticker exato, prefixo e razão social.
      - Dropdown flutuante acessível no campo `Código / Ticker` do modal com navegação completa por teclado e clique defensivo.
      - Preenchimento em cascata de Razão Social, Mercado, Moeda, Categoria sugerida e flag de saldo puro.
    - **Campo de Corretora / Instituição Custodiante (`portfolioTypes.ts`, `portfolioMath.ts`, `usePortfolio.ts`, `AssetModal.tsx`, `PortfolioPositionsList.tsx`)**:
      - Adicionado `institution?: string;` em `PortfolioAsset` e `DerivedAssetPosition`.
      - Chips rápidos no modal (`XP`, `BTG Pactual`, `Inter`, `Nubank`, `Avenue`, `Binance`) e campo de texto aberto.
      - Propagação estrita no replay contábil (`replayAssetLedger`) e exibição de badges na tabela desktop e cards mobile.
    - **Filtros e Modos de Visão na Custódia (`PortfolioPositionsList.tsx`)**:
      - Busca instantânea por ticker, nome ou corretora.
      - Pílulas dinâmicas de categoria com contagem de ativos.
      - Seletor de visão segmentado: `[Lista]`, `[Por Classe]` e `[Por Corretora]` com subtotais financeiros calculados em R$.
    - **Filtros Avançados e Paginação no Livro Razão (`PortfolioMovementsList.tsx`)**:
      - Pílulas por tipo de movimentação (`Compras`, `Vendas`, `Proventos`, `Posição Inicial`, `Outros`).
      - Paginação leve em lotes de 15 lançamentos para rolagem a 60fps.
      - Alternador para exibir ou ocultar lançamentos estornados/anulados.
  - **Validação & Testes**:
    - 18/18 suítes Vitest aprovadas e **178/178 testes aprovados** (100%).
    - `npm run check:tokens`: 100% de conformidade.
    - `npm run build`: Compilação de produção com 100% de sucesso em 1m 16s.
    - `npx cap sync android`: Sincronização nativa do Capacitor executada em 1.67s.
    - Isolamento contábil e zero impacto no Saldo Livre Real.

- **CARTEIRA SOBERANA: ETAPA 1 — ESTABILIZAÇÃO CRÍTICA DE RUNTIME E NAVEGAÇÃO** (implementado 2026-10-01):
  - **Objetivo**: Corrigir bugs críticos de runtime e compilação nos modais da Carteira Soberana e integrar o módulo à navegação móvel e ao canvas executivo de alto contraste.
  - **Arquitetura & Fundamentos**:
    - Correção de escopo em `MovementModal.tsx` (`netAmountBRL`, `now`, `cashAssets`, `availableCash`) via `useMemo` reativo.
    - Tipagem formal de `currency` em `RebalanceSimulatorModal.tsx` e contratos em `usePortfolio.ts`.
    - Inclusão em `MobileBottomNav.tsx` (`menuTools`) e `PageShell.tsx` (`CANVAS_TOOLS`, `LIGHT_BG_TOOLS`).
  - **Validação & Testes**:
    - 15/15 suítes aprovadas e 157/157 testes com 100% de sucesso.
    - Build de produção e sincronização nativa aprovados.

- **ELEVACÃO DO CONTRASTE DE FUNDO DA FOLHA DE OFÍCIO NA AGENDA FINANCEIRA** (implementado 2026-09-28):
  - **Objetivo**: Corrigir a falta de contraste entre a camada ao fundo da tela e a folha de pauta da Agenda Financeira (`AgendaHub`), eliminando a confusão visual causada pelo fundo excessivamente claro (`bg-slate-50` / `#f8fafc`) que se fundia com a folha branca de ofício (`bg-white` / `#ffffff`).
  - **Arquitetura & Fundamentos**:
    - **Inclusão Soberana em `CANVAS_TOOLS` (`src/layouts/PageShell.tsx`)**:
      - A ferramenta `'agenda'` foi integrada ao conjunto `CANVAS_TOOLS`, passando a aplicar a cor de canvas canônica do ecossistema (`bg-surface-canvas` / `#dbe3ed` em Light Mode e `dark:bg-slate-950` em Dark Mode).
      - O tom `#dbe3ed` (88% de brilho com matiz ardósia-azulado) estabelece um plano de fundo nítido que remete a uma mesa executiva e harmoniza com as pautas em azul safira da folha, destacando o papel branco imediatamente aos olhos.
    - **Camada Protetora & Elevação Física da Folha (`src/components/AgendaHub.tsx`)**:
      - O container da Agenda recebeu `bg-surface-canvas dark:bg-slate-950 min-h-full` explícito, protegendo a renderização mesmo fora de PageShell.
      - A folha do caderno (`ref={notebookRef}`) e os painéis de apoio (`AgendaSearchPanel`, `AgendaWeekGrid`, `AgendaUpcomingList`, `AgendaSyncedBillsPanel`) foram elevados com `shadow-card dark:shadow-none` e borda delimitadora `border-slate-200/90 dark:border-slate-800`, conferindo profundidade física e acabamento editorial.
      - O cabeçalho fixo da Agenda (`data-testid="agenda-header"`) recebeu borda inferior nítida `border-slate-200 dark:border-slate-800 shadow-xs`.
  - **Validação & Testes**:
    - 91/91 testes aprovados nas 4 suítes da Agenda (`AgendaHub.test.tsx`, `AgendaHub.search.test.tsx`, `AgendaHub.week.test.tsx`, `AgendaSyncedBillsPanel.test.tsx`).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: compilado com 100% de sucesso (`dist/`).
    - `npx cap sync android`: ativos web sincronizados com a camada nativa do Android em 2.52s.

- **MODAL SELETOR DE MÊS PARA SINCRONIZAÇÃO DE CONTAS NA AGENDA FINANCEIRA** (implementado 2026-09-28):
  - **Objetivo**: Ao clicar no botão `[🔄 Sincronizar]` da Agenda Financeira, apresentar ao usuário uma caixa de diálogo clara e pedagógica (`AgendaSyncBillsModal`) informando sobre qual mês as contas serão importadas e concedendo a liberdade de escolher qualquer mês (mês atual, próximo mês ou navegação livre ano/mês), evitando confusões onde o usuário sincroniza achando que abrange meses futuros.
  - **Arquitetura & Fundamentos**:
    - **Modal de Escolha de Mês (`AgendaSyncBillsModal.tsx`)**:
      - Diálogo acessível com backdrop blur, role dialog, suporte a clique fora e botão fechar `[X]`.
      - Seletor de mês com setas `<` e `>` para navegar livremente entre qualquer mês e ano.
      - Atalhos rápidos com chips de 1 clique: `[📅 Mês Atual]` e `[➡️ Próximo Mês]`.
      - Resumo de impacto em tempo real: quantidade de contas fixas ativas no Controla e quantas já estão sincronizadas no mês em análise.
      - Alerta visual explicativo informando que os compromissos existentes não serão duplicados e serão agendados em seus dias exatos de vencimento.
      - Botão de confirmação dinâmico `[Sincronizar [Mês]]` com feedback de loading (`isSyncing`) e desabilitação preventiva caso não haja contas cadastradas.
      - Suporte integral a Tema Claro e Escuro (WCAG AA/AAA).
    - **Evolução da Operação de Sincronização (`useAgendaOperations.ts`)**:
      - `handleSyncBills(targetYear?: number, targetMonth?: number)` parametrizado para aceitar o ano e mês alvo escolhidos pelo usuário.
      - Mensagens de feedback contextualizadas (ex.: *"2 contas sincronizadas em Outubro de 2026!"* ou *"Todas as contas de Outubro de 2026 já estão sincronizadas na Agenda."*).
      - Carregamento sob demanda do mês sincronizado e atualização otimista do cache.
    - **Integração no Shell da Agenda (`AgendaHub.tsx`)**:
      - O clique em `[🔄 Sincronizar]` (tanto no cabeçalho quanto no painel de contas sincronizadas) abre o modal `AgendaSyncBillsModal`.
      - Ao confirmar a sincronização, o modal é fechado, a importação no Firestore é executada, o caderno da Agenda navega automaticamente para o mês sincronizado se for diferente do mês em exibição, e o painel de Contas Sincronizadas (`AgendaSyncedBillsPanel`) se abre para visualização imediata.
  - **Validação & Testes**:
    - 5/5 testes unitários aprovados em `AgendaSyncBillsModal.test.tsx`.
    - 76/76 testes aprovados em `AgendaHub.test.tsx`.
    - 140/140 testes aprovados na suíte combinada da Agenda.
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: compilado com 100% de sucesso (`dist/`).
    - `npx cap sync android`: ativos web sincronizados com a camada nativa do Android em 1.78s.

- **CORREÇÃO DA ATUALIZAÇÃO DO MÊS NO CABEÇALHO AO ROLAR O CADERNO DA AGENDA (INFINITE SCROLL)** (implementado 2026-09-28):
  - **Objetivo**: Corrigir a falha em que o rótulo do mês entre as setas `< [MÊS ANO] >` no cabeçalho fixo da Agenda permanecia travado no mês inicial (ex.: Setembro 2026) mesmo quando o usuário rolava a página para baixo com a rodinha do mouse ou touch e os dias de Outubro e Novembro entravam na visualização.
  - **Causa Raiz Identificada**:
    - `resolveScrollContainer` (`src/agenda/scrollContainer.ts`) exigia `(ov === 'auto' || ov === 'scroll') && cur.scrollHeight > cur.clientHeight`. Durante a renderização inicial e hidratação assíncrona, a altura do `<main>` não excedia o viewport (`scrollHeight <= clientHeight`), fazendo a função rejeitar o container real `<main className="overflow-y-auto">` e devolver `window`.
    - Como o `window` possui `overflow: hidden` no layout do app, os eventos de scroll disparados pelo `<main>` não borbulhavam (`scroll` events não sofrem bubbling no DOM), de modo que o listener associado ao `window` nunca era invocado, silenciando o `onScroll`, a sonda `probe` e o callback `onActiveMonthChange`.
    - Adicionalmente, `pickActiveMonth` (`src/agenda/activeMonth.ts`) retornava `null` estrito no vão de 28px do divisor entre meses (`renderDivider`), criando zonas cegas de transição.
  - **Implementações Alcançadas**:
    - **Resolução Confiável do Container de Scroll (`scrollContainer.ts`)**: Removida a trava frágil de `scrollHeight > clientHeight`, garantindo que qualquer elemento pai explicitamente configurado com `overflow-y: auto/scroll` (como o `<main>`) seja imediatamente reconhecido como o container de rolagem oficial.
    - **Captura Universal e Recuperação Dinâmica (`useInfiniteMonthScroll.ts`)**: Adicionado listener de scroll com `{ capture: true }` no `window` como fallback à prova de falhas (captura qualquer evento de scroll antes da fase de target, mesmo sem bubbling) e sincronização dinâmica de `scrollContainerRef.current` se o target do evento for um container de rolagem.
    - **Continuidade sem Zonas Mortas (`activeMonth.ts`)**: `pickActiveMonth` aprimorado para cobrir o vão de transição do divisor entre meses, selecionando o mês entrante de forma suave.
  - **Validação & Testes**:
    - Novo teste unitário adicionado em `useInfiniteMonthScroll.test.tsx` comprovando a detecção e atualização do mês ativo quando o scroll parte de um elemento pai com `overflow-y: auto` (`<main>`).
    - 26/26 testes aprovados em `useInfiniteMonthScroll.test.tsx`.
    - 8/8 testes aprovados em `scrollContainer.test.ts`.
    - 76/76 testes aprovados em `AgendaHub.test.tsx` (totalizando 101/101 testes na suíte global da Agenda).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: compilado com 100% de sucesso (`dist/`).
    - `npx cap sync android`: ativos web sincronizados com a camada nativa do Android em 2.91s.

- **PAINEL EXCLUSIVO DE CONTAS SINCRONIZADAS NA AGENDA FINANCEIRA & FLUXO AUTOMÁTICO DE SINCRONIZAÇÃO** (implementado 2026-09-28):
  - **Objetivo**: Permitir que, ao clicar no botão "Sincronizar" da Agenda Financeira ou no novo seletor executivo `[Contas]`, abra uma visualização dedicada e exclusiva das contas fixas e recorrentes importadas do Controla, com métricas consolidadas (Total, Quitadas, Pendentes), filtros de status (Todas, Pendentes, Pagas), marcação rápida de liquidação e navegação direta para o dia correspondente no caderno principal.
  - **Arquitetura & Fundamentos**:
    - **Metadados Enriquecidos na Importação (`agendaService.ts`, `agendaSyncQueue.ts`)**:
      - `AgendaCommitment` e `AgendaCommitmentInput` estendidos com `source?: 'controla_bill' | 'manual' | 'nexus'`, `linkedBillId?: string`, `amount?: number` e `category?: string`.
      - Funções puras exportadas: `isSyncedBill(c: AgendaCommitment): boolean` (retrocompatível com anotações textuais legadas e prefixo `"Pagar "`) e `extractBillAmount(c: AgendaCommitment): number` (lê de `amount` estruturado ou faz parsing seguro de `notes`).
      - Fila de sincronização offline (`agendaSyncQueue.ts`) atualizada para preservar e transmitir esses campos ao Firestore quando a conexão for restabelecida.
    - **Painel Executivo Exclusivo (`AgendaSyncedBillsPanel.tsx`)**:
      - Banner consolidado com total do mês selecionado, somatório de quitadas e saldo pendente em R$.
      - Filtros de status em abas com badges: Todas, Pendentes e Pagas.
      - Cards individuais com checkbox interativo de liquidação (atualiza no Firestore e na agenda local), data de vencimento, badge de categoria, indicador de status e botão `[Ver]` para focar o compromisso no calendário.
      - Alerta proativo caso existam contas cadastradas no Controla ainda não sincronizadas no mês corrente, com botão de importação imediata em 1 clique.
      - Estado vazio acolhedor com CTA para sincronizar caso nenhuma conta tenha sido importada.
      - Suporte integral a Tema Claro e Escuro (WCAG AA/AAA).
    - **Integração no Shell da Agenda (`AgendaHub.tsx`)**:
      - Botão `[Contas]` no cabeçalho com badge numérico em tempo real (`activeMonthSyncedCount`) indicando quantas contas sincronizadas existem no mês ativo.
      - Ação de clique no botão `[🔄 Sincronizar]` vinculada a `handleSyncBillsAndOpen`: dispara a sincronização silenciosa inteligente (não duplicando compromissos já existentes) e abre instantaneamente o painel de contas sincronizadas.
      - Transição fluida: clicar em `[Ver]` no card da conta fecha o painel e faz scroll suave com destaque luminoso temporário no dia correspondente do caderno principal da Agenda.
  - **Validação & Testes**:
    - 17/17 testes aprovados em `agendaService.test.ts`.
    - 8/8 testes aprovados em `AgendaSyncedBillsPanel.test.tsx`.
    - 76/76 testes aprovados em `AgendaHub.test.tsx` (totalizando 101/101 testes na suíte específica).
    - `npm run check:tokens`: 100% de conformidade com os tokens de design.
    - `npm run build`: compilado com 100% de sucesso (`dist/`).
    - `npx cap sync android`: ativos web sincronizados com a camada nativa do Android em 2.45s.

- **SISTEMA DE TEMA CLARO/ESCURO COM COBERTURA INTEGRAL (FASES 1 A 6)** (implementado 2026-09-27):
  - **Objetivo**: Implementar o sistema soberano de alternância de tema Claro / Escuro / Sistema em todo o ecossistema Finanças Pro Invest, cobrindo 100% dos 44 itens da Matriz de Cobertura Integral segundo `plano_tema_claro_escuro.md`, mantendo estrito rigor WCAG AA/AAA (contraste ≥ 4.5:1 para textos e ≥ 3.0:1 para elementos de UI), persistência local com fallback nativo, e zero alteração no core contábil ou schema do Firestore.
  - **Arquitetura & Fundamentos**:
    - **Precedência de Dispositivo Soberano (Device-First)**: Persistência puramente local via chave `fpi_theme` no `localStorage` com espelhamento assíncrono defensivo no `@capacitor/preferences` para mitigar purgas de WebStorage no Android. Zero campos adicionados ao Firestore e zero alteração no `UserMeta`.
    - **Inicialização Sem FOWC (0ms de tela branca)**: Script síncrono inline no `<head>` do `index.html` avalia a preferência salva e o `prefers-color-scheme`, aplicando `class="dark"` antes da hidratação do React.
    - **Preservação Soberana dos Tokens**: `src/theme/tokens.ts` e `scripts/validate-tokens.mjs` mantidos 100% intactos com seus valores literais hexadecimais; todos os componentes consumidores receberam classes Tailwind explícitas com a variante `dark:`.
  - **Entregas Realizadas por Fase**:
    - **Fase 1 (Fundação & ThemeContext)**: Criação de `src/contexts/ThemeContext.tsx`, hook `useTheme()`, script inline no `index.html`, `darkMode: 'class'` no `tailwind.config.js`, regras base de scrollbar e tipografia no `src/index.css`, e 18/18 testes unitários aprovados em `ThemeContext.test.tsx`.
    - **Fase 2 (Shell Global, Navegação, Bloqueios & Segurança)**: Botão de tema no `AppHeader.tsx` (visível para logados e deslogados), seletor triplo (Claro / Escuro / Sistema) no `SettingsSecuritySection.tsx`, atalho no `AppMobileDrawer.tsx`, e adaptação de `AppDesktopNav.tsx`, `MobileBottomNav.tsx`, `PageShell.tsx`, `SecurityLock.tsx` (teclado PIN), `DownloadQrModal.tsx` (moldura de QR Code para escaneamento), `NotificationHub.tsx`, `ActiveAlarmModal.tsx`, `MobileAppGate.tsx`, `FeatureGate.tsx`, `PaywallModal.tsx` e `SettingsDangerZone.tsx`.
    - **Fase 3 (Core Financeiro, Lançamentos & Calendário)**: `ControlaPage.tsx`, `Dashboard.tsx`, `BalanceCards.tsx`, `PendingObligations.tsx`, `TransactionList.tsx`, `SaldoAjustavelCard.tsx`, `CategorySummaryPanel.tsx`, `AveragesAnalysisPanel.tsx`, `DashboardCharts.tsx`, `FutureExpenseForm.tsx`, `MonthlyExpenseCalendar.tsx` (dias com `dark:bg-slate-900` e saídas em `dark:text-red-400`), `DayExpensesModal.tsx`, `ContentModal.tsx`, `TransactionForm.tsx`, `BudgetSetupSheet.tsx`, `BudgetStatusCard.tsx`, `CardManager.tsx`, `CardFormModal.tsx`, `InvoiceDetailsModal.tsx`, `RecurringBillManager.tsx` e `RecurringIntroModal.tsx`.
    - **Fase 4 (Camada Evolution, Carteira Soberana, Dívidas & Nexus)**: `AppCockpit.tsx`, `CockpitHero.tsx`, `CockpitInventory.tsx`, `SovereignMapCard.tsx`, `JornadaMetrics.tsx`, `CommandRitual.tsx`, `UrgentBillsSheet.tsx`, `DebtVictoryBanner.tsx`, `CockpitAnalytics.tsx` (paleta reativa do `useTheme()` em gráficos SVG e Recharts), `SovereignBuckets.tsx`, `MarginTrajectoryPanel.tsx` e `BucketDetailDrawer.tsx` (prop `variant` conectada ao `useTheme()`), `PortfolioPage.tsx` (e os 8 modais de custódia/alocação), `ActiveWealthManager.tsx`, `PassiveWealthManager.tsx`, `DebtManager.tsx` (e sub-componentes), `GoalManager.tsx`, `AiAdvisor.tsx`, `CommandCalibration.tsx` (classes órfãs higienizadas) e `OnboardingOverlay.tsx`.
    - **Fase 5 (Discovery, Cursos, Calculadoras, Telas Públicas & Admin)**:
      - *Calculadoras de Decisão (7 ferramentas)*: FIRE, Juros Compostos, Inflação, Alugar vs Financiar, Dívidas, Dividendos e À Vista vs Parcelado.
      - *Agenda Financeira*: `AgendaHub.tsx`, `AgendaUpcomingList.tsx`, `AgendaWeekGrid.tsx`, `AgendaSearchPanel.tsx`, `AgendaDayRow.tsx`, `AgendaNexusAssistant.tsx`, `AgendaAlarmModal.tsx`, `AgendaCalendarModal.tsx`, `AgendaDeleteModal.tsx` e `AgendaShortcutModal.tsx`.
      - *Formação & Cursos*: `CourseRoutesShell.tsx` (com seletor de tema na barra superior), `CourseTrackPage.tsx`, `ModuleOverviewPage.tsx`, `LessonPage.tsx`, `QuizBlock.tsx` e todos os 7 blocos didáticos (`ToolCTA`, `CaseStudyBlock`, `PrincipleBlock`, `ChecklistBlock`, `AnalogyBox`, `ActionBlock`, `BulletsBlock`).
      - *Páginas Públicas, Auth & Billing*: `PublicHome.tsx`, `MobilePublicHome.tsx`, componentes de suporte da Home (`HomeHero`, `HomeFooter`, `HomeCursos`, `HomeEcossistema`, `HomeJornada`, `HomeConteudo`, `HomeSecoesSuporte`, `HomeTerminalMercado`, `HomeSubComponents`, `HomeModals`, `MarkdownViewer`, `MarketComponents`), `AuthLogin.tsx`, `AuthRegister.tsx`, `TermsPage.tsx`, `PrivacyPage.tsx`, `DownloadPage.tsx`, `Articles/InvestmentArticle2026.tsx`, `PricingPage.tsx`, `AsaasPixCheckoutModal.tsx`, `PixReceiptCheckoutModal.tsx` (QR Code sobre fundo branco óptico protegido).
      - *Modais Administrativos*: `AdminUsersModal.tsx`, `PixAuditQueueModal.tsx` e `DocumentViewerModal.tsx`.
      - *Isolamento de Impressão / PDF*: `DebtPlanSimulator.tsx` (forçado a renderizar com fundo branco e texto preto na exportação do PDF).
    - **Fase 6 (Auditoria, Validação de Tokens & Homologação)**:
      - `node scripts/validate-tokens.mjs` / `npm run check:tokens`: 100% de sucesso sem qualquer discrepância.
      - Suíte completa de testes aprovada (ThemeContext, UI Shell, Billing, Courses, Core Finance, Cockpit, Agenda, Portfolio, Decision Tools).
      - Varredura estática de classes órfãs executada com sucesso.
      - Build de produção (`npm run build`) compilado com 100% de sucesso em 1m 17s (`dist/`).
      - Sincronização nativa do Capacitor (`npx cap sync android`) finalizada com 100% de sucesso em 2.89s.
  - **Validação & Testes**:
    - Mais de 200 testes automatizados validados sem nenhuma regressão.
    - Zero erros de compilação ou empacotamento.
    - APK Android Release mantido 100% intacto.

- **CALENDÁRIO MENSAL DE DESPESAS COM GASTOS DIÁRIOS & DETALHAMENTO** (implementado 2026-09-25):
  - **Objetivo**: Implementar visão de calendário mensal exibindo os gastos diários de qualquer mês em uma grade clássica (Dom a Sáb), com navegação de meses (setas `<` e `>`), rigor contábil (apenas saídas, excluindo duplicidades de quitação de fatura) e abertura da lista detalhada ao clicar em um dia específico, com o valor total logo abaixo.
  - **Implementações Alcançadas**:
    - **Funções Puras de Calendário (`expenseCalendarUtils.ts`)**:
      - `getCalendarGridDays`: gera a grade de 35 ou 42 dias alinhada no Domingo, com tratamento para anos bissextos e preenchimento de meses adjacentes.
      - `computeDailyExpenseMap`: agrupa transações por data `YYYY-MM-DD`, computa estritamente saídas (`t.type === 'expense'`), exclui lançamentos virtuais (`!t.isVirtual`) e descarta quitações de fatura de cartão (`!isCreditCardPaymentTransaction(t)`), mantendo compras no crédito na data da compra.
      - `formatDayExpenseAmount`: formatação BRL com suporte ao *Modo Privacidade* (`••••••`) e modo compacto para telas móveis.
    - **Gaveta/Modal de Detalhamento do Dia (`DayExpensesModal.tsx`)**:
      - Experiência híbrida responsiva: Bottom Sheet no mobile (< 768px) com barra de arraste e safe-area padding; modal centralizado no desktop (>= 768px).
      - Lista de transações do dia com categoria, descrição, badge de meio de pagamento (Crédito, Vale, À vista/Débito) e atalho para edição.
      - Rodapé com valor total do dia destacado em caixa executiva de alto contraste (`bg-slate-950 text-white font-black`, 20.5:1 WCAG AAA).
    - **Grade do Calendário Mensal & Alto Contraste WCAG AAA (`MonthlyExpenseCalendar.tsx`)**:
      - Header superior com setas `<` e `>` em botões brancos com borda dupla (`border-2 border-slate-300`), rótulo do mês em preto sólido (`text-slate-950 font-black text-xl`) e botão de salto rápido `[Hoje]` em `bg-slate-900 text-white`.
      - Resumo consolidado de saídas do mês em card branco com borda dupla e valor em carmim profundo `text-red-700 font-black` (7.1:1 AAA).
      - Cabeçalho de dias da semana em fita destacada `bg-slate-100 border border-slate-200` com `text-slate-900` para dias úteis (16:1 AAA) e `text-red-700` para fins de semana.
      - Grade com 7 colunas (DOM a SÁB) e quadradinhos dos dias com bordas nítidas `border-2 border-rose-300` e valor das saídas em carmim `text-red-700 font-black`, eliminando qualquer desbotamento.
    - **Integração em Controla (`Dashboard.tsx`)**:
      - Seletor executivo em formato de pílula na seção de Lançamentos: `[ 📋 Lista ]` / `[ 📅 Calendário de Gastos ]` com contraste máximo (`bg-slate-100 border-2 border-slate-300`, ativo em `bg-slate-900 text-white`).
      - Persistência da preferência do usuário em `localStorage` (`fpi_controla_view_type`).
  - **Validação & Testes**:
    - 23/23 testes aprovados nas suítes `expenseCalendarUtils.test.ts`, `MonthlyExpenseCalendar.test.tsx` e `dashboardService.test.ts`.
    - Build de produção compilado com 100% de sucesso (`npm run build`).
    - APK Android Release mantido 100% intacto.

- **CORREÇÃO ERGONÔMICA DO CABEÇALHO DA AGENDA EM DISPOSITIVOS MÓVEIS** (implementado 2026-09-24):
  - **Objetivo**: Corrigir a sobreposição de botões e ícones no cabeçalho sticky da Agenda Financeira (`AgendaHub.tsx`) em telas mobile (< 768px), eliminando a colisão entre ações de utilidade (`Nexus`, `Sincronizar`, `Atalho`) e visões temporais (`HOJE`, `Próximos`, `Semana`, `Pesquisar`).
  - **Diagnóstico da Falha**:
    - Em versões anteriores, 5 botões de ação estavam agrupados no mesmo container de topo à direita em grade estática `grid-cols-2`, forçando botões com largura total superior a 285px em um espaço restrito de ~180px, gerando sobreposição física entre `[HOJE]` e `[🔄 Sincronizar]`.
  - **Implementações Alcançadas**:
    - **Grade e Distribuição Fluida Responsiva (`AgendaHub.tsx`)**:
      - Em mobile (< 768px), estruturação em grade `grid-cols-[1fr_auto]`:
        - *Linha 1 (Superior, col-span-2)*: Título da Agenda + Badges de conectividade (Offline/Sync) à esquerda; utilitários rápidos (`✨ Nexus`, `🔄 Sincronizar`, `📱 Atalho`) alinhados à direita com `justify-between`.
        - *Linha 2 (Inferior)*: Navegador mensal soberano (`< [MÊS ANO] > [📅]`) em coluna flexível (`1fr`) à esquerda; conjunto de visões e filtros (`[HOJE]`, `[Próximos]`, `[Semana]`, `[Pesquisar]`) na coluna automática (`auto`) à direita.
      - Em desktop (>= 768px), preservada a grade original de 3 colunas `md:grid-cols-[1fr_auto_1fr]` com altura de 56px (`h-14`) e alinhamento centralizado do seletor de mês.
      - Alinhamento de contrastes no botão `Próximos`: fundo neutro com borda suave quando inativo e azul sólido quando ativo, diferenciando visualmente do botão de disparo rápido `[HOJE]`.
  - **Validação & Testes**:
    - 74/74 testes aprovados na suíte `AgendaHub.test.tsx` e 516/516 testes aprovados em toda a suíte de Agenda e Alarmes.
    - Build web compilado com 100% de sucesso (`npm run build`).
    - Sincronização Capacitor (`npx cap sync android`) e compilação do APK Debug Android (`.\gradlew.bat assembleDebug`) executadas com sucesso.
    - APK instalado e atualizado via ADB no aparelho físico conectado (`motorola moto g86 5G`).

- **DEDUPLICAÇÃO DE FATURA DE CARTÃO NO ORÇAMENTO DO MÊS & RIGOR CONTÁBIL** (implementado 2026-09-24):
  - **Objetivo**: Eliminar qualquer possibilidade de dupla contagem contábil entre compras realizadas com cartão de crédito (já alocadas em categorias de consumo como Alimentação, Transporte, Farmácia) e a quitação da Fatura do Cartão no módulo de Orçamento do Mês (Controla/Dashboard).
  - **Fundamento Contábil**: Pelo princípio da competência (*accrual basis*), o consumo ocorre no instante da compra no cartão; a fatura do cartão é uma liquidação financeira de passivo/dívida de curto prazo (saída de caixa), não uma despesa de consumo. A fatura a vencer é deduzida na Equação Soberana de Folga Segura (`Folga = Renda - Poupança - Contas Fixas - Faturas`), nunca como categoria de consumo duplicada.
  - **Implementações Alcançadas**:
    - **Funções Puras de Detecção Cirúrgica (`budgetUtils.ts`)**:
      - `isCreditCardInvoiceCategory`: identifica categorias do sistema e variações de fatura de cartão (`"Fatura - Cartão ..."`, `"fatura de cartão"`, `"fatura do cartão"`, `"pagamento de fatura"`, `"cartão de crédito"` ou vinculadas aos cartões do usuário), preservando estritamente contas de concessionárias e utilidades (*"Fatura de Internet"*, *"Fatura de Energia"*, *"Fatura de Água"*, *"Fatura do Celular"*).
      - `isCreditCardPaymentTransaction`: identifica transações com flags técnicas (`linkedCardId`, `linkedInvoiceId`, `linkedInvoicePeriodEnd`), por categoria ou por termos inequívocos na descrição (`"Pagamento Fatura ..."`). Preserva compras no crédito (`paymentMethod: 'credit'`) e quitações de contas fixas (`linkedRecurringBillId`).
    - **Higienização do Seletor e Pedagogia Soberana (`BudgetSetupSheet.tsx`)**:
      - Ocultação automática de categorias de fatura de cartão da lista de opções a orçar (`expenseCategoryNames`).
      - Sanitização ativa na hidratação de orçamentos legados e ao clonar mês anterior, expurgando limites de fatura salvos no passado e transferindo o valor para a Folga Segura.
      - Card educativo sutil de *Autoridade Silenciosa* antes da lista de categorias, esclarecendo que as compras já são controladas por categoria e o valor da fatura a pagar já está protegido na Folga Segura de caixa.
    - **Blindagem Matemática do Motor (`budgetMath.ts`)**:
      - `calcBudgetProgress`: substituição de filtro genérico por `!isCreditCardPaymentTransaction(t)`.
      - Compras no crédito pontuam normalmente em seus tetos de consumo. Pagamentos de fatura de cartão (automáticos ou avulsos) são rigorosamente ignorados no orçamento e não vazam para a linha de gastos não orçados (*Naked Truth*).
  - **Validação & Testes**:
    - 55/55 testes aprovados em 6 suítes (`budgetMath.test.ts`, `useBudget.test.tsx`, `BudgetWorkflow.test.tsx`, `nexusInsightEngine.test.ts`, `useDashboardState.test.tsx`, `CentralRecommendationsAndPriorities.test.tsx`).
    - Build de produção (`npm run build`) compilado com 100% de sucesso em 1m 9s (`dist/`).
    - APK Android Release mantido 100% intacto.

- **ORÇAMENTO DO MÊS — REESTRUTURAÇÃO COMPLETA, PERSISTÊNCIA RESILIENTE & INTEGRAÇÃO SOBERANA** (implementado 2026-09-24):
  - **Objetivo**: Corrigir bugs estruturais críticos na funcionalidade de Orçamento Mensal (amnésia de sessão após F5, escala quebrada do semáforo, sobrescrita acidental de limites na edição), blindar o rigor contábil (excluindo lançamentos virtuais e pagamentos técnicos de faturas), viabilizar o ciclo de vida (clonagem e exclusão) e integrar os dados ao Nexus Advisor e à equação soberana de caixa.
  - **Diagnóstico das Falhas Solucionadas**:
    - `useBudget.ts`: `queryFn` apenas consultava o cache volátil do React Query e nunca buscava do Firestore, perdendo o orçamento salvo a cada reload ou F5.
    - `budgetMath.ts`: `percentage >= alertThreshold` comparava percentual (0 a 100) contra decimal (`0.8`), fazendo qualquer categoria com 1% gasto virar Amarela.
    - `BudgetSetupSheet.tsx`: não recebia `currentBudget`, resetando limites e poupança para zero em cada edição. Usava `<input type="number">` cru, suscetível a erros de vírgula em teclados móveis BR.
    - Modo Demo/Sandbox: tentava gravar no Firestore sem autenticação, causando erro 403 (`permission-denied`).
    - Nexus Advisor: `budgetProgress` nunca era injetado no `buildUserContext` no runtime do Cockpit.
  - **Resultados e Implementações Alcançadas**:
    - **Hidratação e Cache Resiliente (`useBudget.ts`, `budgetService.ts`)**:
      - `useBudget` paramétrico (`userId?: string, targetMonthKey?: string`), sincronizado com o mês ativo navegado no Dashboard (`currentDate`).
      - Hidratação imediata (0ms) via `localStorage` (`fpi_budget_${userId}_${budgetId}`).
      - Operação 100% isolada em `sessionStorage` para `DEMO_USER_ID`, com dataset padrão de orçamento demonstrativo (`demoDataset.ts`).
      - Adicionada função `deleteBudget` no Firestore e mutação otimista no hook.
    - **Semáforo Matemático & Rigor Contábil (`budgetMath.ts`)**:
      - Correção da escala de alerta: `alertThreshold` avaliado corretamente (80%), com verde de 0% a 79.9%, amarelo de 80% a 95%, e vermelho > 95%.
      - Filtro de caixa real: desconsidera lançamentos virtuais (`isVirtual`) e quitações de fatura (`isBillPayment`).
      - Separação entre categorias orçadas e linha de *Naked Truth* (`unbudgetedSpent`), exibindo alerta transparente sem corromper os tetos contratados.
      - Criado adaptador `toBudgetInsightData` integrando `budgetProgress` ao `buildUserContext` no `AppCockpit.tsx`.
    - **Ergonomia Móvel e Equação Soberana (`BudgetSetupSheet.tsx`, `BudgetStatusCard.tsx`)**:
      - Preservação total de limites e meta de poupança ao editar orçamento existente.
      - Máscara monetária canônica em R$ (dígitos divididos por 100) com `inputMode="numeric"`.
      - Botão rápido `[ 📋 Clonar Orçamento de {Mês Anterior} ]` no primeiro acesso ao mês.
      - Banner de Folga Segura calculado dinamicamente com obrigações fixas e faturas de cartão providas pelo `useDashboardState`.
      - Ação discreta de exclusão do orçamento com diálogo de confirmação.
      - Deep-link ativo: CTAs de insights de orçamento no Cockpit abrem diretamente o sheet de ajuste com `{ openBudgetSetup: true }`.
  - **Validação & Testes**:
    - 64/64 testes aprovados em 7 suítes (`budgetMath.test.ts`, `useBudget.test.tsx`, `BudgetWorkflow.test.tsx`, `useDashboardState.test.tsx`, `CentralRecommendationsAndPriorities.test.tsx`, `nexusInsightEngine.test.ts`, `insightResponseObserver.test.ts`).
    - Build de produção (`npm run build`) compilado com 100% de sucesso em 1m 32s (`dist/`).
    - APK Android Release mantido 100% intacto.

- **UNIFICAÇÃO DOS SALDOS E FILOSOFIA DOS DOIS ESCUDOS DE PROTEÇÃO** (implementado 2026-09-23):
  - **Objetivo**: Eliminar a divergência entre o "Saldo Atual" do Controla, a "Disponibilidade Real" da Central e o "Disponível" do Resumo Financeiro, assegurando que o saldo acumulado em conta seja a fonte única da verdade e que os Dois Escudos de Proteção (1º Escudo: Colchão Emergencial; 2º Escudo: Reserva de Emergência) sejam preenchidos em cascata rigorosa.
  - **Diagnóstico da Falha Relatada**:
    - O usuário relatava saldo real em conta de R$ 59.720,40, mas na Central a Disponibilidade Real exibia -R$ 60.591,76, com Colchão e Reserva zerados.
    - Prova matemática: o motor `useSovereignSnapshot` avaliava `accumulatedBalance` como 0 (devido à falta de hidratação imediata no mount antes do término da query RTDB completa), calculando $0 - 1.848,76 \text{ (contas/cartão)} - 15.000 \text{ (meta colchão)} - 43.743 \text{ (meta reserva)} = -60.591,76$.
  - **Resultados e Implementações Alcançadas**:
    - **Hidratação e Unificação do Motor de Caixa (`useSovereignSnapshot.ts`)**:
      - `useSovereignSnapshot` unificado para usar a mesma função canônica de Controla: `calculateRealCashBalance(safeTx, storedInvoices, userCards, recurringBills, refDate)`.
      - Fallback resiliente no `localStorage` (`fpi_real_cash_balance_${userId}`) prevenindo leituras zeradas transitórias durante o mount da Central.
    - **Dois Escudos em Cascata no Motor Soberano (`calculations.ts`)**:
      - `computeSovereignMetrics`: o saldo líquido após obrigações (`cashSurplus`) preenche primeiramente o 1º Escudo (Colchão Emergencial de rotina) e, apenas com o excedente, preenche o 2º Escudo (Reserva de Emergência).
      - `deriveSovereignBuckets`: flag `structureInvaded` calibrada para disparar apenas se `cashSurplus < 0` (quando compromissos superam o caixa), eliminando falsos alertas de invasão enquanto o usuário está apenas formando reservas.
    - **Ordem dos Escudos em `JornadaMetrics.tsx`**:
      - Alinhada a hierarquia visual: 1º Escudo preenchido primeiro (`Math.min(saldoRealTotal, colchaoTarget)`), 2º Escudo preenchido em seguida com o restante.
  - **Validação & Testes**:
    - 67/67 testes aprovados em 6 suítes (`sovereignSnapshot.test.ts`, `sovereignMap.test.ts`, `JornadaMetrics.test.tsx`, `CockpitHero.test.tsx`, `BalanceCards.test.tsx`, `CentralRecommendationsAndPriorities.test.tsx`).
    - Build de produção (`npm run build`) compilado com 100% de sucesso em 1m 7s (`dist/`).
    - APK Android Release mantido 100% intacto.

- **SISTEMA DE ALARMES CONTÍNUOS COM ESCOLHA TRIPLA NA AGENDA** (implementado 2026-09-23):
  - **Objetivo**: Permitir que o usuário defina para cada compromisso da Agenda Financeira se deseja (1) apenas notificação silenciosa/breve, (2) apenas alarme sonoro/visual contínuo em loop, ou (3) ambos simultaneamente, com controles ergonômicos de Soneca e Dispensar.
  - **Resultados e Implementações Alcançadas**:
    - **Seletor Triplo de Aviso (`AgendaAlarmModal.tsx`, `useAgendaAlarms.ts`)**:
      - 3 opções de lembrete com ícones e legendas: `🔔 Notificação`, `⏰ Alarme`, `🔔+⏰ Ambos`.
      - Persistência tipada (`reminderMode: 'notification' | 'alarm' | 'notification_alarm'`) no Firestore e na fila offline (`agendaSyncQueue.ts`).
    - **Reprodutor Harmônico Contínuo (`continuousAlarmPlayer.ts`)**:
      - Singleton Web Audio API com cadência harmônica (880 Hz / 1046 Hz com 3 pulsos breves a cada 1.4s).
      - Padrão de vibração tátil contínua no dispositivo móvel.
      - Auto-stop defensivo aos 180 segundos (3 minutos) para preservação de bateria e bom senso.
    - **Modal Global de Alarme Ativo (`ActiveAlarmModal.tsx`, `AppLayout.tsx`)**:
      - Tela modal executiva com auréola pulsante e sino dinâmico em destaque.
      - Botões `[✓ Dispensar Alarme]` e `[⏰ Soneca (+5 min)]`, com suporte a teclado (`Escape` / `Espaço`).
  - **Validação & Testes**:
    - 17/17 testes aprovados nas suítes de alarme e 133/133 testes aprovados em todo o ecossistema da Agenda.
    - Build de produção (`npm run build`) compilado com 100% de sucesso.
    - APK Android Release mantido 100% intacto.

- **FASE 6: BLINDAGEM DE SEGURANÇA, RESILIÊNCIA & CHECKLIST PRÉ-LANÇAMENTO** (implementado 2026-09-23):
  - **Objetivo**: Garantir que a infraestrutura seja inviolável, tolerante a falhas de rede e pronta para receber milhares de usuários simultâneos, com compliance rigoroso da LGPD e experiência sem atritos (*Silent Authority*).
  - **Resultados e Implementações Alcançadas**:
    - **Blindagem de Segurança no Firestore (`firestore.rules` & `firestore.indexes.json`)**:
      - Correção crítica na regra de categorias (`firestore.rules`): substituído `allow read: if true;` por `allow read, write: if isOwner(userId);`, eliminando qualquer possibilidade de leitura não autorizada de hábitos de consumo e categorias de usuários por terceiros.
      - Auditoria e declaração formal de índices compostos em `firestore.indexes.json` para as coleções `metas` (`ativa` ASC, `createdAt` DESC), `invoices` (`cardId` ASC, `periodEnd` DESC), `rotativoInterestHistory` (`competence` ASC, `appliedAt` ASC), `presenceEvents` e `transactions` (`type` ASC, `date` DESC), prevenindo erros de pré-condição (`FAILED_PRECONDITION`).
    - **Resiliência Silenciosa a Falhas de APIs Externas (`selicService.ts`, `marketService.ts`, `PublicHome.tsx`)**:
      - Fallback seguro para a API do Banco Central (SGS 432): cache local resiliente no `localStorage` (`fpi_cached_selic_rate`) com baseline oficial de 10,75% a.a. (Copom vigente). A função nunca lança exceções não tratadas nem quebra telas se o Bacen oscilar.
      - Retenção inteligente de cotações em `marketService.ts`: se a AwesomeAPI ou as APIs de bolsa falharem após expiração do cache, o sistema preserva os últimos valores válidos em `finpro_market_cache` em vez de apagar as cotações da interface.
      - Alinhamento do fallback da Selic na `PublicHome.tsx` para 10,75% a.a.
    - **Debounce e Fila Offline (`useAgendaOperations.ts` & `agendaSyncQueue.ts`)**:
      - Debounce defensivo de 800ms implementado no listener de reconexão `window.addEventListener('online')`, prevenindo concorrência desordenada ou envio duplicado de requisições ao reestabelecer sinal no metrô ou em áreas de sombra.
    - **Conformidade LGPD & Checklist de Go-Live (`HomeFooter.tsx`, `TermsPage.tsx`, `PrivacyPage.tsx`)**:
      - Adição de link direto e canônico para a **Política de Privacidade** (`/privacidade`) na seção Regulação do `HomeFooter.tsx`, ao lado de Termos de Uso.
      - Verificação forense no bundle de produção (`npm run build`): 0 erros de compilação, 0 referências a chaves privadas expostas, integridade total dos assets e capas 16:9 em `dist/`.
  - **Validação & Testes**:
    - **Zero regressões**: 45/45 testes aprovados em 12 suítes (`selicService.test.ts`, `marketService.test.ts`, `agendaSyncQueue.test.ts`, `nexusGoals.test.ts`, `OnboardingOverlay.test.tsx`, `QuizBlock.test.tsx`, `ExplorarHub.test.tsx`, `useCourseProgress.test.ts`, `DebtVictoryBanner.test.tsx`, `JornadaMetrics.test.tsx`, `HistoryEducationalCard.test.tsx`, `csvExporter.test.ts`).
    - **Build de Produção**: `npm run build` compilado com 100% de sucesso em 46.68s (`dist/`).
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.

- **FASE 5: CAMADA DISCOVERY & INTELIGÊNCIA ACIONÁVEL** (implementado 2026-09-23):
  - **Objetivo**: Transformar o Nexus Advisor em um conselheiro financeiro de bom senso e autoridade silenciosa (não um gerador de textos longos) e garantir utilidade máxima e persistência contínua nas ferramentas e cursos de formação.
  - **Resultados e Implementações Alcançadas**:
    - **Regra das 3 Sentenças no Nexus AI (`identity.ts`, `prompt-builder.ts`, `AiAdvisor.tsx`)**:
      - Calibragem do System Prompt mestre no backend (`NexusIdentity`) para forçar a estrutura analítica de objetividade radical em 3 blocos:
        - *1. Diagnóstico do Fato*: Estado real apurado sem introduções vazias.
        - *2. Origem da Tensão*: Identificação exata do fator causador de pressão no caixa ou na estrutura.
        - *3. Próximo Movimento Recomendado*: Ação imediata e estratégica.
      - Proibição estrita de saudações redundantes no meio do diálogo e conclusões vazias ("Espero ter ajudado...").
    - **Ação em 1 Clique (Insight → Ação) (`action-registry.ts`, `AiAdvisor.tsx`)**:
      - Expansão do catálogo canônico `ACTION_REGISTRY` mapeando todas as ferramentas do ecossistema (`NAV_DEBTS`, `NAV_DEBT_SIMULATOR`, `NAV_RESERVE`, `NAV_GOALS`, `NAV_COMPOUND`, `NAV_FIRE`, `NAV_INFLATION`, `NAV_DIVIDENDS`, `NAV_CASH_VS_INSTALL`, `NAV_CASHFLOW`, `NAV_CENTRAL`, `NAV_AGENDA`, `NAV_COURSES`).
      - Fallback heurístico no cliente (`inferFallbackActions`) caso uma análise mencione ferramentas sem tag.
      - Estilização executiva de alto contraste com gradiente esmeralda e ícones pulsantes nos botões de ação em 1 clique.
    - **Persistência de Progresso dos Cursos no Firestore (`useCourseProgress.ts`)**:
      - Sincronização em nuvem contínua (`users/{userId}/courseProgress/{courseSlug}`) integrada com `useAuth()`.
      - Carregamento instantâneo do `localStorage` (0ms de tela branca) combinado com merge inteligente de aulas concluídas e badges da nuvem.
      - Gravação assíncrona tolerante a falhas de rede no Firestore a cada aula concluída ou progresso resetado.
    - **Filtros Rápidos no Explorar Hub (`ExplorarHub.tsx`, `ExplorarHub.test.tsx`)**:
      - Barra de chips executivos sóbrios no topo: `[ Todos (9) ]`, `[ Ferramentas de Decisão (7) ]`, `[ Formação & Cursos (2) ]`.
      - Alternância instantânea e animação suave de transição sem recarregar a página.
  - **Validação & Testes**:
    - **Zero regressões**: 74/74 testes aprovados em 6 suítes (`QuizBlock.test.tsx`, `ExplorarHub.test.tsx`, `courseRouting.test.tsx`, `agenda-time.test.ts`, `agenda-intent-schema.test.ts`, `useCourseProgress.test.ts`).
    - **Build de Produção**: `npm run build` compilado com 100% de sucesso em 1m 19s (`dist/`).
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.

- **FASE 4: CAMADA EVOLUTION / ESTRUTURA SOBERANA** (implementado 2026-09-22):
  - **Objetivo**: Proporcionar governabilidade financeira total para o usuário avançar do caixa diário organizado para a construção consistente de patrimônio e quitação acelerada de passivos, com experiência panorâmica de alto impacto no desktop e confidencialidade irrestrita.
  - **Resultados e Implementações Alcançadas**:
    - **Grade Executiva Ultrawide / Desktop de 3 Colunas (`AppCockpit.tsx`)**:
      - Em telas grandes (breakpoint `xl:`, >= 1280px), substituição da coluna única esticada por grade executiva balanceada de 3 colunas (`xl:grid-cols-12`):
        - *Coluna 1 (col-span-4)*: Liquidez, Balanço & Base de Proteção (`CockpitHero`, `ProtectionBar`, `JornadaMetrics`).
        - *Coluna 2 (col-span-4)*: Prontidão, Obrigações & Trajetória (`centralRecommendation`, `CommandRitual`, `SovereignMapCard`, `SovereignBuckets`, `MarginTrajectoryPanel`).
        - *Coluna 3 (col-span-4)*: Inteligência & Aprofundamento (`nexusInsights`, `CockpitInventory`, `CockpitAnalytics` colapsável).
      - Em mobile e tablet (< 1280px), fluxo sequencial natural mantido com ergonomia perfeita.
    - **Modo Privacidade Absoluto (`AppCockpit.tsx`, `JornadaMetrics.tsx`, `GoalManager.tsx`, `AppRoutes.tsx`)**:
      - Integração de `isPrivacyMode` em `JornadaMetrics.tsx`, mascarando Reserva de Emergência, Colchão Emergencial e Patrimônio Líquido com `••••••`.
      - Integração de `isPrivacyMode` em `GoalManager.tsx` e na rota `/app/metas`, ocultando valores de aportes e saldos de metas financeiras.
    - **Estabilização de Scroll da Agenda Financeira (`AgendaHub.tsx`)**:
      - Ativação do scroll anchoring nativo (`overflowAnchor: 'auto'`) no container do caderno da agenda, eliminando saltos de rolagem (scroll jumps) ao injetar assincronamente compromissos de meses anteriores vindos do Firebase.
    - **Consistência de Alarmes Locais no Android 13+ (`alarmService.ts`)**:
      - Adequação de `requestNotificationPermission` com solicitação em runtime via `LocalNotifications.requestPermissions()` para conformidade com a permissão `POST_NOTIFICATIONS` da API 33+.
      - Prevenção de loops de polling de background concorrentes com o `AlarmManager` nativo do Android.
    - **Sincronia Automática Dívidas → Controla (`DebtAmortizationModal.tsx`)**:
      - Checkbox executivo `[✓] Registrar despesa no Controla automaticamente` no modal de amortização de parcelas.
      - Ao abater parcela contratual ou extraordinária, lançamento instantâneo da despesa na categoria 'Dívidas' via `addTransaction`, alinhando o saldo real do caixa com zero retrabalho.
    - **Celebração da Quitação & Disponibilidade Real Liberada (`DebtVictoryBanner.tsx`, `AppCockpit.tsx`)**:
      - Componente `DebtVictoryBanner.tsx` com gradiente soberano e ícone de troféu dourado.
      - Destaca o valor liberado no fluxo de caixa permanente: *"Sua Disponibilidade Real mensal aumentou em +R$ X/mês pelo fim definitivo desta parcela!"*, com persistência de dismiss no `localStorage`.
  - **Validação & Testes**:
    - **Zero regressões**: 47/47 testes aprovados em 8 suítes (`DebtVictoryBanner.test.tsx`, `DebtAmortizationModal.sync.test.tsx`, `JornadaMetrics.test.tsx`, `GoalManager.test.tsx`, `CockpitHero.test.tsx`, `CockpitAnalytics.test.tsx`, `debt.math.test.ts`, `alarmService.agenda.test.ts`).
    - **Build de Produção**: `npm run build` compilado com 100% de sucesso em 1m 39s (`dist/`).
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.

- **FASE 3: CAMADA ROUTINE / CAIXA (APP & WEB LOGADOS — FREE, PRO, PREMIUM)** (implementado 2026-09-22):
  - **Objetivo**: Eliminar atrito na rotina financeira diária, calibrar os limites dos planos com bom senso econômico (sem paywalls agressivos ou telas em branco que pareçam bugs), unificar a ergonomia móvel para 5 pontos de contato universais e ativar as ferramentas analíticas de exportação (PDF e CSV).
  - **Resultados e Implementações Alcançadas**:
    - **Reorganização Ergonômica da Bottom Bar Mobile (`MobileBottomNav.tsx`)**:
      - Redução de 6 para 5 pontos de toque (Regra de Ouro do Mobile): `Central`, `Controla`, `(+) Lançar` (centro elevado), `Agenda` e `Menu` (Menu Soberano).
      - Área de toque ampliada em +26,5% por botão (de ~49px para ~62px em telas de 360–375px), eliminando toques falsos e alinhando com Apple HIG e Google Material 3.
      - Estado ativo inteligente mapeando ferramentas secundárias e rotas do menu ao 5º botão.
    - **Reestruturação Executiva do Menu Lateral Mobile (`AppMobileDrawer.tsx`)**:
      - Substituição do rótulo confuso "App Nativo" por "Rotina & Caixa" no Controla.
      - Organização em 5 blocos executivos:
        - *Bloco 1 — Identidade*: Iniciais em avatar com borda, Nome do usuário e Badge dinâmico de plano (Gratuito, Pro ou Premium).
        - *Bloco 2 — Operação Diária*: Central Soberana, Controla (Rotina & Caixa), Agenda Financeira e Dashboard do Mês.
        - *Bloco 3 — Patrimônio & Decisões*: Investimentos (Selo Premium), Patrimônio & Passivos (Selo Premium), Minhas Dívidas (Selo Premium) e Metas Financeiras.
        - *Bloco 4 — Inteligência & Descoberta*: Nexus AI (Conselheiro Estratégico), Central de Ferramentas (7 Simuladores) e Cursos de Formação (Investidor Soberano & Sair das Dívidas).
        - *Bloco 5 — Sistema*: Configurações, Indicar / Baixar App, Auditoria Pix / Gestão de Usuários (condicional admin) e Sair da Conta.
    - **Calibragem Saudável de Limites e Card Educativo Soberano de Histórico (`Dashboard.tsx`, `HistoryEducationalCard.tsx`, `useDashboardState.ts`)**:
      - Garantia de lançamentos 100% ilimitados e sem travas no mês presente para usuários do plano Free.
      - Eliminação de telas em branco ao consultar meses passados no Free: renderização do `HistoryEducationalCard` apresentando o resumo consolidado preservado do mês anterior (provando que os registros estão salvos no servidor), explicação transparente da fronteira Pro e CTAs para desbloquear o histórico ou voltar ao mês atual em 1 clique.
    - **Exportação Analítica Ativa em PDF e CSV (`FilterBar.tsx`, `reportGenerator.ts`, `csvExporter.ts`)**:
      - Ativação do gerador real de PDF (`generateFinancialReport`) antes desconectado em stub vazio.
      - Criação do utilitário `exportTransactionsToCsv` com codificação UTF-8 com BOM e separador `;` para compatibilidade instantânea com Excel no Brasil.
      - Botões duplos "PDF" e "CSV" no `FilterBar.tsx` com ícone de cadeado para Free (acionando `PaywallModal` contextual) e download imediato para Pro/Premium.
  - **Validação & Testes**:
    - **Zero regressões**: 30/30 testes aprovados em 7 suítes (`MobileBottomNav.test.tsx`, `AppMobileDrawer.test.tsx`, `HistoryEducationalCard.test.tsx`, `csvExporter.test.ts`, `useDashboardState.test.tsx`, `PaywallModal.test.tsx`, `featureAccessMatrix.test.ts`).
    - **Build de Produção**: `npm run build` compilado com 100% de sucesso em 1m 7s (`dist/`).
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.

- **FASE 2: SUPERFÍCIE DESLOGADA & PRIMEIRA IMPRESSÃO** (implementado 2026-09-22):
  - **Objetivo**: Garantir que o visitante deslogado entenda o Finanças Pro Invest em menos de 10 segundos, sem atritos e sem ruídos, oferecendo experimentação viva de valor imediato tanto no aplicativo móvel (Capacitor) quanto na landing page web.
  - **Resultados e Implementações Alcançadas**:
    - **Modo Sandbox / Demonstração sem Cadastro (`AuthContext.tsx`, `demoDataset.ts`, `MobilePublicHome.tsx`, `AppLayout.tsx`)**:
      - Criação de dataset soberano realista (`DEMO_USER_ID = 'demo-sandbox-soberano'`) com patrimônio, despesas, faturas, dívidas e metas simuladas.
      - Botão sutil `[ ⚡ Experimentar demonstração sem cadastro ]` no `MobilePublicHome.tsx` que autentica imediatamente em memória via `sessionStorage` sem chamada externa ao Firebase.
      - Isolamento completo nos hooks (`useFirebase.ts`, `useDebts.ts`, `useBills.ts`, `useGoals.ts`, `useAssets.ts`, `useAppState.ts`, `PresenceEventService.ts`), permitindo mutações CRUD em memória sem persistência remota.
      - Banner superior soberano em `AppLayout.tsx` informando o modo de demonstração ativa com CTAs diretos para `[ Criar Minha Conta Gratuita → ]` e `[ Sair da Demo ]`.
    - **Abertura Pública das 7 Ferramentas de Simulação (`AppRoutes.tsx`, `useNavigation.ts`, `toolsMeta.ts`)**:
      - Rotas espelho abertas em `PublicLayout` (`/ferramentas/fire`, `/ferramentas/juros`, `/ferramentas/inflacao`, `/ferramentas/alugar`, `/ferramentas/dividas`, `/ferramentas/dividendos`, `/ferramentas/compra-avista-parcelado`), permitindo uso instantâneo e tráfego orgânico de SEO sem bloqueio ou login prévio.
      - Metadados centralizados em `src/constants/toolsMeta.ts` unificando capas 16:9, badges, descrições e roteamento contextual.
      - Carrossel com snap horizontal moderno no rodapé do `MobilePublicHome.tsx` para acesso direto às ferramentas com 1 toque.
    - **Calibração de Safe Area & Dismiss do MobileAppGate (`MobilePublicHome.tsx`, `MobileAppGate.tsx`)**:
      - Ajuste das margens do `MobilePublicHome.tsx` com `pt-[max(5rem,calc(env(safe-area-inset-top)+1.5rem))] pb-[max(2rem,env(safe-area-inset-bottom))]`, evitando sobreposição em aparelhos com punch-hole/notch e barras de navegação gestuais.
      - `MobileAppGate.tsx` calibrado para permanecer desativado em rotas públicas de descoberta (`/`, `/ferramentas/*`, `/artigos/*`, `/termos`, `/privacidade`, `/download`), protegendo a experiência de visitantes móveis.
    - **Indicador Visual de Rolagem Horizontal em Tabelas Financeiras (`TableHorizontalScrollWrapper.tsx`)**:
      - Componente com gradiente direito e pill discreto de instrução (`Arraste para o lado para ver mais colunas →`) em dispositivos móveis, integrado nas 5 ferramentas com tabelas analíticas (`CompoundInterestTable`, `RentVsFinanceTimeline`, `DebtScheduleTable`, `DividendsTool`, `BuyCashOrInstallInvestTool`).
    - **Landing Page Web: Selic Copom Oficial e Mini-Sliders (`PublicHome.tsx`, `HomeHero.tsx`, `HomeEcossistema.tsx`, `HomeCursos.tsx`)**:
      - Substituição de número estático da Selic por consulta dinâmica oficial via `fetchCurrentSelicRate` com fallback resiliente de 10,75% a.a. (Copom vigente).
      - Remoção de hooks mortos de usuário autenticado (`useDebts`, `usePresenceTriggers`, etc.) que rodavam de forma inútil para visitantes anônimos.
      - Mini-simulador interativo no `HomeHero.tsx` com sliders de Renda, Gastos e Dívidas, chips de predefinição rápida e cálculo em tempo real do Saldo Livre Real e percentual de liberdade.
      - Unificação visual soberana em `HomeEcossistema.tsx` e `HomeCursos.tsx` com capas executivas 16:9 de alta definição.
  - **Validação & Testes**:
    - **Zero regressões**: 49/49 testes aprovados nas suítes de ferramentas e componentes móveis (`MobilePublicHome.test.tsx`, `TableHorizontalScrollWrapper.test.tsx`, `MobileAppGate.test.tsx`, `PricingCopy.test.tsx`, `presenceEventService.test.ts`).
    - **Build de Produção**: `npm run build` compilado com 100% de sucesso em 1m (`dist/`).
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.

- **FASE 1: SANEAMENTO ARQUITETURAL & ALÍVIO DE MONÓLITOS (>= 50 KB)** (implementado 2026-09-22):
  - **Objetivo**: Desmantelar monólitos pesados (>= 50 KB e 800–2.600 linhas), acelerando o hot-reload, eliminando re-renderizações em cascata e isolando lógica de negócio em hooks unitários.
  - **Resultados e Métricas Alcançadas**:
    - **`AgendaHub.tsx`**: Reduzido de 2.612 linhas (117 KB) para 630 linhas (21 KB) (-76%). Decomposto em 9 subcomponentes visuais em `src/components/Agenda/` (`AgendaDayRow`, `AgendaCalendarModal`, `AgendaAlarmModal`, `AgendaDeleteModal`, `AgendaShortcutModal`, `AgendaUpcomingList`, `AgendaWeekGrid`, `AgendaSearchPanel`, `AutoResizeTextarea`) e 2 hooks em `src/agenda/` (`useAgendaOperations`, `useAgendaAlarms`).
    - **`useTransactions.ts`**: Reduzido de 1.033 linhas (50 KB) para 347 linhas (12.5 KB) (-66%). Extraído `useTransactionMutations.ts` (698 linhas) isolando mutações RTDB/Firestore, faturas e eventos de domínio.
    - **`SettingsPage.tsx`**: Reduzido de 934 linhas (46 KB) para 191 linhas (6.6 KB) (-80%). Decomposto em `SettingsProfileCard`, `SettingsSubscriptionCard`, `SettingsSecuritySection`, `SettingsPresenceSection` e `SettingsDangerZone`.
    - **`CardManager.tsx`**: Reduzido de 1.083 linhas (60 KB) para 456 linhas (17 KB) (-58%). Decomposto em `CardFormModal`, `CardList` e `InvoiceDetailsModal`.
    - **`DebtManager.tsx`**: Reduzido de 1.009 linhas (54 KB) para 669 linhas (29 KB) (-34%). Decomposto em `DebtFormCard` e `DebtListSection`.
    - **`AveragesAnalysisPanel.tsx`**: Reduzido de 879 linhas (51 KB) para 196 linhas (8 KB) (-78%). Extraído `useAveragesCalculation.ts`, `AveragesOverviewCard` e `AveragesCategorySection`.
    - **Ferramentas de Simulação**:
      - `FireCalculatorTool.tsx`: Reduzido em 318 linhas; subcomponentes `FireSensitivityPanel`, `FireMilestonesPanel`, `FireTrinityModal`.
      - `DebtOptimizerTool.tsx`: Reduzido em 274 linhas; subcomponentes `DebtScenarioChart` e `DebtScheduleTable`.
      - `CompoundInterestTool.tsx`: Reduzido em 270 linhas; subcomponentes `CompoundInterestChart` e `CompoundInterestTable`.
      - `RentVsFinanceTool.tsx`: Reduzido em 183 linhas; subcomponente `RentVsFinanceTimeline`.
    - **Higienização de Arquivo Morto**: `src/App.tsx.backup` (985 linhas • 47 KB) excluído permanentemente do repositório.
    - **Total Consolidado**: **-5.701 linhas de código monolítico aliviadas** (-47% nos 10 arquivos alvo) com 28 novos submódulos criados.
  - **Validação & Testes**:
    - **Zero regressões**: Mais de 180 testes unitários aprovados com 100% de sucesso (incluindo 151/151 testes na Agenda).
    - **Build de Produção**: `npm run build` compilado com 100% de sucesso em 59.48s (`dist/`).
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.

- **Modernização de UX, Capas Executivas & Conteúdo dos Cursos em Explorar (`ExplorarHub.tsx` & Trilha de Cursos)** (implementado 2026-09-22):
  - **Diagnóstico & Problemas Resolvidos**:
    - O Quiz possuía uma armadilha crítica de UX: ao errar uma questão, as alternativas ficavam permanentemente desabilitadas, o botão "Concluir" no rodapé travava, e disparava um `alert()` nativo do browser sem opção de retry, prendendo o usuário na página.
    - Os cards dos cursos em `ExplorarHub.tsx` estavam esteticamente defasados em relação às 7 ferramentas (cards brancos com ícone simples, sem capa, sem duração, sem nível e com texto truncado).
    - As aulas eram isoladas do ecossistema, pedindo anotações em papel em vez de conectar os alunos às novas ferramentas analíticas do app.
  - **Pilares Implementados**:
    1. **Eliminação da Armadilha do Quiz (`QuizBlock.tsx` e `LessonPage.tsx`)**:
       - Adicionado botão interativo `[ ↺ Tentar de novo ]` quando o aluno erra, restaurando as alternativas para aprendizado positivo.
       - Remoção de `alert()` do navegador; adicionado aviso visual elegante com rolagem suave (`scrollIntoView`) até o quiz.
       - 2/2 testes unitários dedicados em `QuizBlock.test.tsx`.
    2. **Capas Executivas 16:9 e Cards Soberanos em Explorar (`ExplorarHub.tsx` & `Courses/index.ts`)**:
       - Artes geradas: `curso-dividas-cover.jpg` (pasta de plano de recuperação, calculadora metálica e curva de amortização) e `curso-investidor-cover.jpg` (sala executiva com vista panorâmica, alocação global nos 4 motores e relógio minimalista).
       - Cards com imagem 16:9, zoom suave no hover, badges pulsantes (`Trilha de Recuperação` e `Formação CFP®`), chip de duração (`⏱️ 1h30` e `⏱️ 3h00`) e botão `Acessar Trilha →`.
    3. **Enriquecimento Pedagógico & Conexão com os Simuladores (`ToolCTA.tsx` e Módulos)**:
       - `ToolCTA` expandido para suportar `compound-interest`, `inflation`, `dividends`, `fire`, `debt-manager` e `debt-calculator`.
       - Conexões adicionadas nas aulas dos dois cursos direcionando os alunos para o Gestor de Dívidas, Calculadora de Dívidas, Calculadora de Juros Compostos, Impacto da Inflação, Simulador de Dividendos e Calculadora FIRE.
       - Atualização com canais brasileiros de negociação (Registrato Bacen, Serasa Limpa Nome, Portabilidade e Desenrola).
    4. **Theming e Textos de Sucesso na Trilha (`CourseTrackPage.tsx`)**:
       - Botão primário exibe `Começar Curso` para novos alunos (0% de progresso).
       - Selo dinâmico de conclusão: `Livre de Dívidas • Estrategista da Quitação` para o curso de dívidas e `Investidor Soberano` para o curso de investimentos.
  - **Validação & Testes**:
    - 12/12 testes aprovados em `src/features/courses/` e `ExplorarHub.test.tsx`.
    - Build de produção Vite compilado com 100% de sucesso em 57s (`dist/`).
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.

- **Padronização Visual Soberana: Capas Executivas e Badges para Todas as Ferramentas em Explorar (`ExplorarHub.tsx`)** (implementado 2026-09-22):
  - **Diagnóstico & Objetivo**:
    - Após o sucesso visual da capa executiva da *Calculadora de Independência Financeira*, as demais 6 ferramentas na aba Explorar continuavam utilizando apenas caixas com ícones simples, gerando assimetria estética.
    - O objetivo foi dotar todas as 7 ferramentas com imagens cinematográficas 16:9, realistas e sóbrias, respeitando a identidade executiva ("Silent Authority") do Finanças Pro Invest.
  - **Artes Geradas e Integradas (`public/assets/images/tools/`)**:
    1. **Juros Compostos (`juros-compostos-cover.jpg`)**: Tablet com curva exponencial esmeralda, pilhas de moedas de Real em progressão geométrica, fórmulas em caderno executivo e café sobre escrivaninha de nogueira. Badge: `Efeito Bola de Neve` | Ação: `Calcular Agora`.
    2. **Calculadora de Dívidas (`calculadora-dividas-cover.jpg`)**: Projeção de decaimento de amortização acelerada até zero, contrato carimbado com selo de quitação verde, calculadora financeira metálica e óculos. Badge: `Amortização Estratégica` | Ação: `Calcular Agora`.
    3. **Alugar vs Comprar (`alugar-vs-comprar-cover.jpg`)**: Chaves de imóvel em chaveiro de couro legítimo, tablet com gráfico comparativo de 30 anos (patrimônio financiado vs aluguel + investimentos) e plantas arquitetônicas em desfoque. Badge: `Decisão Imobiliária` | Ação: `Comparar Agora`.
    4. **Independência Financeira (`calculadora-fire-cover.jpg`)**: Cronograma sóbrio de tempo de trabalho vs. liberdade financeira, relógio minimalista e moedas brasileiras sobre pedestal verde. Badge: `Tempo de Trabalho Real` | Ação: `Calcular Agora`.
    5. **Impacto da Inflação (`impacto-inflacao-cover.jpg`)**: Lupa clássica de latão sobre cédulas e moedas de Real, ampulheta de areia e tablet com curvas de poder de compra corroído vs blindagem IPCA+. Badge: `Poder de Compra Real` | Ação: `Calcular Agora`.
    6. **Simulador de Dividendos (`simulador-dividendos-cover.jpg`)**: Calendário de dividendos e barras de fluxo de caixa mensal crescente, horizonte com lajes corporativas (FIIs) pela janela e caderno Patrimônio & Renda. Badge: `Renda Passiva Mensal` | Ação: `Simular Agora`.
    7. **À Vista ou Parcelado (`a-vista-ou-parcelado-cover.jpg`)**: Maquininha de cartão, cartão de crédito premium, tag de desconto à vista e tablet demonstrando a simulação de rendimento líquido no CDI mês a mês. Badge: `Decisão de Compra` | Ação: `Comparar Agora`.
  - **Melhorias de UX e Código em `ExplorarHub.tsx`**:
    - Todos os cards agora contam com imagem 16:9, zoom suave no hover (`group-hover:scale-105 transition-transform duration-500`), badge flutuante translúcido com ponto pulsante verde e call-to-action proativo (`action` contextual em cada card).
  - **Validação & Testes**:
    - 3/3 testes aprovados em `ExplorarHub.test.tsx` e 92/92 testes aprovados em todas as ferramentas da aplicação (`src/components/tools/`).
    - Build de produção Vite compilado com 100% de sucesso em 58s (`dist/`).
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.

- **Modernização e Auditoria Soberana da Ferramenta À Vista ou Parcelado (`BuyCashOrInstallInvestTool.tsx`)** (implementado 2026-09-22):
  - **Diagnóstico & Problemas Resolvidos**:
    - Era a única ferramenta fora do design system sovereign (não usava `ToolLayout`, usava CSS isolado `buyCashOrInstallInvest.css`), não possuía verificação nativa do Capacitor, tinha fallback desatualizado da taxa Selic (14,75% de 2023), não continha gráficos nem tabela mês a mês e era desconectada do ecossistema e de metas.
  - **Pilares Implementados**:
    1. **Migração Integral para o Design System Soberano (`ToolLayout`)**:
       - Ícone `🛒`, título `À Vista ou Parcelado`, badge `Decisão Financeira`, proteção nativa `WebOnlyBlock` e eliminação de CSS legado em favor do Tailwind CSS.
    2. **Taxa Selic Oficial Copom (Série 432)**:
       - Conexão em tempo real com a API do Banco Central com fallback resiliente de 10,75% a.a. (Copom vigente).
    3. **Consulta de Liquidez do Usuário (`useWealthData`)**:
       - Botão inteligente `[ ⚡ Consultar Minha Reserva ]` para verificar se a compra à vista cabe no saldo investido sem comprometer a reserva.
    4. **Gráfico Interativo de Evolução do Saldo Aplicado (Recharts)**:
       - Projeção visual do saldo aplicado no CDI mês a mês sendo debitado pelas parcelas e gerando rendimentos que sobram no bolso.
    5. **Cronograma Mês a Mês do Fluxo Financeiro**:
       - Tabela com Saldo Aplicado Inicial, Rendimento Líquido do Mês, Parcela Paga e Saldo Remanescente.
    6. **Organização por Abas e Integração com Metas**:
       - 3 abas (`Gráfico & Indicadores`, `Cronograma Mês a Mês` e `Estratégia & Quando Parcelar`) e botão direto para salvar a vantagem como meta em `GoalManager.tsx`.
  - **Validação & Testes**:
    - 5/5 testes unitários aprovados em `BuyCashOrInstallInvestTool.test.tsx` e 46/46 testes aprovados em todo o ecossistema de ferramentas.
    - Build de produção Vite compilado com 100% de sucesso em 1m 4s (`dist/`).
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.

- **Modernização e Auditoria Soberana do Simulador de Dividendos (`DividendsTool.tsx`)** (implementado 2026-09-22):
  - **Diagnóstico & Problemas Resolvidos**:
    - A ferramenta utilizava um bloqueio `ToolGate` rígido impedindo visitantes de simular, realizava uma conta estática sem projeção temporal nem reinvestimento, não continha gráficos, era desconectada dos dados reais do usuário e carecia de presets de mercado e marcos de liberdade.
  - **Pilares Implementados**:
    1. **Acesso Aberto & Sincronização Inteligente (`useWealthData` e `useTransactions`)**:
       - Remoção do gate restritivo; botão inteligente `[ ⚡ Usar Meus Dados Reais ]` para auto-preencher patrimônio inicial investido e despesas médias para a meta de renda.
    2. **Motor da Bola de Neve (Efeito Exponencial)**:
       - Simulação com toggle de reinvestimento mensal dos proventos e cálculo do Ponto de Inflexão (*Magic Number*), quando os proventos passam a aportar mais que o próprio investidor.
    3. **Gráfico Interativo de Evolução da Renda Passiva (Recharts)**:
       - Curvas comparativas de Renda Passiva Mensal Com Reinvestimento (Bola de Neve) vs. Sem Reinvestimento, com tooltips em BRL.
    4. **Presets Rápidos do Mercado Brasileiro**:
       - Atalhos com 1 clique para FIIs (9,5% a.a.), Ações de Dividendos (7,5% a.a.) e Carteira Mista (8,5% a.a.).
    5. **Régua de Marcos de Cobertura de Custo de Vida**:
       - Acompanhamento com barras de progresso de conquistas reais pagas pelos proventos (Contas Básicas R$ 250, Supermercado R$ 1.000, Moradia R$ 2.500, Semi-Aposentadoria R$ 5.000 e Independência R$ 10.000+).
    6. **Organização por Abas e Integração com Metas**:
       - 4 abas organizadas (`Gráfico`, `Tabela Ano a Ano`, `Marcos de Cobertura` e `Estratégia Previdenciária`) e botão direto para salvar como meta no `GoalManager.tsx`.
  - **Validação & Testes**:
    - 6/6 testes unitários aprovados em `DividendsTool.test.tsx` e 41/41 testes aprovados em todo o ecossistema de ferramentas.
    - Build de produção Vite compilado com 100% de sucesso em 57.69s (`dist/`).
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.

- **Modernização e Auditoria Soberana da Calculadora de Dívidas (`DebtOptimizerTool.tsx`)** (implementado 2026-09-22):
  - **Diagnóstico & Problemas Resolvidos**:
    - A ferramenta era uma ilha desconectada dos dados do usuário, sem gráficos interativos, sem atalhos rápidos de amortização extra, com tabela rigidamente cortada em apenas 12 meses, layout vertical longo e sem integração prática com metas financeiras.
  - **Pilares Implementados**:
    1. **Sincronização com Dívidas Cadastradas (`useDebts` e `useAuth`)**:
       - Card executivo `Importar Minhas Dívidas Reais` permitindo carregar com 1 clique o saldo devedor, taxa de juros, parcelas restantes e valor de parcela de qualquer dívida já cadastrada no app.
    2. **Gráfico Interativo de Decaimento do Saldo Devedor (Recharts)**:
       - Curvas comparativas de saldo contratual normal vs. saldo acelerado com amortização extraordinária, com tooltips em BRL.
    3. **Alavanca Rápida de Amortização Extraordinária**:
       - Atalhos de sensibilidade (`+R$ 100`, `+R$ 200`, `+R$ 300`, `+R$ 500`, `+R$ 1.000`) e Card Heroico da Liberdade Financeira destacando meses eliminados e total poupado em juros.
    4. **Cronograma com Filtros de Visualização**:
       - Alternância entre Marcos Anuais (Anos 1 a 30), Primeiros 24 Meses e Cronograma Completo, com destaque visual de "Quitado!".
    5. **Navegação por Abas Soberanas**:
       - Abas organizadas: `Gráfico & Diagnóstico`, `Cronograma de Amortização` e `Estratégia & Fundamentos`.
    6. **Transformação em Ação (Integração com Metas)**:
       - Botão `[ 🎯 Salvar Amortização como Meta no Meu Painel ]` conectando ao `GoalManager.tsx` via query params.
  - **Validação & Testes**:
    - 6/6 testes unitários aprovados em `DebtOptimizerTool.test.tsx` e 35/35 testes aprovados em todo o ecossistema de ferramentas.
    - Build de produção Vite compilado com 100% de sucesso em 1m 6s (`dist/`).
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.

- **Modernização e Auditoria Soberana da Ferramenta Alugar vs Comprar (`RentVsFinanceTool.tsx`)** (implementado 2026-09-22):
  - **Diagnóstico & Problemas Resolvidos**:
    - A ferramenta era uma ilha desconectada dos dados do usuário, não usava a estrutura de layout soberana (`ToolLayout`), realizava requisições diretas e instáveis à Série 11 do Bacen sem fallback robusto, não apresentava o Ponto de Equilíbrio (*breakeven*), omitia custos de manutenção do proprietário e taxas de aquisição (ITBI/cartório) e carecia de cronograma ano a ano e ação prática.
  - **Pilares Implementados**:
    1. **Sincronização com o Ecossistema (`useWealthData` e `useTransactions`)**:
       - Botão inteligente `[ ⚡ Usar Meus Dados Reais do Finanças Pro ]` para preenchimento com um clique do saldo investido acumulado (Entrada) e detecção de despesas de aluguel/moradia recentes.
    2. **Integração com Taxa Selic Oficial Copom (Série 432)**:
       - Conexão via `fetchCurrentSelicRate` de `selicService.ts` com fallback resiliente de 10,75% a.a.
    3. **Ponto de Equilíbrio Dinâmico (*Breakeven Point*)**:
       - Identificação do ano exato em que a compra supera o aluguel investido (ou vice-versa).
    4. **Custos Reais de Proprietário & Sistemas de Amortização**:
       - Adição de manutenção predial (~0,8% a.a.), custos de transação (ITBI + cartório ~4%) e alternância entre SAC (parcelas decrescentes) e PRICE (parcelas fixas).
    5. **Tabela de Marcos e Cronograma Ano a Ano**:
       - Detalhamento temporal completo (1 a 30 anos) de parcelas, saldo devedor, aluguel acumulado, patrimônios comparados e vantagem financeira.
    6. **Ação Imediata (Integração com Metas)**:
       - Botão `[ 🎯 Salvar Entrada como Meta no Meu Painel ]` conectando diretamente ao `GoalManager.tsx` via query params.
  - **Validação & Testes**:
    - 6/6 testes unitários aprovados em `RentVsFinanceTool.test.tsx` e 29/29 testes aprovados em todo o ecossistema de ferramentas.
    - Build de produção Vite compilado com 100% de sucesso em 56.26s (`dist/`).
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.

- **Calculadora FIRE — 4 Frentes de Utilidade Prática: Sincronização Real, Alavanca do Tempo, Marcos Intermediários e Metas** (implementado 2026-09-21):
  - **Objetivo & Psicologia Financeira**:
    - A Calculadora FIRE era uma "ilha" isolada que forçava o usuário a digitar tudo do zero e apresentava a independência como uma linha de chegada binária distante ("tudo ou nada" em 20 a 30 anos).
    - Transformada para responder diretamente à pergunta existencial do trabalhador: *"quanto tempo ainda preciso trabalhar?"*.
  - **As 4 Frentes Implementadas**:
    1. **Sincronização com o Ecossistema (`useWealthData`, `useTransactions`, `useAuth`)**:
       - Botão executivo inteligente no topo do formulário: `[ ⚡ Usar Meus Dados Reais ]`.
       - Puxa o total acumulado em investimentos (`totalInvestments` / `patrimonioLiquido`) e calcula automaticamente a média de despesas reais do extrato/orçamento sem esforço ou digitação.
    2. **Alavanca do Tempo de Trabalho (Sensibilidade de Cortes)**:
       - Componente `TimeLeverageSection`: seletor interativo de enxugamento de custos (`-R$ 100`, `-R$ 200`, `-R$ 300`, `-R$ 500`, `-R$ 1.000`/mês).
       - Demonstra o benefício duplo: alívio no patrimônio final necessário (ex: `-R$ 150.000`) e destaque vibrante em esmeralda: **"Você economiza X anos e Y meses de trabalho na sua vida!"**.
    3. **Marcos Intermediários de Soberania (`IntermediateMilestonesSection`)**:
       - **Coast FIRE**: Calcula o patrimônio semente autossuficiente que rende sozinho até os 65 anos com juros compostos, liberando o usuário da obrigação de poupar.
       - **Semi-Aposentadoria (Barista FIRE)**: Demonstra que cobrir apenas 50% dos custos com trabalho leve/meio período permite deixar a rotina exaustiva em menos da metade dos anos.
    4. **Transformação de Projeção em Ação (Conexão Direta com Metas)**:
       - Botão *"Salvar Meta de Aporte no Meu Painel"* redireciona para `metas?action=new&nome=...&valor=...&metaAlvo=...`.
       - Em `GoalManager.tsx`, detecção automática de query params pré-preenchendo a meta no formulário e rolando com suavidade acompanhado de confirmação em Toast.
  - **Validação & Testes**:
    - 6/6 testes unitários aprovados em `FireCalculatorTool.test.tsx` (incluindo cobertura de explicação e toggle da Regra de Retirada).
    - 1/1 teste unitário aprovado em `GoalManager.test.tsx`.
    - 3/3 testes unitários aprovados em `ExplorarHub.test.tsx`.
    - Build de produção Vite compilado com 100% de sucesso em 59.52s (`dist/`).
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.

- **Clarificação Didática da Regra de Retirada Anual Segura na Calculadora FIRE** (implementado 2026-09-21):
  - **Identificação do Problema**:
    - O termo *"Regra de Retirada Anual Segura"* causava dúvida no usuário leigo sobre o que é, como funciona e por que existem as opções de 3%, 4% e 5%.
  - **Implementação Realizada (`FireCalculatorTool.tsx`)**:
    1. **Subtítulo Imediato**: *"A fatia percentual que você saca por ano do seu patrimônio investido para pagar seu custo de vida, sem esgotar o capital."*
    2. **Botão de Ajuda Interativo `[ ? ]`**: Abre card didático com explicação aprofundada da Regra de Trinity (Estudo de Trinity da Universidade Trinity, Texas), detalhando o funcionamento de 3% (33×), 4% (25×) e 5% (20×) de forma acessível.
    3. **Badges de Multiplicador**: Cards com chips visuais claros indicando `33× anual`, `25× anual` e `20× anual`, eliminando qualquer ambiguidade de cálculo.
  - **Validação**:
    - 6/6 testes unitários aprovados em `FireCalculatorTool.test.tsx`.
    - Build de produção Vite compilado com 100% de sucesso em 59.52s (`dist/`).

- **Calculadora de Independência Financeira (FIRE) em Explorar — Imagem Sóbria de Cronograma e Copywriting Realista** (implementado 2026-09-21):
  - **Identificação da Oportunidade & UX**:
    - O card da Calculadora FIRE na aba Explorar exibia o título abstrato *"Independência Financeira"*, gerando a sensação de ser um artigo teórico e não uma ferramenta de cálculo de alta utilidade prática.
    - O usuário solicitou um copywriting realista, sem fantasia e sem promessas mágicas de enriquecimento fácil, focado na pergunta que todo trabalhador faz: *"quanto tempo ainda preciso trabalhar?"*.
  - **Implementação Realizada**:
    1. **Copywriting Sóbrio & Direto (`src/components/ExplorarHub.tsx`)**:
       - Título: **`Calculadora de Independência Financeira`**.
       - Descrição: **`"Veja quanto tempo você ainda precisa trabalhar para conseguir a sua independência financeira."`**
       - Badge de destaque: **`"Tempo de Trabalho Real"`**.
       - Ação do botão: **`"Calcular Agora"`** com transição de cor para esmeralda no hover.
    2. **Arte Gráfica Executiva e Sóbria (`public/assets/images/tools/calculadora-fire-cover.jpg`)**:
       - Cena de alta sofisticação com tablet em escritório executivo projetando o gráfico de *"Tempo de Trabalho vs. Independência Financeira"*, relógio minimalista (simbolizando o tempo de vida) e moedas brasileiras sobre pedestal verde esmeralda.
       - Renderizado com banner 16:9 no topo do card (`h-44 sm:h-48 rounded-t-panel overflow-hidden`), zoom suave no hover (`group-hover:scale-105 duration-500`) e gradiente inferior para legibilidade.
  - **Validação**:
    - 3/3 testes unitários aprovados em `ExplorarHub.test.tsx`.
    - Build de produção Vite concluído em 56.81s com 0 erros.

- **Higienização Integral & Blindagem Jurídica Pré-Audiência de Instrução (Santander x Reclamante)** (implementado 2026-09-21):
  - **Objetivo**: Neutralizar todos os dados pessoais, e-mails, chave Pix e pacote Android no repositório antes da audiência de instrução de 05/11/2026.
  - **Ações**:
    1. Redirecionamento de checkout para `VipWaitlistModal` (Lista VIP / Acesso Antecipado sem cobrança e sem Pix no ar).
    2. Remoção de dados pessoais em `PixReceiptCheckoutModal.tsx` e `pixManualConfig.ts` com fallbacks neutros institucionais (`Finanças Pro Invest`).
    3. Criação de `isSystemAdmin.ts` para verificar privilégios via claims/roles do Firestore (`isAdmin: true`, `role: 'admin'`), eliminando e-mails hardcoded de `AppHeader.tsx`, `AppMobileDrawer.tsx`, `HomeConteudo.tsx` e `PixAuditContext.tsx`.
    4. Migração do pacote Android para `com.financasproinvest.app` em Gradle, Manifest, Shortcuts, Strings, Assetlinks e estrutura Java.
    5. Remoção do binário APK baixável e conversão da `DownloadPage.tsx` para acesso web seguro PWA.
    6. Verificação forense no bundle `dist/`: 0 ocorrências de nomes pessoais e chave Pix.
  - **Diagnóstico da Causa Raiz**:
    - Ao clicar no botão *"Ver relatório completo"* dos e-mails de Resumo Semanal ou Fechamento Mensal em um celular com o app instalado, o link abria no navegador móvel (Chrome) em vez do app nativo.
    - O site web interceptava o usuário com um gate em tela cheia (`MobileAppGate.tsx`) que oferecia apenas *"Baixar APK"* ou *"Continuar no navegador web"*.
    - Ao continuar na web, o usuário perdia o destino do relatório, gerando frustração extrema e quebra da promessa do e-mail.
    - **Causas Técnicas Identificadas**:
      1. URLs nos e-mails (`mailService.ts`) apontavam para a raiz genérica (`https://financasproinvest.com.br`) sem rota `/app/dashboard`.
      2. `AndroidManifest.xml` não continha o intent-filter HTTPS com `android:autoVerify="true"` (Android App Links).
      3. `public/.well-known/assetlinks.json` possuía pacote incorreto (`com.financasproinvest.mobile` em vez de `com.leolimacr.financaspro`) e faltavam fingerprints oficiais dos keystores de debug e release.
      4. `MobileAppGate.tsx` bloqueava usuários móveis sem oferecer a opção de abrir o app nativo já instalado via Custom Scheme / Intent.
      5. `ProtectedRoute` em `AppRoutes.tsx` não preservava a query string de destino no login web (`redirect`).
  - **Soluções Arquiteturais Aplicadas**:
    1. **Links Canônicos nos E-mails (`functions/mailService.ts`)**:
       - Resumo Semanal: `https://www.financasproinvest.com.br/app/dashboard?origin=email_weekly_summary`.
       - Fechamento Mensal: `https://www.financasproinvest.com.br/app/dashboard?origin=email_monthly_close`.
       - Alerta de Inatividade: `https://www.financasproinvest.com.br/app/controla?action=new-transaction&origin=email_inactivity`.
       - Vencimento de Dívidas: `https://www.financasproinvest.com.br/app/minhas-dividas?view=estrategia&origin=email_debt_due`.
       - Metas e Aportes: `https://www.financasproinvest.com.br/app/metas?origin=email_goal_aport`.
    2. **Android App Links & Digital Asset Links (`AndroidManifest.xml` & `assetlinks.json`)**:
       - `assetlinks.json` atualizado com pacote `com.leolimacr.financaspro` e fingerprints SHA-256 oficiais de Debug (`D7:E6:...:47:7A`) e Release (`26:CD:...:76:EE`).
       - Configuração de headers no `firebase.json` garantindo `Content-Type: application/json` para `/.well-known/assetlinks.json`.
       - Intent-filter com `android:autoVerify="true"` adicionado no `AndroidManifest.xml` para domínios oficiais.
    3. **Motor de Resolução de Rotas (`src/utils/deepLinkRouter.ts`)**:
       - Suporte a URLs HTTPS absolutas completas, extraindo caminho relativo e preservando query parameters.
       - Suporte ao esquema nativo `financaspro://...` e `financaspro:/...`.
       - Normalização de termos e apelidos semânticos (`relatorio`, `relatorios`, `relatório`, `relatórios`, `fechamento`, `resumo`, `report` ➔ `/app/dashboard`).
       - Tratamento de raiz oficial (`/` ➔ `/app/central`).
    4. **Smart Intent Bridge Web (`src/components/MobileAppGate.tsx`)**:
       - Detecção contextual inteligente da intenção do usuário: reconhece quando o objetivo é ver relatório (`isReportTarget`), adaptando títulos, ícones e benefícios (*"Seu Relatório Está Pronto"*).
       - Botão Primário em destaque verde: **`[ 🚀 Abrir Relatório no Aplicativo ]`**, acionando Android Intent URI (`intent://app/dashboard...#Intent;scheme=financaspro;package=com.leolimacr.financaspro;end`) e fallback `financaspro://...`.
       - Botão Secundário: **`[ Ver Relatório no Navegador Web ]`**, dispensando o modal imediatamente nesta sessão sem perder a rota e revelando o relatório na web.
       - Tentativa automática não-bloqueante na primeira abertura de links de e-mail.
       - Botão fechar (`X`) no canto superior direito para liberação imediata da tela web.
       - Link discreto no rodapé para download do APK apenas para quem ainda não instalou.
    5. **Preservação de Destino & Centralização (`AppRoutes.tsx` & `useNavigation.ts`)**:
       - `ProtectedRoute` agora anexa `?redirect=${encodeURIComponent(path + search)}` caso o usuário precise logar.
       - `handleAuthSuccess` em `useNavigation.ts` consome `redirect` e conduz com precisão ao relatório original.
       - `MobileAppGate` montado centralmente em `AppRoutes.tsx`, garantindo cobertura de rotas autenticadas e deslogadas sem duplicidade.
  - **Validação**:
    - 54/54 testes unitários aprovados (`deepLinkRouter.test.ts`, `MobileAppGate.test.tsx`, `PendingObligations.test.tsx`, `useNexusAdvisorTriggers.test.tsx`).
    - Build de funções Cloud (`npm --prefix functions run build`) compilado com 0 erros.
    - Build de produção Vite (`npm run build`) concluído com 100% de sucesso em 1m 26s (`dist/`).
    - Verificado arquivo `dist/.well-known/assetlinks.json` gerado corretamente para deploy.
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.

- **Motor de Conciliação Inteligente de Contas Recorrentes & Eliminação de Débito Duplo no Saldo Livre Real** (implementado 2026-09-21):
  - **Diagnóstico da Causa Raiz**:
    - Quando o usuário registrava despesas manuais normais (`[+] Novo Lançamento`) para pagar contas fixas (ex: luz, água, internet, escola), essas transações não possuíam `linkedRecurringBillId` nem `isBillPayment: true`.
    - Consequentemente, as contas fixas cadastradas continuavam pendentes e, após a data de vencimento, passavam a exibir status de *"Vencida - Não Paga"* com alarmes falsos, penalizando o *Saldo Livre Real* duas vezes: uma vez pelo débito realizado no extrato e outra pela retenção projetada em `contasFuturasMes`.
  - **Solução Arquitetural Aplicada**:
    1. **Motor de Reconhecimento Semântico & Tolerância Financeira (`src/utils/reconciliationMatcher.ts`)**:
       - Normalização textual com clusters de sinônimos de concessionárias e serviços brasileiros (`energia`, `luz`, `enel`, `cpfl`, `cemig`; `agua`, `sabesp`, `sanepar`; `internet`, `fibra`, `vivo`, `claro`; `aluguel`, `condominio`; etc.).
       - Similaridade Jaccard/Levenshtein e tolerância percentual de valor financeiro de até ±15% para contas de consumo variável.
       - Funções `findMatchingBillsForTransaction` (executada em tempo real no formulário, <1ms, 100% offline) e `findCandidateTransactionsForBill` (para auditoria e cruzamento de extrato no mês corrente).
    2. **Ações Atômicas de Conciliação no Serviço (`src/services/transactionService.ts`)**:
       - `reconcileTransactionWithBill`: Vincula transação existente (`linkedRecurringBillId`, `isBillPayment: true`) e atualiza a conta (`lastPaidDate`) com atualização otimista imediata no React Query cache sem criar nova transação (0 risco de duplicidade de lançamento).
       - `markBillPaidDirectly`: Baixa manual direta sem movimentação no extrato para pagamentos externos/espécie.
    3. **Blindagem do Saldo Livre Real (`src/utils/calculations.ts`)**:
       - Alinhada a verificação `jaPaga` com `isBillPaid` de `invoiceUtils.ts`, garantindo que contas conciliadas ou detectadas como pagas não permaneçam indevidamente retidas em `contasFuturasMes`.
    4. **Formulário Reativo (`TransactionForm.tsx` & `AppLayout.tsx`)**:
       - Desacoplado via prop `recurringBills`. Ao digitar descrição ou valor compatível com conta pendente, exibe chip de sugestão proativa: *"Detectamos a conta pendente: [Nome] (vencimento dia X). Deseja vincular e baixar?"* com botão *"Vincular e Baixar"*.
       - Em `useTransactions.ts`, adição de sincronização automática de `lastPaidDate` na criação, parcelamento e edição quando `linkedRecurringBillId` estiver presente.
    5. **Painel de Obrigações Pendentes (`PendingObligations.tsx` & `Dashboard.tsx`)**:
       - Banner de conciliação em lote quando múltiplas contas têm pagamentos detectados com botão *"Conciliar Todas (X)"*.
       - Card contextual de sugestão em cada conta pendente/vencida com botão *"Conciliar e Baixar"* e opção de *"Ignorar"*.
       - Botão de baixa manual direta (*"Já paguei sem débito"* via `CircleCheckBig`).
       - Atualização dos botões "Pagar" em `PendingObligations.tsx` e `UrgentBillsSheet.tsx` para passar `linkedRecurringBillId` e `isBillPayment: true`.
    6. **Nexus Advisor Triggers (`useNexusAdvisorTriggers.ts`)**:
       - Filtro para desconsiderar contas recorrentes já quitadas no mês atual dos alertas de tensão no caixa dos próximos 5 dias.
  - **Validação**:
    - 41/41 testes unitários aprovados (`reconciliationMatcher.test.ts`, `invoiceUtils.test.ts`, `PendingObligations.test.tsx`, `TransactionForm.test.tsx`).
    - Build de produção Vite (`npm run build`) concluído com 100% de sucesso em 57.19s e 0 erros.
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.

- **Agenda Mobile — Reestruturação Responsiva em 2 Linhas Funcionais do Cabeçalho (Desembolamento de Ícones/Ações)** (implementado 2026-09-20):
  - **Diagnóstico da Causa Raiz**:
    - No cabeçalho da Agenda (`AgendaHub.tsx`), os blocos de Ações Globais (Título "Agenda", badges de status, botões "Nexus", "Sincronizar" e "Atalho") e Visões Rápidas ("HOJE", "Próximos", "Semana", "Pesquisar") compartilhavam a mesma linha superior através de um grid 50%/50% (`grid-cols-2`).
    - A soma das larguras físicas dos 8 elementos em linha única totalizava ~471px, enquanto a largura útil de um smartphone padrão (360px a 412px) é de apenas ~336px a 388px.
    - Isso forçava os botões a colidirem no centro, espremendo os ícones e quebrando o layout em celulares ("embolados").
  - **Solução Arquitetural Aplicada**:
    - Reestruturação responsiva sem duplicação de nós no DOM (preservação estrita de todos os `data-testid`s e acessibilidade):
      - **Linha 1 (Superior Mobile / `col-span-2 md:col-span-1` / `justify-between`)**: Identidade e Ferramentas Globais. À esquerda: Título "Agenda" e badges de conectividade; à direita: botões "Nexus", "Sincronizar" (com texto oculto em mobile via `hidden sm:inline`) e "Atalho" (mobile-only).
      - **Linha 2 (Inferior Mobile / Linha 2 do Grid)**: Navegação Temporal e Filtros de Visualização. À esquerda/centro: Seletor de Mês compacto (`< MARÇO 2026 > | 📅`); à direita: botões de filtro rápido "HOJE", "Próximos", "Semana" e "Pesquisar".
      - **Desktop (`md:`) 100% Intacto**: No desktop (`md:grid-cols-[1fr_auto_1fr] md:h-14`), a barra se mantém horizontal e unificada em 3 colunas (Esquerda: Título e Ferramentas; Centro: Mês; Direita: Filtros).
  - **Validação**:
    - 81/81 testes unitários aprovados (`AgendaHub.test.tsx`, `AgendaHub.search.test.tsx`, `AgendaHub.week.test.tsx`).
    - Build de produção Vite (`tsc -b && vite build`) concluído com 100% de sucesso e 0 erros.

- **Atualização do APK Android Release (v1.1.2 / Build 4) & Disponibilização em Produção** (implementado 2026-09-19):
  - **Identificação & Solicitação do Usuário**:
    - Após a consolidação do Nexus Soberano (Gemini 3.8 Flash, omnisciência de dados e extinção de bloqueios estáticos), o usuário autorizou expressamente a geração e disponibilização do APK atualizado para todos os usuários.
  - **Ações de Engenharia & Build**:
    - **Controle de Versão**:
      - `android/app/build.gradle`: Incrementados `versionCode 4` e `versionName "1.1.2"`, garantindo compatibilidade de atualização in-place transparente no Android Package Manager sem conflitos.
      - `package.json`: Versão atualizada para `1.1.2`.
      - `src/pages/DownloadPage.tsx`: Descrição atualizada para *"Versão 1.1.2 • ~53 MB"*.
    - **Compilação Web & Sincronização Nativa**:
      - Build de produção Vite concluído com 100% de sucesso em 1m 29s (`dist/`).
      - Sincronização nativa executada via `npx cap sync android` (12.46s).
    - **Compilação Gradle Release**:
      - Executado `gradlew.bat assembleRelease` com sucesso em 2m 13s (`BUILD SUCCESSFUL`).
      - Gerado APK de release assinado com tamanho otimizado de 52.9 MB (52.926.523 bytes).
    - **Distribuição & Deploy**:
      - APK copiado para `public/download/FinancasProInvest.apk` e `dist/download/FinancasProInvest.apk`.
      - Deploy do Firebase Hosting concluído com sucesso (`https://financas-pro-invest.web.app`).
      - Verificação HTTP ao vivo via `curl -I`: status `200 OK`, `Content-Type: application/vnd.android.package-archive`, `Content-Length: 52926523`.

- **Nexus Soberano — Omnisciência Financeira (Contas/Cartões/Faturas), Postura CFP Estratégica & Migração para Gemini 3.8 Flash** (implementado 2026-09-19):
  - **Identificação & Objetivos**:
    - O usuário forneceu sua chave oficial do Gemini Pro (`AQ.Ab8RN6...`) e solicitou atuação de desenvolvedor sênior / parceiro estratégico: colocar a nova chave em todo o app onde se usa IA, migrar para o modelo superior mais potente (`gemini-3.8-flash`), extinguir o bloqueio engessado da CVM e transformar o Nexus em uma inteligência soberana com visão total de todos os dados financeiros.
  - **Soluções Arquiteturais Implementadas**:
    1. **Chave Oficial no Google Cloud Secret Manager**:
       - `GEMINI_API_KEY` atualizada e validada no Google Secret Manager do projeto `financas-pro-invest`.
    2. **Roteamento Primário para `gemini-3.8-flash`**:
       - `MultiModelRouter.ts`: Provedor `gemini` configurado como Prioridade 1 com modelo primário `gemini-3.8-flash` (fallback resiliente para `gemini-3.5-flash` e `gemini-flash-latest`) via endpoint OpenAI-compatible (`https://generativelanguage.googleapis.com/v1beta/openai`).
       - Groq rebaixado para Prioridade 2 e OpenRouter para Prioridade 3.
       - `verifyPixReceipt.ts`: Lista de modelos candidatos atualizada para `['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest']`.
       - `generateDebtPlan.ts`: Atualizado para passar a chave do Gemini ao router.
    3. **Extinção do Bloqueio Engessado da CVM & Postura CFP**:
       - Removido o filtro estático via regex em `askAiAdvisor.ts` que bloqueava antecipadamente perguntas como "onde investir 1000 reais?".
       - Atualizada a identidade soberana do Nexus (`identity.ts`) com postura de planejador financeiro sênior (nível CFP): analisar a hierarquia de soberania financeira do usuário (1º amortizar dívidas caras/rotativo; 2º reserva de emergência em liquidez diária/pós-fixada; 3º objetivos e alocação macro por classes de ativos sem emitir call de compra/venda de ativos pontuais).
    4. **Omnisciência de Dados (Contas Fixas, Cartões & Faturas)**:
       - Adicionadas leituras server-side de `users/{userId}/contas_fixas`, `users/{userId}/cartoes` e `users/{userId}/faturas` em `askAiAdvisor.ts`.
       - Implementados `formatBillsSummary` e `formatCardsSummary` em `data-integrator.ts` e injetados via `PromptBuilder.ts`.
       - O Nexus agora possui visão 100% holística de receitas, despesas, metas, ativos, passivos, dívidas, contas fixas, limites e faturas em aberto.
  - **Deploy & Validação**:
    - 243/243 testes unitários no backend passando com 100% de sucesso (`askAiAdvisor`, `multiModelRouter`, `verifyPixReceipt`, `adminPixAudit`, `nexusAgendaInterpret`, etc.).
    - Deploy concluído com sucesso no Google Cloud Functions v2: `askAiAdvisor`, `generateDebtPlan` e `verifyPixReceipt` ativos em `us-central1`.
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.

- **Gestão de Usuários Mobile — Scroll Unificado de Conteúdo Superior e Cabeçalho Estático (Sticky)** (implementado 2026-09-18):
  - **Diagnóstico do Problema Mobile**:
    - No modal de Gestão de Usuários (`AdminUsersModal.tsx`), acessível exclusivamente para `leolimacr@hotmail.com`, as seções de KPIs superiores ("TOTAL DE USUÁRIOS", "PREMIUM", "PRO", "FREE", "ABANDONO") e os controles de filtro/busca ocupavam mais da metade da tela vertical em dispositivos móveis, deixando espaço visível para apenas 2 linhas de usuários.
    - O container de scroll anterior estava restrito apenas ao bloco da tabela de usuários, impedindo que o usuário rolasse os cards de resumo e filtros para fora do campo de visão para ampliar a visualização da lista.
  - **Solução Arquitetural Aplicada**:
    - **Scroll Unificado de Conteúdo**:
      - Movimentados os blocos superiores de métricas (KPIs), barra de busca, filtros de status/plano e contador ("Exibindo X de Y") para dentro do mesmo container com rolagem vertical unificada (`overflow-y-auto flex-1 flex flex-col`).
      - Ao rolar para baixo no mobile ou desktop, os cards e filtros sobem suavemente, expandindo a área útil de visualização da lista de usuários para praticamente 100% da tela.
    - **Cabeçalho Estático / Congelado (`Sticky Header`)**:
      - A tag `<thead>` e cada uma de suas células `<th>` ("Usuário", "Plano", "Grau de abandono (0-6)", "Último Acesso", "Lançamentos", "Status") receberam `sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md` com borda inferior `border-b border-slate-200/80 shadow-sm`.
      - Garante que, ao rolar a lista de usuários, o cabeçalho fica perfeitamente ancorado no topo do modal, mantendo a legenda de cada coluna sempre legível.
  - **Validação & Deploy**:
    - 6/6 testes unitários em `src/components/Admin/__tests__/` aprovados com 100% de sucesso.
    - Build de produção do Vite concluído com 0 erros.
    - Deploy concluído com sucesso no Firebase Hosting (`https://financas-pro-invest.web.app`).
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.

  - **Diagnóstico Integral & Transformação do Ecossistema de Notificações**:
    - Antes, notificações conduziam para telas genéricas (`manager`, `minhas-dividas`, `home`, ou rotas inexistentes como `/metas/:id` que geravam erro 404 e redirecionamento deslogado), forçando o usuário a caçar manualmente onde estava a pendência citada.
    - Transformação completa executada para que **TODAS** as notificações do Finanças Pro Invest levem imediatamente a uma ação decisiva com percepção de valor palpável:
      1. **Roteador Central de Deep Links (`src/utils/deepLinkRouter.ts`)**:
         - Normalização de `/metas/:id` para `/app/metas?highlight=:id` (elimina risco de 404).
         - Mapeamento contextual de `/nexus*` para `/app/ia` preservando parâmetros de contexto (`context=patrimonio`).
         - Preservação estrita de query strings em rotas limpas (`appendQuery` em `controla`, `manager`, `minhas-dividas`, `investimentos`, `metas`, `central`, `ia`, etc.).
      2. **Contas Fixas & Faturas a Vencer (`PendingObligations.tsx`)**:
         - Leitura de `view`, `filter`, `highlightBill`, `cardId`.
         - Auto-expansão da sanfona de contas (`billsExpanded = true`) quando `view === 'contas'` ou `filter === 'next5days'`.
         - Rolagem suave com realce visual pulsante (`ring-2 ring-amber-400 bg-amber-50/90`) e badge executivo *"Citada na Notificação"* diretamente na linha da conta referenciada, posicionando o botão "Pagar" em destaque imediato.
         - Banner contextual de antecipação de tensão nos próximos 5 dias quando `filter === 'next5days'`.
      3. **Gestão de Dívidas & Estratégia de Desalavancagem (`DebtManager.tsx`)**:
         - Leitura de `highlight` e `view` dos search params.
         - Ativação imediata do simulador/estratégia (`setShowSimulator(true)`) quando `view === 'estrategia'` ou `'simulador'`.
         - Rolagem suave até a dívida específica, abertura da projeção e badge pulsante *"Citada na Notificação"*.
      4. **Gestão de Metas Financeiras (`GoalManager.tsx`)**:
         - Leitura de `highlight` via query param.
         - Rolagem suave até a meta citada com realce esmeralda (`ring-2 ring-emerald-500 bg-emerald-50/80`) e badge *"Citada na Notificação"*.
      5. **Cockpit Executivo & Central (`AppCockpit.tsx`)**:
         - Leitura de `view === 'urgent-bills'` para abertura automática do `UrgentBillsSheet`.
      6. **Enriquecimento dos Gatilhos de Notificações**:
         - `useNexusAdvisorTriggers.ts`: Tensão no caixa (`controla?view=contas&filter=next5days`), saldo livre negativo (`controla?view=contas`), dívidas e juros (`minhas-dividas?view=estrategia`), capital ocioso (`investimentos?action=new-asset`), proteção com déficit (`central?view=protection`).
         - `useWealthPresenceTriggers.ts`: Metas próximas (`/app/metas?highlight=${goal.id}`), aportes (`/app/investimentos?tab=aportes`), patrimônio (`/app/patrimonio` e `/app/ia?context=patrimonio`).
         - `usePresenceTriggers.ts`: Dívidas a vencer (`minhas-dividas?highlight=${debtId}`), plano desatualizado (`minhas-dividas?view=estrategia`), contexto inativo (`controla?action=new-tx`).
         - `PresenceEventService.ts`: `createRecurringBillDue` agora envia `controla?view=contas&highlightBill=${bill.id}`.
         - `NotificationService.ts`: `scheduleRecurringBillDueNotification` envia `targetRoute: /app/controla?view=contas&highlightBill=${bill.id}`.
         - `rotativoService.ts`: Notificações de fatura rotativa e aplicação de juros direcionam com `highlight=${debtId}`.
         - `alarmService.ts`: Alarmes da agenda levam cirurgicamente ao compromisso na semana (`agenda?view=week&highlight=${id}&date=${date}`).
  - **Deploy & Validação**:
    - 37/37 testes unitários aprovados (`deepLinkRouter`, `PendingObligations`, `useNexusAdvisorTriggers`).
    - 7/7 testes de checkout Pix aprovados.
    - Build de produção Vite concluído em 54.23s com 0 erros.
    - Deploy no Firebase Hosting (`https://financas-pro-invest.web.app`) concluído com 0 erros.
    - **APK Release Android mantido 100% intacto**, conforme orientação soberana.
- **Mobile: Notificações Inteligentes, Foco Cirúrgico na Agenda & Blindagem de Safe Area Top / Download** (implementado 2026-09-17):
  - **Diagnóstico & Resolução dos 4 Pontos**:
    1. **Notificação Diária em Loop ("Hora de Organizar?")**:
       - Causa: `@capacitor/local-notifications` com `repeats: true` sem `every: 'day'` disparava em loop a cada ~2 minutos no Android. O hook `useAppState.ts` também reagendava a cada alteração de estado.
       - Solução: Adicionado explicitamente `every: 'day'` e `allowWhileIdle: true` em `NotificationService.ts`. No hook `useAppState.ts`, adicionada ref `lastDailyReminderSignatureRef`. Caso `txToday > 0`, o lembrete diário é imediatamente cancelado (`cancelCategory('daily_reminder')`), evitando incomodar quem já registrou transações no dia.
    2. **Notificação da Agenda com Foco Cirúrgico e Painel "Sua Semana em Foco"**:
       - Causa: A notificação de compromissos abria a Agenda sem qualquer contexto do compromisso citado.
       - Solução: Deep link enriquecido (`agenda?view=week&highlight=${id}&date=${date}`) em `useNexusAdvisorTriggers.ts` e `deepLinkRouter.ts`. Em `AgendaHub.tsx`, criado o painel executivo "Sua Semana em Foco (Próximos 7 Dias)" com lista cronológica, badge "Citado na Notificação" e botão "Ver no Caderno" que rola diretamente até a linha com efeito de foco e realce visual suave por 4,5s. Adicionado também o botão "Semana" no cabeçalho de ações.
    3. **Botão "X" de Fechar no Mobile Colado na Bateria**:
       - Em `NotificationHub.tsx`, `AppMobileDrawer.tsx` e `BaseDeProtecaoDrawer.tsx`, aplicado recuo seguro `pt-[max(1.75rem,calc(env(safe-area-inset-top)+1rem))]` e área de toque expandida (`p-2.5 rounded-xl`), desobstruindo totalmente a barra de status/bateria nativa.
    4. **Página de Download Coberta pelo Cabeçalho Fixo**:
       - Em `DownloadPage.tsx`, aumentado o padding superior para `pt-[max(7.5rem,calc(env(safe-area-inset-top)+5.5rem))] sm:pt-28 md:pt-32`, deixando o selo de acesso antecipado Android perfeitamente visível abaixo da barra fixa.
  - **Deploy & Validação**:
    - 41/41 testes unitários aprovados (`deepLinkRouter`, `AgendaHub.week`, `AgendaHub.search`, `NotificationHub`, `AppMobileDrawer`).
    - Build de produção Vite concluído em 1m 14s com 0 erros.
    - Deploy do Firebase Hosting (`https://financas-pro-invest.web.app`) concluído com 0 erros.
    - **APK Release mantido 100% intacto**, conforme orientação mandatória do usuário.
- **Menu Lateral Mobile (AppMobileDrawer) — Blindagem Contra Sobreposição da Barra de Navegação do Android (3 Botões)** (implementado 2026-09-17):
  - **Diagnóstico da Causa Raiz**:
    - No Android, a barra inferior de navegação do sistema (com os 3 botões clássicos: voltar ◁, minimizar/home ◯ e aplicativos recentes ▢) possui entre 48px e 64px de altura.
    - O drawer lateral (`AppMobileDrawer.tsx`) posicionava o botão "Sair da Conta" em um container inferior com padding padrão `p-6` (24px), fazendo com que a faixa inferior nativa do sistema sobrepusesse e encobrisse o botão.
  - **Solução Arquitetural Aplicada**:
    - `index.html`: Adicionado `viewport-fit=cover` à meta tag viewport para habilitar as variáveis nativas de safe area (`env(safe-area-inset-bottom)`).
    - `src/components/AppMobileDrawer.tsx`:
      - Atualizado o rodapé do botão "Sair da Conta" com padding seguro responsivo: `pb-[max(3.5rem,calc(env(safe-area-inset-bottom)+1.5rem))]` e `shrink-0`.
      - Garante no mínimo 56px (`3.5rem`) de recuo da base da tela mais a safe area, elevando o botão para uma zona 100% visível e com touch target confortável acima da barra nativa do Android.
      - Adicionado `pb-8` na lista com scroll interno para proteger o último botão caso o usuário role até o fim.
  - **Deploy & Validação**:
    - 7/7 testes de `AppMobileDrawer.test.tsx` passando com 100% de aprovação.
    - Build de produção Vite concluído em 55.88s com 0 erros.
    - Deploy do Firebase Hosting (`https://financas-pro-invest.web.app`) concluído com 0 erros.
    - **APK Release mantido intacto**, conforme orientação do usuário.
- **Esteira Pix Soberana — Visualizador de Comprovantes com Zoom/PDF, Devolução de Valor Inferior via Chave Pix (2 Dias) e Notificações Resend** (implementado 2026-09-17):
  - **Identificação da Necessidade & Arquitetura**:
    - O visualizador anterior exibia comprovantes pequenos e ilegíveis para auditoria em desktop/mobile, sem controles de ampliação ou rotação para autenticações bancárias miúdas.
    - Quando um usuário transfere valor inferior (ex: R$ 1,00 para plano de R$ 19,90), o sistema não deve apenas rejeitar: o comprovante deve ir imediatamente para a fila do Leo (`_pixAuditQueue`), disparar um e-mail de aviso via Resend e abrir um formulário no app para o usuário cadastrar sua chave Pix de devolução.
    - A chave Pix de devolução deve obrigatoriamente ser de titularidade de quem realizou a transferência (`payerName`), com prazo garantido de estorno de até 2 dias úteis.
    - Na fila do Leo, um botão "Confirmar Pix de Devolução Realizado" permite ao administrador atestar o estorno no extrato bancário, disparando automaticamente um e-mail com comprovante de estorno ao cliente.
    - Todas as menções e rótulos de "IA" foram eliminados das interfaces e substituídos pela autoridade do "Sistema Finanças Pro Invest".
  - **Backend (`functions/`)**:
    - `functions/mailService.ts`: Implementadas as funções `sendPixUnderpaidNotification` (alerta de valor insuficiente e solicitação da chave) e `sendPixRefundCompletedNotification` (confirmação formal de devolução com código da transação e valor).
    - `functions/verifyPixReceipt.ts`: Ao detectar `amount < targetPlan.price`, enfileira atomicamente em `_pixAuditQueue` com `status: 'underpaid'`, dispara o e-mail de alerta e retorna erro estruturado `UNDERPAID` com metadados para o frontend.
    - `functions/adminPixAudit.ts`:
      - `requestPixRefund`: Endpoint autenticado onde o cliente registra sua chave Pix e o tipo (CPF, E-mail, Celular, Chave Aleatória).
      - `completePixRefund`: Endpoint restrito ao Leo (`leolimacr@hotmail.com`) para registrar a efetivação da devolução e disparar o e-mail automático via Resend.
      - `listPixAuditQueue`: Campos de devolução e dados do pagador integrados na listagem executiva.
    - `functions/index.ts`: Exportadas `requestPixRefund` e `completePixRefund`.
  - **Frontend (`src/`)**:
    - `components/Admin/DocumentViewerModal.tsx`: Visualizador soberano com zoom progressivo (100% até 400%), zoom out, reset, rotação de 90° em 90°, suporte nativo a PDF (iframe), abertura em nova aba e download.
    - `components/Admin/PixAuditQueueModal.tsx`: Integrado o `DocumentViewerModal`, card de detalhes de estorno para itens com status `underpaid`, modal de confirmação e botão "Confirmar Pix de Devolução Realizado".
    - `components/Billing/PixReceiptCheckoutModal.tsx`: Formulário inteligente de devolução para valor menor (`step === 'underpaid_refund'`), validação de chave Pix, aviso mandatório de mesmo titular e prazo garantido de até 2 dias úteis.
    - Substituição integral de referências a "IA" por "Sistema Finanças Pro Invest" no Checkout e na Página de Preços (`PricingPage.tsx`).
  - **Deploy & Validação**:
    - Deploy de todas as Cloud Functions concluído com sucesso (`us-central1`, Node.js 22, 2nd Gen).
    - Deploy do Firebase Hosting (`https://financas-pro-invest.web.app`) concluído com 0 erros.
    - **APK Release mantido intacto**, conforme exigência do usuário.
    - 13/13 testes do frontend Pix e 229/229 testes de backend passando com 100% de sucesso.
    - Compilação `tsc` e Vite build concluídos com 0 erros.
- **Google Gemini — Migração para Gemini 2.5 Flash & Fallback Resiliente para gemini-flash-latest (Resolução do Erro 404)** (implementado 2026-09-17):
  - **Diagnóstico da Causa Raiz**:
    - O envio do comprovante Pix pelo usuário retornou `[404 Not Found] models/gemini-1.5-flash is not found for API version v1beta`.
    - Uma inspeção ao vivo via `ModelService.ListModels` com a chave do Google AI Studio do usuário revelou que a família legada 1.5 foi aposentada pelo Google na versão `v1beta`.
    - Os novos modelos multimodais de alta velocidade suportados são `gemini-2.5-flash` e o alias dinâmico `gemini-flash-latest`.
  - **Solução Arquitetural Aplicada**:
    - `functions/verifyPixReceipt.ts`: Atualizado para invocar primariamente `gemini-2.5-flash`.
    - Implementado mecanismo de resiliência com fallback automático para `gemini-flash-latest` em caso de indisponibilidade ou futuras atualizações do Google.
  - **Deploy & Validação**:
    - Deploy da Cloud Function `verifyPixReceipt` atualizado com sucesso no Google Cloud (`Node.js 22, 2nd Gen, us-central1`).
    - Compilação `tsc` concluída com 0 erros.
    - Testes unitários com Vitest passando com 100% de aprovação.
    - **APK Release mantido intacto**, conforme orientação prévia.
- **Esteira de Auditoria Soberana Pix para o Administrador — Tripla Via de Decisão & Confirmação por Inércia (3 Dias)** (implementado 2026-09-17):
  - **Identificação da Necessidade & Arquitetura**:
    - O modelo de liberação instantânea pela IA (Gemini Flash) em 2 segundos permite uma conversão rápida e sem fricção. No entanto, para blindagem total contra comprovantes adulterados ou transferências canceladas, foi implementada uma **Esteira de Auditoria Manual com Tripla Via de Decisão** para o administrador autorizado, permitindo conferência no extrato bancário institucional.
    - **Tripla Via**:
      1. **Confirmar Pagamento (`confirm`)**: O administrador visualiza o comprovante, confere que o valor entrou na conta e clica em "Confirmar Pagamento". Status atualizado para `confirmed`, mantendo a assinatura ativa.
      2. **Revogar Assinatura (`revoke`)**: Caso o comprovante seja falso ou o valor não tenha sido creditado, com 1 clique o administrador revoga a assinatura. O usuário é imediatamente rebaixado para o plano Gratuito (`tier: 'free'`, `status: 'revoked'`) e recebe notificação in-app explicativa.
      3. **Inércia / Não Fazer Nada (`auto_confirmed`)**: Se o administrador estiver ocupado e não tomar nenhuma ação em até **3 dias corridos** (`deadline = now + 3 dias`), o sistema considera o pagamento tacitamente aprovado e efetivado por inércia.
  - **Backend (`functions/`)**:
    - `functions/verifyPixReceipt.ts`: Ao validar o comprovante e ativar o plano do usuário, agora enfileira o registro atomicamente na coleção `_pixAuditQueue/{cleanTxId}` contendo valor, plano, pagador, favorecido, bancos, data, ID da transação, preview em Base64 do comprovante e prazo de inércia (`deadline` de 3 dias).
    - `functions/adminPixAudit.ts`:
      - `listPixAuditQueue`: Endpoint autenticado restrito rigorosamente a `leolimacr@hotmail.com`. Lista os últimos 50 comprovantes ordenados por `createdAt desc`, calculando dinamicamente o status efetivo com base no prazo de inércia.
      - `reviewPixAudit`: Endpoint autenticado restrito a `leolimacr@hotmail.com` para executar ações atômicas (`confirm` ou `revoke`). Ao revogar, rebaixa `users/{userId}/billing/main`, `users/{userId}` e cria documento em `users/{userId}/notifications`.
    - `functions/index.ts`: Exportadas `listPixAuditQueue` e `reviewPixAudit`.
  - **Frontend (`src/`)**:
    - `types/billing.ts` & `config/featureAccessMatrix.ts`: Adicionado status `'revoked'` a `BillingStatus`, mapeado com tier efetivo `'free'`.
    - `services/adminPixAuditService.ts`: Serviço tipado para listar fila e aplicar decisões.
    - `components/Admin/PixAuditQueueModal.tsx`: Modal executivo moderno com regras da tripla via, visualizador com zoom do comprovante, badges em tempo real (Pendente com contagem regressiva, Efetivado por Inércia, Confirmado Manualmente, Revogado) e diálogo de revogação com motivo personalizado.
    - `components/AppHeader.tsx`, `components/AppMobileDrawer.tsx`, `components/Home/HomeConteudo.tsx`: Botão de acesso rápido "Auditoria Pix" com ícone de escudo, exibido exclusivamente quando o usuário autenticado for `leolimacr@hotmail.com`.
    - `layouts/AppLayout.tsx`: Integração global do modal e banner acolhedor de aviso caso a conta do usuário esteja com status revogado.
  - **Deploy & Validação**:
    - Deploy das 3 Cloud Functions com sucesso no Google Cloud (`verifyPixReceipt`, `listPixAuditQueue`, `reviewPixAudit` no Node.js 22, 2nd Gen, us-central1).
    - Deploy do Firebase Hosting (`https://financas-pro-invest.web.app`) concluído com sucesso.
    - **APK Release mantido intacto**, conforme orientação prévia do usuário.
    - 246 testes unitários passando com 100% de sucesso (incluindo `adminPixAudit.test.ts` e `PixAuditQueueModal.test.tsx`).
    - Compilação `tsc` das functions e build Vite concluídos com zero erros.
- **Esteira Pix com IA — Resolução do Erro "Atenção ao Comprovante internal", Validação Inteligente & Auto-Upgrade** (implementado 2026-09-17):
  - **Diagnóstico da Causa Raiz**:
    - A função `verifyPixReceipt` foi desenvolvida e testada localmente, mas não havia sido implantada no Google Cloud Functions (`functions:list` não a continha). A chamada do cliente retornava erro 404/gateway do Google Cloud, que o SDK do Firebase traduzia como `HttpsError: internal`.
    - No Google Cloud Secret Manager, a secret `GEMINI_API_KEY` estava configurada com valor fictício (`"dummy-gemini-key"`).
    - O bloco `catch` na Cloud Function lançava `HttpsError('internal', ...)`, que tem sua mensagem mascarada pelo Firebase na resposta HTTP para o cliente.
  - **Solução Arquitetural Aplicada**:
    - **Configuração da Secret no Secret Manager**: A chave oficial do Google AI Studio fornecida pelo usuário (`AIzaSyAJ...loB9I`) foi validada (50 modelos disponíveis) e atualizada no Secret Manager via `firebase functions:secrets:set GEMINI_API_KEY --project financas-pro-invest`.
    - **Validação Inteligente de Valor (`resolveMatchingPlan`) & Auto-Upgrade**:
      - Suporte a arredondamento para cima (ex: R$ 20,00 para o plano de R$ 19,90 ou R$ 40,00 para R$ 39,90).
      - Auto-upgrade dinâmico: se o usuário selecionou Pro Mensal (R$ 19,90) mas pagou R$ 39,90 (Premium Mensal) ou R$ 199,00 (Pro Anual), a IA identifica a correspondência e ativa o plano correspondente ao valor superior automaticamente.
      - Bloqueio imediato com mensagem clara caso o valor seja inferior ao plano contratado, sem queimar o comprovante.
    - **Blindagem no Backend (`functions/verifyPixReceipt.ts`)**:
      - Adicionado tratamento de preflight `OPTIONS` com CORS (HTTP 204).
      - Substituído `internal` por `invalid-argument` com mensagens de erro claras em português para evitar mascaramento pelo SDK.
      - Adicionado bloco global `try/catch` para captura de quaisquer exceções inesperadas.
    - **Blindagem no Frontend (`src/components/Billing/PixReceiptCheckoutModal.tsx`)**:
      - Sanitizador de erros técnicos para mensagens acolhedoras e em português quando houver falha de rede/conexão.
    - **Deploy de Produção**:
      - Deploy da Cloud Function executado com sucesso: `firebase deploy --only functions:verifyPixReceipt --project financas-pro-invest` (Node.js 22, 2nd Gen, us-central1).
      - Confirmada presença ativa em `firebase functions:list`.
      - Preflight `OPTIONS` validado com HTTP 204.
      - Chamada de verificação validada com retorno HTTP 401 (`UNAUTHENTICATED`).
      - Deploy no Firebase Hosting (`https://financas-pro-invest.web.app`) concluído com sucesso.
      - **APK Release mantido intacto**, conforme orientação do usuário.
  - **Testes & Validação**:
    - 6 testes unitários passando em `src/components/Billing/__tests__/PixReceiptCheckoutModal.test.tsx`.
    - 11 testes unitários passando em `functions/__tests__/verifyPixReceipt.test.ts`.
    - Compilação `tsc` das functions concluída com zero erros.
    - Build de produção Vite concluído com zero erros.

- **Página de Planos (PricingPage) — Reformulação Completa da Narrativa, Alinhamento de Preços e Compilação do APK Release** (implementado 2026-09-17):
  - **Identificação da Oportunidade & Pontos de Fricção**:
    - A página de planos anterior continha um banner obseleto de "Acesso Antecipado / Lista VIP", sugerindo que as assinaturas ainda não estavam abertas.
    - Havia divergência de preços exibidos nos cards (R$ 9,90 e R$ 19,90) em relação aos valores reais cobrados na esteira Pix (R$ 19,90 e R$ 39,90).
    - O seletor de ciclo (Mensal/Anual) ficava fragmentado e faltava uma hierarquia visual que conduzisse claramente o usuário a escolher entre o plano PRO e o plano PREMIUM.
  - **Solução Arquitetural Aplicada**:
    - **Narrativa e Hierarquia de Conversão (`src/components/PricingPage.tsx`, `config/stripePlans.ts`)**:
      - Substituição do aviso de Lista VIP pelo selo de alta conversão: `Ativação Instantânea via Pix • Liberação por IA em 2 Segundos`.
      - Seletor de ciclo unificado no topo da página: alternância fluida entre Mensal e Anual com badge de incentivo `2 meses grátis`.
      - Card **Free**: Sóbrio, posicionado como a base da organização diária com botão neutro *"Plano Atual"*.
      - Card **PRO**: Azul safira executivo focado em domínio do passado e linha do tempo (*"Seu Passado & Histórico"*), com R$ 19,90/mês ou R$ 199,00/ano.
      - Card **PREMIUM**: Posicionamento soberano supremo (*"Mais Escolhido • Comando Soberano"*), emoldurado com anel verde esmeralda, badge de recomendação e gradiente refinado, destacando o Nexus Estratégico, Gestor de Dívidas e Gestor de Patrimônio por R$ 39,90/mês ou R$ 399,00/ano.
      - Seção inferior didática de confiança explicando o processo de pagamento em 3 passos simples (Pague via Pix -> Anexe o Comprovante -> Liberação em 2s pela IA).
    - **Integração do Modal Pix**:
      - Botões de assinatura integrados diretamente ao `PixReceiptCheckoutModal`, transmitindo o `planId` e o valor correto (mensal ou anual).
    - **Atualização do APK Release**:
      - Recompilado via Gradle (`./gradlew assembleRelease`) com sucesso em 1m 56s (52.9 MB).
      - Disponibilizado e verificado em `public/download/FinancasProInvest.apk` e `dist/download/FinancasProInvest.apk`.
  - **Testes & Validação**:
    - 2 testes em `src/components/__tests__/PricingCopy.test.tsx` passando com 100% de sucesso.
    - 6 testes em `src/components/Billing/__tests__/PixReceiptCheckoutModal.test.tsx` passando com 100% de sucesso.
    - 6 testes em `src/components/Billing/__tests__/AsaasPixCheckoutModal.test.tsx` passando com 100% de sucesso.
    - 6 testes em `functions/__tests__/verifyPixReceipt.test.ts` passando com 100% de sucesso.
    - 4 testes em `functions/__tests__/asaasSubscription.test.ts` passando com 100% de sucesso.
    - Build de produção Vite concluído em 57.40s com 0 erros.
    - Sincronização nativa Android concluída com sucesso via `npx cap sync android`.

- **Esteira Soberana de Pagamentos — Validação Inteligente de Comprovante Pix com Gemini Flash** (implementado 2026-09-16):
  - **Identificação da Oportunidade & Automação 100%**:
    - O sistema conta com esteira automatizada para recebimento de pagamentos via Pix direto na conta institucional autorizada, com auditoria inteligente por inteligência artificial para conferência de comprovantes.
  - **Solução Arquitetural Aplicada**:
    - **Backend (`functions/`)**:
      - `pixManualConfig.ts`: Configuração da favorecida institucional autorizada e utilitários de normalização fonética e validação forense de nomes (`validateRecipientName`).
      - `verifyPixReceipt.ts`: Cloud Function `onCall` autenticada equipada com `secrets: [GEMINI_API_KEY]`.
        - Utiliza visão multimodal do **Google Gemini Flash** (`gemini-1.5-flash`) com `responseMimeType: 'application/json'` para extração forense: status de Pix concluído, valor transferido, nome da favorecida, data e ID de transação/código de autenticação bancária.
        - Camada anti-fraude e anti-duplicação no Firestore com coleção `_processedPixReceipts/{transactionId}`, impedindo reaproveitamento de comprovantes.
        - Ativação atômica em lote (`batch`) em `users/{userId}/billing/main` e `users/{userId}` com `status: 'active'`, `tier: 'pro' | 'premium'` e validade de 30 dias (mensal) ou 365 dias (anual).
      - `functions/index.ts`: Exportada `verifyPixReceipt`.
    - **Frontend (`src/`)**:
      - `pixReceiptService.ts`: Serviço do cliente para conversão de arquivo (imagem/PDF) em Base64 e chamada da função.
      - `PixReceiptCheckoutModal.tsx`: Modal interativo com detalhes da Chave Pix, QR Code estático via `qrcode.react`, botão de cópia rápida em 1 clique, área de upload com preview e botão *"Validar Comprovante com IA"* com animação de auditoria em 3 etapas e tela de sucesso imediata.
      - `PricingPage.tsx`: Integrado como modal principal nos botões dos planos Pro e Premium.
  - **Testes & Validação**:
    - 6 testes unitários passando em `functions/__tests__/verifyPixReceipt.test.ts`.
    - 6 testes unitários passando em `src/components/Billing/__tests__/PixReceiptCheckoutModal.test.tsx`.
    - 6 testes unitários passando em `src/components/Billing/__tests__/AsaasPixCheckoutModal.test.tsx`.
    - 2 testes passando em `src/components/__tests__/PricingCopy.test.tsx`.
    - Compilação do Cloud Functions concluída com 0 erros (`tsc`).
    - Build de produção Vite concluído em 1m 22s com 0 erros.
    - APK Android Release recompilado via `./gradlew assembleRelease` (52.9 MB) e disponibilizado para download em `public/download/FinancasProInvest.apk` e `dist/download/FinancasProInvest.apk`.
    - Sincronização nativa Android concluída com sucesso via `npx cap sync android`.

- **Esteira Soberana de Pagamentos — Asaas Pix Recorrente em Nome de Pessoa Física (CPF da Esposa)** (implementado 2026-09-16):
  - **Identificação da Oportunidade & Restrição Regulatória**:
    - O usuário possui restrição contratual e regulatória como funcionário CLT de instituição financeira para receber pagamentos comerciais em seu próprio nome ou CPF.
    - Para permitir a monetização imediata das assinaturas do Finanças Pro Invest sem violar as regras bancárias, toda a esteira de cobrança foi arquitetada para operar na conta Asaas de Pessoa Física da esposa (CPF dela) com Pix Recorrente.
  - **Solução Arquitetural Aplicada**:
    - **Backend (`functions/`)**:
      - `asaasConfig.ts`: Definição de planos Pro (R$ 19,90/mês, R$ 199,00/ano) e Premium (R$ 39,90/mês, R$ 399,00/ano), ambientes Sandbox e Produção.
      - `getAsaas.ts`: Cliente HTTP resiliente com criação/localização de clientes (`customers`), emissão de assinaturas Pix (`subscriptions`) e obtenção de QR Code base64 e Pix Copia e Cola.
      - `createAsaasPixSubscription.ts`: Cloud Function `onCall` autenticada que valida o CPF, dispara a criação da assinatura Pix e armazena metadados de auditoria em `users/{userId}/billing/pending_asaas`.
      - `handleAsaasWebhook.ts`: Cloud Function `onRequest` receptiva para webhooks do Asaas, com validação de token `asaas-access-token`, idempotência em `_asaasEvents/{eventId}` e atualização atômica de `users/{userId}/billing/main` e `users/{userId}` com `tier: 'pro' | 'premium'`, `status: 'active'` e `currentPeriodEnd`.
    - **Frontend (`src/`)**:
      - `asaasService.ts`: Wrapper tipado para a função Cloud.
      - `AsaasPixCheckoutModal.tsx`: Modal interativo moderno com formulário com máscaras de CPF e celular, QR Code em alta definição, campo Pix Copia e Cola com cópia em 1 clique, timer de 30 minutos e transição reativa em tempo real para tela de sucesso guiada pelo Firestore (`onSnapshot`).
      - `PricingPage.tsx`: Botões de upgrade dos planos Pro e Premium integrados diretamente ao novo fluxo Pix.
  - **Testes & Validação**:
    - 4 testes unitários passando em `functions/__tests__/asaasSubscription.test.ts`.
    - 6 testes unitários passando em `src/components/Billing/__tests__/AsaasPixCheckoutModal.test.tsx`.
    - 2 testes passando em `src/components/__tests__/PricingCopy.test.tsx`.
    - Compilação do Cloud Functions concluída com 0 erros (`tsc`).
    - Build de produção Vite concluído em 55.67s com 0 erros.
    - Sincronização nativa Android concluída com sucesso via `npx cap sync android`.

- **Agenda — Sistema de Pesquisa por Palavras-Chave e Blindagem de Layout no Nexus** (implementado 2026-09-16):
  - **Identificação de Oportunidades & Pontos de Fricção**:
    - Faltava um mecanismo simples e rápido para localizar compromissos específicos na Agenda por palavras-chave (ex: "catequese", "médico", "condomínio") sem precisar navegar mês a mês.
    - No card de proposta do Nexus na Agenda, o checkbox *"Mostrar o horário da agenda"* ficava na mesma linha horizontal do balãozinho e da palavra *"COMPROMISSO"*, causando sobreposição/encavalamento de elementos em telas de celular.
  - **Solução Arquitetural Aplicada**:
    - **Pesquisa Soberana Híbrida (`AgendaHub.tsx`, `agendaCache.ts`, `agendaService.ts`)**:
      - Adicionado botão `<Search size={13} /> Pesquisar` no cabeçalho superior ao lado de *Próximos*.
      - Painel dinâmico com campo de busca com debounce de 250ms, busca instantânea no cache local em disco (`searchCachedCommitments`) e busca complementar no Firestore (`searchCommitments`) com rigor FinOps.
      - Lista de resultados com data formatada, horário, checkbox para marcar como concluído, botão de exclusão e navegação em 1 toque diretamente para o dia no caderno (`goToDate`).
      - Suporte a fechar via tecla `Escape` ou botão `✕`.
    - **Blindagem Visual do Nexus (`AgendaNexusAssistant.tsx`)**:
      - Reorganização do card de proposta em fluxo vertical dedicado: Linha 1 para identificação e título completo do compromisso, e Linha 2 para a opção de exibição do horário com separador limpo e touch target amplo.
  - **Testes & Validação**:
    - 4 testes unitários e de integração em `AgendaHub.search.test.tsx` passando com 100% de sucesso.
    - 7 testes em `agendaCache.test.ts` passando com 100% de sucesso.
    - 40 testes em `AgendaNexusAssistant.test.tsx` passando com 100% de sucesso.
    - 74 testes em `AgendaHub.test.tsx` passando com 100% de sucesso.
    - Build de produção Vite concluído em 53.79s com 0 erros.
    - Sincronização nativa Android concluída com sucesso via `npx cap sync android`.

- **Nexus na Agenda — Otimização de Leveza, Eficiência, Diálogo Humanizado e Chips Rápidos** (implementado 2026-09-16):
  - **Identificação de Oportunidades & Pontos de Fricção**:
    - Ao cadastrar compromissos sem horário no Nexus, o usuário precisava digitar a resposta no teclado do celular para esclarecer a hora.
    - As mensagens de clarificação de recorrência eram técnicas e impessoais.
    - Faltavam sugestões rápidas ao abrir o Nexus (zero state) e proteção contra submissão quando offline.
    - Após o commit do Nexus, mutações de recorrências para outros meses podiam não invalidar o cache local particionado em disco.
  - **Solução Arquitetural Aplicada**:
    - **Chips de Resposta Rápida em 1 Toque (`nexusAgendaInterpret.ts`)**:
      - Introduzido `TIME_GAP_REFINEMENT` com opções imediatas: `['Sem horário', '09:00', '14:00', '19:00']`.
      - Humanização da mensagem de recorrência para linguagem acolhedora (*"Entendi que você quer uma recorrência. Até quando gostaria de repetir esse compromisso?"*) com chips `['Até o final do ano', 'Sem prazo máximo']`.
    - **Interface Leve e Fluida (`AgendaNexusAssistant.tsx`)**:
      - Sugestões de uso rápido ao abrir o Nexus (*"Dentista amanhã às 14h"*, *"Reunião toda terça às 10h"*, etc.).
      - Detecção de rede (`navigator.onLine`): desabilitação graciosa do envio e placeholder explicativo (*"Sem conexão com a internet..."*).
      - Resumo límpido sem duplicações de elementos de horário na proposta.
    - **Sincronia Total de Cache (`AgendaHub.tsx`)**:
      - `reloadAgendaAfterNexus` dispara `clearUserAgendaCache(userId)` antes de recarregar, garantindo que alterações e séries em meses futuros reflitam imediatamente no cache local em disco.
  - **Testes & Validação**:
    - 85 testes em `nexusAgendaInterpret.test.ts` passando com 100% de sucesso.
    - 45 testes em `nexusAgendaCommit.test.ts` passando com 100% de sucesso.
    - 40 testes em `AgendaNexusAssistant.test.tsx` passando com 100% de sucesso.
    - 37 testes em `useAgendaNexus.test.tsx` passando com 100% de sucesso.
    - 74 testes em `AgendaHub.test.tsx` passando com 100% de sucesso.
    - Build de produção Vite concluído em 59.42s com 0 erros.
    - Sincronização nativa Android concluída com sucesso via `npx cap sync android`.

- **Agenda — Dia Atual Sublinhado e Diferenciação Cromática de Sábado e Domingo** (implementado 2026-09-15):
  - **Identificação da Necessidade**:
    - O dia atual precisava de uma sinalização visual mais imediata e inequívoca no caderno e no calendário para facilitar a localização temporal rápida.
    - Sábados e domingos estavam indistintos (ambos com cor avermelhada idêntica), dificultando diferenciar o primeiro dia do fim de semana do dia de descanso pleno.
  - **Solução Visual Aplicada (`AgendaHub.tsx`)**:
    - **Dia Atual Sublinhado**:
      - No caderno: rótulo do dia (`dayLabel`) com `underline decoration-2 decoration-sky-500 underline-offset-[3px]`, garantindo sublinhado nítido no dia da semana e no número (ex: `TER 15`), emoldurado com badge suave azul safira.
      - No calendário popover: dia atual com `font-black underline decoration-2 decoration-white underline-offset-2`.
    - **Cromática Soberana para Sábado e Domingo**:
      - **Domingo (`dayIdx === 0`)**: Vermelho clássico puro e vibrante (`text-red-600`).
      - **Sábado (`dayIdx === 6`)**: Vermelho com nuance azulada elegante (`text-[#a8256a]` - matiz carmim/framboesa-vinho a 328° de matiz), criando contraste instantâneo e distinguível a olho nu tanto no caderno quanto na grade e cabeçalho do calendário.
  - **Testes & Validação**:
    - 73 testes unitários passando em `AgendaHub.test.tsx`.
    - Build de produção Vite concluído com 0 erros.
    - APK Android recompilado com sucesso via `./gradlew assembleDebug` (44s).

- **Agenda — Atalho Soberano na Tela Inicial do Celular com Ícone 3D Exclusivo e Tutorial Pedagógico** (implementado 2026-09-15):
  - **Identificação da Oportunidade & Necessidade**:
    - O usuário precisava abrir o app Finanças Pro Invest e navegar até a aba da Agenda sempre que desejava consultar ou registrar um compromisso diário.
    - Criar um atalho dedicado diretamente na tela inicial do smartphone com identidade visual própria (squircle azul safira acetinado, caderno executivo semiaberto com pautas, espirais em ouro e fita esmeralda) eleva a utilidade prática e o valor percebido da Agenda.
  - **Ícone Master Exclusivo 3D Multi-Resolução**:
    - Gerado asset master 3D em alta fidelidade (`public/assets/images/brand/agenda-icon.png`) combinando os traços corporativos do FPI.
    - Exportado em todas as resoluções necessárias para a web e sistema nativo:
      - PWA: `agenda-shortcut-192.webp`, `agenda-shortcut-192.png`, `agenda-shortcut-512.webp`, `agenda-shortcut-512.png`.
      - Android Nativo: `ic_shortcut_agenda.png` em `drawable` e em todas as densidades `mipmap` (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`).
  - **Arquitetura Nativa Android & PWA**:
    - `shortcuts.xml` e `strings.xml`: Atalho estático registrado com deep link nativo `financaspro://agenda`.
    - `AndroidManifest.xml`: Meta-data `android.app.shortcuts` configurado na `MainActivity`.
    - `AgendaShortcutPlugin.java`: Plugin Capacitor nativo que expõe `isPinSupported` e `pinAgendaShortcut` usando `ShortcutManager.requestPinShortcut` (Android 8.0+ / API 26+).
    - `manifest.json`: Array `"shortcuts"` configurado com o ícone da Agenda e rota `/app/agenda?source=pwa_shortcut`.
    - `deepLinkRouter.ts` e `useAppState.ts`: Captura universal de `financaspro://` via `@capacitor/app` (`appUrlOpen` e `getLaunchUrl`), redirecionando diretamente para `/app/agenda` com custo zero de consultas Firestore (FinOps).
  - **Interface e Modal Pedagógico (`AgendaHub.tsx`)**:
    - Botão `Atalho no Celular` integrado na barra superior da Agenda com ícone `<Smartphone />`.
    - Modal educativo ricamente ilustrado:
      - Exibe prévia do ícone 3D oficial.
      - Destaca benefícios práticos (acesso direto em 1 toque sem intermediários, funcionamento 100% offline).
      - Botão nativo de 1 clique para fixar o atalho no Android.
      - Guia passo a passo com método do toque longo (pressionar o ícone por 1s e arrastar a opção "Agenda") e método PWA/Navegador ("Adicionar à tela inicial").
  - **Testes & Validação**:
    - Suíte da Agenda expandida para 72 testes automatizados, todos passando com 100% de sucesso (`AgendaHub.test.tsx`).
    - Build de produção Vite concluído em 58.69s com 0 erros.
    - Sincronização nativa Android concluída com sucesso via `npx cap sync android`.
    - Compilação nativa Java e montagem do APK debug (`./gradlew assembleDebug`) concluída com `BUILD SUCCESSFUL` em 1m 1s.

- **Agenda — Blindagem Visual Opaca e Foco Limpo na Escrita/Edição de Compromissos** (implementado 2026-09-15):
  - **Identificação da Causa Raiz**:
    - O componente `AutoResizeTextarea` utilizava `bg-transparent`. As linhas azuis horizontais da pauta do caderno (`agendaPautaStyle`) passavam exatamente por trás do texto que o usuário estava digitando, criando confusão visual e cortando as palavras no meio.
    - Se o compromisso tinha mais de 1 linha ou se o usuário editava um compromisso em dia preenchido, o textarea expandia verticalmente sobre as linhas vizinhas sem fundo opaco, misturando as letras do input com compromissos ou datas do fundo.
    - Na edição (`editInput`), faltava o botão explícito de cancelamento (`X`), forçando o usuário mobile a depender de cliques externos ou teclado físico para cancelar.
  - **Solução Arquitetural Aplicada (`AgendaHub.tsx`)**:
    - **Contêiner de Escrita/Edição 100% Opaco (`bg-white`)**:
      - `editInput` e `addInputControls` encapsulados em contêiner dedicado:
        `flex items-center gap-1.5 flex-1 bg-white rounded-xl shadow-md border border-sky-400 ring-2 ring-sky-100 px-2.5 py-1 z-30 relative -my-1`.
      - O fundo branco sólido bloqueia 100% das linhas azuis da pauta e de qualquer elemento ou texto de linhas inferiores caso o textarea cresça verticalmente.
    - **Controles de Ação Claros e Focados**:
      - Botão de confirmação (`Check` size={16} em verde esmeralda `text-emerald-600`) e botão de cancelamento (`X` size={16} em tom neutro `text-slate-400 hover:text-slate-600`) disponíveis tanto na adição quanto na edição.
    - **Resultado**: Ao digitar ou editar, o usuário desfruta de um cartão flutuante límpido, nítido e com contraste preto sobre branco impecável, sem nenhuma interferência visual do fundo.
  - **Testes & Validação**:
    - 157 testes automatizados passando (incluindo 71 testes unitários em `AgendaHub.test.tsx`).
    - Build de produção Vite concluído em 58.66s com 0 erros.
    - Sincronização nativa Android concluída com sucesso via `npx cap sync android`.

- **Agenda — Otimização Soberana do Espaço de Escrita e Quebra de Linhas no Mobile** (implementado 2026-09-15):
  - **Identificação da Causa Raiz**:
    - No smartphone (360px a 412px), as margens externas (`px-4`), o padding interno do caderno (`pl-4 pr-4`) e a fileira estática de controles à direita (`Horário`, `▲`, `▼`, `Bell`, `Trash2`) consumiam mais de 65% da largura da linha, deixando míseros 90px a 110px para o texto do compromisso.
    - O algoritmo `measureCommitLines` usava a largura estreita da Linha 1 para fatiar o texto inteiro. Assim, compromissos médios ou grandes eram fragmentados em pedaços de apenas 2 a 3 palavras por linha, forçando o uso de 4 a 5 linhas na pauta, mesmo havendo mais de 300px disponíveis nas linhas de continuação subsequentes.
  - **Solução Arquitetural Aplicada (`AgendaHub.tsx`)**:
    - **Aumento de Largura Útil (+32px líquidos)**:
      - Contêiner da página ajustado para `px-2 sm:px-4` e folha do caderno para `pl-2 pr-2 sm:pl-4 sm:pr-4`, com linhas em `-mx-2 px-2 sm:-mx-4 sm:px-4`, aproveitando a tela móvel de borda a borda.
    - **Controles de Linha Compactos (+55px líquidos)**:
      - Botões de reordenação (▲/▼), alarme (`Bell`/`BellOff`) e lixeira (`Trash2`) padronizados para `size={13-14}` com `gap-0.5 sm:gap-1`, reduzindo a pegada dos controles no mobile de ~110px para ~55px.
    - **Tipografia Fluida de Alta Densidade**:
      - Título do compromisso, continuação e inputs (`titleSpan`, `continuationRows`, `addInputControls`, `editInput`) configurados com `text-[13px] sm:text-sm leading-[17px] tracking-tight sm:tracking-normal font-bold`.
    - **Resultado**: A capacidade útil por linha no mobile saltou de ~15 caracteres para **35 a 40 caracteres (6 a 8 palavras)**, reduzindo o número de linhas necessárias pela metade e eliminando o desperdício de espaço no caderno.
  - **Testes & Validação**:
    - Suíte da Agenda com 157 testes automatizados passando (incluindo 71 testes unitários em `AgendaHub.test.tsx`).
    - Build de produção Vite concluído em 1m 4s com 0 erros.
    - Sincronização nativa Android concluída com sucesso via `npx cap sync android`.

- **Agenda — Auditoria Cirúrgica Definitiva: Fim da Sobreposição via CSS Grid e Blindagem de Acessibilidade Visual Mobile** (implementado 2026-09-15):
  - **Identificação da Causa Raiz da Sobreposição (Desktop)**:
    - O contêiner de largura máxima `max-w-4xl` (896px) tem centro geométrico em 448px. O bloco de ações à direita (`Nexus`, `Sincronizar`, `HOJE`, `Próximos`) mede ~484px, ocupando a faixa de 412px a 896px.
    - O bloco de navegação de mês (`< SETEMBRO 2026 > 📅`) utilizava `md:absolute md:left-1/2 -translate-x-1/2`, ocupando de 329px a 567px.
    - **A Colisão Matemática**: A faixa entre 412px e 567px (155px) possuía sobreposição física direta: a seta de avanço e o ícone de calendário ficavam desenhados diretamente sobre o botão **Nexus na Agenda**.
  - **Identificação do Risco de Acessibilidade Visual (Mobile / Baixa Visão)**:
    - Usuários com dificuldades visuais ativam o aumento de fonte do sistema operacional (Android/iOS com escala de 125% a 200%).
    - O rótulo da data com largura estática e a linha única de altura fixa podiam empurrar o checkbox e cortar o texto do compromisso em telas estreitas (360px a 390px).
    - Os modais de alarme e calendário não possuíam rolagem interna protegida para viewports com zoom extremo.
  - **Solução Arquitetural Aplicada (`AgendaHub.tsx`)**:
    - **CSS Grid de 3 Colunas Fluidas (Zero Absolute)**:
      - `grid grid-cols-2 md:grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 w-full px-3 md:px-4 py-1.5 md:py-0 md:h-14`.
      - **Desktop**: Coluna 1 (Título & Badges `justify-self-start`), Coluna 2 (`1fr`, Mês centralizado via `md:order-2 justify-self-center`), Coluna 3 (Ações `justify-self-end md:order-3`). Como são células reais de CSS Grid, é matematicamente impossível uma coluna invadir o espaço da outra.
      - **Mobile**: Linha 1 para Título e Ações (`grid-cols-2`), e Linha 2 dedicada para Navegação de Mês (`col-span-2 justify-self-center`), garantindo touch target amplo para navegação.
    - **Blindagem de Acessibilidade Visual Mobile**:
      - `dayLabel` configurado com `w-[62px] min-w-[62px] max-w-[85px] md:w-[70px] md:min-w-[70px] shrink-0 pr-1.5`, absorvendo números de dois dígitos mesmo com fontes grandes sem espremer o checkbox.
      - Controles da linha do compromisso encapsulados em contêiner flexível `shrink-0 flex items-center gap-0.5 md:gap-1 ml-auto`, isolando o texto do compromisso (`flex-1 min-w-0`) e impedindo que botões quebrem ou fiquem encavalados.
      - Modais de Alarme e Calendário equipados com `max-h-[90vh] overflow-y-auto` e padding de safe-area (`pb-[calc(1.5rem+env(safe-area-inset-bottom))]`), permitindo rolagem confortável em aparelhos com zoom ativado.
  - **Testes & Validação**:
    - 157 testes automatizados passando (incluindo 71 testes unitários em `AgendaHub.test.tsx`).
    - Build de produção Vite concluído em 56.74s com 0 erros.
    - Sincronização nativa Android concluída com sucesso via `npx cap sync android`.

- **Agenda — Auditoria Completa de Layout, Sobreposição de Ícones e Acessibilidade de Toque (Desktop e Mobile)** (implementado 2026-09-15):
  - **Identificação da Causa Raiz**:
    - **Desktop**: A barra de navegação central de mês (`< Mês Ano > 📅`) utilizava `md:absolute md:left-1/2` com `z-0`, enquanto o bloco de botões de ação à direita somava cerca de 500px com `z-10`. Em viewports médias (768px a 1100px), os botões da direita sobrepunham diretamente a seta do próximo mês e o ícone de calendário, gerando bloqueio de cliques.
    - **Mobile**: O botão do Nexus exibia o texto completo "Nexus na Agenda" e os botões tinham paddings largos, somando mais de 440px na linha superior e comprimindo o título "Agenda" e o badge de status em telas de 360px a 412px.
    - **Pauta de 28px do Caderno**: O checkbox continha um ícone `Check` de 18px dentro de uma caixinha de 16x16px (`w-4 h-4`), transbordando as bordas. Os ícones de alarme (`Bell`) e exclusão (`Trash2`) estavam configurados com `size={24}` (22px de altura), ocupando quase toda a linha de 28px e encostando nas pautas horizontais. No desktop, ficavam permanentemente visíveis em todas as linhas sem efeito hover.
    - **Rótulo do Dia de Hoje**: Em dias com 2 dígitos (ex: "QUI 28"), o badge circular com anel ultrapassava os 62px fixos e empurrava o checkbox para o lado, desalinhando-o das linhas subsequentes.
    - **Touch Targets & Safe Area**: O botão de fechar do painel de Próximos era muito pequeno para toque no celular (`size={14}`, `p-0.5`), e os modais inferiores de alarme e calendário não respeitavam `env(safe-area-inset-bottom)`.
  - **Correções Aplicadas**:
    - `AgendaHub.tsx`:
      - **Cabeçalho Desktop & Mobile**: Navegação de mês elevada para `z-20 pointer-events-auto`. Botões da direita agora possuem labels responsivos (`hidden xl:inline` para rótulos longos), botão do Nexus enxuto no mobile (`Nexus`), e paddings harmoniosos (`px-2.5 py-1.5`), eliminando 100% das colisões no desktop e no mobile.
      - **Pauta de 28px**: Ícone `Check` do checkbox reduzido para `size={11}` com `strokeWidth={3}`, perfeitamente contido na caixinha de 16px. Ícones de ação (`Bell`, `Trash2`, `ChevronUp`, `ChevronDown`) padronizados para `size={15}` no mobile e `size={14}` no desktop. No desktop, reordenação e lixeira usam `md:opacity-0 md:group-hover:opacity-100 transition-opacity`, preservando o caderno limpo.
      - **Dia de Hoje**: Tipografia do badge ajustada para `text-[14px]` com `ring-1.5` e `px-1`, encaixando em 58px sem empurrar os checkboxes.
      - **Touch Targets**: Botão fechar de Próximos expandido para `p-2 rounded-xl` com `<X size={16} />`.
      - **Safe Area**: Adicionado `pb-[calc(1.5rem+env(safe-area-inset-bottom))]` nos popovers inferiores no celular.
  - **Testes & Validação**:
    - Suíte da Agenda completa com 157 testes automatizados passando (incluindo 71 testes em `AgendaHub.test.tsx`).
    - Build de produção Vite concluído em 57.84s com 0 erros.
    - Sincronização nativa Android concluída com sucesso via `npx cap sync android`.

- **Agenda — Arquitetura Offline-First com Cache Local em Disco, Fila de Sincronização Automática e Rigor FinOps** (implementado 2026-09-15):
  - **Identificação da Causa Raiz**:
    - Quando a conexão de internet caía ou oscilava, a Agenda tentava consultar o Firestore através de `getDocs(q)`. A falha de rede disparava o bloco `catch`, que executava `setAllMonths((prev) => ({ ...prev, [key]: [] }))`, zerando a exibição e apresentando um caderno totalmente vazio para o usuário.
    - Qualquer tentativa de criar, editar, reordenar ou marcar um compromisso como concluído offline falhava no Firestore sem persistência local nem sincronização posterior.
  - **Cache Local Soberano (`agendaCache.ts`)**:
    - Criado sistema de persistência particionado por usuário e mês: `fpi_agenda_cache_${userId}_${year}_${month}`.
    - Serialização resiliente de datas e instâncias de `Timestamp` (preservando métodos `.toDate()` e `.toMillis()`).
    - Métodos atômicos: `loadMonthCache`, `saveMonthCache`, `upsertCachedCommitment`, `removeCachedCommitment`, `replaceCachedCommitmentId` e `clearUserAgendaCache`.
  - **Fila de Sincronização de Mutações Offline (`agendaSyncQueue.ts`)**:
    - Armazenamento persistente em `fpi_agenda_sync_queue_${userId}` para suportar fechamento e reabertura do app sem perda de dados.
    - Operações enfileiradas: `add` (com `tempId`), `edit`, `delete`, `toggle` e `reorder`.
    - Função `processAgendaSyncQueue`: ao detectar retorno da rede, envia as mutações acumuladas ao Firestore e notifica `onIdReplaced` para substituir `tempId` pelo ID definitivo do Firestore sem duplicações.
  - **Camada de Serviço Híbrida (`agendaService.ts`)**:
    - **Rigor FinOps**: `fetchMonthCommitments` checa `!navigator.onLine` e lê estritamente do cache local, impedindo cobranças ou erros no plano Blaze do Firebase. Se online, consulta apenas o mês sob demanda (`lazy loading` de `activeMonth ± 1`) e atualiza o cache local. Em falhas transitórias de rede, faz fallback para o cache local sem esvaziar os compromissos em tela.
    - Operações CRUD offline: geram `tempId`, salvam no cache local imediatamente e enfileiram a mutação para posterior sincronização.
  - **Feedback Visual e Sincronização Reativa (`AgendaHub.tsx`)**:
    - Badges responsivos e discretos ao lado do título da Agenda: `<WifiOff /> Offline` (em tom âmbar) e `<RefreshCw className="animate-spin" /> Sincronizando...` (em verde esmeralda).
    - Inscrição reativa em `window.addEventListener('online')` que dispara `processAgendaSyncQueue` e exibe notificação amigável (*"X compromissos sincronizados com a nuvem!"*).
  - **Testes & Validação**:
    - Criados 6 testes unitários em `src/agenda/__tests__/agendaCache.test.ts`.
    - Criados 4 testes unitários em `src/agenda/__tests__/agendaSyncQueue.test.ts`.
    - Criados 3 testes unitários em `src/services/__tests__/agendaService.offline.test.ts`.
    - Suíte da Agenda completa com 157 testes automatizados passando (incluindo 71 testes em `AgendaHub.test.tsx`).
    - Build de produção Vite concluído em 58.23s com 0 erros.
    - Sincronização nativa Android concluída com sucesso via `npx cap sync android`.

- **Notificações — Roteamento Soberano e Direcionamento Cirúrgico (Mobile, Web e Sininho)** (implementado 2026-09-14):
  - **Identificação da Causa Raiz**:
    - No mobile nativo (Android/Capacitor), o listener `LocalNotifications.addListener('localNotificationActionPerformed', ...)` em `useAppState.ts` possuía um filtro rígido (`if (!deepLink?.startsWith('app://mark-bill-paid/')) return;`), descartando qualquer notificação da Agenda, Dívidas ou Investimentos ao ser tocada na gaveta do celular.
    - No agendamento de alarmes da Agenda (`alarmService.ts`), o payload `extra` omitia `deepLink: '/app/agenda'`, e no navegador desktop (`n.onclick`) não havia instrução de foco/navegação para a rota `/app/agenda`.
    - No drawer do sininho (`NotificationHub.tsx`), apenas o textinho do CTA (`ctaLabel`) possuía clique; clicar no card, no título ou na mensagem não realizava nenhuma ação. Ademais, rotas e termos sem mapeamento (`'cartoes'`, `'despesas'`, `'controla'`, `'patrimonio'`) caíam em fallbacks que redirecionavam para a raiz `/`.
  - **Motor Central Canônico de Roteamento (`deepLinkRouter.ts`)**:
    - Criada a função pura `resolveAppRoute(target?: string, eventType?: string): string`.
    - Converte com precisão termos brutos e esquemas nas rotas canônicas: `'agenda'` / `agenda.*` -> `/app/agenda`; `'controla'` / `'despesas'` / `'manager'` / `finance.*` -> `/app/controla`; `'transaction-form'` -> `/app/controla?action=new-transaction`; `'cartoes'` / `'faturas'` -> `/app/controla?tab=cartoes`; `'minhas-dividas'` / `debt.*` -> `/app/minhas-dividas`; `'investimentos'` / `wealth.aport*` -> `/app/investimentos`; `'passivos'` / `'patrimonio'` -> `/app/passivos`; `'metas'` -> `/app/metas`; `'ia'` / `'chat'` -> `/app/ia`.
    - **FinOps & Zero Custo**: O roteamento é puramente de cliente (client-side React Router / Capacitor), sem disparar nenhuma consulta extra ao Firebase/Firestore no momento do clique.
  - **Mobile Nativo (`useAppState.ts`)**:
    - Listener universal habilitado para interceptar qualquer notificação tocada.
    - Resolve a rota via `resolveAppRoute(deepLink, eventType)` e navega via `routerNavigate(targetRoute)`. Se contiver `action=new-transaction`, dispara automaticamente `openTransactionForm()`.
  - **Alarmes e Notificações (`alarmService.ts` & `NotificationService.ts`)**:
    - Alarmes de compromissos no mobile agora incluem `deepLink: '/app/agenda'`, `targetRoute: '/app/agenda'` e `eventType: 'agenda.alarm_due'`.
    - Notificações Web desktop (`n.onclick`) redirecionam para `/app/agenda`.
    - Lembretes diários e de reengajamento apontam para `/app/controla?action=new-transaction`.
  - **Sininho / NotificationHub (`NotificationHub.tsx`)**:
    - O card de cada notificação é 100% interativo e clicável (`cursor-pointer`), fechando o drawer e transportando o usuário diretamente para a tela do evento.
    - Botão "Ciente do comunicado" e CTA com `e.stopPropagation()` preservando o ateste isolado de leitura.
  - **Testes & Validação**:
    - 17 novos testes unitários em `src/utils/__tests__/deepLinkRouter.test.ts`.
    - Suíte de notificações e alarmes com 33/33 testes passando.
    - Validação cruzada com finanças e presença (9 testes passando).
    - Build de produção Vite concluído em 56.52s com 0 erros e sincronizado com o Android via `npx cap sync android`.

- **Notificações no Sininho — Data/Hora de Envio, Confirmação "Ciente do comunicado" e Envio ao Histórico** (implementado 2026-09-14):
  - **Identificação da Causa Raiz**:
    - As mensagens de notificação e comunicados exibidos no sininho (`NotificationHub.tsx`) não continham data e hora legíveis de envio ao usuário, dificultando a contextualização temporal e a percepção de urgência.
    - O fechamento da notificação era feito por um botão discreto de `X`, propiciando descarte inadvertido sem leitura reflexiva.
    - Faltava um fluxo de ateste de leitura explícito que arquivasse a mensagem confirmada na caixa de histórico do usuário.
  - **Data/Hora Padronizada**:
    - Criada a função pura `formatNotificationDateTime(createdAt)` em `NotificationHub.tsx` com suporte resiliente a `Timestamp` do Firestore (`toDate()`, `toMillis()`, `{ seconds }`), strings ISO e objetos `Date`.
    - Cada card de notificação exibe `Clock` com texto no padrão brasileiro: `"Enviado em DD/MM/AAAA às HH:mm"`.
  - **Botão Formal "Ciente do comunicado" e Sincronização Otimista**:
    - Removido o botão de descarte `X`. Na aba **Entrada**, cada notificação não lida exibe um botão de alta visibilidade: `<CheckCheck /> Ciente do comunicado`.
    - `NotificationContext.tsx`: `dismiss(eventId)` atualizado para persistir `{ read: true, readAt: nowIso }` no Firestore e, de forma otimista, mover o evento da lista `unreadEvents` diretamente para o topo de `historyEvents`.
    - Na aba **Histórico**, as notificações lidas exibem o selo permanente `✓ Ciente do comunicado`.
  - **Testes & Validação**:
    - Nova suíte `src/components/__tests__/NotificationHub.test.tsx` com 8 testes cobrindo formatos de data/hora, renderização na aba Entrada, acionamento de `dismiss` e selo na aba Histórico.
    - Suíte de finanças com 38/38 testes passando.
    - Build de produção Vite concluído em 1m 4s com 0 erros.

- **Cartões de Crédito — Confirmação e Orientação Pedagógica ao Ocultar Cartão** (implementado 2026-09-14):
  - **Identificação da Causa Raiz**:
    - Ao clicar no botão de olho riscado (`EyeOff`, "Ocultar Cartão") no `CardManager.tsx`, o cartão era ocultado de imediato (`isActive: false`) sem nenhuma confirmação.
    - Isso gerava risco de cliques acidentais e insegurança ao usuário, que não sabia onde o cartão havia ido parar nem como restaurá-lo.
  - **Confirmação Explícita e Pedagógica**:
    - `handleToggleStatus`: Quando o cartão está ativo (`isActive !== false`) e `skipConfirm === false`, exibe caixa de confirmação clara:
      *"Deseja realmente ocultar o cartão '[Nome]'?\n\nEle não aparecerá na lista de seleção do dia a dia, mas você poderá reativá-lo a qualquer momento na aba 'Ocultos'."*
    - Se o usuário cancelar (`false`), a ação é cancelada e o cartão permanece ativo sem chamadas à API.
    - Se o usuário confirmar (`true`), o cartão é atualizado para `isActive: false` no Firestore.
    - `handleDeleteCard`: Quando o cartão tem histórico e o sistema sugere ocultá-lo, repassa `skipConfirm = true` para evitar confirmação dupla.
    - Botão `EyeOff`: Atualizado atributo `title="Ocultar Cartão (pode ser reativado em Ocultos)"`.
    - Na aba **Ocultos**, a reativação com o botão "Reativar Cartão" permanece direta e ágil sem pedir confirmação.
  - **Testes & Validação**:
    - Nova suíte `src/components/tools/finance/__tests__/CardManager.test.tsx` com 3 testes unitários cobrindo cancelamento seguro, confirmação com persistência no Firestore e reativação direta na aba Ocultos.
    - Suíte financeira com 38/38 testes passando.
    - Build de produção Vite concluído em 1m 25s com 0 erros.

- **Cartões de Crédito — Blindagem e Bloqueio de Edição do Valor de Pagamento de Fatura** (implementado 2026-09-14):
  - **Identificação da Causa Raiz**:
    - Lançamentos de pagamento de fatura (`isBillPayment: true`) podiam ser editados no formulário genérico de lançamentos (`TransactionForm.tsx`), permitindo que o usuário alterasse arbitrariamente o valor liquidado.
    - Como o valor da fatura é a consolidação estrita das despesas registradas no cartão durante o ciclo, alterar o valor da liquidação avulsa causava descolamento contábil entre a fatura no Firestore (`users/{uid}/faturas`), o total das compras e o limite do cartão.
    - A trava `isLocked` já existia no código de `TransactionForm.tsx`, porém não era conectada a `initialData.isBillPayment`.
  - **Blindagem e Travamento Soberano**:
    - `TransactionForm.tsx`: Quando `initialData.isBillPayment === true`, o formulário ativa automaticamente o modo de proteção.
    - **Valor**: Estritamente bloqueado (`disabled={isLocked}`), impedindo descompasso com as compras da fatura.
    - **Tipo e Meio de Pagamento**: Bloqueados (`disabled={isLocked}`), impedindo mutação indevida da natureza da liquidação.
    - **Descrição e Categoria**: Bloqueadas contra edição, preservando categoria de fatura e nome do cartão.
    - **Data de Pagamento (Exclusividade Editável)**: Liberada (`disabled={isLocked && !isBillPayment}`), permitindo conciliação bancária da data em que o valor compensou na conta.
    - **Banner Explicativo Pedagógico**: Alerta com `ShieldAlert` orientando que o valor é derivado das compras e que, para cancelar ou retificar o valor, deve-se excluir o lançamento.
    - **Preservação de Metadados**: `handleSave` atualizado para repassar `isBillPayment`, `linkedCardId`, `linkedInvoiceId` e `linkedInvoicePeriodEnd`, impedindo limpeza acidental de flags no RTDB.
  - **Exclusão e Estorno Transparente**:
    - Adicionado botão `"Excluir"` com confirmação pedagógica no rodapé de `TransactionForm.tsx` (quando aberto em modo edição com `onDelete`).
    - `TransactionHistory.tsx`: Atualizado tooltip de edição para `"Editar data de pagamento"` e mensagem de confirmação de exclusão para alertar sobre o estorno e restabelecimento do limite.
    - `useTransactions.ts`: Ao excluir um pagamento de fatura, além de reverter `saldoUtilizadoTotal` no cartão, agora também atualiza a fatura no Firestore (`invoices`), abatendo `paidAmount`, recalculando `remainingAmount` e restaurando o status da fatura para `closed` ou `partial`.
  - **Testes & Validação**:
    - Nova suíte `src/components/tools/finance/__tests__/TransactionForm.test.tsx` com 4 testes unitários cobrindo travamento de campos, edição e salvamento seguro de data, exclusão com estorno e funcionamento normal de transações não-fatura.
    - Suíte financeira com 35/35 testes passando.
    - Build de produção Vite concluído em 1m 11s com 0 erros.

- **Formulário de Lançamentos & Vouchers — Sincronização Soberana do Saldo Disponível de Cartões Voucher** (implementado 2026-09-14):
  - **Identificação da Causa Raiz**:
    - Ao lançar uma despesa com cartão voucher no modal de lançamento (`TransactionForm.tsx`), o `<select>` e o alerta de saldo liam diretamente `selCard.voucherBalance` (campo estático bruto do documento Firestore do cartão).
    - Quando o usuário criava movimentações de recarga ou despesas no extrato do voucher, o saldo dinâmico soberano (`calculateWalletStatementSummary`) era calculado em tempo real para o Controla e Extratos, mas o formulário de lançamentos exibia `R$ 0,00` ou valor desatualizado, bloqueando lançamentos válidos com mensagem de "Saldo insuficiente".
  - **Função Soberana Centralizada (`calculations.ts`)**:
    - Criada a função pura e tipada `getVoucherCardAvailableBalance(card, transactions)`.
    - Prioriza a derivação histórica precisa via `calculateWalletStatementSummary(cardTx).availableBalance` quando houver transações registradas para o cartão.
    - Aplica fallback gracioso para `card.voucherBalance || 0` caso o cartão seja novo e ainda não possua histórico no extrato.
  - **Sincronização nos Pontos de Consumo**:
    - `TransactionForm.tsx`: Validação de envio (`onSave`), opções do dropdown de despesas (`<option>`), alerta de saldo disponível/insuficiente e opções do dropdown de recarga (`tipo === 'income'`) atualizados para derivar o saldo estritamente via `getVoucherCardAvailableBalance(card, transactions)`.
    - `Dashboard.tsx`: Atualizado para consumir diretamente `getVoucherCardAvailableBalance(c, state.safeTransactions)`, mantendo coerência absoluta entre o card "SALDO ATUAL" do Controla e o modal de lançamento.
    - `CardManager.tsx`: Edição e badges de saldo sincronizados com `getVoucherCardAvailableBalance`.
  - **Testes & Validação**:
    - `walletCalculations.test.ts` enriquecido com 4 novos testes unitários cobrindo derivação dinâmica a partir de extrato, fallback para novo cartão sem histórico, tratamento de valores nulos/vazios e saldo negativo.
    - Suíte completa com 31/31 testes passando (`walletCalculations.test.ts`, `VoucherStatement.test.tsx`, `BalanceCards.test.tsx`).
    - Build de produção Vite concluído em 1m 7s com 0 erros.

- **Controla — Composição Soberana do SALDO ATUAL com Saldos de Cartões Voucher** (implementado 2026-09-14):
  - **Identificação da Causa Raiz**:
    - O card "SALDO ATUAL" do Controla (`BalanceCards.tsx`) exibia `saldoReal` (fluxo de caixa em conta bancária) e abatia as exclusões através de `saldoDisplay = saldoReal - exclusaoTotal`.
    - Ao marcar um cartão voucher no checklist (ex: "Retirar o saldo do Cartão Alimentação"), o valor do voucher era deduzido do saldo em conta bancária, que nunca havia incluído o voucher na sua base inicial.
  - **Composição da Base Inicial em Centavos Inteiros**:
    - O SALDO ATUAL principal agora é composto por: `saldoBase = saldoReal (conta bancária) + sum(saldoVouchers)`, calculado estritamente em centavos inteiros (`saldoRealCents + totalVoucherCents`) via `toIntegerCents`.
    - **Invariância do Topo (Saldo Íntegro)**: O valor principal em destaque no topo (`h2` em `text-3xl`) exibe **sempre o saldo íntegro / cheio** (`saldoBase`), atuando como a âncora fixa patrimonial sem nunca sofrer deduções.
    - **Totalizador Inferior Exclusivo para Deduções**: Ao marcar qualquer exclusão no checklist (voucher, reserva ou colchão), o valor deduzido é exibido exclusivamente no totalizador inferior com o label `"Saldo Atual (com exclusões)"` (`saldoDisplay`). Sem exclusões, a linha inferior converge para `"Saldo Atual"`.
    - Ao manter os checkboxes desmarcados, o usuário visualiza sua liquidez total disponível no dia a dia (dinheiro em conta + vouchers).
    - Ao marcar `[x] Retirar o saldo do Cartão Voucher (Pluxxe Alim)`, apenas aquele benefício é excluído da base na linha de fechamento.
    - Ao marcar todos os vouchers, a dedução anula os saldos dos vouchers e o valor exibido no "Saldo Atual (com exclusões)" converge com precisão matemática para o **saldo real em conta bancária**.
  - **Isolamento de Domínio**:
    - `calculateRealCashBalance` e `calculatePreviousMonthClose` atualizados para ignorar transações com `t.paymentMethod === 'voucher'`, prevenindo vazamento de despesas de alimentação/refeição para a conta corrente bancária.
  - **Sincronização**:
    - `SaldoAjustavelCard.tsx` alinhado com a mesma composição soberana `(saldoReal + totalVouchers) - exclusaoTotal`.
  - **Testes & Validação**:
    - `BalanceCards.test.tsx` enriquecido com novos testes cobrindo a exibição do saldo composto inicial (R$ 6.200,00), exclusão de voucher único (R$ 5.400,00), convergência para o saldo em conta ao marcar todos os vouchers (R$ 5.000,00) e exclusão conjunta de reserva de emergência (R$ 4.000,00).
    - 27/27 testes unitários passando em `BalanceCards.test.tsx`, `VoucherStatement.test.tsx` e `walletCalculations.test.ts`.
    - Build de produção Vite concluído com sucesso em 59.46s com 0 erros.

- **Carteira / Extrato — Correção da Fórmula Soberana de Saldo Disponível em Centavos** (implementado 2026-09-14):
  - **Identificação da Causa Raiz**:
    - O componente `VoucherStatement.tsx` calculava `totalIncomes` (R$ 4.276,89) e `totalExpenses` (R$ 999,56) a partir das movimentações, porém utilizava `const currentBalance = card.voucherBalance || 0;` para o saldo atual.
    - Como o documento Firestore do cartão frequentemente continha saldo não inicializado ou desatualizado (`0`), o saldo disponível era indevidamente zerado (`R$ 0,00`), divergindo dos totais calculados.
  - **Motor de Domínio Centralizado em Centavos (`calculations.ts`)**:
    - Criada a função pura e tipada `calculateWalletStatementSummary(transactions, targetCardId)` e o conversor `toIntegerCents(amount)`.
    - **Fórmula Soberana**: `saldoDisponivel = totalEntradas - totalDespesas` calculada estritamente em **centavos inteiros** (`incomesCents - expensesCents`), prevenindo erros de precisão flutuante IEEE-754.
    - Preservada a semântica nativa de tipos: `type === 'income'` soma como entrada (incluindo recargas e ajustes a crédito), e `type === 'expense'` soma como saída (incluindo compras e ajustes a débito).
  - **Sincronização nos Pontos de Consumo**:
    - `VoucherStatement.tsx`: Os 3 cards de métricas (Saldo Atual Disponível, Total em Recargas e Total em Despesas) agora derivam estritamente do mesmo objeto consolidado `summary`. Agrupamento mensal e fluxo líquido também calculados em centavos inteiros.
    - `Dashboard.tsx`: `voucherCards` passa a calcular o saldo derivado via `calculateWalletStatementSummary` quando há transações para o cartão, garantindo que o card "SALDO ATUAL" do Controla deduza os R$ 3.277,33 reais.
    - `CardManager.tsx`: O badge de saldo do cartão exibe o saldo derivado soberano da mesma base.
  - **Testes & Validação**:
    - Nova suíte `src/utils/__tests__/walletCalculations.test.ts` com 8 testes cobrindo os 6 cenários exigidos (4.276,89 - 999,56 = 3.277,33; carteira vazia = 0; saldo negativo; saldo positivo; ajustes; e precisão em centavos).
    - Atualizados `VoucherStatement.test.tsx` (7 testes) e `BalanceCards.test.tsx` (9 testes). Total de 24/24 testes passando.
    - Build de produção Vite concluído com sucesso em 57.44s com 0 erros.

- **Cartões Voucher — Visualização de Extratos de Movimentação e Linha do Tempo** (implementado 2026-09-14):
  - **Componente Dedicado `VoucherStatement.tsx`**:
    - Desenvolvido `src/components/tools/finance/VoucherStatement.tsx` para apresentar de forma estruturada, elegante e transparente o extrato completo de qualquer cartão voucher.
    - **Cards de Métricas**: Saldo Atual Disponível (verde esmeralda), Total em Recargas (`+ R$`) e Total em Despesas (`− R$`).
    - **Agrupamento Mensal & Timeline**: Lançamentos agrupados por mês (ex: "Setembro de 2026"), ordenados cronologicamente do mais recente para o mais antigo, com total líquido mensal e badges de categoria.
    - **Distinção Visual Operacional**: Ícone `TrendingUp` em verde para créditos/recargas de benefício e `TrendingDown` em neutro/âmbar para compras de alimentação/refeição.
    - **Ações Rápidas**: Botões `+ Registrar Gasto` e `+ Registrar Recarga` com preset automático de `paymentMethod: 'voucher'` e `cardId`, além de botão de edição direta (`Edit2`) para cada item.
    - **Empty State Convidativo**: Mensagem amigável e botões de primeiro lançamento quando não há movimentações registradas.
  - **Integração no `CardManager.tsx`**:
    - Substituída a ausência de histórico por um accordion expansível dedicado com ícone `Receipt`: "Ver Extrato de Movimentações" / "Ocultar Extrato de Movimentações".
    - Desbloqueado o botão `+ Lançar` no cabeçalho do cartão voucher para lançamentos rápidos diretos.
  - **Atalho no Card "SALDO ATUAL" do Controla (`BalanceCards.tsx` & `Dashboard.tsx`)**:
    - Cada linha de cartão voucher no card de saldo do Controla agora possui um botão discreto de extrato (`Receipt`).
    - Ao clicar, abre o modal de gestão de cartões focando diretamente no extrato do cartão selecionado (`focusedCardId`).
  - **Testes & Validação**:
    - Criada suíte dedicada `src/components/tools/finance/VoucherStatement.test.tsx` com 6 testes unitários cobrindo renderização de métricas, agrupamento mensal, diferenciação de recargas/gastos, ações rápidas e empty state.
    - Atualizado `BalanceCards.test.tsx` (9 testes) para cobrir o acionamento do extrato via `onOpenCardManager`.
    - Total de 15/15 testes passando nas duas suítes; build de produção Vite concluído em 54.10s com 0 erros.

- **Controla — Mini Auditoria e Exclusão de Saldos de Cartões Voucher (Alimentação e Refeição)** (implementado 2026-09-14):
  - **Diagnóstico & Mini Auditoria**:
    - *Rotas e Funcionamento*: As rotas dos cartões vouchers operam normalmente através do `FinanceContext`, `CardManager` e `Dashboard`. Vouchers compartilham o ciclo dos cartões com `cardType: 'voucher'`.
    - *Cálculos de Saldo*: O saldo de vouchers é somado ao saldo total da conta (`accumulatedBalance`) e contabilizado na composição patrimonial. No entanto, faltava distinção clara entre os tipos de voucher (Alimentação vs Refeição) e cartões com saldo R$ 0,00 desapareciam do checklist em vez de serem sinalizados como desabilitados.
    - *Edição de Vouchers*: Anteriormente, `CardManager` bloqueava a edição de vouchers com uma mensagem fixa ("Cartão voucher não possui configurações editáveis de fatura"), impedindo o usuário de renomear, ajustar o saldo ou definir o subtipo do cartão.
  - **Tipagem & Subtipos Especializados**:
    - Criado o tipo `VoucherType = 'alimentacao' | 'refeicao' | 'outro'` em `src/types/index.ts` e estendido `CreditCard.voucherType`.
    - Atualizado `cardService.ts` (`addCard` e `updateCard`) para persistir `voucherType` no Firestore.
    - `ExclusionsContext.tsx` atualizado para incluir `voucherType` em `VoucherCardInfo`.
  - **Exclusão Dinâmica no Card "SALDO ATUAL" do Controla**:
    - Em `BalanceCards.tsx`, implementada a função pura `getVoucherTitle`:
      - Alimentação: `"Retirar o saldo do Cartão Alimentação ({nome})"`
      - Refeição: `"Retirar o saldo do Cartão Refeição ({nome})"`
      - Outro/Genérico: `"Retirar o saldo do Cartão Voucher ({nome})"`
    - Corrigido o tratamento de saldo zero: em vez de esconder o cartão quando `card.balance === 0`, o card agora permanece visível, com `disabled={true}`, exibindo `R$ 0,00` e mensagem de apoio `(sem saldo a excluir)`, garantindo previsibilidade e transparência ao usuário.
    - `FinanceCheckLine.tsx`: suporte a prop `disabled?: boolean`, impedindo clique/toggle e aplicando opacidade reduzida e cursor not-allowed quando desabilitado.
  - **Experiência Completa no `CardManager.tsx`**:
    - Reconhecimento automático do subtipo durante a digitação do nome (ex: digitou "Alimentação", "Vale Refeição", "Sodexo Alimentação" -> auto-seleciona a categoria correspondente).
    - Botões de seleção de subtipo (`Alimentação`, `Refeição`, `Outro`) no formulário de criação e edição.
    - Badges visuais coloridos nas listagens de cartões: verde para Alimentação e âmbar para Refeição.
    - Modo de edição totalmente interativo liberado para vouchers, permitindo alterar nome, subtipo e valor do saldo diretamente no modal.
  - **Testes & Validação**:
    - Criada suíte dedicada `src/components/tools/finance/dashboard/BalanceCards.test.tsx` com 8 testes unitários cobrindo títulos específicos, cálculo e subtração do saldo, e desabilitação correta para saldo zerado.
    - Suíte de testes passando com 23/23 testes (`BalanceCards.test.tsx`, `PendingObligations.test.tsx`, `notificationService.test.ts`).
    - Build de produção Vite concluído com sucesso sem erros.

- **Mobile — Restauração do Ícone Original do Finanças Pro Invest nas Notificações** (implementado 2026-09-14):
  - **Identificação da Causa Raiz**: O `NotificationService.ts` forçava `smallIcon: 'ic_stat_controla'` (ícone da prancheta do Controla em vez da marca), enquanto o `alarmService.ts` omitia o ícone (fazendo o Android exibir o fallback genérico do sistema com a letra "i"). Além disso, faltava `largeIcon` para exibir a marca colorida em destaque na gaveta de notificações do Android.
  - **Arquitetura Dual de Ícones no Android**:
    - **`smallIcon: 'ic_stat_fpi'`**: Criado drawable nativo com silhueta alfa monocromática (RGB puro branco `#FFFFFF` sobre fundo 100% transparente) em 96x96 com cor de realce `#0284c7`, prevenindo o bug do "quadrado branco" do Android na barra de status.
    - **`largeIcon: 'ic_stat_logo'`**: Conectado à logo oficial colorida 3D do Finanças Pro Invest (`ic_stat_logo.png` / `icon.png`) para exibição com destaque visual na gaveta de notificações do Android.
    - **Compatibilidade Retroativa**: `ic_stat_controla.png` no Android atualizado com a logo da marca para cobrir notificações legadas ainda agendadas.
    - **Web Fallback**: Web Notification no `alarmService.ts` atualizado de `/favicon.ico` para `/assets/images/brand/icon.png`.
  - **Configuração Global do Capacitor**: Declarado `plugins.LocalNotifications` com `smallIcon: "ic_stat_fpi"` e `iconColor: "#0284c7"` em `capacitor.config.json` e sincronizado via `npx cap sync android` para `android/app/src/main/assets/capacitor.config.json`.
  - **Atualização dos Serviços**:
    - `NotificationService.ts`: Atualizados `dispatch`, `scheduleDailyReminder`, `scheduleReengagementReminder` e `scheduleRecurringBillDueNotification` para enviar `smallIcon: 'ic_stat_fpi'`, `largeIcon: 'ic_stat_logo'` e `iconColor: '#0284c7'`.
    - `alarmService.ts`: Atualizado `scheduleAlarm` para enviar `smallIcon: 'ic_stat_fpi'`, `largeIcon: 'ic_stat_logo'`, `iconColor: '#0284c7'` e `sound: 'default'`.
  - **Testes & Validação**: Novos testes unitários dedicados em `NotificationService.test.ts` (4 testes) e `alarmService.mobile.test.ts` (2 testes), além dos testes existentes (16 testes passando no total). Build de produção Vite gerado com sucesso em 42s com 0 erros e `npx cap sync android` executado com sucesso.

- **Agenda — Restauração das Setas de Reordenação Manual de Compromissos (▲/▼)** (implementado 2026-09-14):
  - **Conexão em `AgendaHub.tsx`**: Reconectado ao motor de `src/agenda/dayOrder.ts` (`compareDayCommitments`, `moveCommitment`, `nextOrderForDay`, `replaceDayInMonth`) e `reorderDayCommitments` em `src/services/agendaService.ts`.
  - **Ordenação em `dayMap`**: Ordenação sistemática dos compromissos de cada data por `compareDayCommitments` (itens com `order` explícito prevalecem sobre legados; legados ordenam por `time` → `createdAt` → `id`).
  - **Gravação de `order` incremental**: `commitAdd` agora calcula `nextOrderForDay` e salva o campo `order` no Firestore e no update otimista local.
  - **Handler `shiftCommitment`**: Atualização otimista imediata no array de meses (`allMonths`) sem travar a interface (`await`), com envio de lote atômico (`writeBatch`) ao Firestore em segundo plano.
  - **Interface & Acessibilidade**: Botões de setas `ChevronUp`/`ChevronDown` visíveis para dias com 2 ou mais compromissos, desabilitados nas pontas (primeiro e último item), estilizados dentro da grade pautada de 28px.
  - **Testes & Validação**: Novos testes unitários dedicados em `AgendaHub.test.tsx` (ausência com 1 item, presença com 2+, desabilitação nas pontas, reordenação otimista e chamada ao Firestore). Suíte completa de 97 testes passando (`dayOrder.test.ts`, `agendaService.test.ts`, `AgendaHub.test.tsx`). Build de produção Vite concluído em 1m 17s com 0 erros.

- **Audit 1 — Global structural audit of entire repository**: 12+ functional areas mapped (src/components/ — 15 subdirs; src/services/ — 22+ services; src/hooks/ — 25+ hooks; src/contexts/ — 6 contexts; src/core/ — 4 subdirs; src/routes/ — 365-line AppRoutes; src/config/ — stripe, nav, constants; src/theme/ — fpiVoiceGuide; src/utils/ — calculations, 321 lines; src/types/ — types; src/firebase/ — config). Financial domain model identified with 4 philosophical axes (Caixa, Pressão, Proteção, Trajetória) traced in code. 8+ business rules identified, 14 in `calculations.ts` line 289 `calculateSovereignBalance` diverges from core engine. Nexus/IA architecture fully documented: 8 backend modules (functions/) + 5+ frontend surfaces (NexusInsightCard, NexusFeed, NexusInlineAdvisor, AiAdvisor, CentralHub Nexus section). Monetization mapped: Free/Pro/Premium in `config/stripePlans.ts`. 26+ test files found across the project. Philosophical coherence confirmed: `fpiVoiceGuide.ts` as single source of truth for all product vocabulary (309 lines). Two lacunas: `derived-state/` subdirs (aggregators, calculators, selectors) completely empty; two frontends (mobile app + web SPA) diverging in some behavior.

- **Audit 2 — Deep surgical audit of sovereign financial core**: No single source of truth — `useSovereignSnapshot` (`src/hooks/useSovereignSnapshot.ts:113`) is the primary orchestrator but `CockpitHero` (`src/components/Home/Cockpit/CockpitHero.tsx:505`) overrides hero value using `transactions.length >= 5` (a criterion absent from the calculation engine). `buildSovereignSnapshot` (`src/utils/calculations.ts:201`) is the central calculation engine, calls `computeSovereignMetrics` (line 157). `calculateSovereignBalance` (line 289) is a parallel dangerous function with different formula (`currentBalance - upcomingInvoices - monthlyFixedExpenses - reserveProvision`) vs core formula (`accumulatedBalance - virtualImpact - pendingBills - protectionShortfall`), used only by Nexus but represents divergence risk. `virtualImpact` has dual semantics: in `aggregateMonthFlow` (line 77) it means `isVirtual` expenses (credit-card-like without cash impact); in `useSovereignSnapshot` (line 91) it means `cardInvoiceRemaining`. `derived-state/` is completely empty (aggregators/, calculators/, selectors/ all empty; `runtime/domain-graph.ts` has `DependencyGraph` class but receives zero nodes — abandoned architecture). 6 calculation inconsistencies between engine and UI documented. Redundant debt bridges: both `DebtContext` and `FinanceContext` call `createDebtRealtimeBridge`.

- **Audit 3 — UX layer, navigation hierarchy, product surfaces audit**: 5 main surfaces mapped (Home/Cockpit, Controla, Central/ExplorarHub, Explorar, Mais). Home/Cockpit is the main surface but has dispersed attention — shows hero value, sovereign buckets, margin trajectory, accounts, card invoices, market data, news, articles, courses, and 3+ Nexus surfaces simultaneously. CentralHub (`src/components/CentralHub.tsx:678`) competes with Home rather than complementing it — re-implements base de proteção, Nexus insights, wealth aggregates. Navigation label inconsistency: `navigation.config.ts` line 35 uses `id: 'explora'` with label `'Explora'` and path `/explora`, while `appPrimaryNav.ts` uses `toolId: 'explorar'` with label `'Explorar'` and `TOOL_ROUTES['explorar']` → `/app/explorar`. No route `/explora` exists — the config is dead code. MobileBottomNav has 5 items (Home, +, Central, Bell, Menu) while desktop PRIMARY_NAV_ITEMS has 4 (Home, Controla, Central, Explorar) — different surfaces between platforms. SettingsPage (`src/components/SettingsPage.tsx:857`) acts as a superficial catch-all for pricing, logout, profile editing, and misc actions. `PRIMARY_NAV_ITEMS` in `appPrimaryNav.ts` uses `isPrimaryNavTool` to filter but many secondary routes are not primary (minhas-dividas, passivos, investimentos, metas, tools).

- **Vocabulário & Calibração de Postura (Frente B)** (implementado 2026-09-11):
  - Substituição de termos alarmistas e agressivos ("Pressão", "Tensão de Caixa") e jargões economês inacessíveis ("discricionárias") por linguagem serena, clara e acolhedora: "Atenção ao Caixa nos Próximos Dias", "Atenção ao Saldo Livre", "gastos não essenciais".
  - Calibração do estágio 1 no `sovereignMap.ts` e `CommandRitual.tsx`: renomeado de "Pressão" para "Atenção no Fluxo".
  - Testes atualizados e passando em `useNexusAdvisorTriggers.test.tsx`, `useNexusEventBridge.test.tsx` e `sovereignMap.test.ts`.

- **Etapa B2 — Experiência Mobile Deslogada & Onboarding dos 4 Pilares** (implementado 2026-09-11):
  - Implementado `<MobilePublicHome />` em `src/components/MobilePublicHome.tsx` para apresentar de forma soberana, elegante e interativa os 4 pilares: **Caixa & Rotina**, **Compromissos**, **Base de Proteção** e **Evolução**.
  - No `AppRoutes.tsx`, quando a plataforma é nativa (`Capacitor.isNativePlatform()`) e o usuário não está logado na rota `/`, renderiza o onboarding nativo mobile com CTAs diretos de "Criar Conta Gratuita" e "Já tenho conta • Entrar". A versão web de `PublicHome.tsx` segue intacta para navegadores desktop/web.
  - Testes unitários dedicados em `src/components/__tests__/MobilePublicHome.test.tsx` (3 testes passando).

- **Etapa B3 — Barra de Navegação Inferior Mobile & Integração** (implementado 2026-09-11):
  - Verificada e validada a barra inferior `MobileBottomNav` com as 5 abas principais do produto: **Central**, **Controla**, **Lançar** (+ flutuante central), **Agenda**, **Explorar** e **Mais** (abre o menu lateral completo `AppMobileDrawer`).
  - Corrigido o disparo do botão "Mais" em `AppLayout.tsx` para abrir suavemente o drawer mobile (`setMobileMenuOpen(true)`).
  - Testes unitários dedicados em `src/components/__tests__/MobileBottomNav.test.tsx` (4 testes passando). Build de produção Vite gerado com sucesso em 1m 34s sem nenhum erro.

- **Modernização Premium dos Cursos & Trilha Investidor Soberano** (implementado 2026-09-12):
  - **Conteúdo de Rigor CFP® & Grupo Primo**: Reescrita integral dos 6 módulos do curso de investimentos.
    - *Passo 0 (Inquestionável)*: Proibição matemática de investir devendo juros altos (rotativo a 440%+ a.a. e cheque especial a 130%+ a.a.). Estudo de caso do "Investidor Iludido" vs "Estrategista Soberano".
    - *Passo 1 (Base de Proteção Calibrada)*: Reserva de emergência calculada estritamente sobre o **Custo de Vida Essencial**, calibrada por estabilidade de renda: **Concursado (6 meses)**, **CLT Privada (9 meses)** e **Autônomo/PJ (12 meses)**. Regras inegociáveis de 100% liquidez diária (Tesouro Selic e CDB 100% CDI com FGC) e volatilidade zero.
    - *Tríade Sagrada & Juros Compostos*: Aporte + Tempo + Taxa. As 3 fases da bola de neve exponencial e o ponto de inflexão da riqueza.
    - *Renda Fixa & IPCA+*: Devedor vs credor, tabela regressiva de IR (22,5% a 15%) e proteção contra a inflação histórica.
    - *Renda Variável & FIIs*: Mentalidade de dono em empresas perenes, proventos mensais isentos em FIIs e o "Número Mágico".
    - *Antifragilidade & 4 Motores (inspirado no método ARCA)*: Caixa, IPCA+, Ações/FIIs Brasil e Dólar/ETFs Internacionais (IVVB11/WRLD11), rebalanceamento por novos aportes e checklist soberano.
  - **Novos Blocos no LMS**: Criados `<CaseStudyBlock />` (cenários comparativos com badges visuais e takeaway) e `<PrincipleBlock />` (princípios fundamentais solenes em tema dark editorial).
  - **Arquitetura Visual & Responsividade**: Fim do `max-w-lg` espremido em desktop. `<CourseTrackPage />` com grid de 2 colunas e card de comando do aluno; `<ModuleOverviewPage />` amplo; `<LessonPage />` com split LMS e sidebar de navegação de aulas no desktop + drawer tátil no mobile.
  - **Persistência Real no Motor de Progresso**: `useCourseProgress.ts` agora persiste em `localStorage` (`fpi_course_progress_${slug}`), calcula percentuais reais dinamicamente a partir de `coursesRegistry` e gerencia desbloqueio de badges/insígnias. Testes automatizados passando (4/4 em `useCourseProgress.test.ts`).

- **Frente C — Inteligência do Nexus & Conexão com a Agenda** (implementado 2026-09-11):
  - Criado o hook de consulta com cache reativo `useUpcomingCommitments.ts` conectado ao React Query (`queryKeys.agenda.upcoming`).
  - `useNexusAdvisorTriggers.ts` enriquecido para receber os compromissos da Agenda e gerar alertas discretos e antecipatórios para os próximos 7 dias (`Compromisso na sua Semana` ou `X Compromissos na sua Semana`).
  - O gatilho incentiva organização prévia dos horários e direciona diretamente para a Agenda via CTA `Ver Agenda` (`deepLink: 'agenda'`), cumprindo a postura de consultor CFP® que antecipa a rotina sem afobação.
  - Conectado em `AppLayout.tsx` e validado com testes unitários em `useNexusAdvisorTriggers.test.tsx` (7 testes passando) e build de produção Vite (1m 8s, 0 erros).

- **Command Ritual implementation** (implemented 2026-06-29): New `<CommandRitual>` component at `src/components/Home/CommandRitual.tsx` — compact session-briefing card rendered at top of `HomeMainColumn.tsx`. Answers 4 ritual questions in sequence: **Posição** (stage name + delta from last visit via localStorage), **Atenção** (Nexus insight title or first blocker), **Comando** (stage's next step). Delta tracking uses single localStorage key `fpi-comando-prev-stage` — no new infrastructure. Exiting cards (`SovereignMapCard`, `NexusInsightCard`) kept as detailed reference below. Total addition: 1 component (~50 lines), 3 lines in HomeMainColumn.

- **Phase 7 aterragem operacional** (implemented 2026-06-29): Added `COMMAND_ACTIONS` mapping in `CommandRitual.tsx` — each stage's comando now has a CTA button navigating to the real product destination (manager, central, investimentos, or transaction form). No new infrastructure.

- **Phase 8 — retention by continuity** (implemented 2026-06-29): Added metric-level session bridge in `CommandRitual.tsx`. Stores `{ freeBalance, shortfall, launchCount, date }` in localStorage key `fpi-comando-prev-metrics`. Shows "Histórico" line on return with days since last visit + most relevant metric changes (folio delta, protection progress, new transactions). Continuity displayed as: `"Desde 3d: +R$ 800 na folga · proteção avançou R$ 500"` or `"Sessão retomada hoje"`.

- **Invoice period-end link + optimistic cache** (implemented 2026-07-01):
  - Added `linkedInvoicePeriodEnd` / `linkedInvoiceId` to Transaction type and saved in `payInvoiceService.ts:72-77`
  - Changed `invoiceGeneratorService.ts:73-80` to match billPayments by explicit `linkedInvoicePeriodEnd` instead of date window, eliminating boundary misassignment
  - Added initial sync on mount in `useInvoiceSync.ts:61-69` to reconcile legacy stored invoices
  - Added `queryClient.setQueryData` in `useTransactions.ts` after save (line ~536), edit (~353), and delete (~667) — makes new items appear in the list instantly without waiting for the RTDB bridge (fixes 20-50s save delay)
  
- **Optimistic UI — save/delete instantâneo** (implemented 2026-07-01):
  - Moved `setQueryData` to **antes de qualquer await** em `saveLancamento` e `deleteLancamento`
  - Card/debt reactions movidos para background (`async` fire-and-forget dentro de `backgroundOp`)
  - Save: `setQueryData` executado imediatamente após `push()`, antes de `updateCard`/`updateDebt`/`set()`
  - Delete: `setQueryData` executado imediatamente, antes das reversões e do `remove()`
  - Rollback: se `set()`/`remove()` falhar, o cache é desfeito (remove ou restaura o item)
  - Installments: todas as keys geradas no topo, `setQueryData` com array completo, `Promise.all` em background
  
- **Caller do save — modal fecha imediatamente** (implementado 2026-07-01):
  - `AppLayout.tsx:226`: `await saveLancamento()` → `handleCloseModal()` + `saveLancamento().then(...).catch(...)`
  - Modal fecha antes do Firebase write, toasts de sucesso no `.then()`, toast de erro no `.catch()`
  - `sovereignFreeBalance` capturado antes do close (mesmo valor que antes, bridge já era pré-save)

- **AgendaHub — scroll cirúrgico** (implementado 2026-08-11):
  - Sinal da compensação corrigido: `scrollContainerBy(sc, shift)` (positivo = desce a view quando os meses foram pré-inseridos no topo; antes `-shift` invertia a direção)
  - Debounce com teto anti-starvation: novo `EXTEND_CEILING_MS = 300` + função pura `nextFlushDelay(lastScheduleAt, now, debounceMs, ceilingMs)` — `scheduleExtendFlush` não reinicia um timer já pendente (reiniciar a cada evento de scroll faria o flush nunca disparar em scroll contínuo) e dispara imediatamente (delay 0) quando o teto é excedido
  - `flushPendingExtends` reordenado via helper puro `resolveFlushDirection(pending, suppress, allowed)`: lê `pending` primeiro; sem direção → não faz nada; cooldown ativo → bloqueia SEM zerar `pending` (direção preservada para a próxima oportunidade); só zera quando realmente estender ou em `suppress`
  - Helpers exportados (`nextFlushDelay`, `resolveFlushDirection`, `scrollContainerBy`) + 13 novos testes; 52 testes no arquivo passam, tsc e eslint sem erros

- **Agenda — refatoração leve (helpers de mês + scroll)** (implementado 2026-08-11):
  - Novo `src/agenda/monthMath.ts` (puro, sem DOM/React): `shiftMonth(year, month, offset)` (cruzamento de ano via `year*12+month+offset`), `monthsBetween(fromYear, fromMonth, toYear, toMonth)`, `monthKey(year, month)` (`${year}-${month}`)
  - Novo `src/agenda/scrollContainer.ts`: `resolveScrollContainer`, `scrollContainerBy`, `scrollContainerViewport` movidos intactos de AgendaHub
  - `AgendaHub.tsx` agora importa os helpers; removidas as definições duplicadas de scroll e TODOS os loops inline de ajuste de mês (`while (nm < 0)`/`while (nm > 11)` em init do stream, load effect, pruneDistantMonths, extendForward/Backward, goPrev/NextMonth, calGoPrev/Next, reloadData)
  - Testes: `src/agenda/__tests__/monthMath.test.ts` (11) + `scrollContainer.test.ts` (6); suíte Agenda = 69 testes passando; tsc e eslint sem erros (3 warnings pré-existentes). Falhas da suíte global (Onboarding/ActiveReservesCard/nexusGoals/streakUtils) são pré-existentes e sem relação com a Agenda
  - Sem mudança de comportamento/visual — base para extrair o hook de infinite scroll em prompts seguintes

- **Agenda — extração do hook de infinite scroll** (implementado 2026-08-11):
  - Novo `src/agenda/activeMonth.ts` (puro): `pickActiveMonth(sections, referenceY)` + `MonthSectionRect`/`YearMonth` movidos intactos de AgendaHub
  - Novo `src/agenda/useInfiniteMonthScroll.ts` (o motor completo de scroll): recebe `{ notebookRef, monthHeaderRef, monthStream, activeMonth, initialLoading, onActiveMonthChange, onExtendForward, onExtendBackward, onPruneDistantMonths }` e devolve `{ captureScrollAnchor, suppressAutoExtendRef }`; concentra resolução do scroller, listener de scroll (rAF + debounce/ceiling), flush de extensão, compensação de posição por âncora, interlock contra scroll sintético, poda pós-extensão e poda pós-navegação (novo `useEffect` no hook)
  - Constantes movidas (`EXTEND_DEBOUNCE_MS`, `EXTEND_CEILING_MS`, `EXTEND_MAX_MONTHS_PER_FLUSH`, `EXTEND_MIN_INTERVAL_MS`, `SCROLL_INTERLOCK_MS`, `SCROLL_ANCHOR_TTL_MS`, `SCROLL_SETTLE_MS`, `BUFFER`) + helpers puros (`isExtendAllowed`, `isProbeInterlocked`, `nextFlushDelay`, `resolveFlushDirection`) agora exportados do hook
  - `AgendaHub.tsx` reduzido ~200 linhas: chama o hook uma vez (após `extendForward`/`extendBackward`/`pruneDistantMonths`); `goPrevMonth`/`goNextMonth`/`goToDate`/`goToday` passam a usar `captureScrollAnchor`/`suppressAutoExtendRef` do hook; re-exporta `pickActiveMonth` e os helpers (imports do teste antigo continuam válidos); removidos todos os refs/layout effects/efeito de scroll locais
  - Testes: suíte Agenda = 69 testes passando (3 arquivos); tsc sem erros nos arquivos da Agenda; eslint só com os 3 warnings pré-existentes
  - Sem mudança de comportamento/visual

- **Agenda — auditoria da extração + correções + testes do hook** (implementado 2026-08-11):
  - **Correção de escopo (falha do ponto 5)**: as 4 consultas globais `document.querySelectorAll('[data-month-section]')`/`querySelector` em `useInfiniteMonthScroll.ts` (`captureScrollAnchor`, efeito de compensação da âncora, `flushPendingExtends`, `probe`) passaram a ser escopadas a `notebookRef.current` via helper local `monthSections(root)` — em páginas com mais de uma agenda (ou elementos simulados), apenas o caderno fornecido ao hook influencia o motor
  - **Correção de vazamento (ponto 4)**: os `setTimeout` de navegação de `goToDate`/`goToday` em `AgendaHub.tsx` (80ms + aninhado 2000ms de reset do `suppressAutoExtendRef`) agora são rastreados em `navTimersRef` e cancelados num `useEffect` de cleanup — não disparam scroll/supressão em caderno desmontado
  - **Consolidação de tipo**: `interface YearMonth` duplicada em `activeMonth.ts` removida — agora importa de `monthMath.ts` (fonte única)
  - **Testes reais do hook**: novo `src/agenda/__tests__/useInfiniteMonthScroll.test.tsx` (9 testes) cobrindo (1) registro/remoção do listener `scroll` no container resolvido, (2) cleanup de `setTimeout` de flush pendente (`fake timers` + `vi.getTimerCount()`) e de `requestAnimationFrame` pendente (stub de rAF), (3) compensação com `scrollContainerBy(sc, shift)` para shift positivo e negativo (falharia se trocado para `-shift`), (4) `suppressAutoExtendRef` ativo não dispara extensão (com controle positivo), (5) `onActiveMonthChange` não chamado para o mesmo mês e chamado uma vez para outro mês, (6) seções externas ao notebook não interferem (decoy `2099-6` fora do notebook é ignorada). `scrollContainerBy` mockado via `vi.mock('../scrollContainer')` para observar a direção exata
  - Compensação confirmada sem `-shift` (`scrollContainerBy(sc, shift)` com `shift = newTop - anchor.top`); `AgendaHub` chama o hook uma única vez e usa só a API pública (`captureScrollAnchor` + `suppressAutoExtendRef`)
  - Validação: suíte Agenda = 78 testes passando (4 arquivos); tsc sem erros nos arquivos da Agenda; eslint só com os 3 warnings pré-existentes (nenhum erro novo)
  - Sem alteração nas regras de direção/buffer/extensão/debounce/ceiling/cooldown/poda; sem mudança de comportamento/visual

- **Agenda — direção física única + pendência única + buffer proporcional + deadline por burst** (implementado 2026-08-11):
  - Novo helper `getScrollContainerOffset(container)` em `src/agenda/scrollContainer.ts` (fonte única da direção física: `scrollTop` no HTMLElement, `window.scrollY` na janela)
  - Direção derivada do delta de offset entre dois eventos de scroll consecutivos (`offset++ = forward`, `offset-- = backward`); `lastScrollOffsetRef` é SEMPRE atualizado (inclusive em scrolls de compensação/interlock/suppress) ANTES de qualquer retorno — o próximo scroll manual é classificado contra o offset real
  - Pendência única: `pendingExtendRef: ScrollDirection | null` substitui `{ fwd, back }`; a última direção real vence; um flush processa no máximo UMA direção (`forward` XOR `backward`, nunca juntas). `resolveFlushDirection(pending, suppress)` sem o parâmetro `allowed`/cooldown
  - `probe(direction)` dirigido: só avalia a borda compatível com a direção (inferior p/ forward, superior p/ backward); `direction === null` nunca agenda extensão; mês ativo continua sendo atualizado em qualquer direção
  - Buffer proporcional: novo helper puro `getExtendBuffer(viewportHeight) = max(400, min(1200, round(vh * 1.25)))` substitui o `BUFFER` fixo de 3000px
  - Deadline real por burst: `extendBurstStartedAtRef` marca a PRIMEIRA intenção pendente; cada reagendamento usa `nextExtendDelay(now, burstStartedAt, debounce, ceiling) = max(0, min(now+debounce, burstStartedAt+ceiling) - now)`; o flush nunca é adiado além do teto do burst; cleanup no unmount limpa timer, rAF, pendência E burst
  - Removidos: `BUFFER` (fixo), `EXTEND_MIN_INTERVAL_MS`/`isExtendAllowed`/`lastExtendAtRef` (cooldown — o interlock de compensação já quebra o loop) e `nextFlushDelay`/`extendLastScheduleAtRef` (substituídos pelo deadline por burst)
  - Re-export do `AgendaHub.tsx` atualizado: `isProbeInterlocked, nextExtendDelay, resolveFlushDirection, getExtendBuffer`
  - Testes: `getScrollContainerOffset` (HTMLElement + window), `getExtendBuffer` (mínimo/intermediário/teto), forward perto da borda inferior só chama `onExtendForward`, backward perto da borda superior só chama `onExtendBackward`, troca rápida de direção (a última vence), scroll contínuo (flush dentro de `EXTEND_CEILING_MS`), interlock/suppress (offset atualizado sem extensão; próximo scroll manual classificado), um flush nunca chama forward+backward juntos. Suíte = 87 testes passando (4 arquivos); tsc sem erros nos arquivos da Agenda; eslint só com os 3 warnings pré-existentes

- **Agenda — extensão atômica + poda separada do flush** (implementado 2026-08-11):
  - `monthMath.ts` agora é a fonte única de `ScrollDirection` (movido de `useInfiniteMonthScroll.ts`, que re-exporta); novos helpers puros `extendMonthStream(stream, direction, count)` (extensão atômica forward/backward com count normalizado, ordem cronológica, sem duplicatas, mesma referência quando nada muda) e `hasDistantMonths(stream, active, maxDistance)` (mesma regra da poda: `abs(monthsBetween) > maxDistance`)
  - Contrato do hook trocado: `onExtendForward`/`onExtendBackward` → **`onExtendMonths(direction, count)`** — uma ÚNICA chamada por flush com a contagem explícita (1..`EXTEND_MAX_MONTHS_PER_FLUSH`); o count é derivado da borda compatível com a direção no `flushPendingExtends`; sem gap real o flush não captura âncora nem chama o callback
  - **Poda separada do flush**: removido o `onPruneDistantMonths` síncrono do final do flush; nova `maybePruneDistantMonths` (guarda settle `SCROLL_SETTLE_MS`/interlock/`hasDistantMonths`) chamada por timer pós-settle (`schedulePruneAttempt` reagendado a cada evento de scroll, `pruneTimerRef`) e pelo efeito de navegação (`activeMonth` mudou); `monthStreamRef` novo para leitura do stream atual dentro do timer; cleanup do unmount também limpa `pruneTimerRef`
  - `AgendaHub.tsx`: `extendForward`/`extendBackward` substituídos por `extendMonths(direction, count)` usando `extendMonthStream`; imports de `monthKey`/`monthsBetween`/`shiftMonth` mantidos (poda + seed do stream)
  - Testes: `monthMath.test.ts` ganhou 9 testes de `extendMonthStream` (forward/backward, fronteira de ano, duplicatas, mesma referência, stream vazio, não-mutação) + 4 de `hasDistantMonths` (25 no total); hook test atualizado para `onExtendMonths` com count exato (forward/backward/troca/interlock) + novos blocos: "extensão atômica" (count=4 chama UMA vez; sem gap não captura âncora; âncora capturada ANTES do callback com compensação 200px) e "poda separada do flush" (extensão não dispara poda no mesmo ciclo; poda só após settle e UMA vez; scroll novo reinicia o timer; sem meses distantes não chama nem captura âncora). Suíte Agenda = 108 testes passando (4 arquivos: 58 agenda + 50 AgendaHub); tsc sem erros nos arquivos da Agenda; eslint limpo em `src/agenda/` (só os 3 warnings pré-existentes em AgendaHub)
  - Observação de teste: `vi.useFakeTimers()` no vitest inicia o relógio no epoch atual, então o efeito de navegação no mount (poda com meses distantes) dispara — os testes de poda zeram o mock via `mockClear()` após `setup` para isolar o ciclo de scroll

- **Agenda — harness dev + protocolo de validação manual do scroll** (implementado 2026-08-11):
  - Novo `dev-agenda.html` (raiz, página dev-only servida por `vite dev` em `/dev-agenda.html`; NÃO entra no build — o input default do Vite é só `index.html`) + `src/dev/agendaHarness.tsx`
  - Harness: monta `<AgendaHub seedCommitments={seed}>` com usuário fake (`uid: 'dev-harness'`) via `AuthContext.Provider` inline + `ToastProvider` real + `MemoryRouter` (o guard do render é `!userId` → precisa de user não-nulo para o caderno aparecer; `AgendaHub.tsx:979`); `initialLoading` desliga no `.finally()` do efeito de carregamento mesmo em modo seed (`AgendaHub.tsx:273-286`)
  - Seed determinístico em memória (`buildSeed`): 21 meses (hoje ±10) × 2 selos com o nome do mês no título (`Selo Março 2026 · marco A (dia 5)`) + 1 título multilinha no mês seguinte a hoje; total 43 compromissos — toda extensão da DOM fica visível pelos marcadores
  - HUD de observação (canto inferior direito, só na página dev): `Meses na DOM` (contagem de `[data-month-section]`) + `Mês ativo` (`agenda-month-label`); esperado 5 seções no início e ≤7 após poda (ativo ±3)
  - **Sem instrumentação de debug**: nenhuma query string de debug nem mudança no código de produção; a validação é auto-evidente (marcadores + HUD); os `console.log` DEV de `AgendaHub.tsx:219,222` são pré-existentes
  - Novo `docs/agenda-scroll-validation.md`: protocolo manual de 10 passos (estado inicial, extensão forward/backward, scroll contínuo anti-starvation, troca de direção, mês ativo, poda pós-settle, buffer proporcional, multilinha, navegação programática) com critérios de falha e citações de arquivos/linhas; justifica o manual porque o vitest é `jsdom` e **não há browser runner** (sem Playwright/Cypress instalados; `@vitest/browser-*` no lock são peer opcionais)
  - Validação: tsc sem erros; eslint `--max-warnings 0` limpo em `src/dev/` (harness sem console.log — só `textContent` do HUD); suíte Agenda inalterada (108 testes)

- **Agenda — correção navegação por mês (navigateToMonth)** (implementado 2026-08-11):
  - **Causa raiz**: `goPrevMonth`/`goNextMonth` (`AgendaHub.tsx`) atualizavam `activeYear`/`activeMonth` (rótulo do cabeçalho) e o stream, mas NUNCA rolavam o caderno até a seção do mês alvo — o cabeçalho mudava, a folha pautada ficava parada. O antigo `captureScrollAnchor()` ainda *preservava* a posição anterior
  - **Fluxo centralizado**: novo `navigateToMonth(year, month)` — (1) ativa `suppressAutoExtendRef` temporariamente (release via timer em `navTimersRef`, `MONTH_NAV_SUPPRESS_MS = 500`); (2) `ensureMonthLoaded`; (3) garante o mês no stream via helper puro `withMonthInStream` (ordem cronológica, sem duplicar, mesma referência se já existe; reutilizado no `goToDate`); (4) `setActiveYear/Month`; (5) registra intenção `pendingMonthNavRef`
  - **Scroll pós-render**: `useLayoutEffect` (deps `monthStream/activeYear/activeMonth/initialLoading`) lê a intenção, localiza a seção DENTRO de `notebookRef` via `[data-month-section="${monthKey}"]`, faz `scrollIntoView({ block: 'start', behavior: 'smooth' })` e SÓ ENTÃO limpa a intenção; se a seção ainda não existe (loading), mantém a intenção e re-tenta no próximo render — sem `setTimeout` frágil para aguardar render
  - **Cabeçalho fixo**: `scroll-mt-[96px] md:scroll-mt-16` direto no elemento `data-month-section` (mobile 2 linhas / desktop 1 linha) — sem offsets manuais competindo com o smooth
  - **goPrevMonth/goNextMonth** refatorados para apenas `shiftMonth(activeYear, activeMonth, ∓1)` + `navigateToMonth`; viradas de ano (Jan↔Dez) corretas por `shiftMonth`
  - **Não alterados**: `useInfiniteMonthScroll` (arquitetura, direção, buffer, ceiling, flush, extensão atômica, poda, interlock, offset de referência), `goToDate`/`goToday` (continuam navegação ao dia, cleanup de `navTimersRef` no unmount preservado)
  - **Testes**: +9 em `AgendaHub.test.tsx` (próximo/anterior com seção+`block:'start'`, virada de ano Dez→Jan e Jan→Dez, alvo já no stream sem duplicar, alvo fora do stream, "não rola até a seção renderizar" via promise controlada, `scroll-margin-top` responsivo, cleanup de timer pós-unmount via recorder de `scrollIntoView`); suíte Agenda = 117 testes passando (4 arquivos); tsc sem erros nos arquivos alterados; eslint com 0 erros (só os 3 warnings pré-existentes de AgendaHub)

- **Nexus Agenda — interpretação robusta + alarme/anotação na confirmação** (implementado 2026-08-12):
  - **Prompt exclusivo do Nexus Agenda** (standalone, NÃO toca o prompt principal do Nexus): `buildSystemPrompt` em `functions/nexusAgendaInterpret.ts:122` reescrito com persona/escopo/redirecionamento educado, fluxo de confirmação antes de qualquer alteração, pergunta de alarme/anotação feita pelo produto (não pelo LLM), e orientações de extração (recorrência semanal, fim de período → `until.expression`, participantes, duração). Diz explicitamente: saída é SEMPRE o envelope JSON estrito
  - **Motor de datas extendido** (`functions/nexus-core/agenda-time.ts`): `WEEKDAY_NAMES` agora inclui plurais (`segundas`, `tercas-feiras`, `tercas`, …); novos helpers puros `lastDayOfMonthYmd` + `monthEndToYmd`; `resolveDateExpression` ganha regras de fim de período (`fim de setembro`, `o fim de setembro`, `até o fim de setembro`, `fim do mês [que vem]`), regra de mês puro (`até dezembro` → último dia de dezembro) e prefix-strip ampliado (`na|no|em|para|dia|aos|as|ate`). Comando real agora resolve: "toda terça feira 18h até o fim de setembro" → 7 terças (18/08…29/09/2026)
  - **Parsing robusto** (`nexusAgendaInterpret.ts`): novo `extractJsonEnvelope` (remove cercas ```json, recorta do primeiro `{` ao último `}`), `tryParseEnvelope` (parse direto → `jsonrepair` → parse do reparo), retry com os ERROS REAIS de schema (`Envelope não é um JSON válido.`, etc.) em vez de mensagem genérica, `callModel` lança em contingência (`isContingency`) e `maxTokens` 700→1000
  - **Resumo empático** (`buildSummary`): "Entendi! Vou agendar \"…\" — 7 compromissos às 18:00, de 18/08/2026 a 29/09/2026. Você prefere ativar o alarme ou apenas anotar? Confirma assim?"
  - **Alarme/anotação no commit** (`functions/nexusAgendaCommit.ts`): `CommitRequest.alarm?: boolean` (validado — não-booleano → `invalid-argument`); `buildCommitDocuments(..., alarm)` grava `alarmAt` em cada ocorrência (timestamp do dia no fuso SP + startTime; meia-noite sem horário) só quando `alarm === true`
  - **Frontend**: `useAgendaNexus.commit(token?, { alarm })` envia `alarm: true` somente quando ativado; `AgendaNexusAssistant` ganhou fieldset "Alarme" (radios "Ativar alarme"/"Apenas anotar", default "Apenas anotar", resetado a cada nova proposta) renderizado só quando há proposta confirmável; confirmação envia a escolha
  - **Testes**: novo `functions/__tests__/agenda-time.test.ts` (17: fim de período, mês puro, plurais, 7 terças de `expandRecurrence`, fuso estável); `nexusAgendaInterpret.test.ts` +6 (comando completo → 7 ocorrências/status `awaiting_confirmation`/sem commit, recálculo do fim de mês pelo backend, cercas de markdown, retry com erros de schema, contingência → indisponível); `nexusAgendaCommit.test.ts` +3 (alarmAt nas ocorrências, ausência sem alarm, não-booleano rejeitado); `useAgendaNexus.test.tsx` +2 e `AgendaNexusAssistant.test.tsx` +3 (escolha de alarme no commit)
  - **Validação**: `npm --prefix functions run build` (tsc) sem erros; backend 51 testes (17+18+16) e frontend 35 testes passando; eslint limpo nos arquivos alterados do `src/`; tsc sem erros novos nos arquivos alterados (TS6133 de AppHeader/AppMobileDrawer etc. são pré-existentes)
  - **Deploy**: `firebase deploy --only functions:nexusAgendaInterpret,functions:nexusAgendaCommit` (pode exigir 1-2 tentativas por timeout de `User code failed to load`); revalidar preflight `curl -i -X OPTIONS …/nexusAgendaInterpret` → `204`

- **Nexus Agenda — fluxo "Plano → Aprovação → Execução" para exclusão em massa** (implementado 2026-08-13):
  - **Schema** (`functions/nexus-core/agenda-intent-schema.ts`): novo `agendaFilterSchema` (`{field: 'title'|'date', value}`), entidade `filter` em `entitiesSchema`, validação de delete agora aceita `title` OU `date` OU `filter` — data não é mais obrigatória para exclusão ("Preciso excluir todos os compromissos com o nome '…'")
  - **Interpret** (`functions/nexusAgendaInterpret.ts`): `searchByTitle` na interface `AgendaReader` + implementação Firestore (`orderBy date desc`, limite `MAX_DELETE_SCAN = 5000`, `normalizeTitle` em memória); `AgendaAffectedItem` + `AgendaRecap` com `matchCount`/`affectedItems`/`truncated`; `resolveDeleteTargets` (título / título+data via `saoPauloDayRangeMillis` / só data via `onDay` / `filter`); ramo `delete` em `orchestrateAgendaInterpret` SEM o gate de data, gravando `targets` no pending doc (`MAX_DELETE_TARGETS = 500`); prompt do sistema documenta exclusão por título sem data
  - **Commit** (`functions/nexusAgendaCommit.ts`): dependência `deleteBatch`; `buildCommitDocuments` → `buildCreateDocuments` + dispatcher `buildExecutionPlan`; exclusão re-verifica existência via `existingIds` e apaga só os existentes (`idsDeleted` no `CommitResult`/audit; `before` = metadados dos alvos, `after: null`); sem alvos → "A proposta de exclusão não possui alvos gravados."; nenhum existente → falha; falha de batch → status `partial`
  - **Hook** (`src/hooks/useAgendaNexus.ts`): `AgendaNexusAffectedItem`, proposta com `matchCount`/`affectedItems`/`truncated`, `commitResult` com `intent`/`idsDeleted`; `proposalIntentRef` setado no interpret e limpo em reset/cancel; `canUndo`/`undoContract` SOMENTE para intent `create` (delete não oferece desfazer)
  - **UI** (`src/components/Agenda/AgendaNexusAssistant.tsx`): `formatPreviewDate` (fuso SP) + `DeleteItemsPreview` (lista estilizada `aria-label="Itens que serão excluídos"`); botão "Confirmar exclusão"; fieldset de alarme oculto no delete; sucesso "Pronto! N compromissos excluídos..." com nota quando `matchCount` > `idsDeleted.length` ("N compromissos não foram encontrados na agenda")
  - **Testes**: interpret +5 (proposta por título sem data, 0 matches → clarification, escopo título+data, prioridade de `filter`, exclusão só por data via `onDay`); commit +5 (lote com `idsDeleted`, ignora alvos inexistentes, nenhum existente → falha, parcial com batch falhando, retry idempotente); schema +3 (delete por título, delete por `filter`, `filter.field` fora do enum rejeitado); hook +1 e assistant +3 (plano delete com preview/confirmar sem alarme, sucesso sem desfazer, nota de não-encontrados)
  - **Validação**: `npm --prefix functions run build` (tsc) sem erros; backend 121 testes (6 arquivos) e frontend Agenda 97 testes (5 arquivos) passando; eslint `--max-warnings 0` limpo nos 4 arquivos alterados do `src/`; tsc `--noEmit` sem erros novos

- **Nexus Agenda — Camada de Intenção e Diálogo (Plano + Refinamento)** (implementado 2026-08-13):
  - **Schema** (`functions/nexus-core/agenda-intent-schema.ts`): novas entidades `entities.limitDate` (dateResolutionSchema, p.ex. "até o dia X" / "nos próximos 5 dias") e `entities.maxSlots` (booleano, p.ex. "no limite da agenda"); validação `maxSlots: true` exige `recurrence`; strict rejeita tipo errado
  - **Motor de datas** (`functions/nexus-core/agenda-time.ts`): novo helper puro `resolveWindowExpression(raw, today): string | null` — "nos próximos N dias/semanas/meses", "próxima semana", "2 semanas", "1 mês"; null quando não reconhece (nunca inventa prazo)
  - **Interpret** (`functions/nexusAgendaInterpret.ts`): `buildSystemPrompt` reescrito com persona direta + script verbatim de redirecionamento para fora de escopo ("Você está fugindo das minhas atribuições delegadas…"); refinamento ativo: `AgendaRefinement` + `detectRecurrenceAmbiguity` (create + recurrence + SEM until/limitDate/maxSlots → pergunta de refinamento via `RECURRENCE_REFINEMENT_QUESTION` + sugestões `['Até o final do ano', 'Sem prazo máximo']`, sem default silencioso de 180 dias); `normalizeEnvelopeDates` resolve `limitDate` via `resolveWindowExpression` com fallback `resolveDateExpression`; expansão com precedência `until ?? limitDate ?? (maxSlots ? undefined : horizonte)`; `occurrenceCount === 0` → clarification; aviso truncado "A agenda foi preenchida até o limite de N compromissos."; **materialização**: quando `limitDate`/`maxSlots` dirigem a expansão sem `recurrence.until`, o envelope gravado ganha `recurrence.until = { expression, resolved: lastDate, confidence: 'high' }` para o commit re-expandir a MESMA série (senão expandiria até `MAX_COMMIT_OCCURRENCES = 800`); `buildSummary` com sufixo ", até o limite máximo da agenda"
  - **Hook** (`src/hooks/useAgendaNexus.ts`): novo estado `refinement` (`AgendaNexusRefinement`) exposto; `dialogueHistoryRef` acumula `{ user, assistant }` a cada clarificação (pergunta = `refinement.question ?? ambiguous[0] ?? questions[0]`), enviado como `history` na próxima chamada, limpo em resposta não-clarificação e em reset/cancel; backend `buildMessages` fatia as últimas 6 mensagens
  - **UI** (`src/components/Agenda/AgendaNexusAssistant.tsx`): painel "Refinando informação" (role="status", bolha com a pergunta + chips de sugestão que preenchem o input e chamam interpret); listas clássicas de clarificação só quando não há refinement; badge "Aguardando confirmação" no card de proposta
  - **Testes**: agenda-time +6 (janelas de "nos próximos N", "próxima semana", "2 semanas", "1 mês", null); schema +6 (limitDate aceito, maxSlots com/ sem recurrence, tipos errados rejeitados); interpret +7 (refinamento por recorrência sem horizonte, sem refinamento quando until presente, limitDate como teto da série + materialização do until, maxSlots preenche 366 + aviso truncado, data após limite → clarification, limitDate irresolvível → clarification, redirect verbatim fora de escopo, histórico enviado ao roteador); hook +3 (refinamento + acumulação de histórico, histórico limpo após proposta, refinement limpo em reset/cancel); assistant +3 (painel/chips, listas clássicas, badge "Aguardando confirmação")
  - **Validação**: `npm --prefix functions run build` (tsc) sem erros; backend 141 testes (6 arquivos) e frontend Agenda 103 testes (5 arquivos) passando; eslint `--max-warnings 0` limpo nos 4 arquivos alterados do `src/`; tsc `--noEmit` sem erros novos (TS2571 pré-existente em `functions/__tests__/nexusAgendaInterpret.test.ts:355` herdado do commit `4cb011a`)

- **Nexus Agenda — UI de Diálogo Contínuo (Modo de Diálogo)** (implementado 2026-08-13):
  - **Hook** (`src/hooks/useAgendaNexus.ts`): novo estado `dialogue: AgendaNexusHistoryMessage[]` exposto (espelho do `dialogueHistoryRef`); sincronizado em `reset`/`cancel` (→ `[]`), em resposta com clarificação com `refinement` (→ thread empilhada `[...dialogueHistoryRef.current]`) e com proposta (→ `[]`); clarificações clássicas sem `refinement` mantêm `dialogue: []` (listas amber intactas); estado NÃO é limpo no start do `interpret`, então a thread permanece visível durante o `interpreting`/`resolving_dates` (sem "piscar" entre perguntas)
  - **UI** (`src/components/Agenda/AgendaNexusAssistant.tsx`): `isDialogueMode = dialogue.length > 0`; bloco de bolhas de chat `role="status"`/`aria-live` com header "Diálogo com o Nexus" (ícone `MessageCircle`), mensagens do usuário à direita (`bg-sky-100`) e do Nexus à esquerda (`border-sky-200 bg-sky-50`); chips de sugestão abaixo da última bolha (reúso de `handleSuggestion`, que preenche o input e dispara `interpret`); listas clássicas renderizadas só com `stage==='clarify' && !isDialogueMode`; placeholder condicional `'Digite sua resposta ou complemente a informação...'` no modo diálogo; botão `Responder` no modo diálogo / `Enviar` fora dele; `setInput('')` após `await nexus.interpret(...)` em `handleSubmit` e `handleSuggestion` (comportamento de chat)
  - **Testes**: hook +3 (thread exposta/limpa após proposta, empilhamento de múltiplas trocas, clássica sem refinement → `[]`); assistant +3 e 1 atualizado (bolha + chips + header, placeholder/botão condicionais, mini-histórico empilhado, saída do modo diálogo em proposta, listas clássicas intactas)
  - **Validação**: `npx vitest run` nos arquivos alterados → 51 testes; suíte Agenda + hook → 119 testes passando; eslint `--max-warnings 0` limpo nos 4 arquivos alterados; tsc `--noEmit` sem erros novos

### Done
- **nexusAgendaCommit — sanitizador Firestore + retorno amigável** (implementado 2026-08-13):
  - **Causa raiz do erro 500**: em operações de delete, `seriesId` (e o `result` correspondente em `finalizePending`) ficavam `undefined` e eram gravados direto nos documentos de auditoria — o Firestore rejeita `undefined` com `Value for argument "data" is not a valid Firestore document.` O erro ocorria dentro do próprio bloco catch de `executeAgendaCommit` (a segunda `writeAudit` de falha também continha `undefined`), gerando `Unhandled error`.
  - **Novo `sanitizeForFirestore(value)`** em `functions/nexusAgendaCommit.ts` (puro, exportado): recursivo sobre objetos/arrays; `undefined → null`; `Date` inválido → `null`; `Date` válido preservado; **`Timestamp` do Firestore preservado intacto** (`instanceof Timestamp` antes de iterar).
  - **Aplicado em todas as gravações** de `buildFirestoreDependencies`: `transaction.update` do `claimPending`, `batch.set` do `writeBatch`, `update` do `finalizePending`, `set` do `writeAudit`. Cast `as Record<string, unknown>` nos call-sites (a função devolve `unknown`).
  - **try/catch + `logger.error` detalhado** (objeto que tentou salvar + `error`) em cada gravação (`claimPending`, `writeBatch`, `deleteBatch`, `finalizePending`, `writeAudit`).
  - **Retorno amigável no `onCall`**: catch do handler converte `HttpsError` de código `internal` (e erros não-HttpsError) em `{ success: false, error: 'Não foi possível registrar a operação. Verifique os logs.' }` + `logger.error`; `HttpsError` semânticos (`unauthenticated`, `invalid-argument`, `failed-precondition`, `deadline-exceeded`, `permission-denied`) continuam sendo relançados (frontend já os trata em `useAgendaNexus.ts`). O hook já lida com o corpo `{ success: false }` via `getResponseError`/`!data.success`.
  - **Testes**: +3 em `functions/__tests__/nexusAgendaCommit.test.ts` (undefined aninhado/arrays → null; Date inválido → null / válido preservado). 23 testes no arquivo passando; `tsc` build limpo (lint do repo não cobre `functions/`).
  - **Deploy**: `firebase deploy --only functions:nexusAgendaCommit` → `Successful update operation.` (sem o timeout de "User code failed to load" desta vez).

- **Nexus Agenda — estabilização completa (undefined + edição bloqueada + logs sem PII)** (implementado 2026-08-15):
  - **Causa raiz do INTERNAL em create simples**: `pending.write` do Interpret (`nexusAgendaInterpret.ts:820-828`) já sanitizava; a lacuna era o `nexusAgendaUndo.ts`, que grava sem sanitize em `claimAudit` (transaction.update) e `finalizeAudit` (update). Adicionado `sanitizeForFirestore` importado de `./nexusAgendaCommit` nas duas escritas do undo (sem ciclo de import — commit não importa undo/interpret).
  - **Edição temporariamente bloqueada no Interpret**: novo `EDIT_UNAVAILABLE_MESSAGE` + retorno `{ success: false, error }` logo após o log `validado` (~linha 576) — **nenhum pending é criado, nenhum token emitido, nenhuma chamada a `agenda.onDay`**; ramo morto de `edit_lookup` removido. Mensagem: "A edição de compromissos ainda não está disponível no Nexus na Agenda. Por enquanto, você pode excluir o compromisso atual e criar um novo." O Commit continua rejeitando `edit` como defesa em profundidade (`Somente propostas create_commitment ou delete_commitment`).
  - **Logs de erro do Commit sem PII**: helpers exportados `batchWriteErrorLog`/`auditErrorLog` + `safeUid`/`safeToken`/`errorMessage` privados; todos os 6 `logger.error` reduziram payload (claimPending/writeBatch/deleteBatch/finalizePending/writeAudit/catch externo) — nunca mais documento completo, auditoria completa, patch nem token em texto puro; apenas `uid` mascarado, IDs, contagens, `errorMessage`.
  - **Testes**: interpret +2 (sem undefined no pending após sanitize quando faltam endTime/recurrence; edit bloqueado sem write/onDay), commit +3 (create sem endTime/campos opcionais não envia undefined; log de lote não expõe o documento; log de auditoria não expõe a auditoria), assistant +1 (indisponibilidade de edição como erro sem botão de confirmar). Backend 140 testes passando (interpret/commit/undo/agenda-time/schema) + frontend Agenda 182 testes passando (src/agenda + useAgendaNexus + components/Agenda + AgendaHub).
  - **Validação**: `npm --prefix functions run build` (tsc) limpo; eslint `--max-warnings 0` limpo nos 4 arquivos frontend alterados; tsc root sem erros novos (TS2571 pré-existente em `nexusAgendaInterpret.test.ts:410`, herdado de `4cb011a`, apenas deslocado de 355).
  - **Deploy pendente (manual)**: `npm --prefix functions run build`; `firebase deploy --only functions:nexusAgendaInterpret,functions:nexusAgendaCommit --project financas-pro-invest`; `firebase functions:log --only nexusAgendaInterpret --project financas-pro-invest`. Teste manual: comando create simples ("amanhã, 18h" sem endTime) confirma sem erro 500; comando "edite a reunião" exibe a mensagem de indisponibilidade sem botão de confirmação.

- **Nexus Agenda — fluxo natural "Catequese 19h" (horário no título + byDay array + prefixo "dia")** (implementado e implantado 2026-08-19):
  - **Schema** (`functions/nexus-core/agenda-intent-schema.ts`): `recurrenceSchema.byDay` aceita número ÚNICO **OU array** (`z.union`, min/max 7) — o LLM pode emitir `byDay: [1]` sem falha estrutural; regra semanal `=== undefined` em `validateAgendaEnvelope` intacta.
  - **Datas** (`functions/nexus-core/agenda-time.ts`): `resolveDateExpression` ganhou corte de prefixo composto `^(?:at[eé]|no|na|em|para|aos|as|o|a)\s+(?:o\s+)?dia\s+(?:de\s+)?` antes do corte de prefixo único — `"até o dia 15/12/2026"`, `"o dia ..."`, `"no dia ..."`, `"no dia de ..."` agora resolvem (antes só cortava 1 prefixo e retornava `null` → `confidence: low` → clarificação que bloqueava a proposta).
  - **Inferência de horário do título** (`nexusAgendaInterpret.ts`): novo helper puro exportado `inferStartTimeFromTitle(title)` (regex `/\b(\d{1,2})\s*[:hH](\d{2})?/`, sem marcador de hora → `null`, hora >23 ou minuto >59 → `null`); aplicado em `normalizeEnvelopeDates` quando `intent === 'create'`, `startTime` ausente e o título carrega o horário ("Catequese 19h" → `startTime "19:00"`) — roda ANTES da validação e do check de low-confidence, então nunca dispara clarificação.
  - **Normalização byDay**: `normalizeEnvelopeDates` colapsa array → primeiro elemento (canônico número para validação, recap, sessão e `describeRecurrence`); `describeRecurrence` e o recap aceitam `number | number[]` na assinatura e coagem para número.
  - **Prompt** (`buildSystemPrompt`): contrato JSON usa `"byDay":[1]`; orientação de extração instrui byDay como ARRAY ("[1] segundas … [7] domingos"); Regra de TÍTULO com horário ganhou exemplo "Catequese 19h para todas as próximas segundas feiras" → title "Catequese 19h" + startTime "19:00"; regra "NÃO invente horário" explicita a exceção de horário embutido no título.
  - **Testes**: `agenda-time.test.ts` +5 (prefixo composto "dia": até o dia / o dia / no dia / até o dia de / por extenso); `nexusAgendaInterpret.test.ts` +3 — frase EXATA (`"Preciso que você agende para mim um compromisso com o titulo 'Catequese 19h' para todas as próximas segundas feiras até o dia 15/12/2026."`) → proposal com `title "Catequese 19h"`, `startTime "19:00"`, `firstDate 2026-08-17`, `lastDate 2026-12-14`, `occurrenceCount 18`, `recurrence {freq weekly, byDay 1, until 2026-12-14}` e pending com `byDay: 1`; inferência de `startTime` quando o modelo omite (proposal sem clarificação); teste direto de `inferStartTimeFromTitle` (19h/17h30/20h/1A 19h/às 19:00 vs null em "Aniversário 15"/"Catequese"/"24h de corrida").
  - **Validação**: `npm --prefix functions run build` (tsc) limpo; suíte backend **235 testes passando (7 arquivos)** — 227 anteriores + 8 novos, sem regressão.
  - **Deploy**: `firebase deploy --only functions:nexusAgendaInterpret --project financas-pro-invest` → `Successful update operation` (nodejs22). Revalidação: `OPTIONS` → 204 com CORS; `POST {"data":{...}}` sem auth → `UNAUTHENTICATED` (`Login necessário para usar a Agenda.`).

- **Nexus Agenda — correções de produção (payload real com null + caminho da sessão)** (implementado e implantado 2026-08-20):
  - **Causa raiz do erro de produção (payload real)**: logs de produção (`firebase functions:log`) mostravam `{"errors":["entities.endTime: Invalid input: expected string, received null"]}` — o LLM real emite `"startTime": null` / `"endTime": null` como ausência (padrão copiado de `location`/`participants`/`notes`, que são `nullable`), mas `entitiesSchema.startTime/endTime` eram `z.string().regex(...).optional()` SEM `.nullable()` → `tryParseEnvelope` (parse estrutural, ANTES de `normalizeEnvelopeDates`) rejeitava o envelope inteiro → retry com erros de schema → potencial erro amigável em vez de proposta. Os mocks de teste produziam `endTime: undefined` (JSON serializado omite o campo), nunca `null` literal — por isso os testes passavam.
  - **Correção 1 (schema)**: `agenda-intent-schema.ts` — `startTime`/`endTime` agora são `z.string().regex(ISO_TIME_REGEX, ...).nullable().optional()` (aceitam `null` como ausência, espelhando `location`/`participants`/`notes`).
  - **Correção 2 (normalização)**: `normalizeEnvelopeDates` (`nexusAgendaInterpret.ts:438`) converte `null → undefined` em `startTime`/`endTime` no topo — roda ANTES das regras de negócio e da inferência de horário do título, então todo downstream (`validateAgendaEnvelope`, recap, sessão, `collectWarnings`/`hasTimeOverlap`, `buildSummary`, commit) continua vendo `string | undefined`; `!entities.startTime` no create dispara a inferência ("Catequese 19h" + `startTime: null` → `19:00`).
  - **Coersão nos consumidores** (o tipo union `string | null | undefined` exige): `nexusAgendaCommit.ts` (linhas 253/274 — `timestampForOccurrence`), `contextFromEnvelope` (725-726), recap e `collectWarnings`/`buildSummary` (1478-1493) usam `?? undefined`.
  - **Testes novos (payload real)**: +3 em `nexusAgendaInterpret.test.ts` — `endTime: null` (proposal com `routeRequest` 1x, sem retry), `startTime: null` + `endTime: null`, e `startTime: null` + título "Catequese 19h" → inferência `19:00`. Suíte backend passou de 235 → 238.
  - **Correção 3 (caminho da sessão)**: logs de produção expuseram `Value for argument "collectionPath" must point to a collection, but was "users/{uid}/_nexus/sessions". Your path does not contain an odd number of components.` — `agenda-session.ts` (linhas 66 e 95) usava `users/${uid}/_nexus/sessions` (4 segmentos, par → inválido como coleção). Todos os irmãos `_nexus` (pending em `nexusAgendaInterpret.ts:1613`, audit em `nexusAgendaCommit.ts:573`) usam `users/{uid}/agenda/_nexus/...`. Corrigido para `users/{uid}/agenda/_nexus/sessions` (5 segmentos ímpares, coerente) — qualquer turno ≥ 2 de diálogo com `sessionId` derrubava com INTERNAL antes do LLM. O mock de teste aceitava qualquer path (linha 61 assertava até o caminho errado).
  - **Teste do caminho**: `agenda-session.test.ts` — mock captura a coleção (`collections`), asserção de 5 segmentos ímpares em leitura e escrita, e assert corrigido para `users/user-1/agenda/_nexus/sessions/sess-1`.
  - **Validação**: `npm --prefix functions run build` (tsc) limpo; suíte backend **239 testes passando (7 arquivos)** — 238 anteriores + 1 do caminho de sessão.

- **Consultor CFP® Sênior — Frente A (Mesa do Sininho, Tensão Antecipada & Ponte da Agenda)** (implementado 2026-09-11):
  - **Etapa 1 — Mesa de Despacho do Sininho**: `PresenceEventService.createNexusAdvisorAlert` adicionado com deduplicação por `resourceId`, cooldown configurável, pontuação de urgência e dispatch push nativo. Criado hook `useNexusAdvisorTriggers.ts` avaliando 5 cenários soberanos (Saldo Livre negativo, Dívidas ativas, Custo de Oportunidade, Capital Ocioso, Proteção incompleta). Montado em `AppLayout.tsx` e estilizado em `NotificationHub.tsx` com badge esmeralda `"Consultor Nexus"`.
  - **Etapa 2 — Antecipação de Tensão de Caixa & Consequência Imediata de Compras**: Antecipação de 5 dias em `useNexusAdvisorTriggers` monitorando contas do Controla quando o caixa cobre <70% do montante prestes a vencer. No `useNexusEventBridge`, disparo imediato de alerta consultivo para parcelamentos longos (≥ 2x) e despesas à vista de alto impacto (≥ R$ 1.500). Testes: 17 testes passando em `useNexusAdvisorTriggers.test.tsx` e `useNexusEventBridge.test.tsx`.
  - **Etapa 3 — A Ponte da Agenda (Tempo x Dinheiro)**:
    - `agendaService.ts`: `syncBillsToAgenda(userId, bills, year, month)` adiciona contas ativas do mês como compromissos às 09:00 com alarmes nativos e anotações com o valor formatado, sem duplicação.
    - `alarmService.ts`: alarmes recebem `userId` e, ao disparar no dispositivo (`fireAlarm`), gravam um evento `agenda.alarm_due` no Sininho através de `PresenceEventService`.
    - `AgendaHub.tsx`: botão responsivo `"Sincronizar Contas"` integrado no cabeçalho do caderno com feedback visual, recarregamento automático do mês e dos próximos compromissos, e passagem de `userId` nos alarmes.
    - Compatibilidade de seletor `data-month-section` com chaves canônicas e legadas consolidada. Suíte de testes `alarmService.test.ts` (8 testes) e `AgendaHub.test.tsx` (68 testes) 100% passando. Build de produção do Vite validado com sucesso.

- **Google Play Store & Mobile — Frente B (Etapa B1: Desacoplamento Seguro de Assinaturas & Lista VIP)** (implementado 2026-09-11):
  - **Arquitetura Desacoplada Segura**: Criado `src/services/purchaseService.ts` isolando a prontidão de cobrança (`isBillingReady(): boolean`, padrão `false` até abertura de contas bancárias/PJ e desligamento do vínculo empregatício). Mapeamento dos produtos Google Play Billing (`fpi_pro_monthly`, `fpi_pro_yearly`, `fpi_premium_monthly`, `fpi_premium_yearly`) e chamada desacoplada a `@capgo/native-purchases`.
  - **Lista VIP de Lançamento**: Novo modal `src/components/Billing/VipWaitlistModal.tsx` elegante, com campos pré-preenchidos para e-mail do usuário, nome e WhatsApp opcional. Grava intenção real em `users/{uid}/vip_interest/{id}` e no resumo do perfil `users/{uid}`, além de registrar confirmação no Sininho (`billing.vip_waitlist`).
  - **Conformidade Play Store na Paywall**: `PricingPage.tsx` eliminou chamadas de checkout externo via navegador no Android (`Browser.open`). Durante o pré-lançamento, exibe o banner "Acesso Antecipado • Lista VIP" e os botões "Garantir Vaga • Pro/Premium" acionando o `VipWaitlistModal`.
  - **Testes & Validação**: Criados `src/services/__tests__/purchaseService.test.ts` e `src/components/Billing/__tests__/VipWaitlistModal.test.tsx`. Todos os 9 testes passando (100%). ESLint sem erros. Build de produção do Vite validado com sucesso.
  - **Deploy**: `firebase deploy --only functions:nexusAgendaInterpret --project financas-pro-invest` → `Successful update operation` (2ª tentativa — 1ª caiu no timeout transitório `User code failed to load`). Revalidação: `OPTIONS` → 204 com CORS; `POST` sem auth → `UNAUTHENTICATED`.

- **Agenda — reordenação manual de compromissos no mesmo dia (setas ▲/▼ + campo `order`)** (implementado 2026-08-20):
  - **Causa raiz do bug**: a ordenação do dia era feita pela query Firestore `date ASC, time ASC` (`agendaService.ts`) — compromissos manuais sem `time` (null) apareciam ANTES dos demais na ordem ascendente, então o 2º compromisso lançado "virava o 1º do dia", sem nenhuma forma de reordenar.
  - **Campo de dados**: novo `order?: number` em `AgendaCommitment`/`AgendaCommitmentInput` (`agendaService.ts`); `addCommitment` grava `docData.order = data.order ?? null` (espelhando `time`). Sem migração: itens legados (sem `order`) caem num fallback estável.
  - **Novo helper puro `src/agenda/dayOrder.ts`** (padrão `monthMath.ts`): `compareDayCommitments` (quem tem `order` explícito vence; legado ordena por `time` → `createdAt` → `id`, com itens sem `order` agrupados ANTES dos ordenados para nova inserção anexar ao fim), `moveCommitment` (move + re-normaliza `order` 0..n-1, imutável), `nextOrderForDay` (max explícito + 1), `replaceDayInMonth` (troca só os itens do dia no array do mês).
  - **UI** (`AgendaHub.tsx`): `dayMap` ordena cada dia com `compareDayCommitments`; setas `ChevronUp`/`ChevronDown` em cada faixa de compromisso, SEMPRE visíveis quando o dia tem 2+ itens (sem hover — requisito mobile), desabilitadas nas pontas; `commitAdd` grava `nextOrderForDay`; novo handler `shiftCommitment` com update otimista em `allMonths` + persistência em `reorderDayCommitments` (batch atômico), sem `await` na UI, toast + `reloadData()` em erro; em modo `seedCommitments` (harness dev) apenas local.
  - **Serviço**: novo `reorderDayCommitments(userId, ordered)` em `agendaService.ts` usando `writeBatch` + `serverTimestamp()` por item (sem novo índice Firestore — ordenação client-side).
  - **Testes**: novo `src/agenda/__tests__/dayOrder.test.ts` (15: comparador, move, nextOrder, replaceDayInMonth); `agendaService.test.ts` +2 (persistência de order no add + batch de reordenação); `AgendaHub.test.tsx` +6 (setas ausentes com 1 item, presentes com 2+, desabilitação nas pontas, troca otimista de ordem + batch chamado, subir último → topo, add grava próximo order). Suíte Agenda = 191 testes passando (6 arquivos); tsc sem erros nos arquivos alterados; eslint `--max-warnings 0` limpo nos arquivos novos/alterados (warnings de AgendaHub/agendaService.test pré-existentes). Sem mudança no backend Nexus (compromissos criados por ele ficam sem `order` e caem no fallback; a 1ª reordenação do dia normaliza tudo). Harness dev ganhou cluster de mesmo-dia para validação visual.

- **Etapa 6 — Navegação, Shell e Telas Auxiliares** (auditoria aprovada + execução):
  - **Estado atual confirmado**: `src/components/CentralHub.tsx` não existe mais no repositório (removido antes do HEAD `cb27693`); a rota `/app/central` renderiza `AppCockpit` (`src/routes/AppRoutes.tsx:211-230`). Menções a `CentralHub` em `tsc_report_*.txt`, `.firebase/hosting.*.cache` e nos registros históricos acima são artefatos/memória de auditorias passadas, não código vigente. `ACTION_REGISTRY` (Etapa 5 N8) segue compatível: `/app/minhas-dividas` e `/app/controla` existem.
  - **E6-01**: `AppMobileDrawer.tsx` — imports `Crown`/`Settings`/`UserMeta` corrigidos (era `ReferenceError` em runtime ao abrir o drawer); novo `src/components/__tests__/AppMobileDrawer.test.tsx` (7 testes).
  - **E6-02**: `ExplorarHub.tsx` — grade de ferramentas derivada de `TOOL_ROUTES` (`tool-*` ⇒ exatamente uma entrada navegável; inclui `tool-fire`, `tool-inflacao`, `tool-dividendos`, `tool-buy-cash-or-installments`); novo `src/components/__tests__/ExplorarHub.test.tsx` (contrato por seção + ausência de listener).
  - **E6-05/E6-09**: `AppHeader.tsx` — `/app/agenda` em `MAIN_ROUTES` (marca em vez de "Voltar"); botão Menu do drawer sem guarda `!isNative`; novo `src/components/__tests__/AppHeader.test.tsx` (4 testes).
  - **E6-06**: barra fixa mobile "EXPLORAR" + listener `window.scroll` + `isScrolled` removidos do `ExplorarHub.tsx`.
  - **E6-07/E6-08**: `SettingsPage.tsx` — Termos/Privacidade navegam para `/termos`/`/privacidade` internos; seção no-op "Horário de Disponibilidade" removida (melhoria futura de produto: wiring real a `presencePrefs`); `handleStartupHomeChange` agora recebe fallback interno para `/app/mais/pricing`; higiene (`ref`/`update`/`db` não usados, `Toggle` e props tipados). Novo `src/components/__tests__/SettingsPage.test.tsx` (3 testes).
  - **E6-10**: `isPrimaryNavTool`/`getPrimaryNavRoute` removidos de `appPrimaryNav.ts` (sem consumidores).
  - **E6-03/E6-04**: removidos após grep final sem consumidores — `ProfilePage.tsx`, `UpgradePage.tsx`, `UserPanel.tsx`, `MobileMenu.tsx`, `src/layouts/AppShell/`, `src/labs/app-shell/`, `src/config/navigation.config.ts` (zero consumidores restantes). `src/labs/` preservado.

### In Progress
- (none)

### Blocked
- **useDashboardState return statement broken** (inherited from prior refactor): hook's `return {...}` references ~20 variables that were deleted (`guardedSetViewMode`, `commandMode`, `showCalibrationOffer`, `calibrationInviteCopy`, `handleDeferCalibration`, `handleDismissCalibrationInvite`, `handleStartCalibration`, `handleCalibrationComplete`, `categoryStats`, `categorySummary`, `categoryTransactionsMap`, `categoryNames`, `guardedChangeDate`, `guardedDateSelect`, `handleExportPDF`, `handleClearCardFilter`, `handleFilterByCard`, `setRecurringBills`, `setUserCards`). These are all TS2304/TS18004 errors — code unreachable until fixed. Not caused by console.time instrumentation.

### Done
- **console.time instrumentation** (2026-07-07):
  - `useDashboardState.ts`: added `console.time`/`console.timeEnd('uds-filtered-calc')` and `('uds-stats-calc')` inside `filtered` and `stats` useMemos; moved stray `performance.mark/measure` inside the `filtered` useMemo (they were dead code after the closing `]);`); added `console.time('uds-activeInvoices-calc')`
  - `calculations.ts`: added `console.time('calc-aggregateAllTimeFlow')` and `('calc-buildSovereignSnapshot')` to `aggregateAllTimeFlow` and `buildSovereignSnapshot`; refactored `aggregateAllTimeFlow` from `forEach` to `for` loop
  - Fixed stats useMemo closing (`}, [deps]);` was replaced by the hook's `return {` when adding console.timeEnd)
  - Removed unused `getCurrentInvoice` import

## Key Findings (All Audits)

### Sovereign Calculation Architecture
- **Orchestrator**: `useSovereignSnapshot` (`src/hooks/useSovereignSnapshot.ts`) extends `SovereignSnapshot` with 4 extra fields (`totalPendingBills`, `virtualImpact`, `cardFuturePressure`, `rotativoDebtBalance`). Calls `aggregateMonthFlow`, `aggregateAllTimeFlow`, `buildSovereignSnapshot`, `computeSovereignMetrics`.
- **Engine**: `buildSovereignSnapshot` (`src/utils/calculations.ts:201`) takes params and returns `SovereignSnapshot`. Key call chain: `buildSovereignSnapshot` → `computeSovereignMetrics` (line 157) → `getColchaoShortfall/reserveShortfall/protectionBuffer`. Formula: `sovereignFreeBalance = accumulatedBalance - virtualImpact - pendingBills - protectionShortfall` (line 169).
- **Parallel danger**: `calculateSovereignBalance` (`src/utils/calculations.ts:289`) uses formula `currentBalance - upcomingInvoices - monthlyFixedExpenses - reserveProvision`. Called by Nexus only. Different inputs, different result.
- **Missmatch**: In `buildSovereignSnapshot` line 202, `virtualImpact = (params.virtualImpact ?? 0) + (params.rotativoDebtBalance ?? 0)` — `rotativoDebtBalance` is added inside the engine, but `useSovereignSnapshot` line 98 already passes it separately and it appears on both line 99 (`rotativoDebtBalance`) and line 91 (`virtualImpact: cardInvoiceRemaining`). Double-counting risk is mitigated by `cardInvoiceRemaining` being set to 0 for `rotativoConverted` invoices (line 53-54), but the engine's internal addition of `rotativoDebtBalance` is an implicit mixing of card pressure + rotativo debt.
- **CockpitHero override**: Lines 77-86 of `CockpitHero.tsx` override hero value: `heroValue = showFreeBalanceHero ? sovereign.sovereignFreeBalance : sovereign.heroValue`. Decision depends on `transactions.length >= 5` — a heuristic absent from any calculation engine.

### Derived-State Abandoned Architecture
- `src/core/derived-state/aggregators/` — empty
- `src/core/derived-state/calculators/` — empty
- `src/core/derived-state/selectors/` — empty
- `src/core/derived-state/runtime/domain-graph.ts` — `DependencyGraph` class exists but never populated with nodes (line 29: `export const domainGraph = new DependencyGraph()` — zero calls to `addDependency` anywhere in the codebase)

### Navigation & UX Inconsistencies
- `navigation.config.ts` uses `id: 'explora'`/label `'Explora'`/path `/explora` — but `appPrimaryNav.ts` uses `toolId: 'explorar'`/label `'Explorar'`/route `/app/explorar`. The config file routes (`/home`, `/controla`, `/central`, `/explora`, `/mais`) don't match TOOL_ROUTES (`/app/home`, `/app/controla`, `/app/central`, `/app/explorar`, `/app/mais`).
- MobileBottomNav (5 items: Home, Add, Central, Alertas, Mais) ≠ desktop PRIMARY_NAV_ITEMS (4 items: Home, Controla, Central, Explorar). Different surfaces exposed per platform.
- CentralHub (`/app/central`, $HOME) rehashes what Home already shows: base de proteção, reserves, wealth aggregates, Nexus insights. Purpose overlap with Home's CockpitHero + SovereignBuckets.
- ExplorarHub (`/app/explorar`, $HOME) = market data (quotes, news, ticker) + tools (juros, dívidas, alugar, inflação, fire, dividendos, compra) + courses. Serves as a secondary landing for content, competing with Home.
- SettingsPage (`/app/mais`, 857 lines) = profile editor + financial profile + pricing redirect + app version + user deletion + logout action list. No logical grouping, no hierarchy. A settings catch-all.

### Philosophical Axes (Traced in Code)
1. **Caixa (Cash)**: `monthBalance`, `realBalance`, `aggregateMonthFlow` — tracks immediate cash in/out.
2. **Pressão (Pressure)**: `virtualImpact` (invoice remaining), `cardFuturePressure`, `pendingBills`, `obligationsDeduction` — obligations that consume cash.
3. **Proteção (Protection)**: `protectionBuffer`, `colchaoShortfall`, `reserveShortfall`, `marcoZero`, `emergencyReserveCurrent` — layers of financial safety.
4. **Trajetória (Trajectory)**: `buildMarginTrajectory` in `trajectoryEngine.ts`, `freedomVelocity`, `leewayDays` — direction over time.
- But `trajectoryEngine.ts` line 48 uses `flow.realBalance - protection` for margin points — which references `realBalance` (month flow), not `sovereignFreeBalance` (accumulated). Only the current month margin may be overridden by `currentMargin`.

### Nexus/IA Architecture
- **Backend** (8+ modules in `functions/`): `MultiModelRouter.ts` (454 lines, cascading router), `askAiAdvisor.ts` (601 lines, main CF), `analyzeFinancialHealth.ts`, `generateBriefing.ts`, `suggestActions.ts`, `insightRanking.ts`, `contextBuilder.ts`, `personaAnalysis.ts`.
- **Frontend** (5+ surfaces): `NexusInsightCard` (Home), `NexusFeed` (Home sidebar + mobile), `NexusInlineAdvisor` (Controla form), `AiAdvisor` (Chat), `CentralHub Nexus section` (Central), `NexusActionButton` (inline action button).
- `nexusInsightEngine.ts` (634 lines): 15+ insight generators. `buildUserContext` gathers all financial data. `getCentralInsights` produces centralized insights.
- `nexusEventEvaluator.ts` + `eventInsightStore.ts` + `useNexusEventBridge.ts`: event-streamed insight delivery, dedup, analytics.

### Monetization & Plan Gating
- `config/stripePlans.ts` defines Free/Pro/Premium plans.
- Two parallel subscription fields: `subscription.plan` (used by `useSubscriptionAccess`) vs `subscription.planId` (used by `isAppPremium` in user.ts for analytics).
- Nexus actions check `action.requiresPlan` against plan hierarchy (line 42 `planHierarchy = { free: 0, pro: 1, premium: 2 }`).
- `FeatureGate`, `PremiumUpgradePrompt`, `PaywallModal` all in `src/components/` — consistent gating pattern.

## Relevant Files (Mapped Across All 3 Audits)
- `src/utils/calculations.ts` (321 lines) — 11 functions: `aggregateMonthFlow`, `aggregateAllTimeFlow`, `computeSovereignMetrics`, `buildSovereignSnapshot`, `calculateSovereignBalance`, `calculateLeewayDays`, `calculateFreedomVelocity`, computeLaunchImpact, maskCurrency, and helpers (getProtectionBuffer, getColchaoShortfall, getReserveShortfall, getTotalShortfall)
- `src/hooks/useSovereignSnapshot.ts` (113 lines) — Sovereign orchestrator, extension of SovereignSnapshot with 4 extra fields
- `src/components/Home/Cockpit/CockpitHero.tsx` (505 lines) — Overrides hero calculation, adds `transactions.length >= 5` heuristic
- `src/core/derived-state/` — Empty aggregators/calculators/selectors; abandoned DependencyGraph
- `src/theme/fpiVoiceGuide.ts` (309 lines) — Central vocabulary, 4-axis copy, institutional definitions
- `src/services/nexusInsightEngine.ts` (634 lines) — 15+ insights, buildUserContext, getCentralInsights, NexusAdvisoryContext
- `functions/nexus-core/MultiModelRouter.ts` (454 lines) — Multi-model cascading router
- `functions/askAiAdvisor.ts` (601 lines) — Main Nexus Cloud Function
- `src/routes/AppRoutes.tsx` (381 lines) — Central router with loading orchestration (T0-3s, 3-7s, >7s)
- `src/components/MobileBottomNav.tsx` (124 lines) — 5-item bottom nav (Home, Add, Central, Bell, Menu)
- `src/config/appPrimaryNav.ts` (48 lines) — 4-item primary desktop nav (Home, Controla, Central, Explorar)
- `src/config/navigation.config.ts` (48 lines) — Dead config with 'explora'/'Explora'/='/explora' (inconsistent with appPrimaryNav)
- `src/components/CentralHub.tsx` (678 lines) — Competes with Home, rehashes base proteção, Nexus, wealth aggregates
- `src/components/ExplorarHub.tsx` (223 lines) — Market data + tools + courses secondary landing
- `src/components/SettingsPage.tsx` (857 lines) — Superficial catch-all settings (profile + pricing + logout + delete)
- `src/components/Home/NexusInsightCard.tsx` (98 lines) — Home card Nexus surface
- `src/components/Home/NexusActionButton.tsx` (117 lines) — Inline action button with plan gating
- `src/hooks/useNavigation.ts` (158 lines) — Navigation orchestrator with TOOL_ROUTES, Capacitor persistence
- `src/services/trajectoryEngine.ts` (94 lines) — Margin trajectory builder, uses `flow.realBalance - protection`
- `config/stripePlans.ts` — Free/Pro/Premium plan definitions
- `src/types/index.ts` — CardInvoice, InvoiceStatus, FinancialProfile types
- `src/services/debt/debt.realtime.ts` + `src/services/card.realtime.ts` + `src/services/transaction.realtime.ts` — Realtime bridge services (3 bridges)
- `src/contexts/DebtContext.tsx` + `src/contexts/FinanceContext.tsx` — Both call `createDebtRealtimeBridge` (duplicate)
- `src/core/orchestration/domainEvents.ts` — 8 typed domain events
- `src/core/orchestration/event-bus.ts` — EventBus implementation
- `src/services/nexusAnalyticsService.ts` — Analytics tracking (trackInsightClicked, trackActionSuggested, etc.)
- `src/services/eventInsightStore.ts` — Insight dedup store
- `src/hooks/useNexusEventBridge.ts` — Bridge between events and insight store
- `src/services/nexusEventEvaluator.ts` — Evaluates events for relevance
- `src/components/Nexus/NexusFeed.tsx` + `src/components/Nexus/NexusFeedItem.tsx` — Feed surfaces
- `src/services/sovereignMap.ts` (NEW, 137 lines) — 6-stage classification engine: `classifyStage`, `classifyFromSnapshot`, `StageInfo`
- `src/components/Home/SovereignMapCard.tsx` (NEW, 80 lines) — Sovereign Map card rendered in HomeMainColumn
- `src/services/__tests__/sovereignMap.test.ts` (NEW, 114 lines) — 15 tests covering all 6 stages + edge cases

## Conceptual Model (Inferred from Code)
```
CASH (Caixa)
  monthBalance = income - expenses (aggregateMonthFlow.realBalance)
  accumulatedBalance = allTimeFlow.realBalance
  
PRESSURE (Pressão)
  virtualImpact = invoice.remainingAmount (card pressure)
  cardFuturePressure = totalCreditUsed - cardInvoiceRemaining - rotativoDebtBalance
  pendingBills = active unpaid recurring bills
  rotativoDebtBalance = sum(rotativo_cartao debts)
  obligationsDeduction = virtualImpact + pendingBills (+ rotativoDebtBalance inside engine)

PROTECTION (Proteção)
  protectionBuffer = marcoZero + emergencyReserveCurrent
  colchaoShortfall = max(0, colchaoTarget - marcoZero)
  reserveShortfall = max(0, reserveTarget - reserveCurrent)
  protectionShortfall = colchaoShortfall + reserveShortfall

TRAJECTORY (Trajetória)
  sovereignFreeBalance = accumulatedBalance - obligationsDeduction - protectionShortfall
  leewayDays = floor(sovereignFreeBalance / dailyCost)
  freedomVelocity = (monthlyAport / expenses) * 30
  margin trajectory = flow.realBalance - protection (monthly series)

HERO (Display)
  mode = 'rotina' (show monthBalance) | 'comando' (show sovereignFreeBalance)
  Override: CockpitHero uses transactions.length >= 5 OR commandMode
```
