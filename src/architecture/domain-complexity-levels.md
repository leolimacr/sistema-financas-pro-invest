# Níveis de Complexidade de Domínio

Este documento define os critérios arquiteturais para evitar *overengineering* e garantir que a complexidade do código seja proporcional à necessidade do domínio.

---

## 1. Níveis de Classificação

### A. SIMPLE_DOMAIN
Domínios de interface/UI pura ou utilitários sem persistência de estado complexa.
* **Exemplos:** `AuthShell`, `AppHeader`, `Calculadoras simples`.
* **Estrutura Mínima:** Apenas `index.ts` e o arquivo do componente.
* **Responsabilidades:** Renderização de UI.
* **Anti-patterns:** Criar services, mappers ou providers desnecessários.

### B. DATA_DOMAIN (O Padrão 'Debt')
Domínios de CRUD simples, leitura/escrita básica em banco de dados.
* **Exemplos:** `Debt`, `Goals`, `UserMeta`.
* **Estrutura Mínima:** Estrutura completa (`types`, `persist`, `mapper`, `validators`, `service`, `hooks`).
* **Responsabilidades:** Persistência, validação de fronteira, mapeamento simples.
* **Anti-patterns:** Colocar regras de negócio complexas nos mappers.

### C. CORE_DOMAIN
Domínios que orquestram múltiplos domínios de dados, possuem regras de negócio intrincadas, estado complexo ou fluxos transacionais.
* **Exemplos:** `NexusCore`, `DebtPlanSimulator` (quando extraído), `WealthOrchestrator`.
* **Estrutura Mínima:** Estrutura `DATA_DOMAIN` + `facade.ts` (ou orquestrador) + `redux/zustand` (se necessário).
* **Responsabilidades:** Orquestração, state management complexo, fluxos multi-passo.
* **Anti-patterns:** Misturar lógica de orquestração dentro de serviços de CRUD.

---

## 2. Critérios de Decisão e Boilerplate

### Quando criar artefatos?
| Artefato | Quando criar |
| :--- | :--- |
| **`mapper`** | Sempre que o modelo de banco (ex: Firestore) divergir do modelo de UI. |
| **`persist`** | Sempre que o dado no banco for estruturalmente diferente do dado do domínio. |
| **`validators`** | Quando houver regras de negócio críticas na entrada/saída de dados. |
| **`service`** | Sempre que houver acesso a infraestrutura (Firebase, API). |

### Regras para evitar boilerplate:
1. **Regra dos 3:** Se um componente UI consome Firebase diretamente e isso se repete em 3 arquivos diferentes, extraia para `service`.
2. **YAGNI (You Ain't Gonna Need It):** Se a estrutura de dados é idêntica à do banco, não crie `mapper` ou `persist`. Use o tipo de domínio diretamente.
3. **Consolidação:** Em `SIMPLE_DOMAIN`, mantenha tudo no arquivo do componente se for pequeno.

---

## 3. Matriz de Seleção

| Nível | Complexidade | Persistência | Regras de Negócio | Exemplo |
| :--- | :--- | :--- | :--- | :--- |
| **SIMPLE** | Baixa | Nenhuma | Nenhuma | `components/tools/InflationTool` |
| **DATA** | Média | Básica (CRUD) | Validação simples | `services/debt` |
| **CORE** | Alta | Alta/Transacional | Complexas | `NexusCore` (Futuro) |

## 4. Promoção de Nível
Um domínio deve ser promovido de `DATA` para `CORE` quando:
1. O domínio precisar orquestrar a consistência entre múltiplos `DATA_DOMAINS` (ex: atualizar Meta após registrar Lançamento).
2. A lógica de negócio ficar grande demais para um simples `service` ou `validator`.
3. Necessitar de um estado global complexo para orquestrar fluxos inter-domínios.
