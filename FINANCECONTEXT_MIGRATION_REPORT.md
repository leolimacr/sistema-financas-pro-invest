# FinanceContext Migration Report

## Antes

**FinanceContext** mantinha **8 listeners `onSnapshot`** ativos por sessão:

| Coleção | Query | Docs lidos (max) |
|---|---|---|
| cartoes | `limit(100)` | 100 |
| contas_fixas | `limit(100)` | 100 |
| ativos | `orderBy(currentValue, desc), limit(100)` | 100 |
| passivos | `orderBy(currentValue, desc), limit(100)` | 100 |
| dividas | `limit(100)` | 100 |
| metas | `orderBy(createdAt, desc), limit(100)` | 100 |
| categories | `doc('categories/{userId}')` | 1 |
| faturas | `orderBy(periodEnd, desc), limit(50)` | 50 |

**Total de listeners Firestore por sessão:** 13–14 (incluindo AuthContext, NotificationContext, EntitlementContext, DebtManager, TransactionsContext RTDB)

## Depois

**FinanceContext** não cria mais nenhum listener. Cada domínio usa React Query com `staleTime` + fetch via `getDocs` na primeira leitura + `queryClient.invalidateQueries` após mutação.

### Estratégia de cache por domínio

| Coleção | staleTime | queryFn | Invalidação em |
|---|---|---|---|
| cartoes | 2 min | `getCards(userId)` | `addCard`, `updateCard`, `deleteCard`, `payInvoice` |
| contas_fixas | 5 min | `getRecurringBills(userId)` | `addRecurringBill`, `updateRecurringBill`, `deleteRecurringBill` |
| ativos | 5 min | `getDocs(collection(.../ativos))` | ActiveWealthManager (save, delete) |
| passivos | 5 min | `getDocs(collection(.../passivos))` | PassiveWealthManager (save, delete) |
| dividas | 2 min | via `useDebts` → lê cache populado | `saveDebt`, `updateDebt`, `deleteDebt` |
| metas | 5 min | `fetchGoals(userId)` | `addGoal`, `editGoal`, `removeGoal` (via useGoals) |
| categories | 60 min | `getDoc(doc('categories', userId))` | `saveCategory`, `deleteCategory` (via useCategories) |
| faturas | 2 min | `getInvoicesByCard` / `getAllInvoices` | `saveInvoice`, `deleteInvoice`, `payInvoice` |

### Gatilhos de invalidação

| Ação | Coleções invalidadas |
|---|---|
| Criar/editar/excluir cartão | `cards.byUser(userId)` |
| Criar/editar/excluir conta fixa | `bills.byUser(userId)` |
| Salvar/excluir ativo | `wealth.assetsByUser(userId)` |
| Salvar/excluir passivo | `wealth.passivesByUser(userId)` |
| Criar/editar/excluir dívida | `debts.byUser(userId)` |
| Criar/editar/excluir meta | `goals.byUser(userId)` |
| Salvar/excluir categoria | `categories.byUser(userId)` |
| Salvar/excluir fatura | `invoices.byUser(userId)`, `invoices.byCard(userId, cardId)` |
| Pagar fatura | `cards.byUser(userId)`, `transactions.byUser(userId)`, `invoices.byUser(userId)` |

### Comportamento do FinanceProvider

- Antes: esperava o primeiro dado de cada bridge para setar `financeBridgeReady = true`
- Depois: `financeBridgeReady = true` imediatamente quando `user?.uid` existe
- `hasConnectedAtLeastOnce` = mesmo valor (não tem mais sentido, mantido para compatibilidade)

## Arquivos Modificados

### Contexto
- `src/contexts/FinanceContext.tsx` — removidos 8 bridges e toda lógica de subscribe/unsubscribe

### Hooks de leitura (queryFn real)
- `src/hooks/useBills.ts` — `queryFn` agora chama `getRecurringBills(userId)`, `staleTime: 5min`
- `src/hooks/useCards.ts` — `queryFn` agora chama `getCards(userId)`, `staleTime: 2min`
- `src/hooks/useCardInvoices.ts` — `queryFn` agora chama `getInvoicesByCard`/`getAllInvoices`, `staleTime: 2min`
- `src/hooks/useAssets.ts` — `queryFn` agora faz `getDocs` no Firestore, `staleTime: 5min`
- `src/hooks/usePassives.ts` — `queryFn` agora faz `getDocs` no Firestore, `staleTime: 5min`
- `src/hooks/useCategories.ts` — `queryFn` agora faz `getDoc(doc(...))`, `staleTime: 60min`
- `src/hooks/useGoals.ts` — `queryFn` agora chama `fetchGoals(userId)`, `staleTime: 5min`
- `src/hooks/useWealthData.ts` — `queryFn` para ativos/passivos agora faz `getDocs` no Firestore

### Serviços de mutação (invalidação adicionada)
- `src/services/cardService.ts` — `invalidateQueries` após addCard, updateCard, deleteCard
- `src/services/billService.ts` — `invalidateQueries` após addBill, updateBill, deleteBill
- `src/services/debt/debtService.ts` — `invalidateQueries` após saveDebt, updateDebt, deleteDebt
- `src/services/invoiceService.ts` — `getAllInvoices()` adicionada; `invalidateQueries` após saveInvoice, deleteInvoice
- `src/services/payInvoiceService.ts` — `invalidateQueries` para `invoices.byUser(userId)` adicionado

### Componentes de UI (invalidação adicionada)
- `src/components/tools/wealth/ActiveWealthManager.tsx` — `invalidateQueries` na criação, edição e exclusão de ativos
- `src/components/tools/wealth/PassiveWealthManager.tsx` — `invalidateQueries` na criação, edição e exclusão de passivos

## Nova Contagem de Listeners

**Após migração: 4 listeners Firestore + 1 RTDB**

| # | Origem | Coleção | Tipo |
|---|---|---|---|
| L1 | AuthContext | `users/{uid}` | onSnapshot |
| L3 | NotificationContext | `presenceEvents` | onSnapshot |
| L5 | EntitlementContext | `billing/main` | onSnapshot |
| L6 | DebtManager | `nexusDebtPlans` | onSnapshot |
| — | TransactionsContext | `transactions/{uid}` | RTDB onValue |

**Redução: 8 listeners Firestore eliminados (L7a–L7h)**

## Fluxos que devem ser testados manualmente antes do deploy

1. **Login/logout**: dados financeiros aparecem após login; troca de usuário não mostra dados do anterior
2. **Criar cartão**: salva, aparece na lista de cartões sem refresh
3. **Editar cartão**: alterações refletem no dashboard
4. **Pagar fatura**: saldo do cartão atualiza, fatura aparece como paga, transação criada
5. **Adicionar conta fixa**: aparece na lista de contas
6. **Adicionar/editar/excluir ativo**: reflete no cálculo de patrimônio no dashboard
7. **Adicionar/editar/excluir passivo**: reflete no cálculo de patrimônio
8. **Adicionar/editar/excluir dívida**: reflete no dashboard e cálculos de baldes
9. **Adicionar/editar/excluir meta**: aparece na lista de metas
10. **Adicionar/editar/excluir categoria**: disponível nos formulários de transação
11. **Navegação entre telas**: dados não desaparecem ao navegar
12. **Recarregar página**: dados são carregados na primeira renderização

## Riscos Residuais

1. **Latência de staleTime**: dados podem ficar desatualizados por até `staleTime` (2–60 min) sem mutação. Mitigação: `invalidateQueries` imediato pós-mutation em todos os serviços.
2. **Dívidas sem listener**: `useDebts` depende de cache populado por `debtService` e tem `staleTime: Infinity`. Sem invalidação explícita, dados não atualizam. Verificar: `debtService` já tem `invalidateQueries` após saveDebt, updateDebt, deleteDebt.
3. **Cartões sem listener**: `payInvoiceService` invalida `cards.byUser` após pagamento. Verificar se `cardService.updateCard` e `cardService.addCard`/`deleteCard` também invalidam (✅ implementado).
4. **Transações RTDB**: não fazem parte do escopo. Alguns fluxos dependem de invalidação cruzada (pagar fatura → invalidar transações + cartões + faturas). Já implementado em `payInvoiceService`.
5. **FinanceBridgeReady**: agora é `true` imediatamente. AppRoutes e hooks que consumiam `financeBridgeReady` foram ajustados. `AppRoutes.tsx` não precisa mais esperar — não há regressão esperada.

## Estratégia de Rollback

Reverter arquivos alterados para a versão anterior:
```bash
git checkout \
  src/contexts/FinanceContext.tsx \
  src/hooks/useBills.ts \
  src/hooks/useCards.ts \
  src/hooks/useCardInvoices.ts \
  src/hooks/useAssets.ts \
  src/hooks/usePassives.ts \
  src/hooks/useCategories.ts \
  src/hooks/useGoals.ts \
  src/hooks/useWealthData.ts \
  src/services/cardService.ts \
  src/services/billService.ts \
  src/services/debt/debtService.ts \
  src/services/invoiceService.ts \
  src/services/payInvoiceService.ts \
  src/components/tools/wealth/ActiveWealthManager.tsx \
  src/components/tools/wealth/PassiveWealthManager.tsx
```

## Próximo Ponto de Auditoria

**Listener L6 (DebtManager — nexusDebtPlans).** É o último listener Firestore `onSnapshot` que não de serviços centrais (Auth, Notification, Entitlement). Pode ser convertido para `getDocs` + cache, seguindo o mesmo padrão usado aqui.
