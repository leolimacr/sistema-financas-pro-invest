# FINOP Patch Plan — Validação e Contenção

## Inventário de Listeners Firestore

### Listeners Ativos (produção, usuário logado no dashboard)

| # | Arquivo:linha | Owner | Coleção/Query | Tipo | Indispensável? | Status |
|---|---|---|---|---|---|---|
| L1 | `AuthContext.tsx:56` | AuthProvider | `doc('users/{uid}')` | `onSnapshot` | SIM — userMeta tempo real | ✅ Mantido |
| L2 | ~~`user.realtime.ts:11` via `useUserMeta.ts:13`~~ | ~~useUserMeta~~ | ~~`doc('users/{uid}')`~~ | ~~`onSnapshot`~~ | ~~DUPLICADO L1~~ | ✅ ELIMINADO (FINOP Etapa 2) |
| L3 | `NotificationContext.tsx:60` | NotificationProvider | `query('users/{uid}/presenceEvents', ...)` | `onSnapshot` | SIM — notificações | ✅ Mantido |
| L4 | ~~`presence.realtime.ts:18` via `usePresenceEvents.ts:12`~~ | ~~PresenceAlertsBanner~~ | ~~`query(...)`~~ | ~~`onSnapshot`~~ | ~~DUPLICADO L3~~ | ✅ ELIMINADO (FINOP Etapa 2) |
| L5 | `EntitlementContext.tsx:63` | EntitlementProvider | `doc('users/{uid}/billing/main')` | `onSnapshot` | SIM — status assinatura | ✅ Mantido |
| L6 | `DebtManager.tsx:144` | DebtManager | `query('users/{uid}/nexusDebtPlans', ...)` | `onSnapshot` | PODE SER FETCH | ⏳ Pendente |
| L7a | ~~`FinanceContext.tsx`~~ | ~~FinanceProvider~~ | ~~`cartoes`~~ | ~~`onSnapshot`~~ | ~~MIGRADO~~ | ✅ React Query fetch + invalidate |
| L7b | ~~`FinanceContext.tsx`~~ | ~~FinanceProvider~~ | ~~`contas_fixas`~~ | ~~`onSnapshot`~~ | ~~MIGRADO~~ | ✅ React Query fetch + invalidate |
| L7c | ~~`FinanceContext.tsx`~~ | ~~FinanceProvider~~ | ~~`ativos`~~ | ~~`onSnapshot`~~ | ~~MIGRADO~~ | ✅ React Query fetch + invalidate |
| L7d | ~~`FinanceContext.tsx`~~ | ~~FinanceProvider~~ | ~~`passivos`~~ | ~~`onSnapshot`~~ | ~~MIGRADO~~ | ✅ React Query fetch + invalidate |
| L7e | ~~`FinanceContext.tsx`~~ | ~~FinanceProvider~~ | ~~`dividas`~~ | ~~`onSnapshot`~~ | ~~MIGRADO~~ | ✅ React Query fetch + invalidate |
| L7f | ~~`FinanceContext.tsx`~~ | ~~FinanceProvider~~ | ~~`metas`~~ | ~~`onSnapshot`~~ | ~~MIGRADO~~ | ✅ React Query fetch + invalidate |
| L7g | ~~`FinanceContext.tsx`~~ | ~~FinanceProvider~~ | ~~`categories/{userId}`~~ | ~~`onSnapshot`~~ | ~~MIGRADO~~ | ✅ React Query fetch + invalidate |
| L7h | ~~`FinanceContext.tsx`~~ | ~~FinanceProvider~~ | ~~`faturas`~~ | ~~`onSnapshot`~~ | ~~MIGRADO~~ | ✅ React Query fetch + invalidate |

**Total atual: 4 listeners Firestore + 1 RTDB por sessão** (L1, L3, L5, L6 + TransactionsContext RTDB)

### Total eliminado: 10 listeners Firestore (L2, L4, L7a–L7h)

---

## Correções Implementadas

### Etapa 2A — Emulador Firestore
✅ Concluído (FINOP Etapa 2)

### Etapa 2B — Duplicações eliminadas
✅ L2 (`user.realtime.ts`), L4 (`presence.realtime.ts`) — concluído (FINOP Etapa 2)

### Etapa 2C — Telemetria
✅ `src/core/firestoreListenerTelemetry.ts` — concluído (FINOP Etapa 2)

### Etapa 3 — Migração FinanceContext (8 listeners)
✅ **Concluído** — ver `FINANCECONTEXT_MIGRATION_REPORT.md` para detalhes completos.

---

## Próximos Passos (fora do escopo atual)
- L6 (`DebtManager.tsx:144` — nexusDebtPlans) — converter para fetch único
- TransactionsContext (RTDB onValue) — converter para fetch + invalidate
- AuthContext `onSnapshot` — avaliar se pode ser fetch único (userMeta muda raramente)
