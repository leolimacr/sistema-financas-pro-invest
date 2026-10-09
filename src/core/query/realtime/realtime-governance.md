# Realtime Governance

Este documento define as regras de governança para a integração entre o Firebase (Realtime Data) e o Query Runtime.

## 1. Regras de Propriedade
* **Firebase:** Fonte exclusiva de eventos em tempo real. Não deve atualizar a UI diretamente.
* **Query Cache:** Fonte exclusiva de estado para a UI.
* **Realtime Bridge:** Responsável pela escrita dos eventos do Firebase no Query Cache via `bindSnapshotToQuery`.

## 2. Ciclo de Vida (StrictMode Safe)
* **Idempotência:** A `realtimeRegistry` garante que múltiplas subscrições para a mesma chave não causem duplicação de listeners.
* **Cleanup Automático:** O hook `useDebts` (e futuros) utiliza o retorno de `createRealtimeQuery` para limpar listeners no `useEffect`, evitando memory leaks.

## 3. Fluxo Oficial de Mutação
1. **Mutation:** Disparada pelo Hook de Domínio.
2. **Execution:** Executa no Service (Firestore API).
3. **Optimistic Update:** Opcional: altera o Query Cache antes da resposta do servidor.
4. **Invalidation:** O `onSuccess` invalida a query, garantindo que o listener realtime receba a atualização do servidor e sincronize o cache novamente.

## 4. Tratamento de Erros
* Toda mutação e erro de query deve ser passado por `normalizeError(error, domain)`. A UI recebe instâncias de `AppError`, nunca erros crus do Firebase.
