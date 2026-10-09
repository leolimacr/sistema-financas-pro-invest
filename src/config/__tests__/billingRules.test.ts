import { describe, it, expect } from 'vitest';
import rulesText from '../../../firestore.rules?raw';

/**
 * Etapa 7 — E7-01: guarda regressiva de estrutura (NÃO substitui o Emulator,
 * que é a evidência principal de autorização).
 * Nenhum `allow ... if false` nega por prioridade; a escrita do dono em
 * billing/** é negada por ausência de concessão. Sem funções de prefixo.
 */
const rules: string = rulesText as unknown as string;

/** Extrai o bloco do match pelo balanceamento de chaves (sem falso positivo). */
function getMatchBlock(matchHeader: string): string {
  const start = rules.indexOf(matchHeader);
  expect(start, `match não encontrado: ${matchHeader}`).toBeGreaterThanOrEqual(0);
  const open = rules.indexOf('{', start + matchHeader.length);
  if (open < 0) {
    throw new Error(`abertura de bloco não encontrada: ${matchHeader}`);
  }
  let depth = 0;
  for (let i = open; i < rules.length; i++) {
    if (rules[i] === '{') depth++;
    if (rules[i] === '}') {
      depth--;
      if (depth === 0) return rules.slice(start, i + 1);
    }
  }
  throw new Error(`bloco não fechado: ${matchHeader}`);
}

describe('firestore.rules — billing (E7-01, estrutura)', () => {
  it('billing/main: leitura do dono e escrita sem concessão', () => {
    const block = getMatchBlock('match /users/{userId}/billing/main');
    expect(block).toMatch(/allow read:\s*if isOwner\(userId\)/);
    expect(block).toMatch(/allow write:\s*if false/);
  });

  it('billing/** sem concessão ao cliente', () => {
    const block = getMatchBlock('match /users/{userId}/billing/{document=**}');
    expect(block).toMatch(/allow read, write:\s*if false/);
  });

  it('genérico exclui billing e agenda por primeiro segmento', () => {
    const block = getMatchBlock('match /users/{userId}/{collection}/{document=**}');
    expect(block).toMatch(/collection != 'billing'/);
    expect(block).toMatch(/collection != 'agenda'/);
  });

  it('agenda normal protege o placeholder _nexus', () => {
    const block = getMatchBlock('match /users/{userId}/agenda/{commitmentId}');
    expect(block).toMatch(/commitmentId != '_nexus'/);
  });

  it('sem funções de prefixo em rules', () => {
    expect(rules).not.toMatch(/startsWith/);
    expect(rules).not.toMatch(/beginsWith/);
  });
});

describe('firestore.rules — agenda (Etapa 7.x, estrutura)', () => {
  it('leitura sem guarda por ID (list por mês precisa valer para todo retorno)', () => {
    const block = getMatchBlock('match /users/{userId}/agenda/{commitmentId}');
    expect(block).toMatch(/allow read:\s*if isOwner\(userId\);/);
  });

  it('escrita com guarda por documento (avaliável por operação em doc único)', () => {
    const block = getMatchBlock('match /users/{userId}/agenda/{commitmentId}');
    expect(block).toMatch(/allow write:\s*if isOwner\(userId\) && commitmentId != '_nexus';/);
  });

  it('falha se a leitura voltar a carregar a guarda por ID', () => {
    const block = getMatchBlock('match /users/{userId}/agenda/{commitmentId}');
    expect(block).not.toMatch(/allow read, write:\s*if isOwner\(userId\) && commitmentId/);
  });
});
