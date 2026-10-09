# Optimistic Update Governance

Esta política define como a aplicação deve lidar com atualizações otimistas para garantir fluidez de UI sem comprometer a integridade dos dados.

## 1. Regras de Ouro
* **Ouvinte Sempre Prevalece:** O listener realtime do Firebase é a autoridade final. Atualizações otimistas no cache devem ser reconciliadas (sobrescritas) automaticamente assim que o servidor confirmar o dado.
* **Rollback Seguro:** Se uma mutação falhar, o cache deve ser revertido imediatamente ao estado pré-mutação (snapshot do cache).

## 2. Fluxo Oficial
1. **Trigger:** Mutação disparada.
2. **Optimistic:** `queryClient.setQueryData` altera o cache com o valor "esperado".
3. **Persist:** `mutationFn` chama o Firebase.
4. **Error:** Se falhar, `rollback` (restaurar snapshot).
5. **Success:** Se o Firebase retornar novo dado, o listener realtime (Realtime Bridge) atualiza o cache corretamente, reconciliando o estado.

## 3. Anti-patterns
* **Duplicação:** Não tente manipular o estado do Firebase de forma otimista. Manipule apenas o **Query Cache**.
* **Ignorar Rollback:** Nunca deixe um estado otimista "preso" no cache caso a mutação falhe.
