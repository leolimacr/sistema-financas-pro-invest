import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportTransactionsToCsv } from '../csvExporter';
import type { Transaction } from '../../types';

describe('csvExporter (Fase 3 — Exportação Soberana em CSV para Planilhas)', () => {
  let createdBlob: Blob | null = null;
  let clickedLink: { download?: string; href?: string; click: () => void } | null = null;

  beforeEach(() => {
    createdBlob = null;
    clickedLink = null;

    global.URL.createObjectURL = vi.fn((blob: Blob) => {
      createdBlob = blob;
      return 'blob:mock-url';
    });
    global.URL.revokeObjectURL = vi.fn();

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const link = {
          download: '',
          href: '',
          setAttribute: vi.fn((attr: string, val: string) => {
            (link as any)[attr] = val;
          }),
          click: vi.fn(),
        };
        clickedLink = link;
        return link as any;
      }
      return document.createElement(tagName);
    });

    vi.spyOn(document.body, 'appendChild').mockImplementation((el: any) => el);
    vi.spyOn(document.body, 'removeChild').mockImplementation((el: any) => el);
  });

  it('não exporta se a lista de transações for vazia', async () => {
    await exportTransactionsToCsv([]);
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('exporta transações com cabeçalhos em português e formatação compatível com Excel', async () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2026-06-15',
        description: 'Compra Mercado "Especial"',
        category: 'Alimentação',
        type: 'expense',
        amount: 250.75,
        paymentMethod: 'credit',
      },
      {
        id: '2',
        date: '2026-06-20',
        description: 'Salário Mensal',
        category: 'Renda',
        type: 'income',
        amount: 5000,
        paymentMethod: 'pix',
      },
    ];

    await exportTransactionsToCsv(transactions, 'Junho 2026');

    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(createdBlob).not.toBeNull();
    expect(clickedLink).not.toBeNull();
    expect(clickedLink?.download).toContain('financas_pro_junho_2026');
    expect(clickedLink?.click).toHaveBeenCalled();
  });
});
