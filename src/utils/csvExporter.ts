import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import type { Transaction } from '../types';

/**
 * Exporta uma lista de transações para arquivo CSV formatado para Excel em português (BOM + ';').
 */
export const exportTransactionsToCsv = async (
  transactions: Transaction[],
  periodLabel: string = 'extrato'
): Promise<void> => {
  if (!transactions || transactions.length === 0) return;

  const headers = ['Data', 'Descricao', 'Categoria', 'Tipo', 'Valor (R$)', 'Forma de Pagamento'];

  const rows = transactions.map((t) => {
    const dateFormatted = t.date || '';
    const description = (t.description || '').replace(/"/g, '""');
    const category = (t.category || 'Sem Categoria').replace(/"/g, '""');
    const type = t.type === 'income' ? 'Receita' : 'Despesa';
    const amount = Number(t.amount || 0).toFixed(2).replace('.', ',');
    const paymentMethod = (t.paymentMethod || 'Outro').replace(/"/g, '""');

    return [
      dateFormatted,
      `"${description}"`,
      `"${category}"`,
      type,
      amount,
      `"${paymentMethod}"`,
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const safeLabel = periodLabel.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const fileName = `financas_pro_${safeLabel}_${Date.now()}.csv`;

  if (Capacitor.isNativePlatform()) {
    try {
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: csvContent,
        directory: Directory.Documents,
        encoding: 'utf8' as any,
      });

      await FileOpener.open({
        filePath: savedFile.uri,
        contentType: 'text/csv',
      });
      return;
    } catch (e) {
      console.warn('[CSVExporter] Erro nativo ao salvar arquivo, tentando fallback web:', e);
    }
  }

  // Fallback Web
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
