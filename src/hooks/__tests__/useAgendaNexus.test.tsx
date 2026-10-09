import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const callableMocks = vi.hoisted(() => ({
  interpret: vi.fn(),
  commit: vi.fn(),
  undo: vi.fn(),
}));

vi.mock('../../firebase', () => ({ functions: {} }));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn((_functions: unknown, name: string) => {
    if (name === 'nexusAgendaInterpret') return callableMocks.interpret;
    if (name === 'nexusAgendaCommit') return callableMocks.commit;
    if (name === 'nexusAgendaUndo') return callableMocks.undo;
    throw new Error(`Callable inesperado: ${name}`);
  }),
}));

import { useAgendaNexus, type AgendaNexusCommitResult } from '../useAgendaNexus';

const proposalResponse = {
  success: true,
  outcome: 'proposal',
  status: 'awaiting_confirmation',
  confirmationToken: 'token-1',
  expiresAtMs: Date.now() + 600000,
  recap: {
    intent: 'create',
    action: 'create_commitment',
    title: 'Reunião',
    firstDate: '2026-08-18',
    lastDate: '2026-08-18',
    occurrenceCount: 1,
    summary: 'Criar reunião.',
  },
  warnings: [],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useAgendaNexus', () => {
  beforeEach(() => {
    vi.useRealTimers();
    callableMocks.interpret.mockReset();
    callableMocks.commit.mockReset();
    callableMocks.undo.mockReset();
  });

  it('inicia em idle sem proposta ou resultado', () => {
    const { result } = renderHook(() => useAgendaNexus());
    expect(result.current.stage).toBe('idle');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.proposal).toBeNull();
    expect(result.current.commitResult).toBeNull();
    expect(result.current.canUndo).toBe(false);
  });

  it('interpreta uma proposta e vai para done sem commit automático', async () => {
    callableMocks.interpret.mockResolvedValue({ data: proposalResponse });
    const { result } = renderHook(() => useAgendaNexus());

    await act(async () => {
      await result.current.interpret({ prompt: 'marque reunião' });
    });

    expect(result.current.stage).toBe('done');
    expect(result.current.proposal?.title).toBe('Reunião');
    expect(result.current.isLoading).toBe(false);
    expect(callableMocks.commit).not.toHaveBeenCalled();
  });

  it('transita para clarify com campos ausentes e ambiguidades', async () => {
    callableMocks.interpret.mockResolvedValue({
      data: {
        success: true,
        outcome: 'clarification',
        clarification: {
          missing: ['title'],
          ambiguous: ['data não identificada'],
          questions: ['Qual título?'],
        },
      },
    });
    const { result } = renderHook(() => useAgendaNexus());

    await act(async () => {
      await result.current.interpret({ prompt: 'marque algo' });
    });

    expect(result.current.stage).toBe('clarify');
    expect(result.current.missing).toEqual(['title']);
    expect(result.current.ambiguous).toEqual(['data não identificada']);
  });

  it('prioriza a pergunta natural `question` do backend sobre questions e ambiguous', async () => {
    callableMocks.interpret.mockResolvedValue({
      data: {
        success: true,
        outcome: 'clarification',
        clarification: {
          missing: ['title'],
          ambiguous: ['mensagem qualquer'],
          questions: ['Qual nome você deseja dar a esse compromisso?'],
        },
        question: 'Qual será o título do compromisso?',
      },
    });
    const { result } = renderHook(() => useAgendaNexus());

    await act(async () => { await result.current.interpret({ prompt: 'marque algo' }); });

    expect(result.current.dialogue).toContainEqual({ role: 'assistant', text: 'Qual será o título do compromisso?' });
    expect(result.current.dialogue).not.toContainEqual({ role: 'assistant', text: 'mensagem qualquer' });
  });

  it('usa questions[0] do backend quando question não está presente', async () => {
    callableMocks.interpret.mockResolvedValue({
      data: {
        success: true,
        outcome: 'clarification',
        clarification: {
          missing: ['title'],
          ambiguous: [],
          questions: ['Qual nome você deseja dar a esse compromisso?'],
        },
      },
    });
    const { result } = renderHook(() => useAgendaNexus());

    await act(async () => { await result.current.interpret({ prompt: 'marque algo' }); });

    expect(result.current.dialogue).toContainEqual({ role: 'assistant', text: 'Qual nome você deseja dar a esse compromisso?' });
  });

  it('usa ambiguous[0] quando question e questions não existem', async () => {
    callableMocks.interpret.mockResolvedValue({
      data: {
        success: true,
        outcome: 'clarification',
        clarification: {
          missing: ['title'],
          ambiguous: ['Qual nome você deseja dar a esse compromisso?'],
          questions: [],
        },
      },
    });
    const { result } = renderHook(() => useAgendaNexus());

    await act(async () => { await result.current.interpret({ prompt: 'marque algo' }); });

    expect(result.current.dialogue).toContainEqual({ role: 'assistant', text: 'Qual nome você deseja dar a esse compromisso?' });
  });

  it('gera fallback natural a partir de missing quando não há texto natural', async () => {
    callableMocks.interpret.mockResolvedValue({
      data: {
        success: true,
        outcome: 'clarification',
        clarification: { missing: ['title'], ambiguous: [], questions: [] },
      },
    });
    const { result } = renderHook(() => useAgendaNexus());

    await act(async () => { await result.current.interpret({ prompt: 'marque algo' }); });

    expect(result.current.dialogue).toContainEqual({ role: 'assistant', text: 'Informe, por favor, o título do compromisso.' });
    expect(result.current.dialogue.join(' ')).not.toContain('title');
  });

  it('filtra perguntas técnicas do backend (ex.: "Informe title.") e usa o fallback natural', async () => {
    callableMocks.interpret.mockResolvedValue({
      data: {
        success: true,
        outcome: 'clarification',
        clarification: { missing: ['title'], ambiguous: [], questions: ['Informe title.'] },
      },
    });
    const { result } = renderHook(() => useAgendaNexus());

    await act(async () => { await result.current.interpret({ prompt: 'marque algo' }); });

    expect(result.current.dialogue.join(' ')).not.toContain('Informe title.');
    expect(result.current.dialogue).toContainEqual({ role: 'assistant', text: 'Informe, por favor, o título do compromisso.' });
  });

  it('fluxo real: clarify de horário vira mensagem natural e "Às 20h." reenvia com histórico', async () => {
    const timeQuestion = 'Você quer inserir o horário neste compromisso?';
    callableMocks.interpret.mockResolvedValueOnce({
      data: {
        success: true,
        outcome: 'clarification',
        clarification: {
          missing: ['startTime'],
          ambiguous: [],
          questions: [timeQuestion],
        },
        question: timeQuestion,
      },
    });
    callableMocks.interpret.mockResolvedValueOnce({ data: proposalResponse });
    const { result } = renderHook(() => useAgendaNexus());

    await act(async () => {
      await result.current.interpret({ prompt: 'Agende uma reunião para mim para amanhã.' });
    });

    expect(result.current.stage).toBe('clarify');
    expect(result.current.error).toBeNull();
    expect(result.current.dialogue).toContainEqual({ role: 'assistant', text: timeQuestion });
    expect(result.current.dialogue.join(' ')).not.toContain('Não consegui estruturar esse comando de agenda.');

    await act(async () => {
      await result.current.interpret({ prompt: 'Às 20h.' });
    });

    expect(callableMocks.interpret).toHaveBeenCalledTimes(2);
    const secondCall = callableMocks.interpret.mock.calls[1][0] as { prompt: string; history: Array<{ role: string; text: string }> };
    expect(secondCall.prompt).toBe('Às 20h.');
    expect(secondCall.history).toEqual([
      { role: 'user', text: 'Agende uma reunião para mim para amanhã.' },
      { role: 'assistant', text: timeQuestion },
    ]);
    expect(result.current.stage).toBe('done');
  });

  it('preserva assumptions retornadas pelo backend', async () => {
    callableMocks.interpret.mockResolvedValue({ data: { ...proposalResponse, assumptions: [{ field: 'timeZone', note: 'SP' }] } });
    const { result } = renderHook(() => useAgendaNexus());
    await act(async () => { await result.current.interpret({ prompt: 'reunião' }); });
    expect(result.current.assumptions).toEqual([{ field: 'timeZone', note: 'SP' }]);
  });

  it('trata erro estruturado da Function', async () => {
    callableMocks.interpret.mockResolvedValue({ data: { success: false, error: 'Data inválida.' } });
    const { result } = renderHook(() => useAgendaNexus());
    await act(async () => { await result.current.interpret({ prompt: 'reunião' }); });
    expect(result.current.stage).toBe('error');
    expect(result.current.error).toBe('Data inválida.');
  });

  it('trata erro de rede ou callable rejeitada', async () => {
    callableMocks.interpret.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useAgendaNexus());
    await act(async () => { await result.current.interpret({ prompt: 'reunião' }); });
    expect(result.current.stage).toBe('error');
    expect(result.current.error).toBe('network down');
  });

  it('bloqueia commit sem confirmationToken', async () => {
    const { result } = renderHook(() => useAgendaNexus());
    let returned: unknown;
    await act(async () => { returned = await result.current.commit(); });
    expect(returned).toBeNull();
    expect(result.current.stage).toBe('error');
    expect(result.current.error).toContain('proposta confirmável');
    expect(callableMocks.commit).not.toHaveBeenCalled();
  });

  it('envia ao commit somente confirmationToken e confirmed true', async () => {
    callableMocks.interpret.mockResolvedValue({ data: proposalResponse });
    callableMocks.commit.mockResolvedValue({ data: { success: true, status: 'committed', actionId: 'act-1', idsCreated: ['c-1'] } });
    const { result } = renderHook(() => useAgendaNexus());
    await act(async () => { await result.current.interpret({ prompt: 'reunião' }); });
    await act(async () => { await result.current.commit(); });
    expect(callableMocks.commit).toHaveBeenCalledWith({ confirmationToken: 'token-1', confirmed: true });
  });

  it('envia reminderMode notification ao commit quando o usuário escolhe apenas notificação', async () => {
    callableMocks.interpret.mockResolvedValue({ data: proposalResponse });
    callableMocks.commit.mockResolvedValue({ data: { success: true, status: 'committed', actionId: 'act-1', idsCreated: ['c-1'] } });
    const { result } = renderHook(() => useAgendaNexus());
    await act(async () => { await result.current.interpret({ prompt: 'reunião' }); });
    await act(async () => { await result.current.commit(undefined, { reminderMode: 'notification' }); });
    expect(callableMocks.commit).toHaveBeenCalledWith({ confirmationToken: 'token-1', confirmed: true, reminderMode: 'notification' });
  });

  it('envia reminderMode notification_alarm ao commit para notificação + alarme', async () => {
    callableMocks.interpret.mockResolvedValue({ data: proposalResponse });
    callableMocks.commit.mockResolvedValue({ data: { success: true, status: 'committed', actionId: 'act-1', idsCreated: ['c-1'] } });
    const { result } = renderHook(() => useAgendaNexus());
    await act(async () => { await result.current.interpret({ prompt: 'reunião' }); });
    await act(async () => { await result.current.commit(undefined, { reminderMode: 'notification_alarm' }); });
    expect(callableMocks.commit).toHaveBeenCalledWith({ confirmationToken: 'token-1', confirmed: true, reminderMode: 'notification_alarm' });
  });

  it('omite alarm e reminderMode do commit quando a escolha é sem aviso', async () => {
    callableMocks.interpret.mockResolvedValue({ data: proposalResponse });
    callableMocks.commit.mockResolvedValue({ data: { success: true, status: 'committed', actionId: 'act-1', idsCreated: ['c-1'] } });
    const { result } = renderHook(() => useAgendaNexus());
    await act(async () => { await result.current.interpret({ prompt: 'reunião' }); });
    await act(async () => { await result.current.commit(undefined, { reminderMode: 'none' }); });
    expect(callableMocks.commit).toHaveBeenCalledWith({ confirmationToken: 'token-1', confirmed: true });
  });

  it('mantém compatibilidade: alarm true vira notification', async () => {
    callableMocks.interpret.mockResolvedValue({ data: proposalResponse });
    callableMocks.commit.mockResolvedValue({ data: { success: true, status: 'committed', actionId: 'act-1', idsCreated: ['c-1'] } });
    const { result } = renderHook(() => useAgendaNexus());
    await act(async () => { await result.current.interpret({ prompt: 'reunião' }); });
    await act(async () => { await result.current.commit(undefined, { alarm: true }); });
    expect(callableMocks.commit).toHaveBeenCalledWith({ confirmationToken: 'token-1', confirmed: true, alarm: true });
  });

  it('vai para success e prepara undo sem executar nexusAgendaUndo', async () => {
    callableMocks.interpret.mockResolvedValue({ data: proposalResponse });
    callableMocks.commit.mockResolvedValue({ data: { success: true, status: 'committed', actionId: 'act-1', idsCreated: ['c-1'] } });
    const { result } = renderHook(() => useAgendaNexus());
    await act(async () => { await result.current.interpret({ prompt: 'reunião' }); });
    await act(async () => { await result.current.commit(); });
    expect(result.current.stage).toBe('success');
    expect(result.current.commitResult?.actionId).toBe('act-1');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.undoContract).toEqual({ actionId: 'act-1', confirmationToken: 'token-1' });
    expect(callableMocks.commit).toHaveBeenCalledTimes(1);
  });

  it('vai para partial e não trata operação parcial como sucesso completo', async () => {
    callableMocks.interpret.mockResolvedValue({ data: proposalResponse });
    callableMocks.commit.mockResolvedValue({ data: { success: false, status: 'partial', actionId: 'act-1', idsCreated: ['c-1'], message: 'Reconciliação necessária.' } });
    const { result } = renderHook(() => useAgendaNexus());
    await act(async () => { await result.current.interpret({ prompt: 'reunião' }); });
    await act(async () => { await result.current.commit(); });
    expect(result.current.stage).toBe('partial');
    expect(result.current.commitResult?.idsCreated).toEqual(['c-1']);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.error).toBe('Reconciliação necessária.');
  });

  it('trata token expirado como erro', async () => {
    callableMocks.interpret.mockResolvedValue({ data: proposalResponse });
    callableMocks.commit.mockRejectedValue({ code: 'deadline-exceeded', message: 'A proposta expirou.' });
    const { result } = renderHook(() => useAgendaNexus());
    await act(async () => { await result.current.interpret({ prompt: 'reunião' }); });
    await act(async () => { await result.current.commit(); });
    expect(result.current.stage).toBe('error');
    expect(result.current.error).toBe('A proposta expirou.');
  });

  it('bloqueia dois commits simultâneos', async () => {
    callableMocks.interpret.mockResolvedValue({ data: proposalResponse });
    const pending = deferred<{ data: AgendaNexusCommitResult }>();
    callableMocks.commit.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useAgendaNexus());
    await act(async () => { await result.current.interpret({ prompt: 'reunião' }); });

    let second: unknown;
    await act(async () => {
      void result.current.commit();
      second = await result.current.commit();
    });
    expect(second).toBeNull();
    expect(callableMocks.commit).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve({ data: { success: true, status: 'committed', actionId: 'a' } }); });
  });

  it('cancela interpretação e ignora resposta atrasada', async () => {
    const pending = deferred<{ data: typeof proposalResponse }>();
    callableMocks.interpret.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useAgendaNexus());
    let interpretation: unknown;
    await act(async () => {
      void (async () => { interpretation = await result.current.interpret({ prompt: 'reunião' }); })();
    });
    act(() => { result.current.cancel(); });
    await act(async () => { pending.resolve({ data: proposalResponse }); });
    expect(interpretation).toBeNull();
    expect(result.current.stage).toBe('cancelled');
    expect(result.current.proposal).toBeNull();
  });

  it('reseta completamente o estado', async () => {
    callableMocks.interpret.mockResolvedValue({ data: proposalResponse });
    const { result } = renderHook(() => useAgendaNexus());
    await act(async () => { await result.current.interpret({ prompt: 'reunião' }); });
    act(() => { result.current.reset(); });
    expect(result.current.stage).toBe('idle');
    expect(result.current.proposal).toBeNull();
    expect(result.current.commitResult).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.missing).toEqual([]);
    expect(result.current.ambiguous).toEqual([]);
    expect(result.current.canUndo).toBe(false);
  });

  it('limpa timers progressivos ao cancelar', async () => {
    vi.useFakeTimers();
    const pending = deferred<{ data: typeof proposalResponse }>();
    callableMocks.interpret.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useAgendaNexus());
    act(() => { void result.current.interpret({ prompt: 'reunião' }); });
    expect(vi.getTimerCount()).toBe(2);
    act(() => { result.current.cancel(); });
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => { pending.resolve({ data: proposalResponse }); });
  });

  it('interpreta proposta de exclusão e confirma sem oferecer desfazer', async () => {
    callableMocks.interpret.mockResolvedValue({
      data: {
        success: true,
        outcome: 'proposal',
        status: 'awaiting_confirmation',
        confirmationToken: 'token-del',
        expiresAtMs: Date.now() + 600000,
        recap: {
          intent: 'delete',
          action: 'delete_commitment',
          title: 'Reunião com o coordenador de campo',
          matchCount: 2,
          affectedItems: [
            { id: 'a1', title: 'Reunião com o coordenador de campo', dateMs: 0 },
            { id: 'a2', title: 'Reunião com o coordenador de campo', dateMs: 0 },
          ],
          summary: 'Entendi. Encontrei 2 compromissos com esse nome. Pretendo excluí-los permanentemente. Posso prosseguir?',
        },
        warnings: [],
      },
    });
    callableMocks.commit.mockResolvedValue({
      data: { success: true, status: 'committed', intent: 'delete', actionId: 'act-del', idsDeleted: ['a1', 'a2'], occurrenceCount: 2 },
    });
    const { result } = renderHook(() => useAgendaNexus());

    await act(async () => { await result.current.interpret({ prompt: 'excluir todos' }); });
    expect(result.current.stage).toBe('done');
    expect(result.current.proposal?.matchCount).toBe(2);
    expect(Array.isArray(result.current.proposal?.affectedItems)).toBe(true);

    await act(async () => { await result.current.commit(); });
    expect(callableMocks.commit).toHaveBeenCalledWith({ confirmationToken: 'token-del', confirmed: true });
    expect(result.current.stage).toBe('success');
    expect(result.current.commitResult?.idsDeleted).toEqual(['a1', 'a2']);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.undoContract).toBeNull();
  });

  it('entra em refinamento e mantém o histórico do diálogo para a próxima interpretação', async () => {
    const question = 'Entendi que você quer uma recorrência. Você quer até uma data limite ou até o limite da agenda?';
    callableMocks.interpret.mockResolvedValueOnce({
      data: {
        success: true,
        outcome: 'clarification',
        clarification: {
          missing: [],
          ambiguous: [],
          questions: [question],
          refinement: { question, suggestions: ['Até o final do ano', 'Sem prazo máximo'] },
        },
      },
    });
    callableMocks.interpret.mockResolvedValueOnce({
      data: {
        success: true,
        outcome: 'clarification',
        clarification: { missing: ['title'], ambiguous: [], questions: ['Qual nome você deseja dar a esse compromisso?'] },
        question: 'Qual nome você deseja dar a esse compromisso?',
      },
    });
    const { result } = renderHook(() => useAgendaNexus());

    await act(async () => { await result.current.interpret({ prompt: 'reunião toda terça' }); });
    expect(result.current.stage).toBe('clarify');
    expect(result.current.refinement?.question).toBe(question);
    expect(result.current.refinement?.suggestions).toEqual(['Até o final do ano', 'Sem prazo máximo']);

    await act(async () => { await result.current.interpret({ prompt: 'até o fim de setembro' }); });
    expect(callableMocks.interpret).toHaveBeenCalledTimes(2);
    const secondCall = callableMocks.interpret.mock.calls[1][0] as { prompt: string; history: Array<{ role: string; text: string }> };
    expect(secondCall.prompt).toBe('até o fim de setembro');
    expect(secondCall.history).toEqual([
      { role: 'user', text: 'reunião toda terça' },
      { role: 'assistant', text: question },
    ]);
    expect(result.current.dialogue).toContainEqual({
      role: 'assistant',
      text: 'Qual nome você deseja dar a esse compromisso?',
    });
    expect(result.current.dialogue.join(' ')).not.toContain('Informe title.');
  });

  it('mantém o histórico após uma proposta e inclui o resumo como mensagem do assistente', async () => {
    const question = 'Entendi que você quer uma recorrência. Você quer até uma data limite ou até o limite da agenda?';
    callableMocks.interpret.mockResolvedValueOnce({
      data: {
        success: true,
        outcome: 'clarification',
        clarification: {
          missing: [],
          ambiguous: [],
          questions: [question],
          refinement: { question, suggestions: ['Até o final do ano', 'Sem prazo máximo'] },
        },
      },
    });
    callableMocks.interpret.mockResolvedValueOnce({ data: proposalResponse });
    const { result } = renderHook(() => useAgendaNexus());

    await act(async () => { await result.current.interpret({ prompt: 'reunião toda terça' }); });
    expect(result.current.stage).toBe('clarify');
    await act(async () => { await result.current.interpret({ prompt: 'até o fim de setembro' }); });
    expect(result.current.stage).toBe('done');

    const secondCall = callableMocks.interpret.mock.calls[1][0] as { prompt: string; history: Array<{ role: string; text: string }> };
    expect(secondCall.history).toEqual([
      { role: 'user', text: 'reunião toda terça' },
      { role: 'assistant', text: question },
    ]);

    callableMocks.interpret.mockResolvedValueOnce({ data: proposalResponse });
    await act(async () => { await result.current.interpret({ prompt: 'nova reunião' }); });
    const thirdCall = callableMocks.interpret.mock.calls[2][0] as { prompt: string; history: Array<{ role: string; text: string }> };
    expect(thirdCall.history).toEqual([
      { role: 'user', text: 'reunião toda terça' },
      { role: 'assistant', text: question },
      { role: 'user', text: 'até o fim de setembro' },
      { role: 'assistant', text: 'Criar reunião.' },
    ]);
  });

  it('expoe o estado dialogue como thread contínua e não limpa após proposta', async () => {
    const question = 'Entendi que você quer uma recorrência. Você quer até uma data limite ou até o limite da agenda?';
    callableMocks.interpret.mockResolvedValueOnce({
      data: {
        success: true,
        outcome: 'clarification',
        clarification: {
          missing: [],
          ambiguous: [],
          questions: [question],
          refinement: { question, suggestions: ['Até o final do ano', 'Sem prazo máximo'] },
        },
      },
    });
    callableMocks.interpret.mockResolvedValueOnce({ data: proposalResponse });
    const { result } = renderHook(() => useAgendaNexus());

    await act(async () => { await result.current.interpret({ prompt: 'reunião toda terça' }); });
    expect(result.current.dialogue).toEqual([
      { role: 'user', text: 'reunião toda terça' },
      { role: 'assistant', text: question },
    ]);

    await act(async () => { await result.current.interpret({ prompt: 'até o fim de setembro' }); });
    expect(result.current.stage).toBe('done');
    expect(result.current.dialogue).toEqual([
      { role: 'user', text: 'reunião toda terça' },
      { role: 'assistant', text: question },
      { role: 'user', text: 'até o fim de setembro' },
      { role: 'assistant', text: 'Criar reunião.' },
    ]);
  });

  it('empilha múltiplas trocas de refinamento na thread do dialogue', async () => {
    const firstQuestion = 'Você quer até uma data limite?';
    const secondQuestion = 'Entendi. Confirma o limite?';
    callableMocks.interpret.mockResolvedValueOnce({
      data: {
        success: true,
        outcome: 'clarification',
        clarification: {
          missing: [],
          ambiguous: [],
          questions: [firstQuestion],
          refinement: { question: firstQuestion, suggestions: ['Até o final do ano'] },
        },
      },
    });
    callableMocks.interpret.mockResolvedValueOnce({
      data: {
        success: true,
        outcome: 'clarification',
        clarification: {
          missing: [],
          ambiguous: [],
          questions: [secondQuestion],
          refinement: { question: secondQuestion, suggestions: ['Confirmar'] },
        },
      },
    });
    const { result } = renderHook(() => useAgendaNexus());

    await act(async () => { await result.current.interpret({ prompt: 'reunião toda terça' }); });
    await act(async () => { await result.current.interpret({ prompt: 'até o fim de setembro' }); });

    expect(result.current.dialogue).toEqual([
      { role: 'user', text: 'reunião toda terça' },
      { role: 'assistant', text: firstQuestion },
      { role: 'user', text: 'até o fim de setembro' },
      { role: 'assistant', text: secondQuestion },
    ]);
  });

  it('expõe thread de dialogue também na clarificação clássica sem refinement', async () => {
    callableMocks.interpret.mockResolvedValue({
      data: {
        success: true,
        outcome: 'clarification',
        clarification: {
          missing: ['title'],
          ambiguous: ['data não identificada'],
          questions: ['Qual título?'],
        },
      },
    });
    const { result } = renderHook(() => useAgendaNexus());
    await act(async () => { await result.current.interpret({ prompt: 'marque algo' }); });
    expect(result.current.stage).toBe('clarify');
    expect(result.current.dialogue).toEqual([
      { role: 'user', text: 'marque algo' },
      { role: 'assistant', text: 'Qual título?' },
    ]);
  });

  it('mantém a thread visível após falha de rede para nova tentativa em texto livre', async () => {
    callableMocks.interpret.mockResolvedValue({
      data: {
        success: true,
        outcome: 'clarification',
        clarification: {
          missing: ['title'],
          ambiguous: ['data não identificada'],
          questions: ['Qual título?'],
        },
      },
    });
    const { result } = renderHook(() => useAgendaNexus());
    await act(async () => { await result.current.interpret({ prompt: 'marque algo' }); });
    expect(result.current.dialogue).toHaveLength(2);

    callableMocks.interpret.mockRejectedValue(new Error('network down'));
    await act(async () => { await result.current.interpret({ prompt: 'continua?' }); });
    expect(result.current.stage).toBe('error');
    expect(result.current.dialogue).toHaveLength(3);
  });

  it('limita a thread a 24 mensagens sem descartar as mais recentes', async () => {
    const clarifyResponse = {
      data: {
        success: true,
        outcome: 'clarification',
        clarification: { missing: [], ambiguous: ['Qual título?'], questions: ['Qual título?'] },
      },
    };
    callableMocks.interpret.mockResolvedValue(clarifyResponse);
    const { result } = renderHook(() => useAgendaNexus());

    for (let index = 0; index < 14; index += 1) {
      await act(async () => { await result.current.interpret({ prompt: `pergunta ${index}` }); });
    }

    expect(result.current.dialogue).toHaveLength(24);
    expect(result.current.dialogue[0]).toEqual({ role: 'user', text: 'pergunta 2' });
    expect(result.current.dialogue[23]).toEqual({ role: 'assistant', text: 'Qual título?' });
  });

  it('limpa o refinamento ao resetar e ao cancelar', async () => {
    const question = 'Entendi que você quer uma recorrência. Você quer até uma data limite ou até o limite da agenda?';
    callableMocks.interpret.mockResolvedValue({
      data: {
        success: true,
        outcome: 'clarification',
        clarification: {
          missing: [],
          ambiguous: [],
          questions: [question],
          refinement: { question, suggestions: ['Até o final do ano', 'Sem prazo máximo'] },
        },
      },
    });
    const { result } = renderHook(() => useAgendaNexus());

    await act(async () => { await result.current.interpret({ prompt: 'reunião toda terça' }); });
    expect(result.current.refinement?.question).toBe(question);

    act(() => { result.current.cancel(); });
    expect(result.current.refinement).toBeNull();

    await act(async () => { await result.current.interpret({ prompt: 'reunião toda terça' }); });
    expect(result.current.refinement?.question).toBe(question);
    act(() => { result.current.reset(); });
    expect(result.current.refinement).toBeNull();
  });

  it('interpreta proposta de edição com before/after e confirma sem oferecer desfazer', async () => {
    callableMocks.interpret.mockResolvedValue({
      data: {
        success: true,
        outcome: 'proposal',
        status: 'awaiting_confirmation',
        confirmationToken: 'token-edit',
        expiresAtMs: Date.now() + 600000,
        recap: {
          intent: 'edit',
          action: 'edit_commitment',
          title: 'Reunião com o coordenador',
          firstDate: '2026-08-18',
          lastDate: '2026-08-18',
          occurrenceCount: 1,
          summary: 'Entendi! Vou editar alterando o início para 19:00. Confirma?',
          before: { title: 'Reunião com o coordenador', date: '2026-08-18', startTime: '17:00', endTime: '18:00' },
          after: { title: 'Reunião com o coordenador', date: '2026-08-18', startTime: '19:00', endTime: '20:00' },
        },
        warnings: [],
      },
    });
    callableMocks.commit.mockResolvedValue({
      data: { success: true, status: 'committed', intent: 'edit', actionId: 'act-edit', idsEdited: ['c1'], occurrenceCount: 1 },
    });
    const { result } = renderHook(() => useAgendaNexus());

    await act(async () => { await result.current.interpret({ prompt: 'edite a reunião para as 19h' }); });
    expect(result.current.stage).toBe('done');
    expect(result.current.proposal?.before).toMatchObject({ startTime: '17:00' });
    expect(result.current.proposal?.after).toMatchObject({ startTime: '19:00' });

    await act(async () => { await result.current.commit(); });
    expect(callableMocks.commit).toHaveBeenCalledWith({ confirmationToken: 'token-edit', confirmed: true });
    expect(result.current.stage).toBe('success');
    expect(result.current.commitResult?.idsEdited).toEqual(['c1']);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.undoContract).toBeNull();
  });

  it('desfaz criação com sucesso (undone) e limpa o contrato', async () => {
    callableMocks.interpret.mockResolvedValue({ data: proposalResponse });
    callableMocks.commit.mockResolvedValue({ data: { success: true, status: 'committed', actionId: 'act-1', idsCreated: ['c-1'] } });
    callableMocks.undo.mockResolvedValue({ data: { success: true, status: 'undone', actionId: 'act-1', idsRemoved: ['c-1'] } });
    const { result } = renderHook(() => useAgendaNexus());

    await act(async () => { await result.current.interpret({ prompt: 'reunião' }); });
    await act(async () => { await result.current.commit(); });
    expect(result.current.canUndo).toBe(true);

    await act(async () => { await result.current.undo(); });
    expect(callableMocks.undo).toHaveBeenCalledWith({ actionId: 'act-1' });
    expect(result.current.stage).toBe('undone');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.undoContract).toBeNull();
  });

  it('undo parcial estruturado vai para partial sem regex de mensagem (B3)', async () => {
    callableMocks.interpret.mockResolvedValue({ data: proposalResponse });
    callableMocks.commit.mockResolvedValue({ data: { success: true, status: 'committed', actionId: 'act-1', idsCreated: ['c-1', 'c-2'] } });
    callableMocks.undo.mockResolvedValue({
      data: { success: false, status: 'partial', actionId: 'act-1', idsRemoved: ['c-1'], error: 'Falha ao remover c-2.' },
    });
    const { result } = renderHook(() => useAgendaNexus());

    await act(async () => { await result.current.interpret({ prompt: 'reunião' }); });
    await act(async () => { await result.current.commit(); });
    await act(async () => { await result.current.undo(); });

    expect(result.current.stage).toBe('partial');
    expect(result.current.error).toBe('Falha ao remover c-2.');
    expect(result.current.commitResult).toMatchObject({ status: 'partial' });
  });
});
