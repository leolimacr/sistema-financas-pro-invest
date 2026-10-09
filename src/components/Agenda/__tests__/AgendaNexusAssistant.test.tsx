import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNexus = vi.hoisted(() => ({
  interpret: vi.fn(),
  commit: vi.fn(),
  undo: vi.fn(),
  cancel: vi.fn(),
  reset: vi.fn(),
  isLoading: false,
  stage: 'idle',
  progressMessage: null,
  proposal: null,
  missing: [],
  ambiguous: [],
  assumptions: [],
  refinement: null,
  dialogue: [],
  commitResult: null,
  error: null,
  canUndo: false,
  undoContract: null,
}));

vi.mock('../../../hooks/useAgendaNexus', () => ({
  useAgendaNexus: () => mockNexus,
}));

import AgendaNexusAssistant from '../AgendaNexusAssistant';

const proposal = {
  intent: 'create',
  action: 'create_commitment',
  title: 'Reunião com o coordenador',
  firstDate: '2026-08-18',
  lastDate: '2026-11-24',
  startTime: '17:00',
  endTime: '18:00',
  occurrenceCount: 15,
  recurrence: { freq: 'weekly' },
  location: 'Sala 3',
  participants: ['Ana'],
  notes: 'Levar relatório',
  summary: 'Criar reunião recorrente.',
};

function configure(overrides: Record<string, unknown> = {}) {
  Object.assign(mockNexus, {
    interpret: vi.fn(),
    commit: vi.fn(),
    undo: vi.fn(),
    cancel: vi.fn(),
    reset: vi.fn(),
    isLoading: false,
    stage: 'idle',
    progressMessage: null,
    proposal: null,
    missing: [],
    ambiguous: [],
    assumptions: [],
    refinement: null,
    dialogue: [],
    commitResult: null,
    error: null,
    canUndo: false,
    undoContract: null,
    ...overrides,
  });
}

describe('AgendaNexusAssistant', () => {
  beforeEach(() => {
    cleanup();
    configure();
  });

  it('renderiza campo de comando e botão enviar com labels acessíveis', () => {
    render(<AgendaNexusAssistant />);
    expect(screen.getByRole('heading', { name: 'Nexus na Agenda' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Comando para o Nexus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar/i })).toBeInTheDocument();
  });

  it('envia comando ao pressionar o botão', () => {
    configure({ interpret: vi.fn() });
    render(<AgendaNexusAssistant />);
    const input = screen.getByRole('textbox', { name: 'Comando para o Nexus' });
    fireEvent.change(input, { target: { value: 'marque uma reunião' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(mockNexus.interpret).toHaveBeenCalledWith({ prompt: 'marque uma reunião' });
  });

  it('exibe progresso e desabilita envio durante interpretação', () => {
    configure({ isLoading: true, stage: 'resolving_dates', progressMessage: 'Estruturando datas e recorrência…' });
    render(<AgendaNexusAssistant />);
    expect(screen.getByRole('status')).toHaveTextContent('Estruturando datas e recorrência');
    expect(screen.getByRole('button', { name: /enviar/i })).toBeDisabled();
  });

  it('exibe proposta estruturada e metadados', () => {
    configure({ stage: 'done', proposal });
    render(<AgendaNexusAssistant />);
    expect(screen.getByRole('heading', { name: 'Revise antes de confirmar' })).toBeInTheDocument();
    expect(screen.getByText('Reunião com o coordenador')).toBeInTheDocument();
    expect(screen.getByText('18/08/2026')).toBeInTheDocument();
    expect(screen.getByText('24/11/2026')).toBeInTheDocument();
    expect(screen.getByText('17:00 às 18:00')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Sala 3')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Levar relatório')).toBeInTheDocument();
  });

  it('mostra o horário em chip imediatamente após o título e a caixinha "Mostrar o horário da agenda" marcada por padrão', () => {
    configure({ stage: 'done', proposal });
    render(<AgendaNexusAssistant />);

    const checkbox = screen.getByRole('checkbox', { name: 'Mostrar o horário da agenda' });
    expect(checkbox).toBeChecked();
    const titleElement = screen.getByText('Reunião com o coordenador');
    expect(titleElement.nextElementSibling).toHaveTextContent('17:00 às 18:00');
  });

  it('desmarcar a caixinha omite o horário no cartão, mas o título permanece', () => {
    configure({ stage: 'done', proposal });
    render(<AgendaNexusAssistant />);

    const checkbox = screen.getByRole('checkbox', { name: 'Mostrar o horário da agenda' });
    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(screen.queryByText('17:00 às 18:00')).not.toBeInTheDocument();
    expect(screen.getByText('Reunião com o coordenador')).toBeInTheDocument();
  });

  it('a caixinha é apenas exibição: confirmar continua enviando o mesmo payload de commit', () => {
    configure({ stage: 'done', proposal });
    render(<AgendaNexusAssistant />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Mostrar o horário da agenda' }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar criação/i }));

    expect(mockNexus.commit).toHaveBeenCalledWith(undefined, { reminderMode: 'none' });
  });

  it('exibe campos ausentes, ambiguidades, assumptions e alertas', () => {
    configure({
      stage: 'clarify',
      proposal: { ...proposal, summary: undefined },
      missing: ['local'],
      ambiguous: ['Qual terça-feira?'],
      assumptions: [{ note: 'Fuso de São Paulo' }],
    });
    render(<AgendaNexusAssistant />);
    expect(screen.getByText(/local/)).toBeInTheDocument();
    expect(screen.getByText(/Qual terça-feira/)).toBeInTheDocument();

    cleanup();
    configure({
      stage: 'done',
      proposal: { ...proposal, warnings: [{ type: 'conflict', message: 'Há conflito de horário.' }] },
      assumptions: [{ note: 'Fuso de São Paulo' }],
    });
    render(<AgendaNexusAssistant />);
    expect(screen.getByText(/Fuso de São Paulo/)).toBeInTheDocument();
    expect(screen.getByText(/Há conflito de horário/)).toBeInTheDocument();
  });

  it('confirma somente proposta válida e usa callback do hook', () => {
    configure({ stage: 'done', proposal });
    render(<AgendaNexusAssistant />);
    fireEvent.click(screen.getByRole('button', { name: /confirmar criação/i }));
    expect(mockNexus.commit).toHaveBeenCalledTimes(1);
  });

  it('não mostra confirmar durante committing e previne confirmação duplicada', () => {
    configure({ stage: 'committing', isLoading: true, proposal });
    render(<AgendaNexusAssistant />);
    expect(screen.queryByRole('button', { name: /confirmar criação/i })).not.toBeInTheDocument();

    configure({ stage: 'done', proposal });
    render(<AgendaNexusAssistant />);
    const confirm = screen.getByRole('button', { name: /confirmar criação/i });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(mockNexus.commit).toHaveBeenCalledTimes(1);
  });

  it('cancela e solicita correção sem confirmar', () => {
    configure({ stage: 'done', proposal });
    render(<AgendaNexusAssistant />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mockNexus.cancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Corrigir' }));
    expect(mockNexus.cancel).toHaveBeenCalledTimes(2);
  });

  it('fecha pelo controle do painel e notifica o container', () => {
    const onClose = vi.fn();
    configure({ stage: 'done', proposal });
    render(<AgendaNexusAssistant onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fechar Nexus na Agenda' }));
    expect(mockNexus.reset).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exibe success e permite desfazer somente quando canUndo', () => {
    configure({ stage: 'success', proposal, canUndo: true });
    render(<AgendaNexusAssistant />);
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(mockNexus.undo).toHaveBeenCalledTimes(1);

    cleanup();
    configure({ stage: 'success', proposal, canUndo: false });
    render(<AgendaNexusAssistant />);
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument();
  });

  it('notifica o container após success e undo', () => {
    const onCommitted = vi.fn();
    const onUndone = vi.fn();
    configure({ stage: 'done', proposal, canUndo: false });
    const { rerender } = render(<AgendaNexusAssistant onCommitted={onCommitted} onUndone={onUndone} />);
    configure({ stage: 'success', proposal, canUndo: true });
    rerender(<AgendaNexusAssistant onCommitted={onCommitted} onUndone={onUndone} />);
    expect(onCommitted).toHaveBeenCalledTimes(1);
    configure({ stage: 'undone', proposal, canUndo: false });
    rerender(<AgendaNexusAssistant onCommitted={onCommitted} onUndone={onUndone} />);
    expect(onUndone).toHaveBeenCalledTimes(1);
  });

  it('diferencia partial e error', () => {
    configure({ stage: 'partial', error: 'Reconciliação necessária.' });
    render(<AgendaNexusAssistant />);
    expect(screen.getByRole('alert')).toHaveTextContent('Operação parcialmente concluída');
    expect(screen.getByRole('alert')).toHaveTextContent('Reconciliação necessária');

    cleanup();
    configure({ stage: 'error', error: 'Falha de rede.' });
    render(<AgendaNexusAssistant />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falha de rede');
  });

  it('não oferece ações de editar ou excluir', () => {
    configure({ stage: 'done', proposal });
    render(<AgendaNexusAssistant />);
    expect(screen.queryByRole('button', { name: /editar|excluir/i })).not.toBeInTheDocument();
  });

  it('exibe erro de edição indisponível (semântico) sem botão de confirmação', () => {
    configure({ stage: 'error', error: 'A edição de séries recorrentes ainda não está disponível no Nexus na Agenda.' });
    render(<AgendaNexusAssistant />);
    expect(screen.getByRole('alert')).toHaveTextContent('edição de séries recorrentes ainda não está disponível');
    expect(screen.queryByRole('button', { name: /confirmar/i })).not.toBeInTheDocument();
  });

  it('não oferece confirmação para proposta de edição sem antes/depois', () => {
    configure({
      stage: 'done',
      proposal: { ...proposal, intent: 'edit', action: 'edit_commitment' },
    });
    render(<AgendaNexusAssistant />);
    expect(screen.queryByRole('button', { name: /confirmar/i })).not.toBeInTheDocument();
  });

  it('renderiza plano de edição com diff antes→depois e confirma sem alarme', () => {
    const editProposal = {
      intent: 'edit',
      action: 'edit_commitment',
      title: 'Reunião com o coordenador',
      firstDate: '2026-08-18',
      lastDate: '2026-08-18',
      occurrenceCount: 1,
      summary: 'Entendi! Vou editar "Reunião com o coordenador" alterando o início para 19:00. Confirma?',
      before: { title: 'Reunião com o coordenador', date: '2026-08-18', startTime: '17:00', endTime: '18:00', location: 'Sala 3', participants: ['Ana'], notes: 'Levar relatório' },
      after: { title: 'Reunião com o coordenador', date: '2026-08-18', startTime: '19:00', endTime: '20:00', location: 'Sala 3', participants: ['Ana'], notes: 'Levar relatório' },
    };
    configure({ stage: 'done', proposal: editProposal });
    render(<AgendaNexusAssistant />);

    expect(screen.getByRole('button', { name: /confirmar edição/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Alterações da edição')).toBeInTheDocument();
    expect(screen.getByText('17:00')).toBeInTheDocument();
    expect(screen.getByText('19:00')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Sem aviso' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirmar criação/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirmar edição/i }));
    expect(mockNexus.commit).toHaveBeenCalledWith(undefined, { reminderMode: 'none' });
  });

  it('exibe sucesso de edição sem oferecer desfazer', () => {
    const editProposal = {
      intent: 'edit',
      action: 'edit_commitment',
      title: 'Reunião com o coordenador',
      summary: 'Entendi! Vou editar.',
      before: { title: 'Reunião com o coordenador', date: '2026-08-18', startTime: '17:00' },
      after: { title: 'Reunião com o coordenador', date: '2026-08-18', startTime: '19:00' },
    };
    configure({
      stage: 'success',
      proposal: editProposal,
      commitResult: { success: true, status: 'committed', intent: 'edit', actionId: 'act-edit', idsEdited: ['c1'], occurrenceCount: 1 },
      canUndo: false,
    });
    render(<AgendaNexusAssistant />);
    expect(screen.getByRole('status')).toHaveTextContent('Compromisso atualizado com sucesso.');
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument();
  });

  it('permite navegação por teclado no formulário', () => {
    render(<AgendaNexusAssistant />);
    const input = screen.getByRole('textbox', { name: 'Comando para o Nexus' });
    input.focus();
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(document.activeElement).toBe(input);
  });

  it('pergunta sobre o aviso na proposta e confirma com "sem aviso" por padrão', () => {
    configure({ stage: 'done', proposal });
    render(<AgendaNexusAssistant />);
    expect(screen.getByRole('radio', { name: 'Sem aviso' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Notificação' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Notificação + alarme' })).toBeInTheDocument();
    expect(screen.getByText(/O alarme sonoro depende das permissões do dispositivo/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /confirmar criação/i }));
    expect(mockNexus.commit).toHaveBeenCalledWith(undefined, { reminderMode: 'none' });
  });

  it('envia notificação + alarme ao confirmar quando o usuário escolhe o modo completo', () => {
    configure({ stage: 'done', proposal });
    render(<AgendaNexusAssistant />);
    fireEvent.click(screen.getByRole('radio', { name: 'Notificação + alarme' }));
    expect(screen.getAllByText('Notificação + alarme').length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByRole('button', { name: /confirmar criação/i }));
    expect(mockNexus.commit).toHaveBeenCalledWith(undefined, { reminderMode: 'notification_alarm' });
  });

  it('envia apenas notificação ao confirmar quando o usuário escolhe o modo visual', () => {
    configure({ stage: 'done', proposal });
    render(<AgendaNexusAssistant />);
    fireEvent.click(screen.getByRole('radio', { name: 'Notificação' }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar criação/i }));
    expect(mockNexus.commit).toHaveBeenCalledWith(undefined, { reminderMode: 'notification' });
  });

  it('não oferece a escolha de aviso quando não há proposta confirmável', () => {
    configure({ stage: 'clarify', proposal: { ...proposal, summary: undefined }, missing: ['date'] });
    render(<AgendaNexusAssistant />);
    expect(screen.queryByRole('radio', { name: 'Sem aviso' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirmar criação/i })).not.toBeInTheDocument();
  });

  it('renderiza plano de exclusão com preview dos itens afetados e confirma sem alarme', () => {
    const deleteProposal = {
      intent: 'delete',
      action: 'delete_commitment',
      title: 'Reunião com o coordenador de campo',
      matchCount: 2,
      affectedItems: [
        { id: 'a1', title: 'Reunião com o coordenador de campo', time: '18:00', dateMs: 0 },
        { id: 'a2', title: 'Reunião com o coordenador de campo', time: '09:00', dateMs: 0 },
      ],
      summary: 'Entendi. Encontrei 2 compromissos com esse nome. Pretendo excluí-los permanentemente. Posso prosseguir?',
    };
    configure({ stage: 'done', proposal: deleteProposal });
    render(<AgendaNexusAssistant />);

    expect(screen.getByRole('button', { name: /confirmar exclusão/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Itens que serão excluídos')).toBeInTheDocument();
    expect(screen.getByText('2 compromissos serão excluídos')).toBeInTheDocument();
    expect(screen.getAllByText('Reunião com o coordenador de campo').length).toBeGreaterThan(0);
    expect(screen.queryByRole('radio', { name: 'Sem aviso' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirmar criação/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirmar exclusão/i }));
    expect(mockNexus.commit).toHaveBeenCalledWith(undefined, { reminderMode: 'none' });
  });

  it('exibe sucesso de exclusão sem oferecer desfazer', () => {
    const deleteProposal = {
      intent: 'delete',
      action: 'delete_commitment',
      title: 'Reunião com o coordenador de campo',
      matchCount: 2,
      affectedItems: [{ id: 'a1', title: 'Reunião com o coordenador de campo', dateMs: 0 }],
      summary: 'Entendi. Encontrei 2 compromissos.',
    };
    configure({
      stage: 'success',
      proposal: deleteProposal,
      commitResult: { success: true, status: 'committed', intent: 'delete', actionId: 'act-del', idsDeleted: ['a1', 'a2'], occurrenceCount: 2 },
      canUndo: false,
    });
    render(<AgendaNexusAssistant />);
    expect(screen.getByRole('status')).toHaveTextContent('Pronto! 2 compromissos excluídos com sucesso.');
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument();
  });

  it('avisa quando parte dos compromissos não foi encontrada na exclusão', () => {
    const deleteProposal = {
      intent: 'delete',
      action: 'delete_commitment',
      title: 'Reunião com o coordenador de campo',
      matchCount: 5,
      affectedItems: [{ id: 'a1', title: 'Reunião com o coordenador de campo', dateMs: 0 }],
      summary: 'Entendi. Encontrei 5 compromissos.',
    };
    configure({
      stage: 'success',
      proposal: deleteProposal,
      commitResult: { success: true, status: 'committed', intent: 'delete', actionId: 'act-del', idsDeleted: ['a1', 'a2'], occurrenceCount: 2 },
      canUndo: false,
    });
    render(<AgendaNexusAssistant />);
    expect(screen.getByRole('status')).toHaveTextContent('Pronto! 2 compromissos excluídos com sucesso.');
    expect(screen.getByText(/3 compromissos não foram encontrados na agenda/)).toBeInTheDocument();
  });

  it('exibe o estado Diálogo com o Nexus com bolha, pergunta e chips de resposta rápida', () => {
    const question = 'Entendi que você quer uma recorrência. Você quer que eu agende isso para todas as terças até uma data limite, ou devo preencher a terça mais próxima e gerar até o limite máximo de compromissos da sua agenda?';
    configure({
      stage: 'clarify',
      refinement: { question, suggestions: ['Até o final do ano', 'Sem prazo máximo'] },
      dialogue: [
        { role: 'user', text: 'reunião toda terça' },
        { role: 'assistant', text: question },
      ],
    });
    render(<AgendaNexusAssistant />);

    expect(screen.getByText(/Diálogo com o Nexus/)).toBeInTheDocument();
    expect(screen.getByText(question)).toBeInTheDocument();
    expect(screen.getByText('reunião toda terça')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Até o final do ano' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sem prazo máximo' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sem prazo máximo' }));
    expect(mockNexus.interpret).toHaveBeenCalledWith({ prompt: 'Sem prazo máximo' });
  });

  it('no modo diálogo usa placeholder contextual e botão Enviar', () => {
    const question = 'Você quer até uma data limite?';
    configure({
      stage: 'clarify',
      refinement: { question, suggestions: ['Até o final do ano'] },
      dialogue: [{ role: 'assistant', text: question }],
    });
    render(<AgendaNexusAssistant />);

    expect(screen.getByRole('textbox', { name: 'Comando para o Nexus' })).toHaveAttribute(
      'placeholder',
      'Digite sua resposta ou complemente a informação...',
    );
    expect(screen.getByRole('button', { name: /enviar/i })).toBeInTheDocument();
  });

  it('empilha múltiplas trocas do diálogo como mini-histórico', () => {
    const firstQuestion = 'Você quer até uma data limite?';
    const secondQuestion = 'Entendi. E confirma o limite?';
    configure({
      stage: 'clarify',
      refinement: { question: secondQuestion, suggestions: ['Confirmar'] },
      dialogue: [
        { role: 'user', text: 'reunião toda terça' },
        { role: 'assistant', text: firstQuestion },
        { role: 'user', text: 'até o fim de setembro' },
        { role: 'assistant', text: secondQuestion },
      ],
    });
    render(<AgendaNexusAssistant />);

    expect(screen.getByText('reunião toda terça')).toBeInTheDocument();
    expect(screen.getByText(firstQuestion)).toBeInTheDocument();
    expect(screen.getByText('até o fim de setembro')).toBeInTheDocument();
    expect(screen.getByText(secondQuestion)).toBeInTheDocument();
  });

  it('mantém a thread visível quando a proposta chega e inclui o resumo do assistente', () => {
    configure({
      stage: 'done',
      proposal,
      dialogue: [
        { role: 'user', text: 'reunião toda terça' },
        { role: 'assistant', text: 'Entendi que você quer uma recorrência.' },
        { role: 'user', text: 'até o fim de setembro' },
        { role: 'assistant', text: 'Criar reunião recorrente.' },
      ],
    });
    render(<AgendaNexusAssistant />);

    expect(screen.getByText(/Diálogo com o Nexus/)).toBeInTheDocument();
    expect(screen.getByText('Criar reunião recorrente.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Comando para o Nexus' })).toHaveAttribute(
      'placeholder',
      'Digite sua resposta ou complemente a informação...',
    );
  });

  it('prioriza a thread de diálogo e oculta os painéis técnicos na clarificação', () => {
    configure({
      stage: 'clarify',
      missing: ['title'],
      ambiguous: ['data não identificada'],
      dialogue: [
        { role: 'user', text: 'marque algo' },
        { role: 'assistant', text: 'data não identificada' },
      ],
    });
    render(<AgendaNexusAssistant />);

    expect(screen.getByText(/Diálogo com o Nexus/)).toBeInTheDocument();
    expect(screen.getByText('marque algo')).toBeInTheDocument();
    expect(screen.getAllByText(/data não identificada/)).toHaveLength(1);
    expect(screen.queryByText(/Faltam informações/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Preciso esclarecer/)).not.toBeInTheDocument();
  });

  it('não mostra a pergunta técnica (ex.: "Informe title.") em nenhuma superfície', () => {
    configure({
      stage: 'clarify',
      missing: ['title'],
      ambiguous: [],
      dialogue: [
        { role: 'user', text: 'marque algo' },
        { role: 'assistant', text: 'Informe, por favor, o título do compromisso.' },
      ],
    });
    render(<AgendaNexusAssistant />);

    expect(screen.queryByText(/Informe title\./)).not.toBeInTheDocument();
    expect(screen.queryByText(/title/)).not.toBeInTheDocument();
    expect(screen.getByText('Informe, por favor, o título do compromisso.')).toBeInTheDocument();
  });

  it('fluxo real: pergunta natural de horário sem erro nem painel técnico e campo ativo', () => {
    const timeQuestion = 'Você quer inserir o horário neste compromisso?';
    configure({
      stage: 'clarify',
      missing: ['startTime'],
      ambiguous: [],
      dialogue: [
        { role: 'user', text: 'Agende uma reunião para mim para amanhã.' },
        { role: 'assistant', text: timeQuestion },
      ],
    });
    render(<AgendaNexusAssistant />);

    expect(screen.getByText(timeQuestion)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/Faltam informações/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Informe title\./)).not.toBeInTheDocument();
    expect(screen.queryByText(/Não consegui estruturar esse comando de agenda\./)).not.toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: 'Comando para o Nexus' });
    expect(input).toBeEnabled();
    expect(input).toHaveAttribute('placeholder', 'Digite sua resposta ou complemente a informação...');
  });

  it('fluxo real: após "Às 20h." exibe proposta confirmável com o horário', () => {
    const timeQuestion = 'Você quer inserir o horário neste compromisso?';
    const twoTurnProposal = {
      intent: 'create',
      action: 'create_commitment',
      title: 'Reunião 20h',
      firstDate: '2026-08-13',
      lastDate: '2026-08-13',
      startTime: '20:00',
      endTime: undefined,
      occurrenceCount: 1,
      summary: 'Agendar reunião.',
    };
    configure({
      stage: 'done',
      proposal: twoTurnProposal,
      dialogue: [
        { role: 'user', text: 'Agende uma reunião para mim para amanhã.' },
        { role: 'assistant', text: timeQuestion },
        { role: 'user', text: 'Às 20h.' },
      ],
    });
    render(<AgendaNexusAssistant />);

    expect(screen.getByRole('heading', { name: 'Revise antes de confirmar' })).toBeInTheDocument();
    expect(screen.getByText('Reunião 20h')).toBeInTheDocument();
    expect(screen.getByText('13/08/2026')).toBeInTheDocument();
    expect(screen.getByText('20:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rola a thread até o fim quando o diálogo muda', () => {
    const scrollTo = vi.fn();
    Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
    try {
      configure({
        stage: 'clarify',
        dialogue: [{ role: 'user', text: 'marque algo' }],
      });
      render(<AgendaNexusAssistant />);
      expect(scrollTo).toHaveBeenCalledWith({ top: expect.any(Number), behavior: 'smooth' });
    } finally {
      delete (Element.prototype as { scrollTo?: unknown }).scrollTo;
    }
  });

  it('sem thread, uma proposta mostra o placeholder padrão e botão Enviar', () => {
    configure({ stage: 'done', proposal });
    render(<AgendaNexusAssistant />);

    expect(screen.queryByText(/Diálogo com o Nexus/)).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Comando para o Nexus' })).toHaveAttribute(
      'placeholder',
      'Ex.: reunião toda terça, às 17h, até novembro',
    );
    expect(screen.getByRole('button', { name: /enviar/i })).toBeInTheDocument();
  });

  it('mantém as listas clássicas de esclarecimento quando não há refinamento', () => {
    configure({
      stage: 'clarify',
      missing: ['local'],
      ambiguous: ['Qual terça-feira?'],
    });
    render(<AgendaNexusAssistant />);
    expect(screen.queryByText(/Diálogo com o Nexus/)).not.toBeInTheDocument();
    expect(screen.getByText(/local/)).toBeInTheDocument();
    expect(screen.getByText(/Qual terça-feira/)).toBeInTheDocument();
  });

  it('marca a proposta como Aguardando confirmação', () => {
    configure({ stage: 'done', proposal });
    render(<AgendaNexusAssistant />);
    expect(screen.getByText('Aguardando confirmação')).toBeInTheDocument();
  });
});
