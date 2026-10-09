# Arquitetura e Decisões Técnicas do Módulo de Carteira de Investimentos
**Finanças Pro Invest**

Este documento formaliza as decisões arquiteturais, modelos matemáticos e protocolos de consistência do módulo independente de investimentos e alocação.

---

## 1. Definição Oficial de Câmbio e PTAX

O sistema distingue com precisão matemática e jurídica as três fontes de taxa cambial:

1. **PTAX Oficial do Banco Central do Brasil (`OFFICIAL_PTAX_BCB`)**:
   - **Metodologia**: Calculada pelo Banco Central do Brasil como a **média aritmética simples** das 4 janelas de consulta diárias realizadas pelo Depin (Departamento de Operações das Reservas Internacionais) junto aos dealers credenciados:
     - Janela 1: entre 10h00 e 10h10
     - Janela 2: entre 11h00 e 11h10
     - Janela 3: entre 12h00 e 12h10
     - Janela 4: entre 13h00 e 13h10
   - **Correção Histórica**: Não é média ponderada nem provém do sistema BCB SGS 432 (que é a taxa Selic diária).
   - **Fonte Oficial de Integração**: API de Dados Abertos Olinda do Banco Central:
     `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='MM-DD-YYYY'&$format=json`
   - **Aplicação**: Utilizada para relatórios fiscais, balanço patrimonial e apuração contábil oficial.

2. **Câmbio Comercial Interbancário (`COMMERCIAL_AWESOMEAPI`)**:
   - Cotação spot de mercado em tempo real (USDBRL.bid / EURBRL.bid).
   - Utilizada para marcação a mercado instantânea da carteira ao longo do pregão.

3. **Taxa Efetiva do Investidor / VET (`USER_EFFECTIVE_RATE`)**:
   - Câmbio real contratado pelo investidor na corretora/banco, incluindo spread comercial e IOF (Valor Efetivo Total).
   - Utilizada como fonte prioritária no lançamento de compras e vendas quando informada pelo usuário.

---

## 2. Protocolo de Concorrência e Consistência (Sem `activeMovementIds` Crescente)

### Diagnóstico e Descarte de Listas Crescentes no Documento
Em iterações anteriores, avaliou-se armazenar `activeMovementIds: string[]` dentro do documento `portfolio_assets/{assetId}`. Essa abordagem foi **formalmente descartada** pelos seguintes motivos:
- **Risco de Escala**: Uma carteira com histórico longo de movimentações (dividendos mensais, compras fracionadas, juros) faria o array crescer indefinidamente, violando o limite de 1 MB por documento do Firestore.
- **Concorrência O(N)**: A serialização de arrays longos onera o payload de rede e aumenta o risco de conflitos de gravação.

### Protocolo Aprovado de Concorrência Escalar
Para o incremento futuro de persistência no Firestore:
1. **Controle Escalar O(1)**: O documento `portfolio_assets/{assetId}` armazena apenas campos escalares de estado e integridade:
   - `versionToken: number` (contador sequencial monotônico)
   - `lastAppliedMovementId: string`
   - `ledgerChecksum: string` (hash determinístico FNV-1a dos lançamentos ativos)
   - `movementCount: number`
2. **Compatibilidade com o Firebase Web SDK Modular**:
   - No SDK Web do Firestore, `transaction.get()` aceita **estritamente `DocumentReference`** e não suporta `Query`.
   - As transações atômicas operam lendo o documento escalar do ativo (`tx.get(assetRef)`) e gravando a nova movimentação em `portfolio_movements/{movementId}` junto com a atualização da posição derivada em um único commit atômico.
3. **Detecção e Recuperação de Conflito**:
   - Se duas abas ou dispositivos tentarem gravar simultaneamente no mesmo ativo, a transação que encontrar `versionToken` defasado aborta automaticamente e reinicia a leitura, recalculando a posição com o estado mais atual antes de aplicar o novo lançamento.

---

## 3. Modelo de Posições Baseadas em Saldo Financeiro (Balance-Only)

Para ativos sem quantidade de cotas definida (como contas de caixa, Porquinho Inter, CDBs de liquidez diária cadastrados sem cotação unitária):
- `quantity: null` (nunca se utiliza `quantity = 1` como substituto artificial).
- `hasKnownQuantity: false`
- `isBalanceOnly: true`
- `hasKnownCost: false`
- `avgCostOriginal: null` e `avgCostBRL: null`
- `unrealizedPnLBRL: null`
- O valor atual do ativo corresponde estritamente ao saldo financeiro acumulado.
- Na simulação de rebalanceamento, o motor sugere alocação financeira direta em R$ (`suggestedAmountBRL`), mantendo `suggestedBuyQuantity = null` sem produzir cotas fictícias.

---

## 4. Segurança do Importador de Planilhas (CSV/XLSX)

- **Comprimido Máximo**: 5 MB (`MAX_IMPORT_FILE_SIZE_BYTES`).
- **Entradas ZIP Máximas**: 50 arquivos internos (`MAX_ZIP_ENTRIES`).
- **Descompactação Máxima por Arquivo**: 10 MB (`MAX_UNCOMPRESSED_ENTRY_BYTES`).
- **Expansão Total Acumulada Segura**: 25 MB (`MAX_TOTAL_UNCOMPRESSED_BYTES`).
- **Linhas Máximas Processadas**: 2.000 linhas (`MAX_IMPORT_ROWS`).
- **Células Máximas Processadas**: 50.000 células (`MAX_TOTAL_CELLS`).
- **Alinhamento de Coordenadas de Colunas**: Identificação direta da coordenada `r="[A-Z]+[0-9]+"` para que células vazias ou colunas esparsas não desloquem os dados.
- **Strings Compartilhadas Compostas**: Reconstrução completa de fragmentos estilizados (`<si><r><t>...</t></r></si>`).
- **Fórmulas e Ambiguidade**: Fórmulas não avaliadas e pontuações ambíguas geram avisos explícitos e nunca são convertidas silenciosamente.
