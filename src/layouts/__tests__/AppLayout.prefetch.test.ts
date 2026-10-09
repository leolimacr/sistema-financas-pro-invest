import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * D13 — guard-rail contra reintrodução do prefetch Firestore duplicado.
 * O cold boot deve aquecer SOMENTE: bundle do Controla (loadControla) +
 * RTDB dos últimos meses (transactions_extra). Leituras de
 * `cartoes`/`contas_fixas`/`faturas` pertencem aos hooks (useCards/useBills/
 * useCardInvoices) com staleTime próprio — duplicá-las aqui dobra o custo.
 */
describe('AppLayout - sem prefetch Firestore duplicado', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src', 'layouts', 'AppLayout.tsx'),
    'utf8'
  );

  it('não importa getDocs/collection do firebase/firestore', () => {
    expect(source).not.toContain("from 'firebase/firestore'");
    expect(source).not.toMatch(/getDocs\(collection\(firestore/);
  });

  it('não referencia as coleções cartoes/contas_fixas/faturas', () => {
    expect(source).not.toContain('users/${uid}/cartoes');
    expect(source).not.toContain('users/${uid}/contas_fixas');
    expect(source).not.toContain("users/${uid}/faturas");
  });

  it('preserva preload do Controla e prefetch RTDB', () => {
    expect(source).toContain('loadControla()');
    expect(source).toContain('transactions_extra');
  });
});
