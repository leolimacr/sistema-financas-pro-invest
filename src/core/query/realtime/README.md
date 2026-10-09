# Realtime Query Bridge

Este módulo estabelece a ponte oficial entre fontes de dados realtime (Firebase) e o Query Runtime (`TanStack Query`).

## Filosofia
* **Single Source of Truth:** A UI nunca consome snapshots diretamente. O estado é sempre gerenciado pelo Query Cache.
* **Encapsulamento:** A complexidade de subscriptions, listeners e limpeza é escondida pelo `createRealtimeQuery`.
* **Governança:** `realtimeRegistry` previne memory leaks e listeners duplicados para a mesma query.

## Fluxo Oficial
Firebase Snapshot → Realtime Bridge → Query Cache → Domain Hook → UI

## Padrões
* **Registry:** Gerencia o lifecycle das subscriptions.
* **Bridge:** `bindSnapshotToQuery` sincroniza o estado externo com o cache local.
* **Factory:** `createRealtimeQuery` é a forma padrão de iniciar um listener de dados.
