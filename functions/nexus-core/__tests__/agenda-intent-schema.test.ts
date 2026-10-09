import { describe, it, expect } from 'vitest';
import {
  parseAgendaEnvelope,
  parseAndValidateAgendaEnvelope,
  validateAgendaEnvelope,
  actionMatchesIntent,
  type AgendaEnvelope,
} from '../agenda-intent-schema';

const VALID_CREATE_ENVELOPE: AgendaEnvelope = {
  intent: 'create',
  action: 'create_commitment',
  entities: {
    title: 'Reunião com o coordenador',
    date: {
      expression: 'próxima terça-feira',
      resolved: '2026-08-18',
      confidence: 'high',
    },
    startTime: '17:00',
    endTime: '18:00',
    recurrence: {
      freq: 'weekly',
      byDay: 2,
      until: {
        expression: 'última terça-feira de novembro de 2026',
        resolved: '2026-11-24',
        confidence: 'high',
      },
    },
    location: null,
    participants: null,
  },
  missing: ['location', 'participants'],
  ambiguous: [],
  assumptions: [
    { field: 'timeZone', note: 'adotado America/Sao_Paulo (padrão do produto)' },
  ],
};

describe('agenda-intent-schema parseAgendaEnvelope', () => {
  describe('envelopes válidos', () => {
    it('aceita o envelope completo de criação recorrente', () => {
      const raw = JSON.stringify(VALID_CREATE_ENVELOPE);
      const result = parseAgendaEnvelope(raw);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.intent).toBe('create');
        expect(result.data.entities.title).toBe('Reunião com o coordenador');
        expect(result.data.entities.recurrence?.until?.resolved).toBe('2026-11-24');
      }
    });

    it('aplica os defaults de missing, ambiguous e assumptions quando ausentes', () => {
      const raw = JSON.stringify({
        intent: 'query',
        action: 'query_commitments',
        entities: { date: { expression: 'próxima semana', resolved: '2026-08-17', confidence: 'high' } },
      });
      const result = parseAgendaEnvelope(raw);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.missing).toEqual([]);
        expect(result.data.ambiguous).toEqual([]);
        expect(result.data.assumptions).toEqual([]);
      }
    });

    it('aceita delete identificado apenas pelo título', () => {
      const raw = JSON.stringify({
        intent: 'delete',
        action: 'delete_commitment',
        entities: { title: 'Almoço com a família' },
      });
      const result = parseAgendaEnvelope(raw);

      expect(result.ok).toBe(true);
    });

    it('aceita delete com entities.filter de título', () => {
      const raw = JSON.stringify({
        intent: 'delete',
        action: 'delete_commitment',
        entities: { filter: { field: 'title', value: 'Reunião com o coordenador de campo' } },
      });
      const result = parseAgendaEnvelope(raw);

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.entities.filter?.value).toBe('Reunião com o coordenador de campo');
    });

    it('aceita create com entities.limitDate (janela relativa)', () => {
      const raw = JSON.stringify({
        ...VALID_CREATE_ENVELOPE,
        entities: {
          ...VALID_CREATE_ENVELOPE.entities,
          limitDate: { expression: 'nos próximos 5 dias', resolved: '2026-08-17', confidence: 'high' },
        },
      });
      const result = parseAgendaEnvelope(raw);

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.entities.limitDate?.resolved).toBe('2026-08-17');
    });

    it('aceita create com entities.maxSlots true', () => {
      const raw = JSON.stringify({
        ...VALID_CREATE_ENVELOPE,
        entities: { ...VALID_CREATE_ENVELOPE.entities, maxSlots: true },
      });
      const result = parseAgendaEnvelope(raw);

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.entities.maxSlots).toBe(true);
    });
  });

  describe('JSON malformado', () => {
    it('rejeita entrada que não é string', () => {
      for (const bad of [undefined, null, 42, { intent: 'create' }, ['x']]) {
        const result = parseAgendaEnvelope(bad as unknown);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.errors[0]).toContain('string JSON');
        }
      }
    });

    it('rejeita string que não é JSON', () => {
      const result = parseAgendaEnvelope('isto não é json');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors[0]).toContain('JSON');
    });

    it('rejeita JSON que não é um objeto', () => {
      for (const raw of ['[]', '"str"', '42', 'true']) {
        const result = parseAgendaEnvelope(raw);
        expect(result.ok).toBe(false);
      }
    });
  });

  describe('campos obrigatórios ausentes / tipos inválidos', () => {
    it('rejeita envelope sem intent', () => {
      const raw = JSON.stringify({ action: 'create_commitment', entities: {} });
      const result = parseAgendaEnvelope(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join('\n')).toContain('intent');
    });

    it('rejeita intent fora do enum', () => {
      const raw = JSON.stringify({ intent: 'destroy', action: 'create_commitment', entities: {} });
      const result = parseAgendaEnvelope(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join('\n')).toContain('intent');
    });

    it('rejeita action fora do enum', () => {
      const raw = JSON.stringify({ intent: 'create', action: 'hack', entities: {} });
      const result = parseAgendaEnvelope(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join('\n')).toContain('action');
    });

    it('rejeita envelope sem entities', () => {
      const raw = JSON.stringify({ intent: 'create', action: 'create_commitment' });
      const result = parseAgendaEnvelope(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join('\n')).toContain('entities');
    });

    it('rejeita entities que não é objeto (array)', () => {
      const raw = JSON.stringify({ intent: 'create', action: 'create_commitment', entities: ['a'] });
      const result = parseAgendaEnvelope(raw);
      expect(result.ok).toBe(false);
    });

    it('rejeita campos extras no envelope (.strict)', () => {
      const raw = JSON.stringify({ ...VALID_CREATE_ENVELOPE, extraField: true });
      const result = parseAgendaEnvelope(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join('\n')).toContain('Unrecognized key');
    });

    it('rejeita campos extras dentro de entities (.strict)', () => {
      const raw = JSON.stringify({
        ...VALID_CREATE_ENVELOPE,
        entities: { ...VALID_CREATE_ENVELOPE.entities, novelField: 'x' },
      });
      const result = parseAgendaEnvelope(raw);
      expect(result.ok).toBe(false);
    });

    it('rejeita missing que não é array de strings', () => {
      const raw = JSON.stringify({ ...VALID_CREATE_ENVELOPE, missing: 'location' });
      const result = parseAgendaEnvelope(raw);
      expect(result.ok).toBe(false);
    });

    it('rejeita participants com tipo errado', () => {
      const raw = JSON.stringify({
        ...VALID_CREATE_ENVELOPE,
        entities: { ...VALID_CREATE_ENVELOPE.entities, participants: [1, 2] },
      });
      const result = parseAgendaEnvelope(raw);
      expect(result.ok).toBe(false);
    });
  });

  describe('validação de formato de datas e horários', () => {
    it('rejeita date.resolved fora do formato YYYY-MM-DD', () => {
      const raw = JSON.stringify({
        ...VALID_CREATE_ENVELOPE,
        entities: {
          ...VALID_CREATE_ENVELOPE.entities,
          date: { expression: 'amanhã', resolved: '18/08/2026', confidence: 'high' },
        },
      });
      const result = parseAgendaEnvelope(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join('\n')).toContain('YYYY-MM-DD');
    });

    it('rejeita date.confidence fora do enum', () => {
      const raw = JSON.stringify({
        ...VALID_CREATE_ENVELOPE,
        entities: {
          ...VALID_CREATE_ENVELOPE.entities,
          date: { expression: 'amanhã', resolved: '2026-08-18', confidence: 'medium' },
        },
      });
      const result = parseAgendaEnvelope(raw);
      expect(result.ok).toBe(false);
    });

    it('rejeita startTime inválido (25:00)', () => {
      const raw = JSON.stringify({
        ...VALID_CREATE_ENVELOPE,
        entities: { ...VALID_CREATE_ENVELOPE.entities, startTime: '25:00' },
      });
      const result = parseAgendaEnvelope(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join('\n')).toContain('HH:mm');
    });

    it('rejeita endTime inválido (18-00)', () => {
      const raw = JSON.stringify({
        ...VALID_CREATE_ENVELOPE,
        entities: { ...VALID_CREATE_ENVELOPE.entities, endTime: '18-00' },
      });
      const result = parseAgendaEnvelope(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join('\n')).toContain('HH:mm');
    });

    it('rejeita recurrence.freq fora do enum', () => {
      const raw = JSON.stringify({
        ...VALID_CREATE_ENVELOPE,
        entities: {
          ...VALID_CREATE_ENVELOPE.entities,
          recurrence: { freq: 'yearly', byDay: 2 },
        },
      });
      const result = parseAgendaEnvelope(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join('\n')).toContain('freq');
    });

    it('rejeita recurrence.byDay fora de 1..7', () => {
      for (const byDay of [0, 8]) {
        const raw = JSON.stringify({
          ...VALID_CREATE_ENVELOPE,
          entities: {
            ...VALID_CREATE_ENVELOPE.entities,
            recurrence: { freq: 'weekly', byDay },
          },
        });
        const result = parseAgendaEnvelope(raw);
        expect(result.ok).toBe(false);
      }
    });

    it('rejeita maxSlots com tipo errado', () => {
      const raw = JSON.stringify({
        ...VALID_CREATE_ENVELOPE,
        entities: { ...VALID_CREATE_ENVELOPE.entities, maxSlots: 'sim' },
      });
      const result = parseAgendaEnvelope(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join('\n')).toContain('maxSlots');
    });

    it('rejeita limitDate com resolved fora do formato YYYY-MM-DD', () => {
      const raw = JSON.stringify({
        ...VALID_CREATE_ENVELOPE,
        entities: {
          ...VALID_CREATE_ENVELOPE.entities,
          limitDate: { expression: 'nos próximos 5 dias', resolved: '17/08/2026', confidence: 'high' },
        },
      });
      const result = parseAgendaEnvelope(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join('\n')).toContain('YYYY-MM-DD');
    });
  });
});

describe('agenda-intent-schema validateAgendaEnvelope', () => {
  it('valida em envelope semânticamente completo', () => {
    const result = validateAgendaEnvelope(VALID_CREATE_ENVELOPE);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('rejeita intenção sem título', () => {
    const env = {
      ...VALID_CREATE_ENVELOPE,
      entities: {
        ...VALID_CREATE_ENVELOPE.entities,
        title: undefined,
      },
    };
    const result = validateAgendaEnvelope(env);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('entities.title');
  });

  it('rejeita intenção sem data', () => {
    const env = {
      ...VALID_CREATE_ENVELOPE,
      entities: { ...VALID_CREATE_ENVELOPE.entities, date: undefined },
    };
    const result = validateAgendaEnvelope(env);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('entities.date');
  });

  it('rejeita data com confiança baixa em create', () => {
    const env: AgendaEnvelope = {
      ...VALID_CREATE_ENVELOPE,
      entities: {
        ...VALID_CREATE_ENVELOPE.entities,
        date: { expression: 'meio da semana', resolved: '2026-09-16', confidence: 'low' },
      },
    };
    const result = validateAgendaEnvelope(env);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('confiança baixa');
  });

  it('rejeita delete sem identificador (sem título e sem data)', () => {
    const env: AgendaEnvelope = {
      intent: 'delete',
      action: 'delete_commitment',
      entities: {},
      missing: [],
      ambiguous: [],
      assumptions: [],
    };
    const result = validateAgendaEnvelope(env);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('delete');
  });

  it('aceita delete identificado pelo título', () => {
    const env: AgendaEnvelope = {
      intent: 'delete',
      action: 'delete_commitment',
      entities: { title: 'Almoço com a família' },
      missing: [],
      ambiguous: [],
      assumptions: [],
    };
    expect(validateAgendaEnvelope(env).valid).toBe(true);
  });

  it('aceita delete identificado apenas por entities.filter', () => {
    const env: AgendaEnvelope = {
      intent: 'delete',
      action: 'delete_commitment',
      entities: { filter: { field: 'title', value: 'Almoço com a família' } },
      missing: [],
      ambiguous: [],
      assumptions: [],
    };
    expect(validateAgendaEnvelope(env).valid).toBe(true);
  });

  it('rejeita filter.field fora do enum title|date', () => {
    const raw = JSON.stringify({
      intent: 'delete',
      action: 'delete_commitment',
      entities: { filter: { field: 'location', value: 'Sala 3' } },
    });
    const result = parseAgendaEnvelope(raw);
    expect(result.ok).toBe(false);
  });

  it('rejeita recorrência weekly sem byDay', () => {
    const env: AgendaEnvelope = {
      ...VALID_CREATE_ENVELOPE,
      entities: {
        ...VALID_CREATE_ENVELOPE.entities,
        recurrence: { freq: 'weekly', until: VALID_CREATE_ENVELOPE.entities.recurrence?.until },
      },
    };
    const result = validateAgendaEnvelope(env);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('byDay');
  });

  it('rejeita endTime antes de startTime', () => {
    const env = {
      ...VALID_CREATE_ENVELOPE,
      entities: { ...VALID_CREATE_ENVELOPE.entities, startTime: '18:00', endTime: '17:00' },
    };
    const result = validateAgendaEnvelope(env);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('endTime');
  });

  it('rejeita maxSlots sem recurrence', () => {
    const env: AgendaEnvelope = {
      ...VALID_CREATE_ENVELOPE,
      entities: { ...VALID_CREATE_ENVELOPE.entities, recurrence: undefined, maxSlots: true },
    };
    const result = validateAgendaEnvelope(env);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('maxSlots');
  });

  it('aceita maxSlots true com recurrence', () => {
    const env: AgendaEnvelope = {
      ...VALID_CREATE_ENVELOPE,
      entities: { ...VALID_CREATE_ENVELOPE.entities, maxSlots: true },
    };
    expect(validateAgendaEnvelope(env).valid).toBe(true);
  });

  it('rejeita pareamento intenção/ação incompatível', () => {
    const env: AgendaEnvelope = { ...VALID_CREATE_ENVELOPE, action: 'query_commitments' };
    const result = validateAgendaEnvelope(env);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('não corresponde');
  });

  it('aceita edit com título e data', () => {
    const env: AgendaEnvelope = {
      intent: 'edit',
      action: 'edit_commitment',
      entities: {
        title: 'Reunião com o coordenador',
        date: { expression: '16 de setembro', resolved: '2026-09-16', confidence: 'high' },
      },
      missing: [],
      ambiguous: [],
      assumptions: [],
    };
    expect(validateAgendaEnvelope(env).valid).toBe(true);
  });

  it('aceita edit sem data (localização apenas pelo título)', () => {
    const env: AgendaEnvelope = {
      intent: 'edit',
      action: 'edit_commitment',
      entities: {
        title: 'Reunião com o coordenador',
        startTime: '19:00',
      },
      missing: [],
      ambiguous: [],
      assumptions: [],
    };
    expect(validateAgendaEnvelope(env).valid).toBe(true);
  });

  it('rejeita edit sem título', () => {
    const env: AgendaEnvelope = {
      intent: 'edit',
      action: 'edit_commitment',
      entities: { startTime: '19:00' },
      missing: [],
      ambiguous: [],
      assumptions: [],
    };
    const result = validateAgendaEnvelope(env);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('entities.title é obrigatório');
  });

  it('rejeita edit com recurrence', () => {
    const env: AgendaEnvelope = {
      intent: 'edit',
      action: 'edit_commitment',
      entities: {
        title: 'Reunião com o coordenador',
        recurrence: { freq: 'weekly', byDay: 2 },
      },
      missing: [],
      ambiguous: [],
      assumptions: [],
    };
    const result = validateAgendaEnvelope(env);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('entities.recurrence não é suportado em edição');
  });

  it('rejeita edit com data de confiança baixa', () => {
    const env: AgendaEnvelope = {
      intent: 'edit',
      action: 'edit_commitment',
      entities: {
        title: 'Reunião com o coordenador',
        date: { expression: 'talvez', resolved: '2026-09-16', confidence: 'low' },
      },
      missing: [],
      ambiguous: [],
      assumptions: [],
    };
    const result = validateAgendaEnvelope(env);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('confiança baixa');
  });

  it('aceita query mesmo sem entities preenchidas', () => {
    const env: AgendaEnvelope = {
      intent: 'query',
      action: 'query_commitments',
      entities: {},
      missing: [],
      ambiguous: [],
      assumptions: [],
    };
    expect(validateAgendaEnvelope(env).valid).toBe(true);
  });
});

describe('agenda-intent-schema parseAndValidateAgendaEnvelope (fluxo combinado)', () => {
  it('retorna ok:true para envelope válido', () => {
    const result = parseAndValidateAgendaEnvelope(JSON.stringify(VALID_CREATE_ENVELOPE));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.intent).toBe('create');
  });

  it('retorna ok:false acumulando erro de negócio (título ausente)', () => {
    const env = {
      ...VALID_CREATE_ENVELOPE,
      entities: { ...VALID_CREATE_ENVELOPE.entities, title: undefined },
    };
    const result = parseAndValidateAgendaEnvelope(JSON.stringify(env));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toContain('entities.title');
  });

  it('retorna ok:false para JSON malformado', () => {
    const result = parseAndValidateAgendaEnvelope('{broken');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toContain('JSON');
  });
});

describe('agenda-intent-schema actionMatchesIntent', () => {
  it('mapeia cada intenção para a ação canônica', () => {
    expect(actionMatchesIntent('create', 'create_commitment')).toBe(true);
    expect(actionMatchesIntent('edit', 'edit_commitment')).toBe(true);
    expect(actionMatchesIntent('delete', 'delete_commitment')).toBe(true);
    expect(actionMatchesIntent('query', 'query_commitments')).toBe(true);
    expect(actionMatchesIntent('clarify', 'query_clarification')).toBe(true);
  });

  it('rejeita combinações cruzadas', () => {
    expect(actionMatchesIntent('create', 'delete_commitment')).toBe(false);
    expect(actionMatchesIntent('query', 'create_commitment')).toBe(false);
  });
});