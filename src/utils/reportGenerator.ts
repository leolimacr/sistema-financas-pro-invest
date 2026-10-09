import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { getFlowLabels } from '../theme/fpiVoiceGuide';

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
  return adjustedDate.toLocaleDateString('pt-BR');
};

export const generateFinancialReport = async (
  transactions: any[],
  categoryFilter: string,
  userName: string = 'Investidor',
  commandMode?: boolean,
) => {
  const voice = getFlowLabels(commandMode);
  const balanceLabel = voice.monthHero.toUpperCase();
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const today = new Date().toLocaleDateString('pt-BR');

  let totalIncome = 0;
  let totalExpense = 0;
  transactions.forEach(t => {
    const val = Number(t.amount) || 0;
    if (t.type === 'income') totalIncome += val;
    else totalExpense += val;
  });
  const balance = totalIncome - totalExpense;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Controla, do Finanças Pro Invest', 14, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(56, 189, 248);
  doc.text('Relatório Controla', 14, 28);
  doc.setTextColor(200, 200, 200);
  doc.text(`Gerado em: ${today}`, pageWidth - 14, 18, { align: 'right' });
  doc.text(`Filtro: ${categoryFilter}`, pageWidth - 14, 30, { align: 'right' });

  const startY = 50;
  const cardWidth = (pageWidth - 28 - 10) / 3;

  doc.setFillColor(240, 253, 244); doc.setDrawColor(22, 163, 74);
  doc.roundedRect(14, startY, cardWidth, 25, 3, 3, 'FD');
  doc.setFontSize(8); doc.setTextColor(22, 163, 74); doc.text(`TOTAL ${voice.income.toUpperCase()}`, 18, startY + 8);
  doc.setFontSize(12); doc.text(formatCurrency(totalIncome), 18, startY + 18);

  doc.setFillColor(254, 242, 242); doc.setDrawColor(220, 38, 38);
  doc.roundedRect(14 + cardWidth + 5, startY, cardWidth, 25, 3, 3, 'FD');
  doc.setFontSize(8); doc.setTextColor(220, 38, 38); doc.text(`TOTAL ${voice.expense.toUpperCase()}`, 18 + cardWidth + 5, startY + 8);
  doc.setFontSize(12); doc.text(formatCurrency(totalExpense), 18 + cardWidth + 5, startY + 18);

  doc.setFillColor(248, 250, 252); doc.setDrawColor(71, 85, 105);
  doc.roundedRect(14 + (cardWidth * 2) + 10, startY, cardWidth, 25, 3, 3, 'FD');
  doc.setFontSize(8); doc.setTextColor(71, 85, 105); doc.text(balanceLabel, 18 + (cardWidth * 2) + 10, startY + 8);
  doc.setFontSize(12); doc.setTextColor(balance >= 0 ? 22 : 220, balance >= 0 ? 163 : 38, balance >= 0 ? 74 : 38);
  doc.text(formatCurrency(balance), 18 + (cardWidth * 2) + 10, startY + 18);

  const tableRows = transactions.map(t => [
    formatDate(t.date),
    t.description,
    t.category,
    t.type === 'income' ? voice.incomeSingular : voice.expenseSingular,
    formatCurrency(Number(t.amount))
  ]);

  let lastPageDrawn = 1;

  autoTable(doc, {
    startY: startY + 35,
    margin: { top: 50, bottom: 14 },
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    head: [['Data', 'Descricao', 'Categoria', 'Tipo', 'Valor']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    styles: {
      fontSize: 8,
      overflow: 'ellipsize',
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 78 },
      2: { cellWidth: 35 },
      3: { cellWidth: 20 },
      4: { cellWidth: 30, halign: 'right' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        data.cell.styles.textColor = data.row.raw[3] === voice.expenseSingular
          ? [220, 38, 38]
          : [22, 163, 74];
      }
    }
  });

  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = totalPages; p > lastPageDrawn; p--) {
    doc.deletePage(p);
  }

  const fileName = `relatorio_controla_${new Date().getTime()}.pdf`;

  if (Capacitor.isNativePlatform()) {
    try {
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Documents,
        recursive: true
      });
      await FileOpener.open({
        filePath: savedFile.uri,
        contentType: 'application/pdf',
      });
    } catch (error) {
      console.error('Erro ao abrir PDF no App:', error);
      alert('Nao foi possivel abrir o PDF. Verifique as permissoes do app.');
    }
  } else {
    doc.save(fileName);
  }
};
