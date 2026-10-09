# Template Oficial de Domínio: 'debt'

Este documento define o padrão arquitetural oficial para novos domínios no Finanças Pro Invest. O domínio `debt` serve como a implementação de referência (*Golden Template*).

---

## 1. Estrutura do Domínio
Cada novo domínio deve seguir esta estrutura de arquivos em `src/services/{dominio}/`:

*   `{dominio}.types.ts`: Definição dos modelos de domínio (interface limpa).
*   `{dominio}.persist.ts`: Interfaces específicas para o formato de dados no banco (Firestore).
*   `{dominio}.mapper.ts`: Funções puras para conversão entre `Domain` e `Persist`.
*   `{dominio}.validators.ts`: Validações de fronteira (boundary validation).
*   `{dominio}.service.ts`: Camada de infraestrutura (Firebase, API).
*   `{dominio}.hooks.ts`: Camada de *Server State* (Hooks para React Query/SWR).
*   `index.ts`: Ponto único de exportação.

---

## 2. Fluxo Oficial de Dados
**UI → Hook → Service → Mapper → Infraestrutura**

1.  **UI:** Consome hooks de domínio (ex: `useDebts`).
2.  **Hook:** Gerencia o ciclo de vida do dado (loading, cache, revalidação).
3.  **Service:** Executa a chamada de infraestrutura (Firebase/API).
4.  **Mapper:** Converte a resposta bruta da infra para o tipo de domínio antes da UI processar.
5.  **Infraestrutura:** Camada de transporte (Firestore SDK).

---

## 3. Regras Obrigatórias e Anti-patterns

### Obrigatórias
*   **Tipagem Forte:** Proibido o uso de `any`. Definir `Persist` vs `Domain` tipos.
*   **Boundary Validation:** Validar dados na entrada (criação/edição) e na saída (fetch) da infraestrutura.
*   **Isolamento:** A infraestrutura (Firestore) nunca deve vazar para a UI.
*   **Imutabilidade:** Mappers devem retornar novos objetos, sem mutar o original.

### Anti-patterns Proibidos
*   **UI-Coupled Infrastructure:** Importar `firebase/firestore` em componentes `.tsx`.
*   **Implicit Types:** Usar tipos inferidos sem interface definida.
*   **God Services:** Services que misturam múltiplos domínios.
*   **Service-less UI:** Chamadas de `addDoc`/`updateDoc` feitas diretamente nos componentes.

---

## 4. Estratégia de Migração de Estado
1.  **Domain Mapping:** Mapear o dado original para o novo `DomainType`.
2.  **Validator:** Criar validação rigorosa (zod ou função pura) na entrada.
3.  **Service Abstraction:** Encapsular Firebase SDK.
4.  **Hook Abstraction:** Preparar para React Query (TanStack Query) eliminando `useState` manual de loading/error no hook.
