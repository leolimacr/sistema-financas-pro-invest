import type { Archetype, PersonaContext } from '../types';

/**
 * [PDE - Persona Discovery Engine]
 * Calcula arquétipo, nível de linguagem e prioridades a partir da Calibração de Comando.
 * Prioriza tensão (Resiliência) sobre expansão quando scores disputados.
 */
export const calculateUserPersona = (answers: Record<string, string>): PersonaContext => {
  let r = 0;
  let g = 0;
  let c = 0;

  // 1. Campo de batalha
  switch (answers.battlefield) {
    case 'debts': r += 10; break;
    case 'family': g += 10; break;
    case 'freedom': c += 10; break;
    case 'clarity': r += 3; g += 5; break;
  }

  // 2. Dívidas
  switch (answers.debts_status) {
    case 'critical': r += 15; break;
    case 'structured': g += 8; break;
    case 'leverage': c += 6; break;
    case 'none': g += 4; c += 4; break;
  }

  // 3. Sono / tensão emocional
  switch (answers.sleep) {
    case 'worried': r += 10; break;
    case 'calm': g += 6; break;
    case 'focused': c += 6; break;
    case 'neutral': g += 2; c += 2; break;
  }

  // 4. Comportamento com sobra
  switch (answers.surplus) {
    case 'spend': r += 5; break;
    case 'debt_pay': r += 8; break;
    case 'reserve': g += 10; break;
    case 'invest': c += 10; break;
  }

  // 5. Objetivo no FPI
  switch (answers.objective) {
    case 'survival': r += 10; break;
    case 'stability': g += 10; break;
    case 'expansion': c += 10; break;
    case 'clarity': g += 5; r += 4; break;
  }

  // 6. Maturidade em investimentos
  switch (answers.contact) {
    case 'beginner': r += 3; break;
    case 'basic': g += 6; break;
    case 'intermediate': g += 4; c += 4; break;
    case 'strategist': c += 12; break;
  }

  // 7. Preferência de linguagem
  let languageLevel: 1 | 2 | 3 = 2;
  switch (answers.language) {
    case 'simple': languageLevel = 1; break;
    case 'objective': languageLevel = 2; break;
    case 'technical': languageLevel = 3; c += 2; break;
    case 'strategic': languageLevel = 3; c += 3; break;
  }

  let archetype: Archetype = 'guardian';
  if (r >= 15 || (r > g && r > c)) {
    archetype = 'resilient';
  } else if (c > g) {
    archetype = 'commander';
  } else {
    archetype = 'guardian';
  }

  return {
    archetype,
    languageLevel,
    calibratedAt: new Date().toISOString(),
    answers,
    scores: { r, g, c },
  };
};

export const getPersonaVoice = (archetype: Archetype) => {
  const voices = {
    resilient: {
      title: 'Modo Resiliência',
      motto: 'Recuperação de terreno e estancamento de erosão',
      prefix: 'Status: Crítico.',
      color: '#f43f5e',
      firstInsight:
        'Seu foco agora é recuperar folga do mês. Cada movimentação será lida pelo impacto no seu fôlego — não pelo registro isolado.',
      route: ['minhas-dividas', 'controla', 'chat'],
    },
    guardian: {
      title: 'Modo Guardião',
      motto: 'Preservação de lastro e segurança estrutural',
      prefix: 'Status: Protegido.',
      color: '#10b981',
      firstInsight:
        'Seu foco é proteger a estrutura antes de expandir. Priorizo reserva, Colchão Emergencial e estabilidade do custo de vida.',
      route: ['controla', 'central', 'chat'],
    },
    commander: {
      title: 'Modo Soberania',
      motto: 'Expansão de domínio e compra de tempo',
      prefix: 'Status: Comando.',
      color: '#0ea5e9',
      firstInsight:
        'Seu foco é acelerar liberdade com precisão. Análises enfatizam alocação, velocidade patrimonial e custo de oportunidade.',
      route: ['central', 'investimentos', 'chat'],
    },
  };
  return voices[archetype];
};

export const getPersonaRouteLabels = (archetype: Archetype): string[] => {
  const labels: Record<Archetype, string[]> = {
    resilient: ['Cadastrar ou revisar dívidas', 'Consolidar movimentações', 'Falar com o Nexus'],
    guardian: ['Fortalecer reserva no Controla', 'Abrir visão na Central', 'Falar com o Nexus'],
    commander: ['Revisar patrimônio na Central', 'Ajustar investimentos', 'Falar com o Nexus'],
  };
  return labels[archetype];
};

/** Pesos iniciais a partir da intenção do onboarding leve (1 pergunta). */
export const seedPersonaFromIntent = (
  intent: 'dividas' | 'patrimonio' | 'geral'
): Record<string, string> => {
  if (intent === 'dividas') return { battlefield: 'debts', objective: 'survival' };
  if (intent === 'patrimonio') return { battlefield: 'freedom', objective: 'expansion' };
  return { battlefield: 'clarity', objective: 'clarity' };
};
