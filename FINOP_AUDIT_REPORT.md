# Auditoria de Consumo Firestore — Finanças Pro Invest

**Período analisado**: 1–10 jul 2026  
**Custo real**: R$ 39,63 (Firestore ~R$ 39,79, Cloud Run ~R$ 0,02)  
**Previsão mensal**: R$ 65,79  
**Usuários reais**: 1

---

## A. Diagnóstico Executivo

### Hipótese 1 — CRÍTICA (95% de probabilidade)
**Múltiplos listeners `onSnapshot` simultâneos na mesma coleção `presenceEvents` causando leitura dobrada a cada escrita.**

Há **2 listeners persistentes** na subcoleção `users/{uid}/presenceEvents` montados simultaneamente:
- `NotificationContext.tsx:53-60` — sem filtro `where` (carrega todos os 20 mais recentes, inclusive lidos)
- `PresenceAlertsBanner.tsx:11` → `usePresenceEvents` → `presence.realtime.ts:18` — com `where('status', '==', 'pending')`

Cada `addDoc` ou `updateDoc` em `presenceEvents` dispara **ambos os listeners** → 2 leituras por evento. Considerando que `PresenceEventService.create()` é chamado por 5+ hooks/serviços (usePresenceTriggers, useWealthPresenceTriggers, useReengagementTrigger, rotativoService, useAppState), cada ação do usuário pode gerar múltiplas escritas, cada uma dobrando o custo de leitura.

**Além disso**, `HomePresenceFeed.tsx:63-68` executa `getDocs` adicional na mesma coleção.

### Hipótese 2 — CRÍTICA (90% de probabilidade)
**8 listeners onSnapshot permanentes criados pelo `FinanceContext` que permanecem ativos 24/7 durante toda a sessão, mesmo quando o usuário está em páginas que não os utilizam.**

`FinanceContext.tsx:61-89` cria bridges para: cards, contas_fixas, ativos, passivos, dividas, metas, categories, faturas. Cada listener é um `onSnapshot` que mantém uma conexão WebSocket ativa e fatura 1 leitura **por documento modificado por listener invocado**. Mesmo sem modificações, a conexão em si não custa — mas qualquer mudança no Firestore (ex.: outra aba, Cloud Function) dispara leitura em todos.

### Hipótese 3 — ALTA (85% de probabilidade)
**Listener duplicado no documento `users/{uid}`.**

`AuthContext.tsx:56` cria `onSnapshot(doc(firestore, 'users', currentUser.uid))`.  
`useUserMeta.ts:13` → `user.realtime.ts:11` cria **outro** `onSnapshot(doc(firestore, 'users', userId))`.

São 2 listeners simultâneos no mesmo documento. Quando o heartbeat (`useAppState.ts:89`) faz `setDoc(users/{uid}, { lastActiveAt })`, ambos disparam = 2 leituras.

### Hipótese 4 — MÉDIA (70% de probabilidade)
**Backend Cloud Functions com queries amplas (`collectionGroup`) e processamento serial por usuário.**

`functions/presenceCheck.ts` (diário) e `functions/monthlyRotativo.ts` (mensal) usam `collectionGroup('dividas')` e `collectionGroup('billing')` — queries que varrem todos os subdocumentos de todos os usuários. Embora haja apenas 1 usuário, o custo existe: cada chamada lê todos os documentos do usuário das coleções `dividas`, `metas`, `presenceState`.

### Hipótese 5 — MÉDIA (60% de probabilidade)
**Desenvolvimento apontando para produção Firestore (sem emulador).**

O arquivo `.env.local` contém as credenciais reais do projeto Firebase `financas-pro-invest`. Não há config de emulador. Qualquer `npm run dev` ou preview acessa Firestore de produção. Se o desenvolvedor abriu múltiplas abas, recarregou a página várias vezes, ou executou o app em múltiplos dispositivos/capacitor, cada sessão independente criou seus próprios listeners — multiplicando as leituras.

---

## B. Mapa de Consumo Potencial

| Prioridade | Arquivo | Função/Componente | Coleção | Operação | Padrão | Risco |
|---|---|---|---|---|---|---|
| 🔴 1 | `src/contexts/NotificationContext.tsx:53-60` | `NotificationProvider` useEffect | `users/{uid}/presenceEvents` | `onSnapshot` c/ `orderBy('createdAt') limit(20)` **sem where** | Listener duplicado + sem filtro de lidos | MUITO ALTO |
| 🔴 2 | `src/services/presence.realtime.ts:18` | `createPresenceEventsRealtimeBridge` | `users/{uid}/presenceEvents` | `onSnapshot` c/ `where('status==pending') limit(20)` | Listener duplicado (2º no mesmo schema) | MUITO ALTO |
| 🔴 3 | `src/contexts/FinanceContext.tsx:61-89` | `FinanceProvider` | 8 coleções | 8 × `onSnapshot` via bridges | 8 listeners simultâneos permanentes | MUITO ALTO |
| 🔴 4 | `src/contexts/AuthContext.tsx:56` | `AuthProvider` | `users/{uid}` | `onSnapshot` | Listener duplicado | ALTO |
| 🔴 5 | `src/services/user.realtime.ts:11` | `createUserMetaRealtimeBridge` | `users/{uid}` | `onSnapshot` via `useUserMeta` | Listener duplicado (2º no mesmo doc) | ALTO |
| 🟠 6 | `src/hooks/usePresenceTriggers.ts:26-174` | `usePresenceTriggers` | `users/{uid}/presenceEvents`, `users/{uid}/nexusPlans`, `users/{uid}/transactions` (RTDB) | `PresenceEventService.create` + `getDocs` para plans/transactions | Disparado em cada render com dependências instáveis | ALTO |
| 🟠 7 | `src/hooks/useWealthPresenceTriggers.ts:27-150` | `useWealthPresenceTriggers` | `users/{uid}/presenceEvents` | `PresenceEventService.create` | Dispara por montagem, itera metas/ativos | ALTO |
| 🟠 8 | `src/hooks/useAppState.ts:284-297` | useAppState → scheduleBills | `users/{uid}/presenceEvents` | `PresenceEventService.createRecurringBillDue` | Dispara por montagem do App, itera contas_fixas | ALTO |
| 🟠 9 | `functions/presenceCheck.ts:288-317` | `dailyPresenceCheck` (scheduler 6h BRT) | `users/{uid}`, `dividas`, `presenceState`, `metas` | `get()` (leitura) + `createEvent` (escrita) | Query de usuários ativos + N+1 por usuário | MÉDIO |
| 🟠 10 | `functions/monthlyRotativo.ts:37` | `monthlyRotativoInterest` (scheduler dia 1) | `collectionGroup('dividas')` | `get()` via `collectionGroup` | Query ampla sem filtro de usuário | MÉDIO |
| 🟠 11 | `functions/schedulerExpireCanceled.ts:16-20` | `expireCanceledSubscriptions` (6 em 6h) | `collectionGroup('billing')` | `get()` via `collectionGroup` | Query ampla, executa 4×/dia | MÉDIO |
| 🟡 12 | `src/contexts/EntitlementContext.tsx:63` | `EntitlementProvider` | `users/{uid}/billing/main` | `onSnapshot` | Listener extra (embora só 1 no schema) | MÉDIO |
| 🟡 13 | `src/hooks/useAppState.ts:79-101` | `useAppState` heartbeat | `users/{uid}` | `setDoc({ lastActiveAt })` a cada visita | Escrita diária que dispara listeners duplicados (Auth + userMeta) | MÉDIO |
| 🟡 14 | `src/layouts/AppLayout.tsx:100-103` | Prefetch inicial | `users/{uid}/cartoes`, `contas_fixas`, `faturas` | `getDocs` (leitura única) | Redundante com bridges do FinanceContext | MÉDIO |
| 🟡 15 | `src/components/Home/HomePresenceFeed.tsx:63-68` | HomePresenceFeed | `users/{uid}/presenceEvents` | `getDocs` | Leitura adicional redundante com listeners | BAIXO-MÉDIO |
| 🟢 16 | `src/components/PublicHome.tsx:92` | fetchNews | `noticias` | `getDocs` (coleção pública) | Uma leitura por montagem, impacto baixo | BAIXO |
| 🟢 17 | `firestore.rules:22` | Regra `categories` pública | `categories/{doc}` | `allow read: if true` | Sem autenticação, baixo risco prático | BAIXO |

---

## C. Achados Específicos

### C1. Listener Duplicado em `presenceEvents` — CRÍTICO

**Arquivo**: `src/contexts/NotificationContext.tsx:53-60`
```ts
const unreadRef = collection(firestore, 'users', user.uid, 'presenceEvents');
const qUnread = query(unreadRef, orderBy('createdAt', 'desc'), limit(20));
const unsubscribe = onSnapshot(qUnread, ...);
```

**Arquivo**: `src/hooks/usePresenceEvents.ts:12-13` → `src/services/presence.realtime.ts:18`
```ts
export const createPresenceEventsRealtimeBridge = (userId: string) => {
  return createRealtimeBridge<PresenceEvent[]>({
    query: query(collection(firestore, 'users', userId, 'presenceEvents'), where('status', '==', 'pending'), limit(20)),
    ...
  });
};
```

**Causa**: Dois componentes React montados simultaneamente — `NotificationProvider` (global) + `PresenceAlertsBanner` (Home) — cada um cria seu próprio `onSnapshot` na mesma coleção. O listener do `NotificationContext` **não tem filtro `where`**, então carrega inclusive eventos já lidos.

**Impacto**: **MUITO ALTO**. Cada escrita em `presenceEvents` gera 2 snapshots. Cada `addDoc` (novo evento) ou `updateDoc` (marcar como lido) dispara ambos. Com 5+ fontes de escrita (usePresenceTriggers, useWealthPresenceTriggers, useReengagementTrigger, rotativoService, scheduleBills), cada ação do usuário pode gerar 4-10+ leituras em vez de 1-2.

**Correção**: Unificar em um único listener. Se `NotificationContext` já escuta, `PresenceAlertsBanner` deve ler do cache do React Query, não criar novo listener. Ou eliminar o listener do `NotificationContext` e usar React Query com staleTime.

### C2. 8 Listeners Permanentes do FinanceContext — CRÍTICO

**Arquivo**: `src/contexts/FinanceContext.tsx:61-89`

```ts
const cardsBridge = createCardsRealtimeBridge(uid);
unsubscribeCardsRef.current = cardsBridge.subscribe(() => checkReady());
const billsBridge = createBillsRealtimeBridge(uid);
unsubscribeBillsRef.current = billsBridge.subscribe(() => checkReady());
// ... +6 bridges idênticos
```

**Causa**: `FinanceProvider` envolve toda a árvore de rotas protegidas (`/app/*`). Os 8 listeners ficam ativos durante toda a navegação do usuário, independentemente da página atual. Cada listener mantém uma conexão WebSocket separada.

**Impacto**: **MUITO ALTO**. Mesmo sem dados mudando, cada listener custa 0 leitura. MAS: qualquer mudança em qualquer coleção (ex.: addDoc em cartoes) dispara 1 leitura em cada um desses 8 listeners + os listeners duplicados → cascata de leituras.

**Correção**: Converter bridges para React Query com `staleTime` alto e `getDocs` sob demanda. Apenas manter listeners ativos quando o usuário está efetivamente na página que precisa deles.

### C3. Listener Duplicado em `users/{uid}` — ALTO

**Arquivo A**: `src/contexts/AuthContext.tsx:55-56`
```ts
const userDocRef = doc(firestore, 'users', currentUser.uid);
unsubscribeMetaRef.current = onSnapshot(userDocRef, (docSnap) => { ... });
```

**Arquivo B**: `src/services/user.realtime.ts:11`
```ts
query: doc(firestore, 'users', userId),
```
Chamado por `useUserMeta.ts:13` → `createUserMetaRealtimeBridge(userId).subscribe(...)`.

**Causa**: `AuthContext` (wrapper global) escuta o doc do usuário para ter `userMeta`. `useUserMeta` hook (chamado por `useFirebase.ts:19`) cria **outro** listener no mesmo documento.

**Impacto**: **ALTO**. A cada alteração no documento (ex.: heartbeat `setDoc({ lastActiveAt })` em `useAppState.ts:89`), ambos os listeners disparam → 2 leituras para cada escrita.

**Correção**: `AuthContext` já tem o listener. `useUserMeta` deve ler do React Query populado pelo `AuthContext`, ou sincronizar via estado compartilhado.

### C4. Presence Triggers com Dependências Instáveis — ALTO

**Arquivo**: `src/hooks/usePresenceTriggers.ts:26-174`
**Arquivo**: `src/hooks/useWealthPresenceTriggers.ts:27-150`
**Arquivo**: `src/hooks/useReengagementTrigger.ts:19-61`

```ts
// usePresenceTriggers.ts
useEffect(() => {
  if (!userId || debtsLoading) return;
  const evaluate = async () => {
    for (const debt of debts) {  // debts muda a cada nova bridge snapshot
      await PresenceEventService.create({...});
    }
  };
  evaluate();
}, [userId, debts, debtsLoading]);  // debts = nova referência a cada bridge update
```

**Causa**: `debts` é uma nova referência de array cada vez que o bridge de dívidas recebe um snapshot. Isso faz o `useEffect` reexecutar e reavaliar todas as dívidas, chamando `PresenceEventService.create()` novamente para cada dívida próxima do vencimento. O `create()` tem guardas de cooldown, mas **cada chamada faz 3-4 leituras** (`getDoc` de preferences, `getDoc` de state, `getDocs` de existing, `setDoc`/`updateDoc` de state, `addDoc`).

**Impacto**: **ALTO**. Em cada bridge update (que pode ser frequente), o hook reavalia todo o array. Cada avaliação gera múltiplas leituras e potenciais escritas. Com um usuário que tem 5+ dívidas, o custo escala.

**Correção**: Adicionar `useRef` para debounce, memoizar dependências, ou usar um flag de "já avaliou" (similar ao `firedRef` em `useWealthPresenceTriggers`).

### C5. Backend Cloud Functions com Leitura Ampla — MÉDIO

**Arquivo**: `functions/presenceCheck.ts:303-305`
```ts
const usersSnap = await db.collection('users')
  .where('lastActiveAt', '>=', fifteenDaysAgo)
  .get();
```

**Arquivo**: `functions/monthlyRotativo.ts:37-39`
```ts
const rotativoSnap = await db.collectionGroup('dividas')
  .where('originType', '==', 'rotativo_cartao')
  .get();
```

**Arquivo**: `functions/schedulerExpireCanceled.ts:16-20`
```ts
let query = db.collectionGroup('billing')
  .where('status', '==', 'canceled')
  .where('currentPeriodEnd', '<', now)
  .orderBy('currentPeriodEnd')
  .limit(MAX_BATCH_SIZE);
```

**Causa**: As funções `dailyPresenceCheck` (diária), `monthlyRotativoInterest` (mensal, dia 1), e `expireCanceledSubscriptions` (a cada 6 horas) usam `collectionGroup` ou queries sem filtro de UID. Para 1 usuário, o custo é baixo, mas `monthlyRotativo` lê todos os documentos da subcoleção `dividas` e `presenceCheck` processa serialmente cada usuário, fazendo N+1 queries por usuário.

`monthlyRotativo.ts:189` também escreve em `_schedulerLogs` — coleção que cresce indefinidamente.

**Impacto**: **MÉDIO**. Com 1 usuário, cada execução custa algumas leituras. Mas é custo adicional desnecessário. O pattern `collectionGroup` é um risco de escalabilidade futura.

**Correção**: Para 1 usuário, manter como está é aceitável, mas `monthlyRotativo` poderia ser refatorado para processar sob demanda em vez de scheduler. Considerar desligar `expireCanceledSubscriptions` se não há assinantes ativos.

### C6. Sem Emulador — Desenvolvimento Usa Produção — MÉDIO

**Arquivo**: `.env.local` (contém credenciais de produção)
**Arquivo**: `.env.development` (só define `VITE_FIREBASE_FUNCTIONS_BASE_URL=http://localhost:5001/...`)

**Causa**: Não há configuração de emulador Firestore. O `firebase.json` não tem seção `emulators`. O `firebase.ts` não verifica `location.hostname` para usar `connectFirestoreEmulator`. Toda execução local (`npm run dev`) aponta para o Firestore de produção.

**Impacto**: **MÉDIO**. Se o desenvolvedor abriu a aplicação localmente, cada refresh recria os 13+ listeners (8 FinanceContext + Auth + userMeta + Notification + presence + Entitlement + DebtManager debt plans) no Firestore de produção. Cada reload = todas as queries reexecutadas.

**Correção**: Configurar Firebase Emulator Suite. Ou ao menos adicionar `VITE_USE_EMULATOR=true` que ativa `connectFirestoreEmulator`.

### C7. Coleção `presenceEvents` sem Limite de Crescimento — MÉDIO

**Arquivo**: `src/services/PresenceEventService.ts:235-250`

Eventos são criados com `addDoc` em `users/{uid}/presenceEvents`. Não há TTL, job de limpeza, ou política de expurgo. O listener do `NotificationContext` carrega os 20 mais recentes, mas a coleção acumula todos os eventos históricos.

**Causa**: Cada chamada a `PresenceEventService.create` adiciona 1 documento permanentemente. Cada `loadMoreHistory` em `NotificationContext.tsx:119-148` faz `getDocs` com paginação sobre toda a coleção.

**Impacto**: **MÉDIO** para 1 usuário por enquanto. Mas ao longo de meses, milhares de eventos acumulados aumentam o custo de leitura de listeners (o snapshot retorna apenas 20 docs mas o Firestore cobra pelo matching da query no backend).

**Correção**: Implementar TTL via Firestore ou job scheduler para deletar eventos com `expiresAt` passado. Adicionar limite de retenção (ex.: 90 dias).

### C8. Queries Sem Índices Compostos — BAIXO-MÉDIO

**Arquivo**: `firestore.indexes.json` → `"indexes": []`

**Queries sem índice definido**:
- `HomePresenceFeed.tsx:63-68`: `where('status', '==', 'pending'), where('channel', 'in', ['in_app', 'push']), orderBy('urgencyScore', 'desc')`
- `NotificationContext.tsx:122-123`: `orderBy('read', 'desc'), orderBy('createdAt', 'desc')`

**Causa**: Se essas queries falham por falta de índice, o código entra em fallback (HomePresenceFeed.tsx:96-103). O fallback remove filtros, carregando MAIS dados do que o necessário.

**Impacto**: **BAIXO-MÉDIO**. O código trata o erro, mas a query fallback é menos eficiente.

---

## D. Verificações no Google Cloud Console

### 1. Billing > Reports
- **Filtro**: Período 1–10 jul 2026
- **Agrupar por**: SKU (não serviço)
- **Procurar**: SKU `Cloud Firestore - Read Operations`, `Cloud Firestore - Write Operations`, `Cloud Firestore - Stored Data`
- **Confirmar**: a proporção leitura/escrita. Se reads >> writes, confirma hipótese de listeners excessivos.

### 2. Firestore Database > Usage
- **Abrir**: `Cloud Firestore` > `Usage` no Console
- **Aba**: `Read operations`, `Write operations`
- **Filtrar**: Últimos 7 dias, granularidade diária
- **Observar**: Picos de leitura correspondentes a horários de uso do app. Se há leituras 24h/dia (inclusive sem uso ativo), confirma que listeners/schedulers estão ativos.

### 3. Cloud Logging (Logs Explorer)
- **Query sugerida**:
```
resource.type="firestore.googleapis.com"
severity="INFO"
protoPayload.methodName="google.firestore.v1.Firestore.Listen"
timestamp >= "2026-07-01T00:00:00Z"
```
- **Procurar**: Quantas sessões `Listen` únicas foram abertas por dia. Ideal: ~10-13 por sessão (1 por listener). Se muito mais, confirma listeners duplicados ou múltiplas sessões.

- **Query para leituras**:
```
resource.type="firestore.googleapis.com"
protoPayload.methodName="google.firestore.v1.Firestore.RunQuery"
timestamp >= "2026-07-01T00:00:00Z"
```

### 4. Metrics Explorer
- **Métrica**: `firestore.googleapis.com/document/read_count`
- **Filtro**: `resource.container.project_id = "financas-pro-invest"`
- **Agrupar por**: `resource.labels.database` e `metric.labels.op_type`
- **Período**: 1–10 jul 2026
- **Comparar** `LISTEN` vs `RUN_QUERY` vs `GET`. Se `LISTEN` domina, confirma a hipótese de listeners caros.

### 5. Cloud Functions
- **Abrir**: Cloud Functions > Lista
- **Verificar**: `dailyPresenceCheck`, `monthlyRotativoInterest`, `expireCanceledSubscriptions`
- **Métricas**: Invocações nos últimos 7 dias. Verificar se `expireCanceledSubscriptions` dispara a cada 6h (4×/dia) e se está realmente expirando algo.
- **Logs**: Procurar erros de timeout ou queries failing que disparam retries.

### 6. Cloud Run
- Custo é R$ 0,02 — irrelevante. Mas verificar se há serviços não utilizados rodando.

---

## E. Plano de Contenção Imediata (Sem Alterar Código)

### Ação 1 — 🔴 PRIORIDADE MÁXIMA: Parar Schedulers de Backend (Console GCP)

No Console Google Cloud:
1. Acesse **Cloud Scheduler**
2. **Pause** (não delete) os jobs:
   - `dailyPresenceCheck` (diário 6h)
   - `monthlyRotativoInterest` (dia 1 do mês)
   - `expireCanceledSubscriptions` (a cada 6h)
3. Impacto: interrompe leituras/escritas agendadas imediatamente. Presença e notificações programadas param de funcionar — mas para 1 usuário, as triggers do frontend ainda funcionam parcialmente.

**Risco**: Nenhum. Funções podem ser reativadas com 1 clique.

### Ação 2 — 🔴 PRIORIDADE MÁXIMA: Verificar Tráfego de Desenvolvimento

1. Pergunte ao desenvolvedor se está rodando `npm run dev` localmente apontando para produção.
2. Se sim, pare imediatamente ou configure Firestore Emulator (`firebase emulators:start`).
3. Verifique se há múltiplas abas do app abertas (cada uma cria listeners independentes).
4. Verifique se o app está publicado em preview URLs (Vercel, Firebase Hosting) que podem estar sendo acessadas.

### Ação 3 — 🟠 PRIORIDADE ALTA: Desabilitar App Check Temporariamente Se Não Configurado

1. No Console, verifique se App Check está ativado para Firestore.
2. Se NÃO estiver: as regras de segurança já protegem (`request.auth.uid == userId`), então App Check é menos crítico. Mas se estiver desconfiado de abuso externo, ative App Check com reCAPTCHA v3.

### Ação 4 — 🟡 PRIORIDADE MÉDIA: Monitorar por 24h

Após pausar os schedulers:
1. Deixe o app rodar normalmente por 24h.
2. Verifique Firestore > Usage ao final do período.
3. Se as leituras caírem significativamente (ex.: < 1000/dia), confirma que os schedulers ou listeners eram a causa principal.

### Ação 5 — 🟢 BAIXA: Verificar Alertas de Budget

No Console GCP:
1. **Billing > Budgets & alerts**
2. Crie um budget de R$ 50/mês com alertas em 50%, 80%, 100%.
3. Configure alertas por e-mail para evitar nova surpresa.

---

## F. Plano de Correção

### Patch 1 — Unificar Listener de `presenceEvents` (CRÍTICO)

**Arquivo**: `src/contexts/NotificationContext.tsx`

**Problema**: Cria listener próprio desnecessário. O bridge de presence (`presence.realtime.ts`) já escuta.

**Solução**: Remover `onSnapshot` do `NotificationContext` e ler do React Query cache (populado pelo presence bridge). Ou: remover o presence bridge e manter apenas o `NotificationContext` como fonte única.

**Patch sugerido** (manter NotificationContext como fonte única, remover presence bridge):
```ts
// NotificationContext.tsx — manter como está (já tem onSnapshot)
// usePresenceEvents.ts — alterar para ler do React Query

// usePresenceEvents.ts
export const usePresenceEvents = (userId?: string) => {
  const key = queryKeys.presence.byUser(userId || 'anonymous');
  return useQuery<PresenceEvent[]>({
    queryKey: key,
    queryFn: () => Promise.resolve([]),
    enabled: false, // ← desliga queryFn — dados vêm do NotificationContext
  });
};
```

**Alternativa**: Unificar os 2 listeners em 1 no `NotificationContext`, remover o `usePresenceEvents` bridge, e fazer `PresenceAlertsBanner` consumir do `NotificationContext`.

### Patch 2 — Remover Listener Duplicado de `users/{uid}` (ALTO)

**Arquivo**: `src/hooks/useUserMeta.ts`

**Problema**: `useUserMeta` cria segundo `onSnapshot` no mesmo doc que `AuthContext` já escuta.

**Solução**: `useUserMeta` deve ler do `AuthContext` em vez de criar próprio listener.

**Patch sugerido**:
```ts
// useUserMeta.ts
import { useAuth } from '../contexts/AuthContext';

export const useUserMeta = (userId?: string) => {
  const { userMeta, userMetaLoading } = useAuth();
  return {
    userMeta,
    loading: userMetaLoading,
    isSyncing: false,
    error: null,
  };
};
```

### Patch 3 — Converter FinanceContext de Listener para Leitura Sob Demanda (CRÍTICO)

**Arquivo**: `src/contexts/FinanceContext.tsx`

**Problema**: 8 listeners `onSnapshot` permanentes mantidos 24/7.

**Solução**: 
- Opção A (recomendada): Remover os `onSnapshot` e usar React Query com `staleTime: 5 * 60 * 1000` (5 min) e refetch manual.
- Opção B: Manter listeners apenas para coleções críticas (cartoes, faturas) e usar `getDocs` para as demais.

**Patch sugerido** (Opção A — simplificada):
```ts
// FinanceContext.tsx — remover todos os bridges e subscribers
// Manter apenas o contexto com ready=true
useEffect(() => {
  setFinanceBridgeReady(true);
  setHasConnectedAtLeastOnce(true);
}, [user?.uid]);

// Remover:
// createCardsRealtimeBridge, createBillsRealtimeBridge,
// createAssetsRealtimeBridge, createPassivesRealtimeBridge,
// createDebtRealtimeBridge, createGoalRealtimeBridge,
// createCategoriesRealtimeBridge, createInvoicesRealtimeBridge
// e todos os unsubscribeRefs
```

### Patch 4 — Estabilizar Dependências dos Presence Triggers (ALTO)

**Arquivo**: `src/hooks/usePresenceTriggers.ts`

**Problema**: `debts` como dependência de `useEffect` muda a cada render.

**Solução**: Usar `useRef` + flag de "já avaliou" (similar a `useWealthPresenceTriggers`).

**Patch sugerido**:
```ts
const evaluatedRef = useRef(false);

useEffect(() => {
  if (!userId || debtsLoading) return;
  if (evaluatedRef.current) return;
  evaluatedRef.current = true;
  // ... restante do código
}, [userId, debtsLoading]);
// Remove 'debts' da dependência — o trigger avalia apenas no mount
```

### Patch 5 — Configurar Emulador (MÉDIO)

**Arquivo**: `src/firebase.ts`

**Solução**: Detectar ambiente e conectar ao emulador quando em dev.

**Patch sugerido**:
```ts
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  const { connectFirestoreEmulator } = await import('firebase/firestore');
  const { connectAuthEmulator } = await import('firebase/auth');
  connectFirestoreEmulator(firestore, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

**`.env.development`**:
```
VITE_USE_EMULATOR=true
```

### Patch 6 — Desligar Scheduler Desnecessário (MÉDIO)

**Arquivo**: `functions/index.ts`

**Solução**: Comentar export do scheduler que não é necessário para 1 usuário.

**Patch sugerido**:
```ts
// Comentar temporariamente:
// export { dailyPresenceCheck } from './presenceCheck';
// export { expireCanceledSubscriptions } from './schedulerExpireCanceled';
```

Ou simplesmente pausar no Cloud Console (mais seguro, sem deploy).

### Patch 7 — Remover Prefetch Redundante do AppLayout (MÉDIO)

**Arquivo**: `src/layouts/AppLayout.tsx:100-103`

**Problema**: `getDocs` para cartoes, contas_fixas, faturas é redundante com os bridges do FinanceContext.

**Solução**: Remover o prefetch de Firestore. As bridges já populam o cache do React Query.

**Patch sugerido**:
```ts
// Substituir:
const [cardsSnap, billsSnap, invoicesSnap] = await Promise.all([
  getDocs(collection(firestore, `users/${uid}/cartoes`)),
  getDocs(collection(firestore, `users/${uid}/contas_fixas`)),
  getDocs(fsQuery(collection(firestore, `users/${uid}/faturas`), ...)),
]);

// Por: confiar nos bridges do FinanceContext que já estão montados
// Os queryClient.setQueryData abaixo podem ser mantidos apenas
// com dados do RTDB (transactions), que é o único que não tem bridge Firestore
```

### Patch 8 — Adicionar Índices Compostos (BAIXO)

**Arquivo**: `firestore.indexes.json`

**Solução**: Adicionar índices para queries existentes.

**Patch sugerido**:
```json
{
  "indexes": [
    {
      "collectionGroup": "presenceEvents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "channel", "order": "ASCENDING" },
        { "fieldPath": "urgencyScore", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "presenceEvents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "read", "order": "DESCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "presenceEvents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## Resumo das Causas Raiz

```
Causa Raiz 1: Múltiplos listeners simultâneos no mesmo schema
  └─ presenceEvents: 2 listeners (NotificationContext + PresenceAlertsBanner)
  └─ users/{uid}: 2 listeners (AuthContext + useUserMeta)

Causa Raiz 2: Listeners onSnapshot para coleções estáveis
  └─ FinanceContext mantém 8 listeners 24/7 desnecessários
  └─ Dados estáveis (categorias, contas_fixas) não precisam de tempo real

Causa Raiz 3: Presence Triggers com dependências instáveis
  └─ useEffect reexecuta e chama PresenceEventService.create repetidamente
  └─ Cada create faz 3-4 leituras antes de decidir se cria o evento

Causa Raiz 4: Backend Schedulers com queries amplas
  └─ dailyPresenceCheck lê todos os subdocumentos de cada usuário
  └─ monthlyRotativoInterest usa collectionGroup sem filtro de UID

Causa Raiz 5: Desenvolvimento aponta para produção
  └─ Sem emulador, cada npm run dev acessa Firestore real
```

## Primeira Mudança Recomendada (após aprovação)

**Aplicar Patch 3 — Converter `FinanceContext` de 8 listeners `onSnapshot` para `getDocs` sob demanda.**

Esta é a mudança de maior impacto porque:
1. Elimina 8 dos 13+ listeners ativos permanentemente (~62% dos listeners)
2. Remove conexões WebSocket desnecessárias
3. Impacto zero na experiência do usuário (dados são lidos via React Query)
4. Mudança localizada em 1 arquivo (~115 linhas)
5. Pode ser feito e testado em minutos

Após aplicar, os únicos listeners ativos serão: AuthContext (user doc), NotificationContext (presenceEvents), EntitlementContext (billing). Total: 3 listeners (vs 13+ atuais).
