# Agenda — Protocolo de validação manual do scroll (infinite month scroll)

> Documento de validação do motor de scroll da Agenda. Cobre o `dev-agenda.html`
> (harness de desenvolvimento) e o comportamento esperado do componente em um
> navegador real. Não substitui os testes unitários — valida o que o jsdom não
> consegue: rolagem física, rAF, compensação de posição e poda pós-settle.

## Escopo

- Componente: `src/components/AgendaHub.tsx` (1394 linhas)
- Motor de scroll: `src/agenda/useInfiniteMonthScroll.ts`
- Helpers puros: `src/agenda/monthMath.ts`, `src/agenda/scrollContainer.ts`, `src/agenda/activeMonth.ts`
- Harness: `dev-agenda.html` + `src/dev/agendaHarness.tsx`

## Como rodar

1. `npm run dev`
2. Abrir `http://localhost:5173/dev-agenda.html`
3. A página monta `<AgendaHub seedCommitments={seed}>` com um usuário fake
   (`uid: 'dev-harness'`) e um seed em memória. **Nenhuma leitura ao Firebase**:
   o guard `seedCommitments` faz `ensureMonthLoaded`/`loadUpcoming` retornarem cedo
   (`AgendaHub.tsx:213` e `:233`) e a inicialização de `initialLoading` ocorre no
   `.finally()` do efeito de carregamento (`AgendaHub.tsx:273-286`).

### O seed (`src/dev/agendaHarness.tsx`, `buildSeed`)

- 21 meses (hoje ±10), cada um com dois compromissos cujos títulos carregam o
  **nome do mês e ano** (ex.: `Selo Março 2026 · marco A (dia 5)`).
- Um compromisso extra com título longo (multilinha) no mês seguinte a hoje,
  para validar a medição de linhas.
- Total: 43 compromissos.

Como cada seção mensal da DOM mostra o nome do mês no divisor e nos títulos dos
compromissos, **toda extensão da DOM é visível**: ao chegar perto da borda, meses
que ainda não existiam na tela aparecem com seus marcadores distintos.

### HUD de observação (canto inferior direito)

- `Meses na DOM`: contagem de `[data-month-section]` (estado real do stream).
- `Mês ativo`: texto do cabeçalho fixo (`data-testid="agenda-month-label"`).

Estado inicial esperado: **5 seções mensais** (hoje −2 a hoje +2,
`AgendaHub.tsx:162-170`) e `Meses na DOM: 5`.

## Mecânica sob validação (referência)

| Comportamento | Implementação |
|---|---|
| Stream inicial | hoje ±2 (5 meses) — `AgendaHub.tsx:162-170` |
| Extensão atômica forward/backward, max 4 meses por flush | `EXTEND_MAX_MONTHS_PER_FLUSH = 4` — `useInfiniteMonthScroll.ts:21`; `extendMonthStream` — `monthMath.ts:46` |
| Debounce do flush / teto por burst | `EXTEND_DEBOUNCE_MS = 140` / `EXTEND_CEILING_MS = 300` — `useInfiniteMonthScroll.ts:12-18`; `nextExtendDelay` — `:59` |
| Zona de buffer proporcional à viewport | `getExtendBuffer(vh) = max(400, min(1200, round(vh × 1.25)))` — `:72` |
| Direção física do gesto | `getScrollContainerOffset` — `scrollContainer.ts:33` |
| Compensação de posição por âncora | `scrollContainerBy(container, delta)` — `scrollContainer.ts:23` (positivo = desce a view quando meses foram inseridos acima) |
| Interlock contra scroll sintético | `SCROLL_INTERLOCK_MS = 200` — `useInfiniteMonthScroll.ts:25`; `isProbeInterlocked` — `:39` |
| Poda de meses distantes (pós-settle, fora do flush) | `SCROLL_SETTLE_MS = 250` / `PRUNE_MAX_DISTANCE = 3` — `:32-35`; `pruneDistantMonths` — `AgendaHub.tsx:292`; `hasDistantMonths` — `monthMath.ts:83` |
| Linha de régua e altura fixa das faixas | `AGENDA_ROW_HEIGHT = 28` — `AgendaHub.tsx:38` |

## Roteiro de validação manual

Cada passo lista a **ação**, o **resultado esperado** e o **critério de falha**.

### 1. Estado inicial

- **Ação**: abrir `dev-agenda.html`.
- **Esperado**: cabeçalho fixo com `Agenda {Mês} {Ano}`; caderno pautado; **5**
  seções mensais (`Meses na DOM: 5`); o dia de hoje centralizado; divisor
  `— Mês Ano —` entre meses; títulos `Selo <Mês> <Ano> …` visíveis.
- **Falha**: spinner infinito, tela de "Faça login", ou contagem ≠ 5.

### 2. Extensão forward (borda inferior)

- **Ação**: girar a roda do mouse para baixo até cruzar a última seção mensal.
- **Esperado**: ao entrar na zona de buffer inferior (`≈1.25×` da altura visível,
  entre 400 e 1200px), após **140–300ms** parados (debounce/burst), o HUD
  incrementa `Meses na DOM` (até +4 por flush) e um mês seguinte inédito aparece
  no fim do caderno, com seu divisor e selos. **Nenhum salto visual**: a âncora
  compensa automaticamente (`scrollContainerBy`, delta positivo).
- **Falha**: a DOM nunca cresce na borda; a tela "pula"/repete conteúdo; meses
  aparecem aos pedaços no mesmo flush (deveria ser atômico).

### 3. Scroll contínuo (anti-starvation)

- **Ação**: manter a roda girando sem parar até o fim do seed (+10 meses).
- **Esperado**: o flush dispara ao menos a cada **300ms** desde o início do burst
  (`EXTEND_CEILING_MS`); a contagem cresce de forma estável; a DOM **não** fica
  criando e removendo meses repetidamente durante o gesto.
- **Falha**: o scroll "trava" na borda (starvation do debounce) ou a DOM oscila.

### 4. Extensão backward (borda superior)

- **Ação**: subir até o topo do caderno (acima da primeira seção mensal) e girar
  a roda para cima.
- **Esperado**: flush backward insere meses **antes** do primeiro; o conteúdo
  permanece ancorado (compensação desce a view); `Meses na DOM` cresce e os meses
  anteriores (até −10) aparecem com seus selos.
- **Falha**: o conteúdo "dança" ao inserir acima; meses anteriores nunca surgem;
  o mês ativo não muda quando a borda superior passa pelo centro.

### 5. Troca de direção no meio do gesto

- **Ação**: rolar para baixo (forward) e, sem parar, reverter para cima e vice-versa.
- **Esperado**: **a última direção vence** — um flush nunca insere forward+backward
  juntos; pendência única de direção (`resolveFlushDirection`,
  `useInfiniteMonthScroll.ts:46`).
- **Falha**: extensões simultâneas nas duas pontas, ou direção errada após a troca.

### 6. Mês ativo

- **Ação**: percorrer o caderno.
- **Esperado**: o cabeçalho fixo (`agenda-month-label`) mostra o mês centrado na
  viewport e só troca ao cruzar a fronteira de mês (não a cada pixel).
- **Falha**: rótulo oscilando entre dois meses na mesma posição, ou nunca trocando.

### 7. Poda (crescimento limitado da DOM)

- **Ação**: parar de rolar por ≥250ms em um mês distante do centro.
- **Esperado**: `Meses na DOM` retorna a **≤7** (mês ativo ±3 —
  `PRUNE_MAX_DISTANCE = 3`). A poda roda **fora** do flush (pós-settle) e não
  desloca o conteúdo que acabou de ser compensado.
- **Falha**: a contagem cresce sem limite durante o uso; a poda acontece no mesmo
  ciclo do flush (causando "pulo" visual); a poda remove o mês ativo.

### 8. Buffer proporcional

- **Ação**: comparar o ponto de disparo em janelas de tamanhos diferentes
  (viewport alta vs baixa).
- **Esperado**: a extensão dispara mais cedo em viewports altas (buffer
  `min(1200, vh×1.25)`) e mais tarde nas baixas (piso 400px).
- **Falha**: disparo idêntico/independente do tamanho da janela.

### 9. Multilinha

- **Ação**: localizar o compromisso `Compromisso multilinha de validação …`.
- **Esperado**: o título quebra em 2+ faixas do caderno, cada uma com 28px, sem
  sobrepor a régua; as linhas seguintes aparecem com `data-continuation-row`.
- **Falha**: texto cortado, faixas com alturas diferentes ou régua sobreposta.

### 10. Navegação programática

- **Ação**: usar as setas `<` / `>` do cabeçalho, o botão **Próximos**, o ícone de
  calendário ("Ir para data") e **HOJE** (aparece quando o mês ativo ≠ hoje).
- **Esperado**: scroll suave até o alvo com **suppress** de extensão ativo (sem
  extensão automática durante o scroll programático); `Meses na DOM` se ajusta pela
  poda após a navegação; voltar para hoje recentraliza o dia atual.
- **Falha**: extensão disparada durante o scroll programático; navegação "pula" o
  alvo; HOJE não retorna ao mês corrente.

## Critérios de falha globais

- Erros no console do navegador durante qualquer passo (exceto os `console.warn`
  pré-existentes de carregamento em `DEV` — `AgendaHub.tsx:226`, `:242`).
- `Meses na DOM` divergindo do esperado (5 no início; ≤7 após poda).
- Qualquer salto de posição visual na compensação (forward OU backward).
- Vazamento de timers ao navegar/desmontar a página (sem `setTimeout` residual
  causando scroll fantasma após sair).

## Notas

- **Sem instrumentação de debug**: nenhuma query string de debug foi adicionada.
  A validação é auto-evidente (marcadores por mês no seed + HUD de contagem) e a
  instrumentação existente do componente é gated por `import.meta.env.DEV`
  (pré-existente, `AgendaHub.tsx:219`, `:222`). Nenhuma mudança foi feita no
  código de produção.
- **Prompt de notificação**: o componente chama `requestNotificationPermission()`
  no mount (`AgendaHub.tsx:441-442`). No navegador, negar ("Block") é seguro e
  não afeta a validação.
- **Limitação do seed**: os dados cobrem hoje ±10 meses. A extensão da DOM não
  depende dos dados (as seções renderizam sem compromissos), então a validação
  pode continuar além do seed, apenas sem selos para conferência visual.
- **Por que não rodar no vitest/jsdom**: o ambiente é `jsdom`
  (`vitest.config.ts:7`) e **não há browser runner** (sem Playwright/Cypress nas
  dependências; as referências a `@vitest/browser-*` em `package-lock.json` são
  peer opcionais não instaladas). Rolagem real, rAF, `scrollIntoView`, getClientRects
  e `ResizeObserver` exigem um navegador — por isso este protocolo é manual.
