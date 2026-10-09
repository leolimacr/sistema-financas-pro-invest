import { describe, expect, it, vi } from 'vitest';
import { prepareEventInsight } from '../prepareEventInsight';
import type { NexusInsight } from '../nexusInsightEngine';

vi.mock('../personaService', () => ({
  getPersonaVoice: () => ({ prefix: 'Olha,', color: '#000' }),
}));

const base: NexusInsight = {
  id: 'nexus-event-card-invoice-overdue-c1',
  message: {
    title: 'Fatura vencida',
    body: '{prefix} A fatura do {cardName} venceu em {dueDate} com R$ {remainingAmount} em aberto.',
    ctaLabel: 'Converter em Dívida',
  },
  deepLink: 'minhas-dividas',
  priority: 'alta',
};

describe('prepareEventInsight - vars numéricas e textuais (N1)', () => {
  it('interpola cardName/dueDate como texto e remainingAmount como moeda, sem chaves residuais', () => {
    const out = prepareEventInsight(base, {
      remainingAmount: 1234.5,
      cardName: 'Nubank',
      dueDate: '10/09/2026',
    });

    expect(out.message.body).toContain('Nubank');
    expect(out.message.body).toContain('10/09/2026');
    expect(out.message.body).toContain('R$');
    expect(out.message.body).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it('formata value/diff/jump como moeda', () => {
    const out = prepareEventInsight(
      { ...base, message: { ...base.message, body: 'Subiu {jump} ({value}, {diff}).' } },
      { jump: 2000, value: 1500, diff: 750 },
    );

    expect(out.message.body).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(out.message.body).toContain('R$');
  });
});
