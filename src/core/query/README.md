# Core Query Runtime

Este diretório contém a infraestrutura oficial de *Server State* do Finanças Pro Invest, construída sobre o **TanStack Query (React Query)**.

## Filosofia
* **Single Source of Truth:** O estado do servidor deve ser gerido pelo `QueryClient`, não pelo estado local da UI.
* **Normalização:** Todos os erros devem ser tratados e normalizados via `normalizeError` antes de atingir a camada de apresentação.
* **Governança de Cache:** Todas as keys de cache devem ser centralizadas em `queryKeys.ts` para evitar colisões e garantir invalidação correta.

## Fluxo Oficial
`UI → Domain Hook → Query Runtime → Service → Mapper → Infraestrutura`

## Padrões
* **Queries:** Criadas via `createQueryHook`.
* **Mutations:** Criadas via `createMutationHook`.
* **Invalidação:** Sempre usar `invalidateDomain` para garantir consistência.
