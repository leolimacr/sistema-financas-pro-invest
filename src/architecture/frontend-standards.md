# Frontend Standards: Finanças Pro Invest

Este documento define os padrões arquiteturais oficiais para o frontend do ecossistema. Todo novo desenvolvimento ou refatoração deve seguir estas diretrizes para garantir escalabilidade, manutenibilidade e desacoplamento.

---

## 1. Estrutura Oficial de Pastas
```
src/
├── architecture/      # Documentação arquitetural
├── components/        # Legado (em processo de migração/eliminação)
├── config/            # Configurações globais (e.g., navigation.config.ts)
├── hooks/             # Hooks compartilhados (migrar para baseada em domínio)
├── labs/              # Ambiente experimental (código isolado)
├── layouts/           # Shells composicionais (AppShell, AuthShell)
├── services/          # Camada de serviços (acesso a dados/infra)
│   ├── debt/
│   ├── goals/
│   ├── wealth/
│   └── user/
└── labs/app-shell/    # Novo ecossistema
```

## 2. Regras de Arquitetura

### Obrigatórias:
*   **Decoupling:** A UI nunca deve importar Firebase ou serviços de terceiros diretamente.
*   **Composition:** Layouts devem usar o padrão `children` e injeção de componentes via props (e.g., `<AppShell header={...} />`).
*   **Type Safety:** Todo novo código deve possuir interfaces TypeScript explícitas (proibido `any`).
*   **Isolamento:** Componentes legados devem ser isolados em *Adapters* antes de qualquer migração funcional.

### Proibidas:
*   **Proibido:** Importações diretas de infraestrutura em componentes `PRESENTATIONAL` ou `CONTAINER`.
*   **Proibido:** Uso de `currentTool` como orquestrador de estado ou rotas.
*   **Proibido:** Lógica de negócio dentro de componentes de UI.

---

## 3. Padrão de Services
*   Toda infraestrutura (Firebase, APIs) deve ser encapsulada em `src/services/`.
*   Services devem exportar apenas funções de CRUD/acesso a dados que retornam tipos simples ou promessas.
*   A UI consome apenas a API do service, desconhecendo a implementação (ex: Firebase).

## 4. Estratégia de Desacoplamento Firebase
*   Extrair lógica de referência (`collection`, `doc`, `query`) para os serviços.
*   Componentes devem usar hooks de domínio (ex: `useDebts`) que chamam os serviços, não o Firestore.

## 5. Estratégia de Server State
*   Migrar para **React Query (TanStack Query)** para gerenciar cache, loading, error e sync.
*   Context API apenas para estados globais leves (Auth, UI State básico).
*   Zustand para estados globais complexos de UI.

## 6. Classificação de Componentes Legados
*   **LEGACY_GOD_OBJECT**: `LoggedInHomePanel`, `Dashboard`, `CentralHub`. (Prioridade de eliminação/quebra).
*   **HIGH_RISK_MIXED**: `SettingsPage`, `AuthLogin`. (Necessita de adapters antes de mover).
*   **LOW_RISK_TOOL**: `tools/*.tsx`. (Prontos para migração rápida).

## 7. Estratégia de Migração por Territórios
*   **Sequência:** `Mais` -> `Explora` -> `Evolui` -> `Controla` -> `Home`.
*   **Isolamento:** Usar o diretório `labs/` para validar a composição antes de substituir no `AppRoutes` real.

## 8. Estratégia React Router
*   Migração declarativa gradual via *Strangler Fig Pattern*.
*   O `AppRoutes` atual será convertido de um switch monolítico para rotas aninhadas (`<Routes>`).

## 9. Regras de Composição de Layouts
*   `AppShell` é imutável em estrutura, flexível em conteúdo.
*   Sub-layouts (territórios) devem ser injetados como `children` do Shell principal.

## 10. Regras de Separação
*   **UI**: Apenas renderiza, consome dados via Hooks de domínio.
*   **Domínio**: Gerencia regras de negócio e estados (via Hook/Zustand/Context).
*   **Infraestrutura**: Gerencia persistência, auth e APIs (via Services).
