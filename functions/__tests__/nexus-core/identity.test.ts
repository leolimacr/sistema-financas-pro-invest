import { describe, expect, it } from 'vitest';
import { NexusIdentity } from '../../nexus-core/identity';

function promptFor(context: Record<string, unknown>) {
  return NexusIdentity.getSystemPrompt(
    'Lia',
    context,
    '', '', '', '', '', '', '', false,
    { hasData: false },
    'últimos 3 dias',
  );
}

describe('NexusIdentity - formato proporcional à intenção', () => {
  it('mantém a resposta operacional concisa fora de um briefing', () => {
    expect(promptFor({ responseMode: 'concise' })).toContain('REGRA DAS 3 SENTENÇAS');
  });

  it('prioriza quatro blocos em um briefing estratégico', () => {
    const prompt = promptFor({ responseMode: 'strategic_briefing' });
    expect(prompt).toContain('BRIEFING ESTRATÉGICO');
    expect(prompt).toContain('Diagnóstico, Interpretação, Plano de Ação e Próximos Passos');
  });
});
