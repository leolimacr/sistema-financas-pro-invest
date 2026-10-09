# Architecture: Domain Orchestration

## Overview
A arquitetura orientada a eventos desacopla domínios (debt, goals, wealth), permitindo reatividade sistêmica sem acoplamento direto entre serviços.

## Fluxo de Execução Oficial
1. **Mutation** (UI → Service)
2. **Domain Event** (`event-bus.ts` → `event-handlers.ts`)
3. **Orchestration** (Cross-domain reactions)
4. **Cache Sync** (`cache-synchronizer.ts` → Query Cache)

## Regras de Ownership
1. **Domain Isolation:** Domínios não importam outros domínios diretamente. Comunicação é via `EventBus`.
2. **Cache Responsibility:** O `CacheSynchronizer` é o único autorizado a manipular o Query Cache diretamente.
3. **Events:** Eventos devem ser tipados e conter `correlationId` para rastreabilidade.
