import { calculateAbandonmentScore, resolveAdminUserTier } from '../adminUsers';

describe('calculateAbandonmentScore (Métrica de Abandono 0 a 6)', () => {
  it('deve atribuir Grau 0 (Usuário Pleno) para quem acessou há <= 2 dias e tem uso ativo', () => {
    const res = calculateAbandonmentScore({
      daysSinceLastActive: 1,
      launchCount: 15,
      hasFinancialProfile: true,
    });
    expect(res.score).toBe(0);
    expect(res.label).toBe('Usuário Pleno');
  });

  it('deve atribuir Grau 1 (Estável) para acesso entre 3 e 5 dias', () => {
    const res = calculateAbandonmentScore({
      daysSinceLastActive: 4,
      launchCount: 10,
      hasFinancialProfile: true,
    });
    expect(res.score).toBe(1);
    expect(res.label).toBe('Estável');
  });

  it('deve atribuir Grau 2 (Atenção Leve) para acesso entre 6 e 9 dias', () => {
    const res = calculateAbandonmentScore({
      daysSinceLastActive: 7,
      launchCount: 20,
      hasFinancialProfile: true,
    });
    expect(res.score).toBe(2);
    expect(res.label).toBe('Atenção Leve');
  });

  it('deve atribuir Grau 3 (Risco Moderado) para acesso entre 10 e 14 dias', () => {
    const res = calculateAbandonmentScore({
      daysSinceLastActive: 12,
      launchCount: 5,
      hasFinancialProfile: true,
    });
    expect(res.score).toBe(3);
    expect(res.label).toBe('Risco Moderado');
  });

  it('deve atribuir Grau 4 (Risco Alto) para acesso entre 15 e 21 dias', () => {
    const res = calculateAbandonmentScore({
      daysSinceLastActive: 18,
      launchCount: 30,
      hasFinancialProfile: true,
    });
    expect(res.score).toBe(4);
    expect(res.label).toBe('Risco Alto');
  });

  it('deve atribuir Grau 5 (Abandono Iminente) para acesso entre 22 e 29 dias', () => {
    const res = calculateAbandonmentScore({
      daysSinceLastActive: 25,
      launchCount: 12,
      hasFinancialProfile: false,
    });
    expect(res.score).toBe(5);
    expect(res.label).toBe('Abandono Iminente');
  });

  it('deve atribuir Grau 6 (Abandono Pleno) para tempo sem uso >= 30 dias', () => {
    const res = calculateAbandonmentScore({
      daysSinceLastActive: 31,
      launchCount: 50,
      hasFinancialProfile: true,
    });
    expect(res.score).toBe(6);
    expect(res.label).toBe('Abandono Pleno (30d+)');
  });

  it('deve atribuir Grau 6 para conta vazia há mais de 14 dias sem lançamentos', () => {
    const res = calculateAbandonmentScore({
      daysSinceLastActive: 15,
      launchCount: 0,
      hasFinancialProfile: false,
    });
    expect(res.score).toBe(6);
    expect(res.label).toBe('Abandono Pleno (Sem uso)');
  });
});

describe('resolveAdminUserTier (Detecção de Planos e Soberania)', () => {
  it('deve atribuir soberanamente Premium para o administrador Leo', () => {
    const res = resolveAdminUserTier({
      email: 'leolimacr@hotmail.com',
      directTier: 'free',
      directPlan: 'free',
      subscription: null,
    });
    expect(res.tier).toBe('premium');
    expect(res.planName).toContain('Soberano Leo');
  });

  it('deve atribuir soberanamente Premium mesmo com email em maiúsculas ou espaços', () => {
    const res = resolveAdminUserTier({
      email: '  LEOLIMACR@HOTMAIL.COM  ',
    });
    expect(res.tier).toBe('premium');
  });

  it('deve reconhecer plano legado subscription.plan = premium_anual', () => {
    const res = resolveAdminUserTier({
      email: 'outro@teste.com',
      subscription: {
        plan: 'premium_anual',
        status: 'active',
      },
    });
    expect(res.tier).toBe('premium');
    expect(res.billingCycle).toBe('annual');
    expect(res.billingStatus).toBe('active');
  });

  it('deve reconhecer plano legado subscription.plan = pro_monthly', () => {
    const res = resolveAdminUserTier({
      email: 'cliente@teste.com',
      subscription: {
        plan: 'pro_monthly',
        status: 'active',
      },
    });
    expect(res.tier).toBe('pro');
    expect(res.billingCycle).toBe('monthly');
  });

  it('deve reconhecer fallback em billing/main com tier premium', () => {
    const res = resolveAdminUserTier({
      email: 'cliente@teste.com',
      directTier: 'free',
      billingMain: {
        tier: 'premium',
        status: 'active',
        billingCycle: 'annual',
      },
    });
    expect(res.tier).toBe('premium');
    expect(res.billingCycle).toBe('annual');
  });

  it('deve manter free para usuário sem nenhum plano ativo', () => {
    const res = resolveAdminUserTier({
      email: 'normal@teste.com',
      directTier: 'free',
    });
    expect(res.tier).toBe('free');
    expect(res.planName).toBe('Gratuito');
  });
});

