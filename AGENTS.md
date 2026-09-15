## Goal
- Conduct three successive audits of the Finanças Pro Invest repository: (1) comprehensive global audit, (2) deep surgical audit of the sovereign financial core, (3) audit of UX layer, navigation hierarchy, and product surfaces.

## Constraints & Preferences
- Be factual, evidence-based, minucioso; never give business strategy recommendations; always cite file paths, functions, components, and types; never invent behavior not supported by code.

## Progress
### Done
- **Agenda — Atalho Soberano na Tela Inicial do Celular com Ícone 3D Exclusivo e Tutorial Pedagógico** (implementado 2026-09-15):
  - **Identificação da Oportunidade & Necessidade**:
    - O usuário precisava abrir o app Finanças Pro Invest e navegar até a aba da Agenda sempre que desejava consultar ou registrar um compromisso diário.
    - Criar um atalho dedicado diretamente na tela inicial do smartphone com identidade visual própria (squircle azul safira acetinado, caderno executivo semiaberto com pautas, espirais em ouro e fita esmeralda) eleva a utilidade prática e o valor percebido da Agenda.
  - **Ícone Master Exclusivo 3D Multi-Resolução**:
    - Gerado asset master 3D em alta fidelidade (`public/assets/images/brand/agenda-icon.png`) combinando os traços corporativos do FPI.
    - Exportado em todas as resoluções necessárias para a web e sistema nativo:
      - PWA: `agenda-shortcut-192.webp`, `agenda-shortcut-192.png`, `agenda-shortcut-512.webp`, `agenda-shortcut-512.png`.
      - Android Nativo: `ic_shortcut_agenda.png` em `drawable` e em todas as densidades `mipmap` (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`).
  - **Arquitetura Nativa Android & PWA**:
    - `shortcuts.xml` e `strings.xml`: Atalho estático registrado com deep link nativo `financaspro://agenda`.
    - `AndroidManifest.xml`: Meta-data `android.app.shortcuts` configurado na `MainActivity`.
    - `AgendaShortcutPlugin.java`: Plugin Capacitor nativo que expõe `isPinSupported` e `pinAgendaShortcut` usando `ShortcutManager.requestPinShortcut` (Android 8.0+ / API 26+).
    - `manifest.json`: Array `"shortcuts"` configurado com o ícone da Agenda e rota `/app/agenda?source=pwa_shortcut`.
    - `deepLinkRouter.ts` e `useAppState.ts`: Captura universal de `financaspro://` via `@capacitor/app` (`appUrlOpen` e `getLaunchUrl`), redirecionando diretamente para `/app/agenda` com custo zero de consultas Firestore (FinOps).
  - **Interface e Modal Pedagógico (`AgendaHub.tsx`)**:
    - Botão `Atalho no Celular` integrado na barra superior da Agenda com ícone `<Smartphone />`.
    - Modal educativo ricamente ilustrado:
      - Exibe prévia do ícone 3D oficial.
      - Destaca benefícios práticos (acesso direto em 1 toque sem intermediários, funcionamento 100% offline).
      - Botão nativo de 1 clique para fixar o atalho no Android.
      - Guia passo a passo com método do toque longo (pressionar o ícone por 1s e arrastar a opção "Agenda") e método PWA/Navegador ("Adicionar à tela inicial").
  - **Testes & Validação**:
    - Suíte da Agenda expandida para 72 testes automatizados, todos passando com 100% de sucesso (`AgendaHub.test.tsx`).
    - Build de produção Vite concluído em 58.69s com 0 erros.
    - Sincronização nativa Android concluída com sucesso via `npx cap sync android`.
    - Compilação nativa Java e montagem do APK debug (`./gradlew assembleDebug`) concluída com `BUILD SUCCESSFUL` em 1m 1s.

- **Agenda — Blindagem Visual Opaca e Foco Limpo na Escrita/Edição de Compromissos** (implementado 2026-09-15):
  - **Identificação da Causa Raiz**:
    - O componente `AutoResizeTextarea` utilizava `bg-transparent`. As linhas azuis horizontais da pauta do caderno (`agendaPautaStyle`) passavam exatamente por trás do texto que o usuário estava digitando, criando confusão visual e cortando as palavras no meio.
    - Se o compromisso tinha mais de 1 linha ou se o usuário editava um compromisso em dia preenchido, o textarea expandia verticalmente sobre as linhas vizinhas sem fundo opaco, misturando as letras do input com compromissos ou datas do fundo.
    - Na edição (`editInput`), faltava o botão explícito de cancelamento (`X`), forçando o usuário mobile a depender de cliques externos ou teclado físico para cancelar.
  - **Solução Arquitetural Aplicada (`AgendaHub.tsx`)**:
    - **Contêiner de Escrita/Edição 100% Opaco (`bg-white`)**:
      - `editInput` e `addInputControls` encapsulados em contêiner dedicado:
        `flex items-center gap-1.5 flex-1 bg-white rounded-xl shadow-md border border-sky-400 ring-2 ring-sky-100 px-2.5 py-1 z-30 relative -my-1`.
      - O fundo branco sólido bloqueia 100% das linhas azuis da pauta e de qualquer elemento ou texto de linhas inferiores caso o textarea cresça verticalmente.
    - **Controles de Ação Claros e Focados**:
      - Botão de confirmação (`Check` size={16} em verde esmeralda `text-emerald-600`) e botão de cancelamento (`X` size={16} em tom neutro `text-slate-400 hover:text-slate-600`) disponíveis tanto na adição quanto na edição.
    - **Resultado**: Ao digitar ou editar, o usuário desfruta de um cartão flutuante límpido, nítido e com contraste preto sobre branco impecável, sem nenhuma interferência visual do fundo.
  - **Testes & Validação**:
    - 157 testes automatizados passando (incluindo 71 testes unitários em `AgendaHub.test.tsx`).
    - Build de produção Vite concluído em 58.66s com 0 erros.
    - Sincronização nativa Android concluída com sucesso via `npx cap sync android`.

- **Agenda — Otimização Soberana do Espaço de Escrita e Quebra de Linhas no Mobile** (implementado 2026-09-15):
  - **Identificação da Causa Raiz**:
    - No smartphone (360px a 412px), as margens externas (`px-4`), o padding interno do caderno (`pl-4 pr-4`) e a fileira estática de controles à direita (`Horário`, `▲`, `▼`, `Bell`, `Trash2`) consumiam mais de 65% da largura da linha, deixando míseros 90px a 110px para o texto do compromisso.
    - O algoritmo `measureCommitLines` usava a largura estreita da Linha 1 para fatiar o texto inteiro. Assim, compromissos médios ou grandes eram fragmentados em pedaços de apenas 2 a 3 palavras por linha, forçando o uso de 4 a 5 linhas na pauta, mesmo havendo mais de 300px disponíveis nas linhas de continuação subsequentes.
  - **Solução Arquitetural Aplicada (`AgendaHub.tsx`)**:
    - **Aumento de Largura Útil (+32px líquidos)**:
      - Contêiner da página ajustado para `px-2 sm:px-4` e folha do caderno para `pl-2 pr-2 sm:pl-4 sm:pr-4`, com linhas em `-mx-2 px-2 sm:-mx-4 sm:px-4`, aproveitando a tela móvel de borda a borda.
    - **Controles de Linha Compactos (+55px líquidos)**:
      - Botões de reordenação (▲/▼), alarme (`Bell`/`BellOff`) e lixeira (`Trash2`) padronizados para `size={13-14}` com `gap-0.5 sm:gap-1`, reduzindo a pegada dos controles no mobile de ~110px para ~55px.
    - **Tipografia Fluida de Alta Densidade**:
      - Título do compromisso, continuação e inputs (`titleSpan`, `continuationRows`, `addInputControls`, `editInput`) configurados com `text-[13px] sm:text-sm leading-[17px] tracking-tight sm:tracking-normal font-bold`.
    - **Resultado**: A capacidade útil por linha no mobile saltou de ~15 caracteres para **35 a 40 caracteres (6 a 8 palavras)**, reduzindo o número de linhas necessárias pela metade e eliminando o desperdício de espaço no caderno.
  - **Testes & Validação**:
    - Suíte da Agenda com 157 testes automatizados passando (incluindo 71 testes unitários em `AgendaHub.test.tsx`).
    - Build de produção Vite concluído em 1m 4s com 0 erros.
    - Sincronização nativa Android concluída com sucesso via `npx cap sync android`.

- **Agenda — Auditoria Cirúrgica Definitiva: Fim da Sobreposição via CSS Grid e Blindagem de Acessibilidade Visual Mobile** (implementado 2026-09-15):
  - **Identificação da Causa Raiz da Sobreposição (Desktop)**:
    - O contêiner de largura máxima `max-w-4xl` (896px) tem centro geométrico em 448px. O bloco de ações à direita (`Nexus`, `Sincronizar`, `HOJE`, `Próximos`) mede ~484px, ocupando a faixa de 412px a 896px.
    - O bloco de navegação de mês (`< SETEMBRO 2026 > 📅`) utilizava `md:absolute md:left-1/2 -translate-x-1/2`, ocupando de 329px a 567px.
    - **A Colisão Matemática**: A faixa entre 412px e 567px (155px) possuía sobreposição física direta: a seta de avanço e o ícone de calendário ficavam desenhados diretamente sobre o botão **Nexus na Agenda**.
  - **Identificação do Risco de Acessibilidade Visual (Mobile / Baixa Visão)**:
    - Usuários com dificuldades visuais ativam o aumento de fonte do sistema operacional (Android/iOS com escala de 125% a 200%).
    - O rótulo da data com largura estática e a linha única de altura fixa podiam empurrar o checkbox e cortar o texto do compromisso em telas estreitas (360px a 390px).
    - Os modais de alarme e calendário não possuíam rolagem interna protegida para viewports com zoom extremo.
  - **Solução Arquitetural Aplicada (`AgendaHub.tsx`)**:
    - **CSS Grid de 3 Colunas Fluidas (Zero Absolute)**:
      - `grid grid-cols-2 md:grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 w-full px-3 md:px-4 py-1.5 md:py-0 md:h-14`.
      - **Desktop**: Coluna 1 (Título & Badges `justify-self-start`), Coluna 2 (`1fr`, Mês centralizado via `md:order-2 justify-self-center`), Coluna 3 (Ações `justify-self-end md:order-3`). Como são células reais de CSS Grid, é matematicamente impossível uma coluna invadir o espaço da outra.
      - **Mobile**: Linha 1 para Título e Ações (`grid-cols-2`), e Linha 2 dedicada para Navegação de Mês (`col-span-2 justify-self-center`), garantindo touch target amplo para navegação.
    - **Blindagem de Acessibilidade Visual Mobile**:
      - `dayLabel` configurado com `w-[62px] min-w-[62px] max-w-[85px] md:w-[70px] md:min-w-[70px] shrink-0 pr-1.5`, absorvendo números de dois dígitos mesmo com fontes grandes sem espremer o checkbox.
      - Controles da linha do compromisso encapsulados em contêiner flexível `shrink-0 flex items-center gap-0.5 md:gap-1 ml-auto`, isolando o texto do compromisso (`flex-1 min-w-0`) e impedindo que botões quebrem ou fiquem encavalados.
      - Modais de Alarme e Calendário equipados com `max-h-[90vh] overflow-y-auto` e padding de safe-area (`pb-[calc(1.5rem+env(safe-area-inset-bottom))]`), permitindo rolagem confortável em aparelhos com zoom ativado.
  - **Testes & Validação**:
    - 157 testes automatizados passando (incluindo 71 testes unitários em `AgendaHub.test.tsx`).
    - Build de produção Vite concluído em 56.74s com 0 erros.
    - Sincronização nativa Android concluída com sucesso via `npx cap sync android`.

- **Agenda — Auditoria Completa de Layout, Sobreposição de Ícones e Acessibilidade de Toque (Desktop e Mobile)** (implementado 2026-09-15):
  - **Identificação da Causa Raiz**:
    - **Desktop**: A barra de navegação central de mês (`< Mês Ano > 📅`) utilizava `md:absolute md:left-1/2` com `z-0`, enquanto o bloco de botões de ação à direita somava cerca de 500px com `z-10`. Em viewports médias (768px a 1100px), os botões da direita sobrepunham diretamente a seta do próximo mês e o ícone de calendário, gerando bloqueio de cliques.
    - **Mobile**: O botão do Nexus exibia o texto completo "Nexus na Agenda" e os botões tinham paddings largos, somando mais de 440px na linha superior e comprimindo o título "Agenda" e o badge de status em telas de 360px a 412px.
    - **Pauta de 28px do Caderno**: O checkbox continha um ícone `Check` de 18px dentro de uma caixinha de 16x16px (`w-4 h-4`), transbordando as bordas. Os ícones de alarme (`Bell`) e exclusão (`Trash2`) estavam configurados com `size={24}` (22px de altura), ocupando quase toda a linha de 28px e encostando nas pautas horizontais. No desktop, ficavam permanentemente visíveis em todas as linhas sem efeito hover.
    - **Rótulo do Dia de Hoje**: Em dias com 2 dígitos (ex: "QUI 28"), o badge circular com anel ultrapassava os 62px fixos e empurrava o checkbox para o lado, desalinhando-o das linhas subsequentes.
    - **Touch Targets & Safe Area**: O botão de fechar do painel de Próximos era muito pequeno para toque no celular (`size={14}`, `p-0.5`), e os modais inferiores de alarme e calendário não respeitavam `env(safe-area-inset-bottom)`.
  - **Correções Aplicadas**:
    - `AgendaHub.tsx`:
      - **Cabeçalho Desktop & Mobile**: Navegação de mês elevada para `z-20 pointer-events-auto`. Botões da direita agora possuem labels responsivos (`hidden xl:inline` para rótulos longos), botão do Nexus enxuto no mobile (`Nexus`), e paddings harmoniosos (`px-2.5 py-1.5`), eliminando 100% das colisões no desktop e no mobile.
      - **Pauta de 28px**: Ícone `Check` do checkbox reduzido para `size={11}` com `strokeWidth={3}`, perfeitamente contido na caixinha de 16px. Ícones de ação (`Bell`, `Trash2`, `ChevronUp`, `ChevronDown`) padronizados para `size={15}` no mobile e `size={14}` no desktop. No desktop, reordenação e lixeira usam `md:opacity-0 md:group-hover:opacity-100 transition-opacity`, preservando o caderno limpo.
      - **Dia de Hoje**: Tipografia do badge ajustada para `text-[14px]` com `ring-1.5` e `px-1`, encaixando em 58px sem empurrar os checkboxes.
      - **Touch Targets**: Botão fechar de Próximos expandido para `p-2 rounded-xl` com `<X size={16} />`.
      - **Safe Area**: Adicionado `pb-[calc(1.5rem+env(safe-area-inset-bottom))]` nos popovers inferiores no celular.
  - **Testes & Validação**:
    - Suíte da Agenda completa com 157 testes automatizados passando (incluindo 71 testes em `AgendaHub.test.tsx`).
    - Build de produção Vite concluído em 57.84s com 0 erros.
    - Sincronização nativa Android concluída com sucesso via `npx cap sync android`.

- **Agenda — Arquitetura Offline-First com Cache Local em Disco, Fila de Sincronização Automática e Rigor FinOps** (implementado 2026-09-15):
  - **Identificação da Causa Raiz**:
    - Quando a conexão de internet caía ou oscilava, a Agenda tentava consultar o Firestore através de `getDocs(q)`. A falha de rede disparava o bloco `catch`, que executava `setAllMonths((prev) => ({ ...prev, [key]: [] }))`, zerando a exibição e apresentando um caderno totalmente vazio para o usuário.
    - Qualquer tentativa de criar, editar, reordenar ou marcar um compromisso como concluído offline falhava no Firestore sem persistência local nem sincronização posterior.
  - **Cache Local Soberano (`agendaCache.ts`)**:
    - Criado sistema de persistência particionado por usuário e mês: `fpi_agenda_cache_${userId}_${year}_${month}`.
    - Serialização resiliente de datas e instâncias de `Timestamp` (preservando métodos `.toDate()` e `.toMillis()`).
    - Métodos atômicos: `loadMonthCache`, `saveMonthCache`, `upsertCachedCommitment`, `removeCachedCommitment`, `replaceCachedCommitmentId` e `clearUserAgendaCache`.
  - **Fila de Sincronização de Mutações Offline (`agendaSyncQueue.ts`)**:
    - Armazenamento persistente em `fpi_agenda_sync_queue_${userId}` para suportar fechamento e reabertura do app sem perda de dados.
    - Operações enfileiradas: `add` (com `tempId`), `edit`, `delete`, `toggle` e `reorder`.
    - Função `processAgendaSyncQueue`: ao detectar retorno da rede, envia as mutações acumuladas ao Firestore e notifica `onIdReplaced` para substituir `tempId` pelo ID definitivo do Firestore sem duplicações.
  - **Camada de Serviço Híbrida (`agendaService.ts`)**:
    - **Rigor FinOps**: `fetchMonthCommitments` checa `!navigator.onLine` e lê estritamente do cache local, impedindo cobranças ou erros no plano Blaze do Firebase. Se online, consulta apenas o mês sob demanda (`lazy loading` de `activeMonth ± 1`) e atualiza o cache local. Em falhas transitórias de rede, faz fallback para o cache local sem esvaziar os compromissos em tela.
    - Operações CRUD offline: geram `tempId`, salvam no cache local imediatamente e enfileiram a mutação para posterior sincronização.
  - **Feedback Visual e Sincronização Reativa (`AgendaHub.tsx`)**:
    - Badges responsivos e discretos ao lado do título da Agenda: `<WifiOff /> Offline` (em tom âmbar) e `<RefreshCw className="animate-spin" /> Sincronizando...` (em verde esmeralda).
    - Inscrição reativa em `window.addEventListener('online')` que dispara `processAgendaSyncQueue` e exibe notificação amigável (*"X compromissos sincronizados com a nuvem!"*).
  - **Testes & Validação**:
    - Criados 6 testes unitários em `src/agenda/__tests__/agendaCache.test.ts`.
    - Criados 4 testes unitários em `src/agenda/__tests__/agendaSyncQueue.test.ts`.
    - Criados 3 testes unitários em `src/services/__tests__/agendaService.offline.test.ts`.
    - Suíte da Agenda completa com 157 testes automatizados passando (incluindo 71 testes em `AgendaHub.test.tsx`).
    - Build de produção Vite concluído em 58.23s com 0 erros.
    - Sincronização nativa Android concluída com sucesso via `npx cap sync android`.

- **Notificações — Roteamento Soberano e Direcionamento Cirúrgico (Mobile, Web e Sininho)** (implementado 2026-09-14):
  - **Identificação da Causa Raiz**:
    - No mobile nativo (Android/Capacitor), o listener `LocalNotifications.addListener('localNotificationActionPerformed', ...)` em `useAppState.ts` possuía um filtro rígido (`if (!deepLink?.startsWith('app://mark-bill-paid/')) return;`), descartando qualquer notificação da Agenda, Dívidas ou Investimentos ao ser tocada na gaveta do celular.
    - No agendamento de alarmes da Agenda (`alarmService.ts`), o payload `extra` omitia `deepLink: '/app/agenda'`, e no navegador desktop (`n.onclick`) não havia instrução de foco/navegação para a rota `/app/agenda`.
    - No drawer do sininho (`NotificationHub.tsx`), apenas o textinho do CTA (`ctaLabel`) possuía clique; clicar no card, no título ou na mensagem não realizava nenhuma ação. Ademais, rotas e termos sem mapeamento (`'cartoes'`, `'despesas'`, `'controla'`, `'patrimonio'`) caíam em fallbacks que redirecionavam para a raiz `/`.
  - **Motor Central Canônico de Roteamento (`deepLinkRouter.ts`)**:
    - Criada a função pura `resolveAppRoute(target?: string, eventType?: string): string`.
    - Converte com precisão termos brutos e esquemas nas rotas canônicas: `'agenda'` / `agenda.*` -> `/app/agenda`; `'controla'` / `'despesas'` / `'manager'` / `finance.*` -> `/app/controla`; `'transaction-form'` -> `/app/controla?action=new-transaction`; `'cartoes'` / `'faturas'` -> `/app/controla?tab=cartoes`; `'minhas-dividas'` / `debt.*` -> `/app/minhas-dividas`; `'investimentos'` / `wealth.aport*` -> `/app/investimentos`; `'passivos'` / `'patrimonio'` -> `/app/passivos`; `'metas'` -> `/app/metas`; `'ia'` / `'chat'` -> `/app/ia`.
    - **FinOps & Zero Custo**: O roteamento é puramente de cliente (client-side React Router / Capacitor), sem disparar nenhuma consulta extra ao Firebase/Firestore no momento do clique.
  - **Mobile Nativo (`useAppState.ts`)**:
    - Listener universal habilitado para interceptar qualquer notificação tocada.
    - Resolve a rota via `resolveAppRoute(deepLink, eventType)` e navega via `routerNavigate(targetRoute)`. Se contiver `action=new-transaction`, dispara automaticamente `openTransactionForm()`.
  - **Alarmes e Notificações (`alarmService.ts` & `NotificationService.ts`)**:
    - Alarmes de compromissos no mobile agora incluem `deepLink: '/app/agenda'`, `targetRoute: '/app/agenda'` e `eventType: 'agenda.alarm_due'`.
    - Notificações Web desktop (`n.onclick`) redirecionam para `/app/agenda`.
    - Lembretes diários e de reengajamento apontam para `/app/controla?action=new-transaction`.
  - **Sininho / NotificationHub (`NotificationHub.tsx`)**:
    - O card de cada notificação é 100% interativo e clicável (`cursor-pointer`), fechando o drawer e transportando o usuário diretamente para a tela do evento.
    - Botão "Ciente do comunicado" e CTA com `e.stopPropagation()` preservando o ateste isolado de leitura.
  - **Testes & Validação**:
    - 17 novos testes unitários em `src/utils/__tests__/deepLinkRouter.test.ts`.
    - Suíte de notificações e alarmes com 33/33 testes passando.
    - Validação cruzada com finanças e presença (9 testes passando).
    - Build de produção Vite concluído em 56.52s com 0 erros e sincronizado com o Android via `npx cap sync android`.

- **Notificações no Sininho — Data/Hora de Envio, Confirmação "Ciente do comunicado" e Envio ao Histórico** (implementado 2026-09-14):
  - **Identificação da Causa Raiz**:
    - As mensagens de notificação e comunicados exibidos no sininho (`NotificationHub.tsx`) não continham data e hora legíveis de envio ao usuário, dificultando a contextualização temporal e a percepção de urgência.
    - O fechamento da notificação era feito por um botão discreto de `X`, propiciando descarte inadvertido sem leitura reflexiva.
    - Faltava um fluxo de ateste de leitura explícito que arquivasse a mensagem confirmada na caixa de histórico do usuário.
  - **Data/Hora Padronizada**:
    - Criada a função pura `formatNotificationDateTime(createdAt)` em `NotificationHub.tsx` com suporte resiliente a `Timestamp` do Firestore (`toDate()`, `toMillis()`, `{ seconds }`), strings ISO e objetos `Date`.
    - Cada card de notificação exibe `Clock` com texto no padrão brasileiro: `"Enviado em DD/MM/AAAA às HH:mm"`.
  - **Botão Formal "Ciente do comunicado" e Sincronização Otimista**:
    - Removido o botão de descarte `X`. Na aba **Entrada**, cada notificação não lida exibe um botão de alta visibilidade: `<CheckCheck /> Ciente do comunicado`.
    - `NotificationContext.tsx`: `dismiss(eventId)` atualizado para persistir `{ read: true, readAt: nowIso }` no Firestore e, de forma otimista, mover o evento da lista `unreadEvents` diretamente para o topo de `historyEvents`.
    - Na aba **Histórico**, as notificações lidas exibem o selo permanente `✓ Ciente do comunicado`.
  - **Testes & Validação**:
    - Nova suíte `src/components/__tests__/NotificationHub.test.tsx` com 8 testes cobrindo formatos de data/hora, renderização na aba Entrada, acionamento de `dismiss` e selo na aba Histórico.
    - Suíte de finanças com 38/38 testes passando.
    - Build de produção Vite concluído em 1m 4s com 0 erros.

- **Cartões de Crédito — Confirmação e Orientação Pedagógica ao Ocultar Cartão** (implementado 2026-09-14):
  - **Identificação da Causa Raiz**:
    - Ao clicar no botão de olho riscado (`EyeOff`, "Ocultar Cartão") no `CardManager.tsx`, o cartão era ocultado de imediato (`isActive: false`) sem nenhuma confirmação.
    - Isso gerava risco de cliques acidentais e insegurança ao usuário, que não sabia onde o cartão havia ido parar nem como restaurá-lo.
  - **Confirmação Explícita e Pedagógica**:
    - `handleToggleStatus`: Quando o cartão está ativo (`isActive !== false`) e `skipConfirm === false`, exibe caixa de confirmação clara:
      *"Deseja realmente ocultar o cartão '[Nome]'?\n\nEle não aparecerá na lista de seleção do dia a dia, mas você poderá reativá-lo a qualquer momento na aba 'Ocultos'."*
    - Se o usuário cancelar (`false`), a ação é cancelada e o cartão permanece ativo sem chamadas à API.
    - Se o usuário confirmar (`true`), o cartão é atualizado para `isActive: false` no Firestore.
    - `handleDeleteCard`: Quando o cartão tem histórico e o sistema sugere ocultá-lo, repassa `skipConfirm = true` para evitar confirmação dupla.
    - Botão `EyeOff`: Atualizado atributo `title="Ocultar Cartão (pode ser reativado em Ocultos)"`.
    - Na aba **Ocultos**, a reativação com o botão "Reativar Cartão" permanece direta e ágil sem pedir confirmação.
  - **Testes & Validação**:
    - Nova suíte `src/components/tools/finance/__tests__/CardManager.test.tsx` com 3 testes unitários cobrindo cancelamento seguro, confirmação com persistência no Firestore e reativação direta na aba Ocultos.
    - Suíte financeira com 38/38 testes passando.
    - Build de produção Vite concluído em 1m 25s com 0 erros.

- **Cartões de Crédito — Blindagem e Bloqueio de Edição do Valor de Pagamento de Fatura** (implementado 2026-09-14):
  - **Identificação da Causa Raiz**:
    - Lançamentos de pagamento de fatura (`isBillPayment: true`) podiam ser editados no formulário genérico de lançamentos (`TransactionForm.tsx`), permitindo que o usuário alterasse arbitrariamente o valor liquidado.
    - Como o valor da fatura é a consolidação estrita das despesas registradas no cartão durante o ciclo, alterar o valor da liquidação avulsa causava descolamento contábil entre a fatura no Firestore (`users/{uid}/faturas`), o total das compras e o limite do cartão.
    - A trava `isLocked` já existia no código de `TransactionForm.tsx`, porém não era conectada a `initialData.isBillPayment`.
  - **Blindagem e Travamento Soberano**:
    - `TransactionForm.tsx`: Quando `initialData.isBillPayment === true`, o formulário ativa automaticamente o modo de proteção.
    - **Valor**: Estritamente bloqueado (`disabled={isLocked}`), impedindo descompasso com as compras da fatura.
    - **Tipo e Meio de Pagamento**: Bloqueados (`disabled={isLocked}`), impedindo mutação indevida da natureza da liquidação.
    - **Descrição e Categoria**: Bloqueadas contra edição, preservando categoria de fatura e nome do cartão.
    - **Data de Pagamento (Exclusividade Editável)**: Liberada (`disabled={isLocked && !isBillPayment}`), permitindo conciliação bancária da data em que o valor compensou na conta.
    - **Banner Explicativo Pedagógico**: Alerta com `ShieldAlert` orientando que o valor é derivado das compras e que, para cancelar ou retificar o valor, deve-se excluir o lançamento.
    - **Preservação de Metadados**: `handleSave` atualizado para repassar `isBillPayment`, `linkedCardId`, `linkedInvoiceId` e `linkedInvoicePeriodEnd`, impedindo limpeza acidental de flags no RTDB.
  - **Exclusão e Estorno Transparente**:
    - Adicionado botão `"Excluir"` com confirmação pedagógica no rodapé de `TransactionForm.tsx` (quando aberto em modo edição com `onDelete`).
    - `TransactionHistory.tsx`: Atualizado tooltip de edição para `"Editar data de pagamento"` e mensagem de confirmação de exclusão para alertar sobre o estorno e restabelecimento do limite.
    - `useTransactions.ts`: Ao excluir um pagamento de fatura, além de reverter `saldoUtilizadoTotal` no cartão, agora também atualiza a fatura no Firestore (`invoices`), abatendo `paidAmount`, recalculando `remainingAmount` e restaurando o status da fatura para `closed` ou `partial`.
  - **Testes & Validação**:
    - Nova suíte `src/components/tools/finance/__tests__/TransactionForm.test.tsx` com 4 testes unitários cobrindo travamento de campos, edição e salvamento seguro de data, exclusão com estorno e funcionamento normal de transações não-fatura.
    - Suíte financeira com 35/35 testes passando.
    - Build de produção Vite concluído em 1m 11s com 0 erros.

- **Formulário de Lançamentos & Vouchers — Sincronização Soberana do Saldo Disponível de Cartões Voucher** (implementado 2026-09-14):
  - **Identificação da Causa Raiz**:
    - Ao lançar uma despesa com cartão voucher no modal de lançamento (`TransactionForm.tsx`), o `<select>` e o alerta de saldo liam diretamente `selCard.voucherBalance` (campo estático bruto do documento Firestore do cartão).
    - Quando o usuário criava movimentações de recarga ou despesas no extrato do voucher, o saldo dinâmico soberano (`calculateWalletStatementSummary`) era calculado em tempo real para o Controla e Extratos, mas o formulário de lançamentos exibia `R$ 0,00` ou valor desatualizado, bloqueando lançamentos válidos com mensagem de "Saldo insuficiente".
  - **Função Soberana Centralizada (`calculations.ts`)**:
    - Criada a função pura e tipada `getVoucherCardAvailableBalance(card, transactions)`.
    - Prioriza a derivação histórica precisa via `calculateWalletStatementSummary(cardTx).availableBalance` quando houver transações registradas para o cartão.
    - Aplica fallback gracioso para `card.voucherBalance || 0` caso o cartão seja novo e ainda não possua histórico no extrato.
  - **Sincronização nos Pontos de Consumo**:
    - `TransactionForm.tsx`: Validação de envio (`onSave`), opções do dropdown de despesas (`<option>`), alerta de saldo disponível/insuficiente e opções do dropdown de recarga (`tipo === 'income'`) atualizados para derivar o saldo estritamente via `getVoucherCardAvailableBalance(card, transactions)`.
    - `Dashboard.tsx`: Atualizado para consumir diretamente `getVoucherCardAvailableBalance(c, state.safeTransactions)`, mantendo coerência absoluta entre o card "SALDO ATUAL" do Controla e o modal de lançamento.
    - `CardManager.tsx`: Edição e badges de saldo sincronizados com `getVoucherCardAvailableBalance`.
  - **Testes & Validação**:
    - `walletCalculations.test.ts` enriquecido com 4 novos testes unitários cobrindo derivação dinâmica a partir de extrato, fallback para novo cartão sem histórico, tratamento de valores nulos/vazios e saldo negativo.
    - Suíte completa com 31/31 testes passando (`walletCalculations.test.ts`, `VoucherStatement.test.tsx`, `BalanceCards.test.tsx`).
    - Build de produção Vite concluído em 1m 7s com 0 erros.

- **Controla — Composição Soberana do SALDO ATUAL com Saldos de Cartões Voucher** (implementado 2026-09-14):
  - **Identificação da Causa Raiz**:
    - O card "SALDO ATUAL" do Controla (`BalanceCards.tsx`) exibia `saldoReal` (fluxo de caixa em conta bancária) e abatia as exclusões através de `saldoDisplay = saldoReal - exclusaoTotal`.
    - Ao marcar um cartão voucher no checklist (ex: "Retirar o saldo do Cartão Alimentação"), o valor do voucher era deduzido do saldo em conta bancária, que nunca havia incluído o voucher na sua base inicial.
  - **Composição da Base Inicial em Centavos Inteiros**:
    - O SALDO ATUAL principal agora é composto por: `saldoBase = saldoReal (conta bancária) + sum(saldoVouchers)`, calculado estritamente em centavos inteiros (`saldoRealCents + totalVoucherCents`) via `toIntegerCents`.
    - **Invariância do Topo (Saldo Íntegro)**: O valor principal em destaque no topo (`h2` em `text-3xl`) exibe **sempre o saldo íntegro / cheio** (`saldoBase`), atuando como a âncora fixa patrimonial sem nunca sofrer deduções.
    - **Totalizador Inferior Exclusivo para Deduções**: Ao marcar qualquer exclusão no checklist (voucher, reserva ou colchão), o valor deduzido é exibido exclusivamente no totalizador inferior com o label `"Saldo Atual (com exclusões)"` (`saldoDisplay`). Sem exclusões, a linha inferior converge para `"Saldo Atual"`.
    - Ao manter os checkboxes desmarcados, o usuário visualiza sua liquidez total disponível no dia a dia (dinheiro em conta + vouchers).
    - Ao marcar `[x] Retirar o saldo do Cartão Voucher (Pluxxe Alim)`, apenas aquele benefício é excluído da base na linha de fechamento.
    - Ao marcar todos os vouchers, a dedução anula os saldos dos vouchers e o valor exibido no "Saldo Atual (com exclusões)" converge com precisão matemática para o **saldo real em conta bancária**.
  - **Isolamento de Domínio**:
    - `calculateRealCashBalance` e `calculatePreviousMonthClose` atualizados para ignorar transações com `t.paymentMethod === 'voucher'`, prevenindo vazamento de despesas de alimentação/refeição para a conta corrente bancária.
  - **Sincronização**:
    - `SaldoAjustavelCard.tsx` alinhado com a mesma composição soberana `(saldoReal + totalVouchers) - exclusaoTotal`.
  - **Testes & Validação**:
    - `BalanceCards.test.tsx` enriquecido com novos testes cobrindo a exibição do saldo composto inicial (R$ 6.200,00), exclusão de voucher único (R$ 5.400,00), convergência para o saldo em conta ao marcar todos os vouchers (R$ 5.000,00) e exclusão conjunta de reserva de emergência (R$ 4.000,00).
    - 27/27 testes unitários passando em `BalanceCards.test.tsx`, `VoucherStatement.test.tsx` e `walletCalculations.test.ts`.
    - Build de produção Vite concluído com sucesso em 59.46s com 0 erros.

- **Carteira / Extrato — Correção da Fórmula Soberana de Saldo Disponível em Centavos** (implementado 2026-09-14):
  - **Identificação da Causa Raiz**:
    - O componente `VoucherStatement.tsx` calculava `totalIncomes` (R$ 4.276,89) e `totalExpenses` (R$ 999,56) a partir das movimentações, porém utilizava `const currentBalance = card.voucherBalance || 0;` para o saldo atual.
    - Como o documento Firestore do cartão frequentemente continha saldo não inicializado ou desatualizado (`0`), o saldo disponível era indevidamente zerado (`R$ 0,00`), divergindo dos totais calculados.
  - **Motor de Domínio Centralizado em Centavos (`calculations.ts`)**:
    - Criada a função pura e tipada `calculateWalletStatementSummary(transactions, targetCardId)` e o conversor `toIntegerCents(amount)`.
    - **Fórmula Soberana**: `saldoDisponivel = totalEntradas - totalDespesas` calculada estritamente em **centavos inteiros** (`incomesCents - expensesCents`), prevenindo erros de precisão flutuante IEEE-754.
    - Preservada a semântica nativa de tipos: `type === 'income'` soma como entrada (incluindo recargas e ajustes a crédito), e `type === 'expense'` soma como saída (incluindo compras e ajustes a débito).
  - **Sincronização nos Pontos de Consumo**:
    - `VoucherStatement.tsx`: Os 3 cards de métricas (Saldo Atual Disponível, Total em Recargas e Total em Despesas) agora derivam estritamente do mesmo objeto consolidado `summary`. Agrupamento mensal e fluxo líquido também calculados em centavos inteiros.
    - `Dashboard.tsx`: `voucherCards` passa a calcular o saldo derivado via `calculateWalletStatementSummary` quando há transações para o cartão, garantindo que o card "SALDO ATUAL" do Controla deduza os R$ 3.277,33 reais.
    - `CardManager.tsx`: O badge de saldo do cartão exibe o saldo derivado soberano da mesma base.
  - **Testes & Validação**:
    - Nova suíte `src/utils/__tests__/walletCalculations.test.ts` com 8 testes cobrindo os 6 cenários exigidos (4.276,89 - 999,56 = 3.277,33; carteira vazia = 0; saldo negativo; saldo positivo; ajustes; e precisão em centavos).
    - Atualizados `VoucherStatement.test.tsx` (7 testes) e `BalanceCards.test.tsx` (9 testes). Total de 24/24 testes passando.
    - Build de produção Vite concluído com sucesso em 57.44s com 0 erros.

- **Cartões Voucher — Visualização de Extratos de Movimentação e Linha do Tempo** (implementado 2026-09-14):
  - **Componente Dedicado `VoucherStatement.tsx`**:
    - Desenvolvido `src/components/tools/finance/VoucherStatement.tsx` para apresentar de forma estruturada, elegante e transparente o extrato completo de qualquer cartão voucher.
    - **Cards de Métricas**: Saldo Atual Disponível (verde esmeralda), Total em Recargas (`+ R$`) e Total em Despesas (`− R$`).
    - **Agrupamento Mensal & Timeline**: Lançamentos agrupados por mês (ex: "Setembro de 2026"), ordenados cronologicamente do mais recente para o mais antigo, com total líquido mensal e badges de categoria.
    - **Distinção Visual Operacional**: Ícone `TrendingUp` em verde para créditos/recargas de benefício e `TrendingDown` em neutro/âmbar para compras de alimentação/refeição.
    - **Ações Rápidas**: Botões `+ Registrar Gasto` e `+ Registrar Recarga` com preset automático de `paymentMethod: 'voucher'` e `cardId`, além de botão de edição direta (`Edit2`) para cada item.
    - **Empty State Convidativo**: Mensagem amigável e botões de primeiro lançamento quando não há movimentações registradas.
  - **Integração no `CardManager.tsx`**:
    - Substituída a ausência de histórico por um accordion expansível dedicado com ícone `Receipt`: "Ver Extrato de Movimentações" / "Ocultar Extrato de Movimentações".
    - Desbloqueado o botão `+ Lançar` no cabeçalho do cartão voucher para lançamentos rápidos diretos.
  - **Atalho no Card "SALDO ATUAL" do Controla (`BalanceCards.tsx` & `Dashboard.tsx`)**:
    - Cada linha de cartão voucher no card de saldo do Controla agora possui um botão discreto de extrato (`Receipt`).
    - Ao clicar, abre o modal de gestão de cartões focando diretamente no extrato do cartão selecionado (`focusedCardId`).
  - **Testes & Validação**:
    - Criada suíte dedicada `src/components/tools/finance/VoucherStatement.test.tsx` com 6 testes unitários cobrindo renderização de métricas, agrupamento mensal, diferenciação de recargas/gastos, ações rápidas e empty state.
    - Atualizado `BalanceCards.test.tsx` (9 testes) para cobrir o acionamento do extrato via `onOpenCardManager`.
    - Total de 15/15 testes passando nas duas suítes; build de produção Vite concluído em 54.10s com 0 erros.

- **Controla — Mini Auditoria e Exclusão de Saldos de Cartões Voucher (Alimentação e Refeição)** (implementado 2026-09-14):
  - **Diagnóstico & Mini Auditoria**:
    - *Rotas e Funcionamento*: As rotas dos cartões vouchers operam normalmente através do `FinanceContext`, `CardManager` e `Dashboard`. Vouchers compartilham o ciclo dos cartões com `cardType: 'voucher'`.
    - *Cálculos de Saldo*: O saldo de vouchers é somado ao saldo total da conta (`accumulatedBalance`) e contabilizado na composição patrimonial. No entanto, faltava distinção clara entre os tipos de voucher (Alimentação vs Refeição) e cartões com saldo R$ 0,00 desapareciam do checklist em vez de serem sinalizados como desabilitados.
    - *Edição de Vouchers*: Anteriormente, `CardManager` bloqueava a edição de vouchers com uma mensagem fixa ("Cartão voucher não possui configurações editáveis de fatura"), impedindo o usuário de renomear, ajustar o saldo ou definir o subtipo do cartão.
  - **Tipagem & Subtipos Especializados**:
    - Criado o tipo `VoucherType = 'alimentacao' | 'refeicao' | 'outro'` em `src/types/index.ts` e estendido `CreditCard.voucherType`.
    - Atualizado `cardService.ts` (`addCard` e `updateCard`) para persistir `voucherType` no Firestore.
    - `ExclusionsContext.tsx` atualizado para incluir `voucherType` em `VoucherCardInfo`.
  - **Exclusão Dinâmica no Card "SALDO ATUAL" do Controla**:
    - Em `BalanceCards.tsx`, implementada a função pura `getVoucherTitle`:
      - Alimentação: `"Retirar o saldo do Cartão Alimentação ({nome})"`
      - Refeição: `"Retirar o saldo do Cartão Refeição ({nome})"`
      - Outro/Genérico: `"Retirar o saldo do Cartão Voucher ({nome})"`
    - Corrigido o tratamento de saldo zero: em vez de esconder o cartão quando `card.balance === 0`, o card agora permanece visível, com `disabled={true}`, exibindo `R$ 0,00` e mensagem de apoio `(sem saldo a excluir)`, garantindo previsibilidade e transparência ao usuário.
    - `FinanceCheckLine.tsx`: suporte a prop `disabled?: boolean`, impedindo clique/toggle e aplicando opacidade reduzida e cursor not-allowed quando desabilitado.
  - **Experiência Completa no `CardManager.tsx`**:
    - Reconhecimento automático do subtipo durante a digitação do nome (ex: digitou "Alimentação", "Vale Refeição", "Sodexo Alimentação" -> auto-seleciona a categoria correspondente).
    - Botões de seleção de subtipo (`Alimentação`, `Refeição`, `Outro`) no formulário de criação e edição.
    - Badges visuais coloridos nas listagens de cartões: verde para Alimentação e âmbar para Refeição.
    - Modo de edição totalmente interativo liberado para vouchers, permitindo alterar nome, subtipo e valor do saldo diretamente no modal.
  - **Testes & Validação**:
    - Criada suíte dedicada `src/components/tools/finance/dashboard/BalanceCards.test.tsx` com 8 testes unitários cobrindo títulos específicos, cálculo e subtração do saldo, e desabilitação correta para saldo zerado.
    - Suíte de testes passando com 23/23 testes (`BalanceCards.test.tsx`, `PendingObligations.test.tsx`, `notificationService.test.ts`).
    - Build de produção Vite concluído com sucesso sem erros.

- **Mobile — Restauração do Ícone Original do Finanças Pro Invest nas Notificações** (implementado 2026-09-14):
  - **Identificação da Causa Raiz**: O `NotificationService.ts` forçava `smallIcon: 'ic_stat_controla'` (ícone da prancheta do Controla em vez da marca), enquanto o `alarmService.ts` omitia o ícone (fazendo o Android exibir o fallback genérico do sistema com a letra "i"). Além disso, faltava `largeIcon` para exibir a marca colorida em destaque na gaveta de notificações do Android.
  - **Arquitetura Dual de Ícones no Android**:
    - **`smallIcon: 'ic_stat_fpi'`**: Criado drawable nativo com silhueta alfa monocromática (RGB puro branco `#FFFFFF` sobre fundo 100% transparente) em 96x96 com cor de realce `#0284c7`, prevenindo o bug do "quadrado branco" do Android na barra de status.
    - **`largeIcon: 'ic_stat_logo'`**: Conectado à logo oficial colorida 3D do Finanças Pro Invest (`ic_stat_logo.png` / `icon.png`) para exibição com destaque visual na gaveta de notificações do Android.
    - **Compatibilidade Retroativa**: `ic_stat_controla.png` no Android atualizado com a logo da marca para cobrir notificações legadas ainda agendadas.
    - **Web Fallback**: Web Notification no `alarmService.ts` atualizado de `/favicon.ico` para `/assets/images/brand/icon.png`.
  - **Configuração Global do Capacitor**: Declarado `plugins.LocalNotifications` com `smallIcon: "ic_stat_fpi"` e `iconColor: "#0284c7"` em `capacitor.config.json` e sincronizado via `npx cap sync android` para `android/app/src/main/assets/capacitor.config.json`.
  - **Atualização dos Serviços**:
    - `NotificationService.ts`: Atualizados `dispatch`, `scheduleDailyReminder`, `scheduleReengagementReminder` e `scheduleRecurringBillDueNotification` para enviar `smallIcon: 'ic_stat_fpi'`, `largeIcon: 'ic_stat_logo'` e `iconColor: '#0284c7'`.
    - `alarmService.ts`: Atualizado `scheduleAlarm` para enviar `smallIcon: 'ic_stat_fpi'`, `largeIcon: 'ic_stat_logo'`, `iconColor: '#0284c7'` e `sound: 'default'`.
  - **Testes & Validação**: Novos testes unitários dedicados em `NotificationService.test.ts` (4 testes) e `alarmService.mobile.test.ts` (2 testes), além dos testes existentes (16 testes passando no total). Build de produção Vite gerado com sucesso em 42s com 0 erros e `npx cap sync android` executado com sucesso.

- **Agenda — Restauração das Setas de Reordenação Manual de Compromissos (▲/▼)** (implementado 2026-09-14):
  - **Conexão em `AgendaHub.tsx`**: Reconectado ao motor de `src/agenda/dayOrder.ts` (`compareDayCommitments`, `moveCommitment`, `nextOrderForDay`, `replaceDayInMonth`) e `reorderDayCommitments` em `src/services/agendaService.ts`.
  - **Ordenação em `dayMap`**: Ordenação sistemática dos compromissos de cada data por `compareDayCommitments` (itens com `order` explícito prevalecem sobre legados; legados ordenam por `time` → `createdAt` → `id`).
  - **Gravação de `order` incremental**: `commitAdd` agora calcula `nextOrderForDay` e salva o campo `order` no Firestore e no update otimista local.
  - **Handler `shiftCommitment`**: Atualização otimista imediata no array de meses (`allMonths`) sem travar a interface (`await`), com envio de lote atômico (`writeBatch`) ao Firestore em segundo plano.
  - **Interface & Acessibilidade**: Botões de setas `ChevronUp`/`ChevronDown` visíveis para dias com 2 ou mais compromissos, desabilitados nas pontas (primeiro e último item), estilizados dentro da grade pautada de 28px.
  - **Testes & Validação**: Novos testes unitários dedicados em `AgendaHub.test.tsx` (ausência com 1 item, presença com 2+, desabilitação nas pontas, reordenação otimista e chamada ao Firestore). Suíte completa de 97 testes passando (`dayOrder.test.ts`, `agendaService.test.ts`, `AgendaHub.test.tsx`). Build de produção Vite concluído em 1m 17s com 0 erros.

- **Audit 1 — Global structural audit of entire repository**: 12+ functional areas mapped (src/components/ — 15 subdirs; src/services/ — 22+ services; src/hooks/ — 25+ hooks; src/contexts/ — 6 contexts; src/core/ — 4 subdirs; src/routes/ — 365-line AppRoutes; src/config/ — stripe, nav, constants; src/theme/ — fpiVoiceGuide; src/utils/ — calculations, 321 lines; src/types/ — types; src/firebase/ — config). Financial domain model identified with 4 philosophical axes (Caixa, Pressão, Proteção, Trajetória) traced in code. 8+ business rules identified, 14 in `calculations.ts` line 289 `calculateSovereignBalance` diverges from core engine. Nexus/IA architecture fully documented: 8 backend modules (functions/) + 5+ frontend surfaces (NexusInsightCard, NexusFeed, NexusInlineAdvisor, AiAdvisor, CentralHub Nexus section). Monetization mapped: Free/Pro/Premium in `config/stripePlans.ts`. 26+ test files found across the project. Philosophical coherence confirmed: `fpiVoiceGuide.ts` as single source of truth for all product vocabulary (309 lines). Two lacunas: `derived-state/` subdirs (aggregators, calculators, selectors) completely empty; two frontends (mobile app + web SPA) diverging in some behavior.

- **Audit 2 — Deep surgical audit of sovereign financial core**: No single source of truth — `useSovereignSnapshot` (`src/hooks/useSovereignSnapshot.ts:113`) is the primary orchestrator but `CockpitHero` (`src/components/Home/Cockpit/CockpitHero.tsx:505`) overrides hero value using `transactions.length >= 5` (a criterion absent from the calculation engine). `buildSovereignSnapshot` (`src/utils/calculations.ts:201`) is the central calculation engine, calls `computeSovereignMetrics` (line 157). `calculateSovereignBalance` (line 289) is a parallel dangerous function with different formula (`currentBalance - upcomingInvoices - monthlyFixedExpenses - reserveProvision`) vs core formula (`accumulatedBalance - virtualImpact - pendingBills - protectionShortfall`), used only by Nexus but represents divergence risk. `virtualImpact` has dual semantics: in `aggregateMonthFlow` (line 77) it means `isVirtual` expenses (credit-card-like without cash impact); in `useSovereignSnapshot` (line 91) it means `cardInvoiceRemaining`. `derived-state/` is completely empty (aggregators/, calculators/, selectors/ all empty; `runtime/domain-graph.ts` has `DependencyGraph` class but receives zero nodes — abandoned architecture). 6 calculation inconsistencies between engine and UI documented. Redundant debt bridges: both `DebtContext` and `FinanceContext` call `createDebtRealtimeBridge`.

- **Audit 3 — UX layer, navigation hierarchy, product surfaces audit**: 5 main surfaces mapped (Home/Cockpit, Controla, Central/ExplorarHub, Explorar, Mais). Home/Cockpit is the main surface but has dispersed attention — shows hero value, sovereign buckets, margin trajectory, accounts, card invoices, market data, news, articles, courses, and 3+ Nexus surfaces simultaneously. CentralHub (`src/components/CentralHub.tsx:678`) competes with Home rather than complementing it — re-implements base de proteção, Nexus insights, wealth aggregates. Navigation label inconsistency: `navigation.config.ts` line 35 uses `id: 'explora'` with label `'Explora'` and path `/explora`, while `appPrimaryNav.ts` uses `toolId: 'explorar'` with label `'Explorar'` and `TOOL_ROUTES['explorar']` → `/app/explorar`. No route `/explora` exists — the config is dead code. MobileBottomNav has 5 items (Home, +, Central, Bell, Menu) while desktop PRIMARY_NAV_ITEMS has 4 (Home, Controla, Central, Explorar) — different surfaces between platforms. SettingsPage (`src/components/SettingsPage.tsx:857`) acts as a superficial catch-all for pricing, logout, profile editing, and misc actions. `PRIMARY_NAV_ITEMS` in `appPrimaryNav.ts` uses `isPrimaryNavTool` to filter but many secondary routes are not primary (minhas-dividas, passivos, investimentos, metas, tools).

- **Vocabulário & Calibração de Postura (Frente B)** (implementado 2026-09-11):
  - Substituição de termos alarmistas e agressivos ("Pressão", "Tensão de Caixa") e jargões economês inacessíveis ("discricionárias") por linguagem serena, clara e acolhedora: "Atenção ao Caixa nos Próximos Dias", "Atenção ao Saldo Livre", "gastos não essenciais".
  - Calibração do estágio 1 no `sovereignMap.ts` e `CommandRitual.tsx`: renomeado de "Pressão" para "Atenção no Fluxo".
  - Testes atualizados e passando em `useNexusAdvisorTriggers.test.tsx`, `useNexusEventBridge.test.tsx` e `sovereignMap.test.ts`.

- **Etapa B2 — Experiência Mobile Deslogada & Onboarding dos 4 Pilares** (implementado 2026-09-11):
  - Implementado `<MobilePublicHome />` em `src/components/MobilePublicHome.tsx` para apresentar de forma soberana, elegante e interativa os 4 pilares: **Caixa & Rotina**, **Compromissos**, **Base de Proteção** e **Evolução**.
  - No `AppRoutes.tsx`, quando a plataforma é nativa (`Capacitor.isNativePlatform()`) e o usuário não está logado na rota `/`, renderiza o onboarding nativo mobile com CTAs diretos de "Criar Conta Gratuita" e "Já tenho conta • Entrar". A versão web de `PublicHome.tsx` segue intacta para navegadores desktop/web.
  - Testes unitários dedicados em `src/components/__tests__/MobilePublicHome.test.tsx` (3 testes passando).

- **Etapa B3 — Barra de Navegação Inferior Mobile & Integração** (implementado 2026-09-11):
  - Verificada e validada a barra inferior `MobileBottomNav` com as 5 abas principais do produto: **Central**, **Controla**, **Lançar** (+ flutuante central), **Agenda**, **Explorar** e **Mais** (abre o menu lateral completo `AppMobileDrawer`).
  - Corrigido o disparo do botão "Mais" em `AppLayout.tsx` para abrir suavemente o drawer mobile (`setMobileMenuOpen(true)`).
  - Testes unitários dedicados em `src/components/__tests__/MobileBottomNav.test.tsx` (4 testes passando). Build de produção Vite gerado com sucesso em 1m 34s sem nenhum erro.

- **Modernização Premium dos Cursos & Trilha Investidor Soberano** (implementado 2026-09-12):
  - **Conteúdo de Rigor CFP® & Grupo Primo**: Reescrita integral dos 6 módulos do curso de investimentos.
    - *Passo 0 (Inquestionável)*: Proibição matemática de investir devendo juros altos (rotativo a 440%+ a.a. e cheque especial a 130%+ a.a.). Estudo de caso do "Investidor Iludido" vs "Estrategista Soberano".
    - *Passo 1 (Base de Proteção Calibrada)*: Reserva de emergência calculada estritamente sobre o **Custo de Vida Essencial**, calibrada por estabilidade de renda: **Concursado (6 meses)**, **CLT Privada (9 meses)** e **Autônomo/PJ (12 meses)**. Regras inegociáveis de 100% liquidez diária (Tesouro Selic e CDB 100% CDI com FGC) e volatilidade zero.
    - *Tríade Sagrada & Juros Compostos*: Aporte + Tempo + Taxa. As 3 fases da bola de neve exponencial e o ponto de inflexão da riqueza.
    - *Renda Fixa & IPCA+*: Devedor vs credor, tabela regressiva de IR (22,5% a 15%) e proteção contra a inflação histórica.
    - *Renda Variável & FIIs*: Mentalidade de dono em empresas perenes, proventos mensais isentos em FIIs e o "Número Mágico".
    - *Antifragilidade & 4 Motores (inspirado no método ARCA)*: Caixa, IPCA+, Ações/FIIs Brasil e Dólar/ETFs Internacionais (IVVB11/WRLD11), rebalanceamento por novos aportes e checklist soberano.
  - **Novos Blocos no LMS**: Criados `<CaseStudyBlock />` (cenários comparativos com badges visuais e takeaway) e `<PrincipleBlock />` (princípios fundamentais solenes em tema dark editorial).
  - **Arquitetura Visual & Responsividade**: Fim do `max-w-lg` espremido em desktop. `<CourseTrackPage />` com grid de 2 colunas e card de comando do aluno; `<ModuleOverviewPage />` amplo; `<LessonPage />` com split LMS e sidebar de navegação de aulas no desktop + drawer tátil no mobile.
  - **Persistência Real no Motor de Progresso**: `useCourseProgress.ts` agora persiste em `localStorage` (`fpi_course_progress_${slug}`), calcula percentuais reais dinamicamente a partir de `coursesRegistry` e gerencia desbloqueio de badges/insígnias. Testes automatizados passando (4/4 em `useCourseProgress.test.ts`).

- **Frente C — Inteligência do Nexus & Conexão com a Agenda** (implementado 2026-09-11):
  - Criado o hook de consulta com cache reativo `useUpcomingCommitments.ts` conectado ao React Query (`queryKeys.agenda.upcoming`).
  - `useNexusAdvisorTriggers.ts` enriquecido para receber os compromissos da Agenda e gerar alertas discretos e antecipatórios para os próximos 7 dias (`Compromisso na sua Semana` ou `X Compromissos na sua Semana`).
  - O gatilho incentiva organização prévia dos horários e direciona diretamente para a Agenda via CTA `Ver Agenda` (`deepLink: 'agenda'`), cumprindo a postura de consultor CFP® que antecipa a rotina sem afobação.
  - Conectado em `AppLayout.tsx` e validado com testes unitários em `useNexusAdvisorTriggers.test.tsx` (7 testes passando) e build de produção Vite (1m 8s, 0 erros).

- **Command Ritual implementation** (implemented 2026-06-29): New `<CommandRitual>` component at `src/components/Home/CommandRitual.tsx` — compact session-briefing card rendered at top of `HomeMainColumn.tsx`. Answers 4 ritual questions in sequence: **Posição** (stage name + delta from last visit via localStorage), **Atenção** (Nexus insight title or first blocker), **Comando** (stage's next step). Delta tracking uses single localStorage key `fpi-comando-prev-stage` — no new infrastructure. Exiting cards (`SovereignMapCard`, `NexusInsightCard`) kept as detailed reference below. Total addition: 1 component (~50 lines), 3 lines in HomeMainColumn.

- **Phase 7 aterragem operacional** (implemented 2026-06-29): Added `COMMAND_ACTIONS` mapping in `CommandRitual.tsx` — each stage's comando now has a CTA button navigating to the real product destination (manager, central, investimentos, or transaction form). No new infrastructure.

- **Phase 8 — retention by continuity** (implemented 2026-06-29): Added metric-level session bridge in `CommandRitual.tsx`. Stores `{ freeBalance, shortfall, launchCount, date }` in localStorage key `fpi-comando-prev-metrics`. Shows "Histórico" line on return with days since last visit + most relevant metric changes (folio delta, protection progress, new transactions). Continuity displayed as: `"Desde 3d: +R$ 800 na folga · proteção avançou R$ 500"` or `"Sessão retomada hoje"`.

- **Invoice period-end link + optimistic cache** (implemented 2026-07-01):
  - Added `linkedInvoicePeriodEnd` / `linkedInvoiceId` to Transaction type and saved in `payInvoiceService.ts:72-77`
  - Changed `invoiceGeneratorService.ts:73-80` to match billPayments by explicit `linkedInvoicePeriodEnd` instead of date window, eliminating boundary misassignment
  - Added initial sync on mount in `useInvoiceSync.ts:61-69` to reconcile legacy stored invoices
  - Added `queryClient.setQueryData` in `useTransactions.ts` after save (line ~536), edit (~353), and delete (~667) — makes new items appear in the list instantly without waiting for the RTDB bridge (fixes 20-50s save delay)
  
- **Optimistic UI — save/delete instantâneo** (implemented 2026-07-01):
  - Moved `setQueryData` to **antes de qualquer await** em `saveLancamento` e `deleteLancamento`
  - Card/debt reactions movidos para background (`async` fire-and-forget dentro de `backgroundOp`)
  - Save: `setQueryData` executado imediatamente após `push()`, antes de `updateCard`/`updateDebt`/`set()`
  - Delete: `setQueryData` executado imediatamente, antes das reversões e do `remove()`
  - Rollback: se `set()`/`remove()` falhar, o cache é desfeito (remove ou restaura o item)
  - Installments: todas as keys geradas no topo, `setQueryData` com array completo, `Promise.all` em background
  
- **Caller do save — modal fecha imediatamente** (implementado 2026-07-01):
  - `AppLayout.tsx:226`: `await saveLancamento()` → `handleCloseModal()` + `saveLancamento().then(...).catch(...)`
  - Modal fecha antes do Firebase write, toasts de sucesso no `.then()`, toast de erro no `.catch()`
  - `sovereignFreeBalance` capturado antes do close (mesmo valor que antes, bridge já era pré-save)

- **AgendaHub — scroll cirúrgico** (implementado 2026-08-11):
  - Sinal da compensação corrigido: `scrollContainerBy(sc, shift)` (positivo = desce a view quando os meses foram pré-inseridos no topo; antes `-shift` invertia a direção)
  - Debounce com teto anti-starvation: novo `EXTEND_CEILING_MS = 300` + função pura `nextFlushDelay(lastScheduleAt, now, debounceMs, ceilingMs)` — `scheduleExtendFlush` não reinicia um timer já pendente (reiniciar a cada evento de scroll faria o flush nunca disparar em scroll contínuo) e dispara imediatamente (delay 0) quando o teto é excedido
  - `flushPendingExtends` reordenado via helper puro `resolveFlushDirection(pending, suppress, allowed)`: lê `pending` primeiro; sem direção → não faz nada; cooldown ativo → bloqueia SEM zerar `pending` (direção preservada para a próxima oportunidade); só zera quando realmente estender ou em `suppress`
  - Helpers exportados (`nextFlushDelay`, `resolveFlushDirection`, `scrollContainerBy`) + 13 novos testes; 52 testes no arquivo passam, tsc e eslint sem erros

- **Agenda — refatoração leve (helpers de mês + scroll)** (implementado 2026-08-11):
  - Novo `src/agenda/monthMath.ts` (puro, sem DOM/React): `shiftMonth(year, month, offset)` (cruzamento de ano via `year*12+month+offset`), `monthsBetween(fromYear, fromMonth, toYear, toMonth)`, `monthKey(year, month)` (`${year}-${month}`)
  - Novo `src/agenda/scrollContainer.ts`: `resolveScrollContainer`, `scrollContainerBy`, `scrollContainerViewport` movidos intactos de AgendaHub
  - `AgendaHub.tsx` agora importa os helpers; removidas as definições duplicadas de scroll e TODOS os loops inline de ajuste de mês (`while (nm < 0)`/`while (nm > 11)` em init do stream, load effect, pruneDistantMonths, extendForward/Backward, goPrev/NextMonth, calGoPrev/Next, reloadData)
  - Testes: `src/agenda/__tests__/monthMath.test.ts` (11) + `scrollContainer.test.ts` (6); suíte Agenda = 69 testes passando; tsc e eslint sem erros (3 warnings pré-existentes). Falhas da suíte global (Onboarding/ActiveReservesCard/nexusGoals/streakUtils) são pré-existentes e sem relação com a Agenda
  - Sem mudança de comportamento/visual — base para extrair o hook de infinite scroll em prompts seguintes

- **Agenda — extração do hook de infinite scroll** (implementado 2026-08-11):
  - Novo `src/agenda/activeMonth.ts` (puro): `pickActiveMonth(sections, referenceY)` + `MonthSectionRect`/`YearMonth` movidos intactos de AgendaHub
  - Novo `src/agenda/useInfiniteMonthScroll.ts` (o motor completo de scroll): recebe `{ notebookRef, monthHeaderRef, monthStream, activeMonth, initialLoading, onActiveMonthChange, onExtendForward, onExtendBackward, onPruneDistantMonths }` e devolve `{ captureScrollAnchor, suppressAutoExtendRef }`; concentra resolução do scroller, listener de scroll (rAF + debounce/ceiling), flush de extensão, compensação de posição por âncora, interlock contra scroll sintético, poda pós-extensão e poda pós-navegação (novo `useEffect` no hook)
  - Constantes movidas (`EXTEND_DEBOUNCE_MS`, `EXTEND_CEILING_MS`, `EXTEND_MAX_MONTHS_PER_FLUSH`, `EXTEND_MIN_INTERVAL_MS`, `SCROLL_INTERLOCK_MS`, `SCROLL_ANCHOR_TTL_MS`, `SCROLL_SETTLE_MS`, `BUFFER`) + helpers puros (`isExtendAllowed`, `isProbeInterlocked`, `nextFlushDelay`, `resolveFlushDirection`) agora exportados do hook
  - `AgendaHub.tsx` reduzido ~200 linhas: chama o hook uma vez (após `extendForward`/`extendBackward`/`pruneDistantMonths`); `goPrevMonth`/`goNextMonth`/`goToDate`/`goToday` passam a usar `captureScrollAnchor`/`suppressAutoExtendRef` do hook; re-exporta `pickActiveMonth` e os helpers (imports do teste antigo continuam válidos); removidos todos os refs/layout effects/efeito de scroll locais
  - Testes: suíte Agenda = 69 testes passando (3 arquivos); tsc sem erros nos arquivos da Agenda; eslint só com os 3 warnings pré-existentes
  - Sem mudança de comportamento/visual

- **Agenda — auditoria da extração + correções + testes do hook** (implementado 2026-08-11):
  - **Correção de escopo (falha do ponto 5)**: as 4 consultas globais `document.querySelectorAll('[data-month-section]')`/`querySelector` em `useInfiniteMonthScroll.ts` (`captureScrollAnchor`, efeito de compensação da âncora, `flushPendingExtends`, `probe`) passaram a ser escopadas a `notebookRef.current` via helper local `monthSections(root)` — em páginas com mais de uma agenda (ou elementos simulados), apenas o caderno fornecido ao hook influencia o motor
  - **Correção de vazamento (ponto 4)**: os `setTimeout` de navegação de `goToDate`/`goToday` em `AgendaHub.tsx` (80ms + aninhado 2000ms de reset do `suppressAutoExtendRef`) agora são rastreados em `navTimersRef` e cancelados num `useEffect` de cleanup — não disparam scroll/supressão em caderno desmontado
  - **Consolidação de tipo**: `interface YearMonth` duplicada em `activeMonth.ts` removida — agora importa de `monthMath.ts` (fonte única)
  - **Testes reais do hook**: novo `src/agenda/__tests__/useInfiniteMonthScroll.test.tsx` (9 testes) cobrindo (1) registro/remoção do listener `scroll` no container resolvido, (2) cleanup de `setTimeout` de flush pendente (`fake timers` + `vi.getTimerCount()`) e de `requestAnimationFrame` pendente (stub de rAF), (3) compensação com `scrollContainerBy(sc, shift)` para shift positivo e negativo (falharia se trocado para `-shift`), (4) `suppressAutoExtendRef` ativo não dispara extensão (com controle positivo), (5) `onActiveMonthChange` não chamado para o mesmo mês e chamado uma vez para outro mês, (6) seções externas ao notebook não interferem (decoy `2099-6` fora do notebook é ignorada). `scrollContainerBy` mockado via `vi.mock('../scrollContainer')` para observar a direção exata
  - Compensação confirmada sem `-shift` (`scrollContainerBy(sc, shift)` com `shift = newTop - anchor.top`); `AgendaHub` chama o hook uma única vez e usa só a API pública (`captureScrollAnchor` + `suppressAutoExtendRef`)
  - Validação: suíte Agenda = 78 testes passando (4 arquivos); tsc sem erros nos arquivos da Agenda; eslint só com os 3 warnings pré-existentes (nenhum erro novo)
  - Sem alteração nas regras de direção/buffer/extensão/debounce/ceiling/cooldown/poda; sem mudança de comportamento/visual

- **Agenda — direção física única + pendência única + buffer proporcional + deadline por burst** (implementado 2026-08-11):
  - Novo helper `getScrollContainerOffset(container)` em `src/agenda/scrollContainer.ts` (fonte única da direção física: `scrollTop` no HTMLElement, `window.scrollY` na janela)
  - Direção derivada do delta de offset entre dois eventos de scroll consecutivos (`offset++ = forward`, `offset-- = backward`); `lastScrollOffsetRef` é SEMPRE atualizado (inclusive em scrolls de compensação/interlock/suppress) ANTES de qualquer retorno — o próximo scroll manual é classificado contra o offset real
  - Pendência única: `pendingExtendRef: ScrollDirection | null` substitui `{ fwd, back }`; a última direção real vence; um flush processa no máximo UMA direção (`forward` XOR `backward`, nunca juntas). `resolveFlushDirection(pending, suppress)` sem o parâmetro `allowed`/cooldown
  - `probe(direction)` dirigido: só avalia a borda compatível com a direção (inferior p/ forward, superior p/ backward); `direction === null` nunca agenda extensão; mês ativo continua sendo atualizado em qualquer direção
  - Buffer proporcional: novo helper puro `getExtendBuffer(viewportHeight) = max(400, min(1200, round(vh * 1.25)))` substitui o `BUFFER` fixo de 3000px
  - Deadline real por burst: `extendBurstStartedAtRef` marca a PRIMEIRA intenção pendente; cada reagendamento usa `nextExtendDelay(now, burstStartedAt, debounce, ceiling) = max(0, min(now+debounce, burstStartedAt+ceiling) - now)`; o flush nunca é adiado além do teto do burst; cleanup no unmount limpa timer, rAF, pendência E burst
  - Removidos: `BUFFER` (fixo), `EXTEND_MIN_INTERVAL_MS`/`isExtendAllowed`/`lastExtendAtRef` (cooldown — o interlock de compensação já quebra o loop) e `nextFlushDelay`/`extendLastScheduleAtRef` (substituídos pelo deadline por burst)
  - Re-export do `AgendaHub.tsx` atualizado: `isProbeInterlocked, nextExtendDelay, resolveFlushDirection, getExtendBuffer`
  - Testes: `getScrollContainerOffset` (HTMLElement + window), `getExtendBuffer` (mínimo/intermediário/teto), forward perto da borda inferior só chama `onExtendForward`, backward perto da borda superior só chama `onExtendBackward`, troca rápida de direção (a última vence), scroll contínuo (flush dentro de `EXTEND_CEILING_MS`), interlock/suppress (offset atualizado sem extensão; próximo scroll manual classificado), um flush nunca chama forward+backward juntos. Suíte = 87 testes passando (4 arquivos); tsc sem erros nos arquivos da Agenda; eslint só com os 3 warnings pré-existentes

- **Agenda — extensão atômica + poda separada do flush** (implementado 2026-08-11):
  - `monthMath.ts` agora é a fonte única de `ScrollDirection` (movido de `useInfiniteMonthScroll.ts`, que re-exporta); novos helpers puros `extendMonthStream(stream, direction, count)` (extensão atômica forward/backward com count normalizado, ordem cronológica, sem duplicatas, mesma referência quando nada muda) e `hasDistantMonths(stream, active, maxDistance)` (mesma regra da poda: `abs(monthsBetween) > maxDistance`)
  - Contrato do hook trocado: `onExtendForward`/`onExtendBackward` → **`onExtendMonths(direction, count)`** — uma ÚNICA chamada por flush com a contagem explícita (1..`EXTEND_MAX_MONTHS_PER_FLUSH`); o count é derivado da borda compatível com a direção no `flushPendingExtends`; sem gap real o flush não captura âncora nem chama o callback
  - **Poda separada do flush**: removido o `onPruneDistantMonths` síncrono do final do flush; nova `maybePruneDistantMonths` (guarda settle `SCROLL_SETTLE_MS`/interlock/`hasDistantMonths`) chamada por timer pós-settle (`schedulePruneAttempt` reagendado a cada evento de scroll, `pruneTimerRef`) e pelo efeito de navegação (`activeMonth` mudou); `monthStreamRef` novo para leitura do stream atual dentro do timer; cleanup do unmount também limpa `pruneTimerRef`
  - `AgendaHub.tsx`: `extendForward`/`extendBackward` substituídos por `extendMonths(direction, count)` usando `extendMonthStream`; imports de `monthKey`/`monthsBetween`/`shiftMonth` mantidos (poda + seed do stream)
  - Testes: `monthMath.test.ts` ganhou 9 testes de `extendMonthStream` (forward/backward, fronteira de ano, duplicatas, mesma referência, stream vazio, não-mutação) + 4 de `hasDistantMonths` (25 no total); hook test atualizado para `onExtendMonths` com count exato (forward/backward/troca/interlock) + novos blocos: "extensão atômica" (count=4 chama UMA vez; sem gap não captura âncora; âncora capturada ANTES do callback com compensação 200px) e "poda separada do flush" (extensão não dispara poda no mesmo ciclo; poda só após settle e UMA vez; scroll novo reinicia o timer; sem meses distantes não chama nem captura âncora). Suíte Agenda = 108 testes passando (4 arquivos: 58 agenda + 50 AgendaHub); tsc sem erros nos arquivos da Agenda; eslint limpo em `src/agenda/` (só os 3 warnings pré-existentes em AgendaHub)
  - Observação de teste: `vi.useFakeTimers()` no vitest inicia o relógio no epoch atual, então o efeito de navegação no mount (poda com meses distantes) dispara — os testes de poda zeram o mock via `mockClear()` após `setup` para isolar o ciclo de scroll

- **Agenda — harness dev + protocolo de validação manual do scroll** (implementado 2026-08-11):
  - Novo `dev-agenda.html` (raiz, página dev-only servida por `vite dev` em `/dev-agenda.html`; NÃO entra no build — o input default do Vite é só `index.html`) + `src/dev/agendaHarness.tsx`
  - Harness: monta `<AgendaHub seedCommitments={seed}>` com usuário fake (`uid: 'dev-harness'`) via `AuthContext.Provider` inline + `ToastProvider` real + `MemoryRouter` (o guard do render é `!userId` → precisa de user não-nulo para o caderno aparecer; `AgendaHub.tsx:979`); `initialLoading` desliga no `.finally()` do efeito de carregamento mesmo em modo seed (`AgendaHub.tsx:273-286`)
  - Seed determinístico em memória (`buildSeed`): 21 meses (hoje ±10) × 2 selos com o nome do mês no título (`Selo Março 2026 · marco A (dia 5)`) + 1 título multilinha no mês seguinte a hoje; total 43 compromissos — toda extensão da DOM fica visível pelos marcadores
  - HUD de observação (canto inferior direito, só na página dev): `Meses na DOM` (contagem de `[data-month-section]`) + `Mês ativo` (`agenda-month-label`); esperado 5 seções no início e ≤7 após poda (ativo ±3)
  - **Sem instrumentação de debug**: nenhuma query string de debug nem mudança no código de produção; a validação é auto-evidente (marcadores + HUD); os `console.log` DEV de `AgendaHub.tsx:219,222` são pré-existentes
  - Novo `docs/agenda-scroll-validation.md`: protocolo manual de 10 passos (estado inicial, extensão forward/backward, scroll contínuo anti-starvation, troca de direção, mês ativo, poda pós-settle, buffer proporcional, multilinha, navegação programática) com critérios de falha e citações de arquivos/linhas; justifica o manual porque o vitest é `jsdom` e **não há browser runner** (sem Playwright/Cypress instalados; `@vitest/browser-*` no lock são peer opcionais)
  - Validação: tsc sem erros; eslint `--max-warnings 0` limpo em `src/dev/` (harness sem console.log — só `textContent` do HUD); suíte Agenda inalterada (108 testes)

- **Agenda — correção navegação por mês (navigateToMonth)** (implementado 2026-08-11):
  - **Causa raiz**: `goPrevMonth`/`goNextMonth` (`AgendaHub.tsx`) atualizavam `activeYear`/`activeMonth` (rótulo do cabeçalho) e o stream, mas NUNCA rolavam o caderno até a seção do mês alvo — o cabeçalho mudava, a folha pautada ficava parada. O antigo `captureScrollAnchor()` ainda *preservava* a posição anterior
  - **Fluxo centralizado**: novo `navigateToMonth(year, month)` — (1) ativa `suppressAutoExtendRef` temporariamente (release via timer em `navTimersRef`, `MONTH_NAV_SUPPRESS_MS = 500`); (2) `ensureMonthLoaded`; (3) garante o mês no stream via helper puro `withMonthInStream` (ordem cronológica, sem duplicar, mesma referência se já existe; reutilizado no `goToDate`); (4) `setActiveYear/Month`; (5) registra intenção `pendingMonthNavRef`
  - **Scroll pós-render**: `useLayoutEffect` (deps `monthStream/activeYear/activeMonth/initialLoading`) lê a intenção, localiza a seção DENTRO de `notebookRef` via `[data-month-section="${monthKey}"]`, faz `scrollIntoView({ block: 'start', behavior: 'smooth' })` e SÓ ENTÃO limpa a intenção; se a seção ainda não existe (loading), mantém a intenção e re-tenta no próximo render — sem `setTimeout` frágil para aguardar render
  - **Cabeçalho fixo**: `scroll-mt-[96px] md:scroll-mt-16` direto no elemento `data-month-section` (mobile 2 linhas / desktop 1 linha) — sem offsets manuais competindo com o smooth
  - **goPrevMonth/goNextMonth** refatorados para apenas `shiftMonth(activeYear, activeMonth, ∓1)` + `navigateToMonth`; viradas de ano (Jan↔Dez) corretas por `shiftMonth`
  - **Não alterados**: `useInfiniteMonthScroll` (arquitetura, direção, buffer, ceiling, flush, extensão atômica, poda, interlock, offset de referência), `goToDate`/`goToday` (continuam navegação ao dia, cleanup de `navTimersRef` no unmount preservado)
  - **Testes**: +9 em `AgendaHub.test.tsx` (próximo/anterior com seção+`block:'start'`, virada de ano Dez→Jan e Jan→Dez, alvo já no stream sem duplicar, alvo fora do stream, "não rola até a seção renderizar" via promise controlada, `scroll-margin-top` responsivo, cleanup de timer pós-unmount via recorder de `scrollIntoView`); suíte Agenda = 117 testes passando (4 arquivos); tsc sem erros nos arquivos alterados; eslint com 0 erros (só os 3 warnings pré-existentes de AgendaHub)

- **Nexus Agenda — interpretação robusta + alarme/anotação na confirmação** (implementado 2026-08-12):
  - **Prompt exclusivo do Nexus Agenda** (standalone, NÃO toca o prompt principal do Nexus): `buildSystemPrompt` em `functions/nexusAgendaInterpret.ts:122` reescrito com persona/escopo/redirecionamento educado, fluxo de confirmação antes de qualquer alteração, pergunta de alarme/anotação feita pelo produto (não pelo LLM), e orientações de extração (recorrência semanal, fim de período → `until.expression`, participantes, duração). Diz explicitamente: saída é SEMPRE o envelope JSON estrito
  - **Motor de datas extendido** (`functions/nexus-core/agenda-time.ts`): `WEEKDAY_NAMES` agora inclui plurais (`segundas`, `tercas-feiras`, `tercas`, …); novos helpers puros `lastDayOfMonthYmd` + `monthEndToYmd`; `resolveDateExpression` ganha regras de fim de período (`fim de setembro`, `o fim de setembro`, `até o fim de setembro`, `fim do mês [que vem]`), regra de mês puro (`até dezembro` → último dia de dezembro) e prefix-strip ampliado (`na|no|em|para|dia|aos|as|ate`). Comando real agora resolve: "toda terça feira 18h até o fim de setembro" → 7 terças (18/08…29/09/2026)
  - **Parsing robusto** (`nexusAgendaInterpret.ts`): novo `extractJsonEnvelope` (remove cercas ```json, recorta do primeiro `{` ao último `}`), `tryParseEnvelope` (parse direto → `jsonrepair` → parse do reparo), retry com os ERROS REAIS de schema (`Envelope não é um JSON válido.`, etc.) em vez de mensagem genérica, `callModel` lança em contingência (`isContingency`) e `maxTokens` 700→1000
  - **Resumo empático** (`buildSummary`): "Entendi! Vou agendar \"…\" — 7 compromissos às 18:00, de 18/08/2026 a 29/09/2026. Você prefere ativar o alarme ou apenas anotar? Confirma assim?"
  - **Alarme/anotação no commit** (`functions/nexusAgendaCommit.ts`): `CommitRequest.alarm?: boolean` (validado — não-booleano → `invalid-argument`); `buildCommitDocuments(..., alarm)` grava `alarmAt` em cada ocorrência (timestamp do dia no fuso SP + startTime; meia-noite sem horário) só quando `alarm === true`
  - **Frontend**: `useAgendaNexus.commit(token?, { alarm })` envia `alarm: true` somente quando ativado; `AgendaNexusAssistant` ganhou fieldset "Alarme" (radios "Ativar alarme"/"Apenas anotar", default "Apenas anotar", resetado a cada nova proposta) renderizado só quando há proposta confirmável; confirmação envia a escolha
  - **Testes**: novo `functions/__tests__/agenda-time.test.ts` (17: fim de período, mês puro, plurais, 7 terças de `expandRecurrence`, fuso estável); `nexusAgendaInterpret.test.ts` +6 (comando completo → 7 ocorrências/status `awaiting_confirmation`/sem commit, recálculo do fim de mês pelo backend, cercas de markdown, retry com erros de schema, contingência → indisponível); `nexusAgendaCommit.test.ts` +3 (alarmAt nas ocorrências, ausência sem alarm, não-booleano rejeitado); `useAgendaNexus.test.tsx` +2 e `AgendaNexusAssistant.test.tsx` +3 (escolha de alarme no commit)
  - **Validação**: `npm --prefix functions run build` (tsc) sem erros; backend 51 testes (17+18+16) e frontend 35 testes passando; eslint limpo nos arquivos alterados do `src/`; tsc sem erros novos nos arquivos alterados (TS6133 de AppHeader/AppMobileDrawer etc. são pré-existentes)
  - **Deploy**: `firebase deploy --only functions:nexusAgendaInterpret,functions:nexusAgendaCommit` (pode exigir 1-2 tentativas por timeout de `User code failed to load`); revalidar preflight `curl -i -X OPTIONS …/nexusAgendaInterpret` → `204`

- **Nexus Agenda — fluxo "Plano → Aprovação → Execução" para exclusão em massa** (implementado 2026-08-13):
  - **Schema** (`functions/nexus-core/agenda-intent-schema.ts`): novo `agendaFilterSchema` (`{field: 'title'|'date', value}`), entidade `filter` em `entitiesSchema`, validação de delete agora aceita `title` OU `date` OU `filter` — data não é mais obrigatória para exclusão ("Preciso excluir todos os compromissos com o nome '…'")
  - **Interpret** (`functions/nexusAgendaInterpret.ts`): `searchByTitle` na interface `AgendaReader` + implementação Firestore (`orderBy date desc`, limite `MAX_DELETE_SCAN = 5000`, `normalizeTitle` em memória); `AgendaAffectedItem` + `AgendaRecap` com `matchCount`/`affectedItems`/`truncated`; `resolveDeleteTargets` (título / título+data via `saoPauloDayRangeMillis` / só data via `onDay` / `filter`); ramo `delete` em `orchestrateAgendaInterpret` SEM o gate de data, gravando `targets` no pending doc (`MAX_DELETE_TARGETS = 500`); prompt do sistema documenta exclusão por título sem data
  - **Commit** (`functions/nexusAgendaCommit.ts`): dependência `deleteBatch`; `buildCommitDocuments` → `buildCreateDocuments` + dispatcher `buildExecutionPlan`; exclusão re-verifica existência via `existingIds` e apaga só os existentes (`idsDeleted` no `CommitResult`/audit; `before` = metadados dos alvos, `after: null`); sem alvos → "A proposta de exclusão não possui alvos gravados."; nenhum existente → falha; falha de batch → status `partial`
  - **Hook** (`src/hooks/useAgendaNexus.ts`): `AgendaNexusAffectedItem`, proposta com `matchCount`/`affectedItems`/`truncated`, `commitResult` com `intent`/`idsDeleted`; `proposalIntentRef` setado no interpret e limpo em reset/cancel; `canUndo`/`undoContract` SOMENTE para intent `create` (delete não oferece desfazer)
  - **UI** (`src/components/Agenda/AgendaNexusAssistant.tsx`): `formatPreviewDate` (fuso SP) + `DeleteItemsPreview` (lista estilizada `aria-label="Itens que serão excluídos"`); botão "Confirmar exclusão"; fieldset de alarme oculto no delete; sucesso "Pronto! N compromissos excluídos..." com nota quando `matchCount` > `idsDeleted.length` ("N compromissos não foram encontrados na agenda")
  - **Testes**: interpret +5 (proposta por título sem data, 0 matches → clarification, escopo título+data, prioridade de `filter`, exclusão só por data via `onDay`); commit +5 (lote com `idsDeleted`, ignora alvos inexistentes, nenhum existente → falha, parcial com batch falhando, retry idempotente); schema +3 (delete por título, delete por `filter`, `filter.field` fora do enum rejeitado); hook +1 e assistant +3 (plano delete com preview/confirmar sem alarme, sucesso sem desfazer, nota de não-encontrados)
  - **Validação**: `npm --prefix functions run build` (tsc) sem erros; backend 121 testes (6 arquivos) e frontend Agenda 97 testes (5 arquivos) passando; eslint `--max-warnings 0` limpo nos 4 arquivos alterados do `src/`; tsc `--noEmit` sem erros novos

- **Nexus Agenda — Camada de Intenção e Diálogo (Plano + Refinamento)** (implementado 2026-08-13):
  - **Schema** (`functions/nexus-core/agenda-intent-schema.ts`): novas entidades `entities.limitDate` (dateResolutionSchema, p.ex. "até o dia X" / "nos próximos 5 dias") e `entities.maxSlots` (booleano, p.ex. "no limite da agenda"); validação `maxSlots: true` exige `recurrence`; strict rejeita tipo errado
  - **Motor de datas** (`functions/nexus-core/agenda-time.ts`): novo helper puro `resolveWindowExpression(raw, today): string | null` — "nos próximos N dias/semanas/meses", "próxima semana", "2 semanas", "1 mês"; null quando não reconhece (nunca inventa prazo)
  - **Interpret** (`functions/nexusAgendaInterpret.ts`): `buildSystemPrompt` reescrito com persona direta + script verbatim de redirecionamento para fora de escopo ("Você está fugindo das minhas atribuições delegadas…"); refinamento ativo: `AgendaRefinement` + `detectRecurrenceAmbiguity` (create + recurrence + SEM until/limitDate/maxSlots → pergunta de refinamento via `RECURRENCE_REFINEMENT_QUESTION` + sugestões `['Até o final do ano', 'Sem prazo máximo']`, sem default silencioso de 180 dias); `normalizeEnvelopeDates` resolve `limitDate` via `resolveWindowExpression` com fallback `resolveDateExpression`; expansão com precedência `until ?? limitDate ?? (maxSlots ? undefined : horizonte)`; `occurrenceCount === 0` → clarification; aviso truncado "A agenda foi preenchida até o limite de N compromissos."; **materialização**: quando `limitDate`/`maxSlots` dirigem a expansão sem `recurrence.until`, o envelope gravado ganha `recurrence.until = { expression, resolved: lastDate, confidence: 'high' }` para o commit re-expandir a MESMA série (senão expandiria até `MAX_COMMIT_OCCURRENCES = 800`); `buildSummary` com sufixo ", até o limite máximo da agenda"
  - **Hook** (`src/hooks/useAgendaNexus.ts`): novo estado `refinement` (`AgendaNexusRefinement`) exposto; `dialogueHistoryRef` acumula `{ user, assistant }` a cada clarificação (pergunta = `refinement.question ?? ambiguous[0] ?? questions[0]`), enviado como `history` na próxima chamada, limpo em resposta não-clarificação e em reset/cancel; backend `buildMessages` fatia as últimas 6 mensagens
  - **UI** (`src/components/Agenda/AgendaNexusAssistant.tsx`): painel "Refinando informação" (role="status", bolha com a pergunta + chips de sugestão que preenchem o input e chamam interpret); listas clássicas de clarificação só quando não há refinement; badge "Aguardando confirmação" no card de proposta
  - **Testes**: agenda-time +6 (janelas de "nos próximos N", "próxima semana", "2 semanas", "1 mês", null); schema +6 (limitDate aceito, maxSlots com/ sem recurrence, tipos errados rejeitados); interpret +7 (refinamento por recorrência sem horizonte, sem refinamento quando until presente, limitDate como teto da série + materialização do until, maxSlots preenche 366 + aviso truncado, data após limite → clarification, limitDate irresolvível → clarification, redirect verbatim fora de escopo, histórico enviado ao roteador); hook +3 (refinamento + acumulação de histórico, histórico limpo após proposta, refinement limpo em reset/cancel); assistant +3 (painel/chips, listas clássicas, badge "Aguardando confirmação")
  - **Validação**: `npm --prefix functions run build` (tsc) sem erros; backend 141 testes (6 arquivos) e frontend Agenda 103 testes (5 arquivos) passando; eslint `--max-warnings 0` limpo nos 4 arquivos alterados do `src/`; tsc `--noEmit` sem erros novos (TS2571 pré-existente em `functions/__tests__/nexusAgendaInterpret.test.ts:355` herdado do commit `4cb011a`)

- **Nexus Agenda — UI de Diálogo Contínuo (Modo de Diálogo)** (implementado 2026-08-13):
  - **Hook** (`src/hooks/useAgendaNexus.ts`): novo estado `dialogue: AgendaNexusHistoryMessage[]` exposto (espelho do `dialogueHistoryRef`); sincronizado em `reset`/`cancel` (→ `[]`), em resposta com clarificação com `refinement` (→ thread empilhada `[...dialogueHistoryRef.current]`) e com proposta (→ `[]`); clarificações clássicas sem `refinement` mantêm `dialogue: []` (listas amber intactas); estado NÃO é limpo no start do `interpret`, então a thread permanece visível durante o `interpreting`/`resolving_dates` (sem "piscar" entre perguntas)
  - **UI** (`src/components/Agenda/AgendaNexusAssistant.tsx`): `isDialogueMode = dialogue.length > 0`; bloco de bolhas de chat `role="status"`/`aria-live` com header "Diálogo com o Nexus" (ícone `MessageCircle`), mensagens do usuário à direita (`bg-sky-100`) e do Nexus à esquerda (`border-sky-200 bg-sky-50`); chips de sugestão abaixo da última bolha (reúso de `handleSuggestion`, que preenche o input e dispara `interpret`); listas clássicas renderizadas só com `stage==='clarify' && !isDialogueMode`; placeholder condicional `'Digite sua resposta ou complemente a informação...'` no modo diálogo; botão `Responder` no modo diálogo / `Enviar` fora dele; `setInput('')` após `await nexus.interpret(...)` em `handleSubmit` e `handleSuggestion` (comportamento de chat)
  - **Testes**: hook +3 (thread exposta/limpa após proposta, empilhamento de múltiplas trocas, clássica sem refinement → `[]`); assistant +3 e 1 atualizado (bolha + chips + header, placeholder/botão condicionais, mini-histórico empilhado, saída do modo diálogo em proposta, listas clássicas intactas)
  - **Validação**: `npx vitest run` nos arquivos alterados → 51 testes; suíte Agenda + hook → 119 testes passando; eslint `--max-warnings 0` limpo nos 4 arquivos alterados; tsc `--noEmit` sem erros novos

### Done
- **nexusAgendaCommit — sanitizador Firestore + retorno amigável** (implementado 2026-08-13):
  - **Causa raiz do erro 500**: em operações de delete, `seriesId` (e o `result` correspondente em `finalizePending`) ficavam `undefined` e eram gravados direto nos documentos de auditoria — o Firestore rejeita `undefined` com `Value for argument "data" is not a valid Firestore document.` O erro ocorria dentro do próprio bloco catch de `executeAgendaCommit` (a segunda `writeAudit` de falha também continha `undefined`), gerando `Unhandled error`.
  - **Novo `sanitizeForFirestore(value)`** em `functions/nexusAgendaCommit.ts` (puro, exportado): recursivo sobre objetos/arrays; `undefined → null`; `Date` inválido → `null`; `Date` válido preservado; **`Timestamp` do Firestore preservado intacto** (`instanceof Timestamp` antes de iterar).
  - **Aplicado em todas as gravações** de `buildFirestoreDependencies`: `transaction.update` do `claimPending`, `batch.set` do `writeBatch`, `update` do `finalizePending`, `set` do `writeAudit`. Cast `as Record<string, unknown>` nos call-sites (a função devolve `unknown`).
  - **try/catch + `logger.error` detalhado** (objeto que tentou salvar + `error`) em cada gravação (`claimPending`, `writeBatch`, `deleteBatch`, `finalizePending`, `writeAudit`).
  - **Retorno amigável no `onCall`**: catch do handler converte `HttpsError` de código `internal` (e erros não-HttpsError) em `{ success: false, error: 'Não foi possível registrar a operação. Verifique os logs.' }` + `logger.error`; `HttpsError` semânticos (`unauthenticated`, `invalid-argument`, `failed-precondition`, `deadline-exceeded`, `permission-denied`) continuam sendo relançados (frontend já os trata em `useAgendaNexus.ts`). O hook já lida com o corpo `{ success: false }` via `getResponseError`/`!data.success`.
  - **Testes**: +3 em `functions/__tests__/nexusAgendaCommit.test.ts` (undefined aninhado/arrays → null; Date inválido → null / válido preservado). 23 testes no arquivo passando; `tsc` build limpo (lint do repo não cobre `functions/`).
  - **Deploy**: `firebase deploy --only functions:nexusAgendaCommit` → `Successful update operation.` (sem o timeout de "User code failed to load" desta vez).

- **Nexus Agenda — estabilização completa (undefined + edição bloqueada + logs sem PII)** (implementado 2026-08-15):
  - **Causa raiz do INTERNAL em create simples**: `pending.write` do Interpret (`nexusAgendaInterpret.ts:820-828`) já sanitizava; a lacuna era o `nexusAgendaUndo.ts`, que grava sem sanitize em `claimAudit` (transaction.update) e `finalizeAudit` (update). Adicionado `sanitizeForFirestore` importado de `./nexusAgendaCommit` nas duas escritas do undo (sem ciclo de import — commit não importa undo/interpret).
  - **Edição temporariamente bloqueada no Interpret**: novo `EDIT_UNAVAILABLE_MESSAGE` + retorno `{ success: false, error }` logo após o log `validado` (~linha 576) — **nenhum pending é criado, nenhum token emitido, nenhuma chamada a `agenda.onDay`**; ramo morto de `edit_lookup` removido. Mensagem: "A edição de compromissos ainda não está disponível no Nexus na Agenda. Por enquanto, você pode excluir o compromisso atual e criar um novo." O Commit continua rejeitando `edit` como defesa em profundidade (`Somente propostas create_commitment ou delete_commitment`).
  - **Logs de erro do Commit sem PII**: helpers exportados `batchWriteErrorLog`/`auditErrorLog` + `safeUid`/`safeToken`/`errorMessage` privados; todos os 6 `logger.error` reduziram payload (claimPending/writeBatch/deleteBatch/finalizePending/writeAudit/catch externo) — nunca mais documento completo, auditoria completa, patch nem token em texto puro; apenas `uid` mascarado, IDs, contagens, `errorMessage`.
  - **Testes**: interpret +2 (sem undefined no pending após sanitize quando faltam endTime/recurrence; edit bloqueado sem write/onDay), commit +3 (create sem endTime/campos opcionais não envia undefined; log de lote não expõe o documento; log de auditoria não expõe a auditoria), assistant +1 (indisponibilidade de edição como erro sem botão de confirmar). Backend 140 testes passando (interpret/commit/undo/agenda-time/schema) + frontend Agenda 182 testes passando (src/agenda + useAgendaNexus + components/Agenda + AgendaHub).
  - **Validação**: `npm --prefix functions run build` (tsc) limpo; eslint `--max-warnings 0` limpo nos 4 arquivos frontend alterados; tsc root sem erros novos (TS2571 pré-existente em `nexusAgendaInterpret.test.ts:410`, herdado de `4cb011a`, apenas deslocado de 355).
  - **Deploy pendente (manual)**: `npm --prefix functions run build`; `firebase deploy --only functions:nexusAgendaInterpret,functions:nexusAgendaCommit --project financas-pro-invest`; `firebase functions:log --only nexusAgendaInterpret --project financas-pro-invest`. Teste manual: comando create simples ("amanhã, 18h" sem endTime) confirma sem erro 500; comando "edite a reunião" exibe a mensagem de indisponibilidade sem botão de confirmação.

- **Nexus Agenda — fluxo natural "Catequese 19h" (horário no título + byDay array + prefixo "dia")** (implementado e implantado 2026-08-19):
  - **Schema** (`functions/nexus-core/agenda-intent-schema.ts`): `recurrenceSchema.byDay` aceita número ÚNICO **OU array** (`z.union`, min/max 7) — o LLM pode emitir `byDay: [1]` sem falha estrutural; regra semanal `=== undefined` em `validateAgendaEnvelope` intacta.
  - **Datas** (`functions/nexus-core/agenda-time.ts`): `resolveDateExpression` ganhou corte de prefixo composto `^(?:at[eé]|no|na|em|para|aos|as|o|a)\s+(?:o\s+)?dia\s+(?:de\s+)?` antes do corte de prefixo único — `"até o dia 15/12/2026"`, `"o dia ..."`, `"no dia ..."`, `"no dia de ..."` agora resolvem (antes só cortava 1 prefixo e retornava `null` → `confidence: low` → clarificação que bloqueava a proposta).
  - **Inferência de horário do título** (`nexusAgendaInterpret.ts`): novo helper puro exportado `inferStartTimeFromTitle(title)` (regex `/\b(\d{1,2})\s*[:hH](\d{2})?/`, sem marcador de hora → `null`, hora >23 ou minuto >59 → `null`); aplicado em `normalizeEnvelopeDates` quando `intent === 'create'`, `startTime` ausente e o título carrega o horário ("Catequese 19h" → `startTime "19:00"`) — roda ANTES da validação e do check de low-confidence, então nunca dispara clarificação.
  - **Normalização byDay**: `normalizeEnvelopeDates` colapsa array → primeiro elemento (canônico número para validação, recap, sessão e `describeRecurrence`); `describeRecurrence` e o recap aceitam `number | number[]` na assinatura e coagem para número.
  - **Prompt** (`buildSystemPrompt`): contrato JSON usa `"byDay":[1]`; orientação de extração instrui byDay como ARRAY ("[1] segundas … [7] domingos"); Regra de TÍTULO com horário ganhou exemplo "Catequese 19h para todas as próximas segundas feiras" → title "Catequese 19h" + startTime "19:00"; regra "NÃO invente horário" explicita a exceção de horário embutido no título.
  - **Testes**: `agenda-time.test.ts` +5 (prefixo composto "dia": até o dia / o dia / no dia / até o dia de / por extenso); `nexusAgendaInterpret.test.ts` +3 — frase EXATA (`"Preciso que você agende para mim um compromisso com o titulo 'Catequese 19h' para todas as próximas segundas feiras até o dia 15/12/2026."`) → proposal com `title "Catequese 19h"`, `startTime "19:00"`, `firstDate 2026-08-17`, `lastDate 2026-12-14`, `occurrenceCount 18`, `recurrence {freq weekly, byDay 1, until 2026-12-14}` e pending com `byDay: 1`; inferência de `startTime` quando o modelo omite (proposal sem clarificação); teste direto de `inferStartTimeFromTitle` (19h/17h30/20h/1A 19h/às 19:00 vs null em "Aniversário 15"/"Catequese"/"24h de corrida").
  - **Validação**: `npm --prefix functions run build` (tsc) limpo; suíte backend **235 testes passando (7 arquivos)** — 227 anteriores + 8 novos, sem regressão.
  - **Deploy**: `firebase deploy --only functions:nexusAgendaInterpret --project financas-pro-invest` → `Successful update operation` (nodejs22). Revalidação: `OPTIONS` → 204 com CORS; `POST {"data":{...}}` sem auth → `UNAUTHENTICATED` (`Login necessário para usar a Agenda.`).

- **Nexus Agenda — correções de produção (payload real com null + caminho da sessão)** (implementado e implantado 2026-08-20):
  - **Causa raiz do erro de produção (payload real)**: logs de produção (`firebase functions:log`) mostravam `{"errors":["entities.endTime: Invalid input: expected string, received null"]}` — o LLM real emite `"startTime": null` / `"endTime": null` como ausência (padrão copiado de `location`/`participants`/`notes`, que são `nullable`), mas `entitiesSchema.startTime/endTime` eram `z.string().regex(...).optional()` SEM `.nullable()` → `tryParseEnvelope` (parse estrutural, ANTES de `normalizeEnvelopeDates`) rejeitava o envelope inteiro → retry com erros de schema → potencial erro amigável em vez de proposta. Os mocks de teste produziam `endTime: undefined` (JSON serializado omite o campo), nunca `null` literal — por isso os testes passavam.
  - **Correção 1 (schema)**: `agenda-intent-schema.ts` — `startTime`/`endTime` agora são `z.string().regex(ISO_TIME_REGEX, ...).nullable().optional()` (aceitam `null` como ausência, espelhando `location`/`participants`/`notes`).
  - **Correção 2 (normalização)**: `normalizeEnvelopeDates` (`nexusAgendaInterpret.ts:438`) converte `null → undefined` em `startTime`/`endTime` no topo — roda ANTES das regras de negócio e da inferência de horário do título, então todo downstream (`validateAgendaEnvelope`, recap, sessão, `collectWarnings`/`hasTimeOverlap`, `buildSummary`, commit) continua vendo `string | undefined`; `!entities.startTime` no create dispara a inferência ("Catequese 19h" + `startTime: null` → `19:00`).
  - **Coersão nos consumidores** (o tipo union `string | null | undefined` exige): `nexusAgendaCommit.ts` (linhas 253/274 — `timestampForOccurrence`), `contextFromEnvelope` (725-726), recap e `collectWarnings`/`buildSummary` (1478-1493) usam `?? undefined`.
  - **Testes novos (payload real)**: +3 em `nexusAgendaInterpret.test.ts` — `endTime: null` (proposal com `routeRequest` 1x, sem retry), `startTime: null` + `endTime: null`, e `startTime: null` + título "Catequese 19h" → inferência `19:00`. Suíte backend passou de 235 → 238.
  - **Correção 3 (caminho da sessão)**: logs de produção expuseram `Value for argument "collectionPath" must point to a collection, but was "users/{uid}/_nexus/sessions". Your path does not contain an odd number of components.` — `agenda-session.ts` (linhas 66 e 95) usava `users/${uid}/_nexus/sessions` (4 segmentos, par → inválido como coleção). Todos os irmãos `_nexus` (pending em `nexusAgendaInterpret.ts:1613`, audit em `nexusAgendaCommit.ts:573`) usam `users/{uid}/agenda/_nexus/...`. Corrigido para `users/{uid}/agenda/_nexus/sessions` (5 segmentos ímpares, coerente) — qualquer turno ≥ 2 de diálogo com `sessionId` derrubava com INTERNAL antes do LLM. O mock de teste aceitava qualquer path (linha 61 assertava até o caminho errado).
  - **Teste do caminho**: `agenda-session.test.ts` — mock captura a coleção (`collections`), asserção de 5 segmentos ímpares em leitura e escrita, e assert corrigido para `users/user-1/agenda/_nexus/sessions/sess-1`.
  - **Validação**: `npm --prefix functions run build` (tsc) limpo; suíte backend **239 testes passando (7 arquivos)** — 238 anteriores + 1 do caminho de sessão.

- **Consultor CFP® Sênior — Frente A (Mesa do Sininho, Tensão Antecipada & Ponte da Agenda)** (implementado 2026-09-11):
  - **Etapa 1 — Mesa de Despacho do Sininho**: `PresenceEventService.createNexusAdvisorAlert` adicionado com deduplicação por `resourceId`, cooldown configurável, pontuação de urgência e dispatch push nativo. Criado hook `useNexusAdvisorTriggers.ts` avaliando 5 cenários soberanos (Saldo Livre negativo, Dívidas ativas, Custo de Oportunidade, Capital Ocioso, Proteção incompleta). Montado em `AppLayout.tsx` e estilizado em `NotificationHub.tsx` com badge esmeralda `"Consultor Nexus"`.
  - **Etapa 2 — Antecipação de Tensão de Caixa & Consequência Imediata de Compras**: Antecipação de 5 dias em `useNexusAdvisorTriggers` monitorando contas do Controla quando o caixa cobre <70% do montante prestes a vencer. No `useNexusEventBridge`, disparo imediato de alerta consultivo para parcelamentos longos (≥ 2x) e despesas à vista de alto impacto (≥ R$ 1.500). Testes: 17 testes passando em `useNexusAdvisorTriggers.test.tsx` e `useNexusEventBridge.test.tsx`.
  - **Etapa 3 — A Ponte da Agenda (Tempo x Dinheiro)**:
    - `agendaService.ts`: `syncBillsToAgenda(userId, bills, year, month)` adiciona contas ativas do mês como compromissos às 09:00 com alarmes nativos e anotações com o valor formatado, sem duplicação.
    - `alarmService.ts`: alarmes recebem `userId` e, ao disparar no dispositivo (`fireAlarm`), gravam um evento `agenda.alarm_due` no Sininho através de `PresenceEventService`.
    - `AgendaHub.tsx`: botão responsivo `"Sincronizar Contas"` integrado no cabeçalho do caderno com feedback visual, recarregamento automático do mês e dos próximos compromissos, e passagem de `userId` nos alarmes.
    - Compatibilidade de seletor `data-month-section` com chaves canônicas e legadas consolidada. Suíte de testes `alarmService.test.ts` (8 testes) e `AgendaHub.test.tsx` (68 testes) 100% passando. Build de produção do Vite validado com sucesso.

- **Google Play Store & Mobile — Frente B (Etapa B1: Desacoplamento Seguro de Assinaturas & Lista VIP)** (implementado 2026-09-11):
  - **Arquitetura Desacoplada Segura**: Criado `src/services/purchaseService.ts` isolando a prontidão de cobrança (`isBillingReady(): boolean`, padrão `false` até abertura de contas bancárias/PJ e desligamento do vínculo empregatício). Mapeamento dos produtos Google Play Billing (`fpi_pro_monthly`, `fpi_pro_yearly`, `fpi_premium_monthly`, `fpi_premium_yearly`) e chamada desacoplada a `@capgo/native-purchases`.
  - **Lista VIP de Lançamento**: Novo modal `src/components/Billing/VipWaitlistModal.tsx` elegante, com campos pré-preenchidos para e-mail do usuário, nome e WhatsApp opcional. Grava intenção real em `users/{uid}/vip_interest/{id}` e no resumo do perfil `users/{uid}`, além de registrar confirmação no Sininho (`billing.vip_waitlist`).
  - **Conformidade Play Store na Paywall**: `PricingPage.tsx` eliminou chamadas de checkout externo via navegador no Android (`Browser.open`). Durante o pré-lançamento, exibe o banner "Acesso Antecipado • Lista VIP" e os botões "Garantir Vaga • Pro/Premium" acionando o `VipWaitlistModal`.
  - **Testes & Validação**: Criados `src/services/__tests__/purchaseService.test.ts` e `src/components/Billing/__tests__/VipWaitlistModal.test.tsx`. Todos os 9 testes passando (100%). ESLint sem erros. Build de produção do Vite validado com sucesso.
  - **Deploy**: `firebase deploy --only functions:nexusAgendaInterpret --project financas-pro-invest` → `Successful update operation` (2ª tentativa — 1ª caiu no timeout transitório `User code failed to load`). Revalidação: `OPTIONS` → 204 com CORS; `POST` sem auth → `UNAUTHENTICATED`.

- **Agenda — reordenação manual de compromissos no mesmo dia (setas ▲/▼ + campo `order`)** (implementado 2026-08-20):
  - **Causa raiz do bug**: a ordenação do dia era feita pela query Firestore `date ASC, time ASC` (`agendaService.ts`) — compromissos manuais sem `time` (null) apareciam ANTES dos demais na ordem ascendente, então o 2º compromisso lançado "virava o 1º do dia", sem nenhuma forma de reordenar.
  - **Campo de dados**: novo `order?: number` em `AgendaCommitment`/`AgendaCommitmentInput` (`agendaService.ts`); `addCommitment` grava `docData.order = data.order ?? null` (espelhando `time`). Sem migração: itens legados (sem `order`) caem num fallback estável.
  - **Novo helper puro `src/agenda/dayOrder.ts`** (padrão `monthMath.ts`): `compareDayCommitments` (quem tem `order` explícito vence; legado ordena por `time` → `createdAt` → `id`, com itens sem `order` agrupados ANTES dos ordenados para nova inserção anexar ao fim), `moveCommitment` (move + re-normaliza `order` 0..n-1, imutável), `nextOrderForDay` (max explícito + 1), `replaceDayInMonth` (troca só os itens do dia no array do mês).
  - **UI** (`AgendaHub.tsx`): `dayMap` ordena cada dia com `compareDayCommitments`; setas `ChevronUp`/`ChevronDown` em cada faixa de compromisso, SEMPRE visíveis quando o dia tem 2+ itens (sem hover — requisito mobile), desabilitadas nas pontas; `commitAdd` grava `nextOrderForDay`; novo handler `shiftCommitment` com update otimista em `allMonths` + persistência em `reorderDayCommitments` (batch atômico), sem `await` na UI, toast + `reloadData()` em erro; em modo `seedCommitments` (harness dev) apenas local.
  - **Serviço**: novo `reorderDayCommitments(userId, ordered)` em `agendaService.ts` usando `writeBatch` + `serverTimestamp()` por item (sem novo índice Firestore — ordenação client-side).
  - **Testes**: novo `src/agenda/__tests__/dayOrder.test.ts` (15: comparador, move, nextOrder, replaceDayInMonth); `agendaService.test.ts` +2 (persistência de order no add + batch de reordenação); `AgendaHub.test.tsx` +6 (setas ausentes com 1 item, presentes com 2+, desabilitação nas pontas, troca otimista de ordem + batch chamado, subir último → topo, add grava próximo order). Suíte Agenda = 191 testes passando (6 arquivos); tsc sem erros nos arquivos alterados; eslint `--max-warnings 0` limpo nos arquivos novos/alterados (warnings de AgendaHub/agendaService.test pré-existentes). Sem mudança no backend Nexus (compromissos criados por ele ficam sem `order` e caem no fallback; a 1ª reordenação do dia normaliza tudo). Harness dev ganhou cluster de mesmo-dia para validação visual.

- **Etapa 6 — Navegação, Shell e Telas Auxiliares** (auditoria aprovada + execução):
  - **Estado atual confirmado**: `src/components/CentralHub.tsx` não existe mais no repositório (removido antes do HEAD `cb27693`); a rota `/app/central` renderiza `AppCockpit` (`src/routes/AppRoutes.tsx:211-230`). Menções a `CentralHub` em `tsc_report_*.txt`, `.firebase/hosting.*.cache` e nos registros históricos acima são artefatos/memória de auditorias passadas, não código vigente. `ACTION_REGISTRY` (Etapa 5 N8) segue compatível: `/app/minhas-dividas` e `/app/controla` existem.
  - **E6-01**: `AppMobileDrawer.tsx` — imports `Crown`/`Settings`/`UserMeta` corrigidos (era `ReferenceError` em runtime ao abrir o drawer); novo `src/components/__tests__/AppMobileDrawer.test.tsx` (7 testes).
  - **E6-02**: `ExplorarHub.tsx` — grade de ferramentas derivada de `TOOL_ROUTES` (`tool-*` ⇒ exatamente uma entrada navegável; inclui `tool-fire`, `tool-inflacao`, `tool-dividendos`, `tool-buy-cash-or-installments`); novo `src/components/__tests__/ExplorarHub.test.tsx` (contrato por seção + ausência de listener).
  - **E6-05/E6-09**: `AppHeader.tsx` — `/app/agenda` em `MAIN_ROUTES` (marca em vez de "Voltar"); botão Menu do drawer sem guarda `!isNative`; novo `src/components/__tests__/AppHeader.test.tsx` (4 testes).
  - **E6-06**: barra fixa mobile "EXPLORAR" + listener `window.scroll` + `isScrolled` removidos do `ExplorarHub.tsx`.
  - **E6-07/E6-08**: `SettingsPage.tsx` — Termos/Privacidade navegam para `/termos`/`/privacidade` internos; seção no-op "Horário de Disponibilidade" removida (melhoria futura de produto: wiring real a `presencePrefs`); `handleStartupHomeChange` agora recebe fallback interno para `/app/mais/pricing`; higiene (`ref`/`update`/`db` não usados, `Toggle` e props tipados). Novo `src/components/__tests__/SettingsPage.test.tsx` (3 testes).
  - **E6-10**: `isPrimaryNavTool`/`getPrimaryNavRoute` removidos de `appPrimaryNav.ts` (sem consumidores).
  - **E6-03/E6-04**: removidos após grep final sem consumidores — `ProfilePage.tsx`, `UpgradePage.tsx`, `UserPanel.tsx`, `MobileMenu.tsx`, `src/layouts/AppShell/`, `src/labs/app-shell/`, `src/config/navigation.config.ts` (zero consumidores restantes). `src/labs/` preservado.

### In Progress
- (none)

### Blocked
- **useDashboardState return statement broken** (inherited from prior refactor): hook's `return {...}` references ~20 variables that were deleted (`guardedSetViewMode`, `commandMode`, `showCalibrationOffer`, `calibrationInviteCopy`, `handleDeferCalibration`, `handleDismissCalibrationInvite`, `handleStartCalibration`, `handleCalibrationComplete`, `categoryStats`, `categorySummary`, `categoryTransactionsMap`, `categoryNames`, `guardedChangeDate`, `guardedDateSelect`, `handleExportPDF`, `handleClearCardFilter`, `handleFilterByCard`, `setRecurringBills`, `setUserCards`). These are all TS2304/TS18004 errors — code unreachable until fixed. Not caused by console.time instrumentation.

### Done
- **console.time instrumentation** (2026-07-07):
  - `useDashboardState.ts`: added `console.time`/`console.timeEnd('uds-filtered-calc')` and `('uds-stats-calc')` inside `filtered` and `stats` useMemos; moved stray `performance.mark/measure` inside the `filtered` useMemo (they were dead code after the closing `]);`); added `console.time('uds-activeInvoices-calc')`
  - `calculations.ts`: added `console.time('calc-aggregateAllTimeFlow')` and `('calc-buildSovereignSnapshot')` to `aggregateAllTimeFlow` and `buildSovereignSnapshot`; refactored `aggregateAllTimeFlow` from `forEach` to `for` loop
  - Fixed stats useMemo closing (`}, [deps]);` was replaced by the hook's `return {` when adding console.timeEnd)
  - Removed unused `getCurrentInvoice` import

## Key Findings (All Audits)

### Sovereign Calculation Architecture
- **Orchestrator**: `useSovereignSnapshot` (`src/hooks/useSovereignSnapshot.ts`) extends `SovereignSnapshot` with 4 extra fields (`totalPendingBills`, `virtualImpact`, `cardFuturePressure`, `rotativoDebtBalance`). Calls `aggregateMonthFlow`, `aggregateAllTimeFlow`, `buildSovereignSnapshot`, `computeSovereignMetrics`.
- **Engine**: `buildSovereignSnapshot` (`src/utils/calculations.ts:201`) takes params and returns `SovereignSnapshot`. Key call chain: `buildSovereignSnapshot` → `computeSovereignMetrics` (line 157) → `getColchaoShortfall/reserveShortfall/protectionBuffer`. Formula: `sovereignFreeBalance = accumulatedBalance - virtualImpact - pendingBills - protectionShortfall` (line 169).
- **Parallel danger**: `calculateSovereignBalance` (`src/utils/calculations.ts:289`) uses formula `currentBalance - upcomingInvoices - monthlyFixedExpenses - reserveProvision`. Called by Nexus only. Different inputs, different result.
- **Missmatch**: In `buildSovereignSnapshot` line 202, `virtualImpact = (params.virtualImpact ?? 0) + (params.rotativoDebtBalance ?? 0)` — `rotativoDebtBalance` is added inside the engine, but `useSovereignSnapshot` line 98 already passes it separately and it appears on both line 99 (`rotativoDebtBalance`) and line 91 (`virtualImpact: cardInvoiceRemaining`). Double-counting risk is mitigated by `cardInvoiceRemaining` being set to 0 for `rotativoConverted` invoices (line 53-54), but the engine's internal addition of `rotativoDebtBalance` is an implicit mixing of card pressure + rotativo debt.
- **CockpitHero override**: Lines 77-86 of `CockpitHero.tsx` override hero value: `heroValue = showFreeBalanceHero ? sovereign.sovereignFreeBalance : sovereign.heroValue`. Decision depends on `transactions.length >= 5` — a heuristic absent from any calculation engine.

### Derived-State Abandoned Architecture
- `src/core/derived-state/aggregators/` — empty
- `src/core/derived-state/calculators/` — empty
- `src/core/derived-state/selectors/` — empty
- `src/core/derived-state/runtime/domain-graph.ts` — `DependencyGraph` class exists but never populated with nodes (line 29: `export const domainGraph = new DependencyGraph()` — zero calls to `addDependency` anywhere in the codebase)

### Navigation & UX Inconsistencies
- `navigation.config.ts` uses `id: 'explora'`/label `'Explora'`/path `/explora` — but `appPrimaryNav.ts` uses `toolId: 'explorar'`/label `'Explorar'`/route `/app/explorar`. The config file routes (`/home`, `/controla`, `/central`, `/explora`, `/mais`) don't match TOOL_ROUTES (`/app/home`, `/app/controla`, `/app/central`, `/app/explorar`, `/app/mais`).
- MobileBottomNav (5 items: Home, Add, Central, Alertas, Mais) ≠ desktop PRIMARY_NAV_ITEMS (4 items: Home, Controla, Central, Explorar). Different surfaces exposed per platform.
- CentralHub (`/app/central`, $HOME) rehashes what Home already shows: base de proteção, reserves, wealth aggregates, Nexus insights. Purpose overlap with Home's CockpitHero + SovereignBuckets.
- ExplorarHub (`/app/explorar`, $HOME) = market data (quotes, news, ticker) + tools (juros, dívidas, alugar, inflação, fire, dividendos, compra) + courses. Serves as a secondary landing for content, competing with Home.
- SettingsPage (`/app/mais`, 857 lines) = profile editor + financial profile + pricing redirect + app version + user deletion + logout action list. No logical grouping, no hierarchy. A settings catch-all.

### Philosophical Axes (Traced in Code)
1. **Caixa (Cash)**: `monthBalance`, `realBalance`, `aggregateMonthFlow` — tracks immediate cash in/out.
2. **Pressão (Pressure)**: `virtualImpact` (invoice remaining), `cardFuturePressure`, `pendingBills`, `obligationsDeduction` — obligations that consume cash.
3. **Proteção (Protection)**: `protectionBuffer`, `colchaoShortfall`, `reserveShortfall`, `marcoZero`, `emergencyReserveCurrent` — layers of financial safety.
4. **Trajetória (Trajectory)**: `buildMarginTrajectory` in `trajectoryEngine.ts`, `freedomVelocity`, `leewayDays` — direction over time.
- But `trajectoryEngine.ts` line 48 uses `flow.realBalance - protection` for margin points — which references `realBalance` (month flow), not `sovereignFreeBalance` (accumulated). Only the current month margin may be overridden by `currentMargin`.

### Nexus/IA Architecture
- **Backend** (8+ modules in `functions/`): `MultiModelRouter.ts` (454 lines, cascading router), `askAiAdvisor.ts` (601 lines, main CF), `analyzeFinancialHealth.ts`, `generateBriefing.ts`, `suggestActions.ts`, `insightRanking.ts`, `contextBuilder.ts`, `personaAnalysis.ts`.
- **Frontend** (5+ surfaces): `NexusInsightCard` (Home), `NexusFeed` (Home sidebar + mobile), `NexusInlineAdvisor` (Controla form), `AiAdvisor` (Chat), `CentralHub Nexus section` (Central), `NexusActionButton` (inline action button).
- `nexusInsightEngine.ts` (634 lines): 15+ insight generators. `buildUserContext` gathers all financial data. `getCentralInsights` produces centralized insights.
- `nexusEventEvaluator.ts` + `eventInsightStore.ts` + `useNexusEventBridge.ts`: event-streamed insight delivery, dedup, analytics.

### Monetization & Plan Gating
- `config/stripePlans.ts` defines Free/Pro/Premium plans.
- Two parallel subscription fields: `subscription.plan` (used by `useSubscriptionAccess`) vs `subscription.planId` (used by `isAppPremium` in user.ts for analytics).
- Nexus actions check `action.requiresPlan` against plan hierarchy (line 42 `planHierarchy = { free: 0, pro: 1, premium: 2 }`).
- `FeatureGate`, `PremiumUpgradePrompt`, `PaywallModal` all in `src/components/` — consistent gating pattern.

## Relevant Files (Mapped Across All 3 Audits)
- `src/utils/calculations.ts` (321 lines) — 11 functions: `aggregateMonthFlow`, `aggregateAllTimeFlow`, `computeSovereignMetrics`, `buildSovereignSnapshot`, `calculateSovereignBalance`, `calculateLeewayDays`, `calculateFreedomVelocity`, computeLaunchImpact, maskCurrency, and helpers (getProtectionBuffer, getColchaoShortfall, getReserveShortfall, getTotalShortfall)
- `src/hooks/useSovereignSnapshot.ts` (113 lines) — Sovereign orchestrator, extension of SovereignSnapshot with 4 extra fields
- `src/components/Home/Cockpit/CockpitHero.tsx` (505 lines) — Overrides hero calculation, adds `transactions.length >= 5` heuristic
- `src/core/derived-state/` — Empty aggregators/calculators/selectors; abandoned DependencyGraph
- `src/theme/fpiVoiceGuide.ts` (309 lines) — Central vocabulary, 4-axis copy, institutional definitions
- `src/services/nexusInsightEngine.ts` (634 lines) — 15+ insights, buildUserContext, getCentralInsights, NexusAdvisoryContext
- `functions/nexus-core/MultiModelRouter.ts` (454 lines) — Multi-model cascading router
- `functions/askAiAdvisor.ts` (601 lines) — Main Nexus Cloud Function
- `src/routes/AppRoutes.tsx` (381 lines) — Central router with loading orchestration (T0-3s, 3-7s, >7s)
- `src/components/MobileBottomNav.tsx` (124 lines) — 5-item bottom nav (Home, Add, Central, Bell, Menu)
- `src/config/appPrimaryNav.ts` (48 lines) — 4-item primary desktop nav (Home, Controla, Central, Explorar)
- `src/config/navigation.config.ts` (48 lines) — Dead config with 'explora'/'Explora'/='/explora' (inconsistent with appPrimaryNav)
- `src/components/CentralHub.tsx` (678 lines) — Competes with Home, rehashes base proteção, Nexus, wealth aggregates
- `src/components/ExplorarHub.tsx` (223 lines) — Market data + tools + courses secondary landing
- `src/components/SettingsPage.tsx` (857 lines) — Superficial catch-all settings (profile + pricing + logout + delete)
- `src/components/Home/NexusInsightCard.tsx` (98 lines) — Home card Nexus surface
- `src/components/Home/NexusActionButton.tsx` (117 lines) — Inline action button with plan gating
- `src/hooks/useNavigation.ts` (158 lines) — Navigation orchestrator with TOOL_ROUTES, Capacitor persistence
- `src/services/trajectoryEngine.ts` (94 lines) — Margin trajectory builder, uses `flow.realBalance - protection`
- `config/stripePlans.ts` — Free/Pro/Premium plan definitions
- `src/types/index.ts` — CardInvoice, InvoiceStatus, FinancialProfile types
- `src/services/debt/debt.realtime.ts` + `src/services/card.realtime.ts` + `src/services/transaction.realtime.ts` — Realtime bridge services (3 bridges)
- `src/contexts/DebtContext.tsx` + `src/contexts/FinanceContext.tsx` — Both call `createDebtRealtimeBridge` (duplicate)
- `src/core/orchestration/domainEvents.ts` — 8 typed domain events
- `src/core/orchestration/event-bus.ts` — EventBus implementation
- `src/services/nexusAnalyticsService.ts` — Analytics tracking (trackInsightClicked, trackActionSuggested, etc.)
- `src/services/eventInsightStore.ts` — Insight dedup store
- `src/hooks/useNexusEventBridge.ts` — Bridge between events and insight store
- `src/services/nexusEventEvaluator.ts` — Evaluates events for relevance
- `src/components/Nexus/NexusFeed.tsx` + `src/components/Nexus/NexusFeedItem.tsx` — Feed surfaces
- `src/services/sovereignMap.ts` (NEW, 137 lines) — 6-stage classification engine: `classifyStage`, `classifyFromSnapshot`, `StageInfo`
- `src/components/Home/SovereignMapCard.tsx` (NEW, 80 lines) — Sovereign Map card rendered in HomeMainColumn
- `src/services/__tests__/sovereignMap.test.ts` (NEW, 114 lines) — 15 tests covering all 6 stages + edge cases

## Conceptual Model (Inferred from Code)
```
CASH (Caixa)
  monthBalance = income - expenses (aggregateMonthFlow.realBalance)
  accumulatedBalance = allTimeFlow.realBalance
  
PRESSURE (Pressão)
  virtualImpact = invoice.remainingAmount (card pressure)
  cardFuturePressure = totalCreditUsed - cardInvoiceRemaining - rotativoDebtBalance
  pendingBills = active unpaid recurring bills
  rotativoDebtBalance = sum(rotativo_cartao debts)
  obligationsDeduction = virtualImpact + pendingBills (+ rotativoDebtBalance inside engine)

PROTECTION (Proteção)
  protectionBuffer = marcoZero + emergencyReserveCurrent
  colchaoShortfall = max(0, colchaoTarget - marcoZero)
  reserveShortfall = max(0, reserveTarget - reserveCurrent)
  protectionShortfall = colchaoShortfall + reserveShortfall

TRAJECTORY (Trajetória)
  sovereignFreeBalance = accumulatedBalance - obligationsDeduction - protectionShortfall
  leewayDays = floor(sovereignFreeBalance / dailyCost)
  freedomVelocity = (monthlyAport / expenses) * 30
  margin trajectory = flow.realBalance - protection (monthly series)

HERO (Display)
  mode = 'rotina' (show monthBalance) | 'comando' (show sovereignFreeBalance)
  Override: CockpitHero uses transactions.length >= 5 OR commandMode
```
