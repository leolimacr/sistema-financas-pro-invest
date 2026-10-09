import { describe, it, expect } from 'vitest';
import {
  parseCsvString,
  detectCsvDelimiter,
  parseBrazilianNumber,
  parseDate,
  generateImportPreview,
  parseXlsxArrayBuffer,
  autoDetectMapping,
  inferAssetCategory,
  detectMatchingPreset,
  applyImportPreset,
  IMPORT_PRESETS,
} from '../spreadsheetImporter';

describe('spreadsheetImporter - Importador Puro de CSV/XLSX com Prévia e Validação', () => {
  describe('1. Detecção de Delimitador e Parser RFC 4180 de CSV', () => {
    it('deve detectar automaticamente delimitadores ponto-e-vírgula, vírgula e tab', () => {
      expect(detectCsvDelimiter('Ativo;Quantidade;Valor\nPETR4;100;30,50')).toBe(';');
      expect(detectCsvDelimiter('Ticker,Quantity,Price\nVT,10,110.50')).toBe(',');
      expect(detectCsvDelimiter("Ativo\tQuantidade\tValor\nVALE3\t50\t60")).toBe('\t');
    });

    it('deve remover BOM UTF-8 e interpretar campos com aspas e quebras de linha', () => {
      const csv = '\uFEFFAtivo;Descricao;Valor\r\n"VALE3";"Vale S.A.\r\nMineração";"1.500,50"\r\n"PETR4";"Petrobras";"2.000,00"';
      const rows = parseCsvString(csv, ';');

      expect(rows).toHaveLength(3);
      expect(rows[0]).toEqual(['Ativo', 'Descricao', 'Valor']);
      expect(rows[1][0]).toBe('VALE3');
      expect(rows[1][1]).toContain('Vale S.A.\r\nMineração');
      expect(rows[1][2]).toBe('1.500,50');
      expect(rows[2][0]).toBe('PETR4');
    });

    it('deve respeitar o limite máximo de linhas para não travar a memória', () => {
      const longCsv = 'A;B\n' + Array.from({ length: 50 }, (_, i) => `T${i};${i}`).join('\n');
      const rows = parseCsvString(longCsv, ';', 10);
      expect(rows.length).toBeLessThanOrEqual(10);
    });
  });

  describe('2. Parser de Números e Símbolos Brasileiros', () => {
    it('deve interpretar números no formato brasileiro com separador de milhar e decimal', () => {
      const n1 = parseBrazilianNumber('1.500,50');
      expect(n1.value).toBe(1500.5);
      expect(n1.isFormula).toBe(false);

      const n2 = parseBrazilianNumber('R$ 3.250,75');
      expect(n2.value).toBe(3250.75);

      const n3 = parseBrazilianNumber('12,5%');
      expect(n3.value).toBe(12.5);
    });

    it('deve interpretar números inteiros puros e formato americano', () => {
      const n1 = parseBrazilianNumber('100');
      expect(n1.value).toBe(100);

      const n2 = parseBrazilianNumber('1500.50');
      expect(n2.value).toBe(1500.5);
    });

    it('deve detectar fórmulas não avaliadas e não tentar executá-las', () => {
      const formula = parseBrazilianNumber('=SOMA(A1:B1)');
      expect(formula.isFormula).toBe(true);
      expect(formula.value).toBeNull();
    });

    it('deve sinalizar ambiguidade quando houver pontuação de 3 dígitos sem outro separador', () => {
      const amb = parseBrazilianNumber('123.456');
      expect(amb.isAmbiguous).toBe(true);
      // No Brasil trata como milhar com aviso
      expect(amb.value).toBe(123456);
    });
  });

  describe('3. Parser de Datas (Brasileira, ISO e Serial do Excel)', () => {
    it('deve converter data brasileira DD/MM/AAAA para ISO YYYY-MM-DD', () => {
      expect(parseDate('15/06/2026').isoDate).toBe('2026-06-15');
      expect(parseDate('01/01/2024').isoDate).toBe('2024-01-01');
    });

    it('deve preservar data já no formato ISO', () => {
      expect(parseDate('2026-06-15').isoDate).toBe('2026-06-15');
    });

    it('deve converter número de data serial do Excel', () => {
      // 45458 = 2024-06-15 aproximadamente
      const d = parseDate('45458');
      expect(d.isoDate).toBe('2024-06-15');
    });

    it('deve retornar null para texto inválido de data', () => {
      expect(parseDate('data_invalida').isoDate).toBeNull();
    });
  });

  describe('4. Prévia no Modo POSIÇÕES INICIAIS (Não Inventa Cotas nem Custo)', () => {
    const rawHeaders = ['ATIVO', 'EMPRESA', 'CLASSE', 'VALOR ATUAL', 'QTD', 'META'];
    const rawRows = [
      ['VALE3', 'Vale S.A.', 'Ações Brasil', '6.000,00', '100', '0.10'], // 10% com quantidade
      ['PORQ_INTER', 'Porquinho Inter', 'Renda Fixa', '1.618,67', '', '0.01'], // 1% sem quantidade
      ['PRIO3', 'PRIO', 'Ações Brasil', '=SOMA(A1:B1)', '10', '0.05'], // Fórmula no valor
    ];

    it('deve gerar prévia sem inventar cotas quando houver apenas saldo atual', () => {
      const result = generateImportPreview({
        fileName: 'minha_carteira.csv',
        rawHeaders,
        rawRows,
        mapping: {
          tickerColumn: 'ATIVO',
          nameColumn: 'EMPRESA',
          categoryColumn: 'CLASSE',
          totalValueColumn: 'VALOR ATUAL',
          quantityColumn: 'QTD',
          targetPercentageColumn: 'META',
        },
        mode: 'INITIAL_POSITIONS',
      });

      expect(result.totalRowsFound).toBe(3);

      // Linha 1: VALE3
      const row1 = result.previewRows[0];
      expect(row1.status).toBe('VALID');
      expect(row1.interpreted.ticker).toBe('VALE3');
      expect(row1.interpreted.totalValue).toBe(6000.0);
      expect(row1.interpreted.targetPercentage).toBe(10.0);

      // Linha 2: PORQ_INTER - Apenas saldo, sem quantidade -> NÃO inventa cotas nem PM
      const row2 = result.previewRows[1];
      expect(row2.status).toBe('WARNING');
      expect(row2.interpreted.ticker).toBe('PORQ_INTER');
      expect(row2.interpreted.totalValue).toBe(1618.67);
      expect(row2.interpreted.quantity).toBeNull();
      expect(row2.interpreted.hasKnownQuantity).toBe(false);
      expect(row2.interpreted.isBalanceOnly).toBe(true);
      expect(row2.interpreted.hasKnownCost).toBe(false);
      expect(row2.warnings.some((w) => w.includes('quantidade de cotas e preço médio desconhecidos'))).toBe(true);

      // Linha 3: PRIO3 - Fórmula no valor sem cache -> Erro impeditivo com conversão bloqueada
      const row3 = result.previewRows[2];
      expect(row3.status).toBe('ERROR');
      expect(row3.errors.some((e) => e.includes('fórmula'))).toBe(true);
    });
  });

  describe('5. Detecção de Duplicidades (Não Descarta Automaticamente)', () => {
    const rawHeaders = ['Data', 'Ativo', 'Tipo', 'Qtd', 'Preco'];
    const rawRows = [
      ['10/06/2026', 'WEGE3', 'BUY', '100', '40,00'], // Linha 2 física
      ['10/06/2026', 'WEGE3', 'BUY', '100', '40,00'], // Linha 3 física (duplicata exata)
      ['15/06/2026', 'WEGE3', 'BUY', '50', '42,00'],  // Linha 4 física (distinta)
    ];

    it('deve marcar linha duplicada como DUPLICATE_CANDIDATE apontando a linha de origem sem descartá-la', () => {
      const result = generateImportPreview({
        fileName: 'movimentacoes.csv',
        rawHeaders,
        rawRows,
        mapping: {
          dateColumn: 'Data',
          tickerColumn: 'Ativo',
          typeColumn: 'Tipo',
          quantityColumn: 'Qtd',
          unitPriceColumn: 'Preco',
        },
        mode: 'MOVEMENTS',
      });

      expect(result.summary.totalRows).toBe(3);
      expect(result.summary.duplicateCount).toBe(1);

      const rowOriginal = result.previewRows[0];
      expect(rowOriginal.status).toBe('VALID');

      const rowDuplicate = result.previewRows[1];
      expect(rowDuplicate.status).toBe('DUPLICATE_CANDIDATE');
      expect(rowDuplicate.duplicateOfRow).toBe(2); // Aponta para a linha física 2
      expect(rowDuplicate.warnings[0]).toContain('Possível duplicata da Linha 2. Não descartada automaticamente');

      const rowDistinct = result.previewRows[2];
      expect(rowDistinct.status).toBe('VALID');
    });
  });

  describe('6. Parser de Coordenadas de Células e Estrutura XLSX Real', () => {
    it('deve converter corretamente letras de coluna do Excel para índice base-0', async () => {
      const { parseCellColumnIndex } = await import('../spreadsheetImporter');
      expect(parseCellColumnIndex('A1')).toBe(0);
      expect(parseCellColumnIndex('B10')).toBe(1);
      expect(parseCellColumnIndex('Z5')).toBe(25);
      expect(parseCellColumnIndex('AA1')).toBe(26);
      expect(parseCellColumnIndex('AZ99')).toBe(51);
      expect(parseCellColumnIndex('BA2')).toBe(52);
    });

    // Helper para gerar um arquivo ZIP válido contendo arquivos XML da planilha
    function createMockXlsxZip(files: Record<string, string>): ArrayBuffer {
      const chunks: Uint8Array[] = [];
      const encoder = new TextEncoder();

      const allFiles: Record<string, string> = {
        'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Planilha1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
        'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
        ...files,
      };

      for (const [name, content] of Object.entries(allFiles)) {
        const nameBytes = encoder.encode(name);
        const dataBytes = encoder.encode(content);

        const header = new Uint8Array(30);
        // Signature PK\x03\x04
        header[0] = 0x50; header[1] = 0x4b; header[2] = 0x03; header[3] = 0x04;
        header[4] = 0x14; header[5] = 0x00; // Version 2.0
        header[6] = 0x00; header[7] = 0x00; // Flags
        header[8] = 0x00; header[9] = 0x00; // Method 0 (Store)
        header[10] = 0x00; header[11] = 0x00; header[12] = 0x00; header[13] = 0x00; // Time/Date
        header[14] = 0x00; header[15] = 0x00; header[16] = 0x00; header[17] = 0x00; // CRC32 (ignorado)

        const compSize = dataBytes.length;
        header[18] = compSize & 0xff;
        header[19] = (compSize >> 8) & 0xff;
        header[20] = (compSize >> 16) & 0xff;
        header[21] = (compSize >> 24) & 0xff;

        header[22] = compSize & 0xff;
        header[23] = (compSize >> 8) & 0xff;
        header[24] = (compSize >> 16) & 0xff;
        header[25] = (compSize >> 24) & 0xff;

        header[26] = nameBytes.length & 0xff;
        header[27] = (nameBytes.length >> 8) & 0xff;
        header[28] = 0; header[29] = 0; // Extra field length

        chunks.push(header, nameBytes, dataBytes);
      }

      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      const out = new Uint8Array(totalLen);
      let off = 0;
      for (const c of chunks) {
        out.set(c, off);
        off += c.length;
      }
      return out.buffer;
    }

    it('deve extrair dados de planilha XLSX real preservando colunas esparsas e strings compartilhadas compostas', async () => {
      const { parseXlsxArrayBuffer } = await import('../spreadsheetImporter');

      const xlsxBuffer = createMockXlsxZip({
        'xl/sharedStrings.xml': `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <si><t>VALE3</t></si>
  <si><r><t>PETR</t></r><r><t>4</t></r></si>
</sst>`,
        'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>0</v></c>
      <c r="D1" t="s"><v>1</v></c>
      <c r="E1"><v>1500.50</v></c>
    </row>
    <row r="2">
      <c r="A2"><f>SUM(B2:B5)</f><v>3500.00</v></c>
      <c r="B2"><f>AVERAGE(B2:B5)</f></c>
      <c r="C2"><v>45458</v></c>
    </row>
  </sheetData>
</worksheet>`,
      });

      const result = await parseXlsxArrayBuffer(xlsxBuffer);
      const rows = result.rows;

      expect(rows).toHaveLength(2);
      expect(result.sheetName).toBe('Planilha1');
      expect(result.requiresSheetSelection).toBe(false);

      // Linha 1: A1='VALE3', B1='' (esparso), C1='' (esparso), D1='PETR4' (composto <r><t>), E1='1500.50'
      const row1 = rows[0];
      expect(row1[0]).toBe('VALE3');
      expect(row1[1]).toBe('');
      expect(row1[2]).toBe('');
      expect(row1[3]).toBe('PETR4');
      expect(row1[4]).toBe('1500.50');

      // Linha 2: A2 com fórmula e valor avaliado ('=CACHED:3500.00:SUM(B2:B5)'), B2 com fórmula pura ('=AVERAGE(B2:B5)'), C2 serial de data ('45458')
      const row2 = rows[1];
      expect(row2[0]).toBe('=CACHED:3500.00:SUM(B2:B5)');
      expect(row2[1]).toBe('=AVERAGE(B2:B5)');
      expect(row2[2]).toBe('45458');
      expect(parseDate(row2[2]).isoDate).toBe('2024-06-15');
    });

    it('deve identificar fórmulas com resultado em cache com aviso e bloquear fórmulas não calculadas na prévia', () => {
      const preview = generateImportPreview({
        fileName: 'teste_formulas.xlsx',
        rawHeaders: ['ATIVO', 'VALOR ATUAL', 'QTD'],
        rawRows: [
          ['VALE3', '=CACHED:3500.00:SUM(B2:B5)', '100'],
          ['PETR4', '=AVERAGE(B2:B5)', '50'],
        ],
        mapping: {
          tickerColumn: 'ATIVO',
          totalValueColumn: 'VALOR ATUAL',
          quantityColumn: 'QTD',
        },
        mode: 'INITIAL_POSITIONS',
        sheetName: 'Planilha1',
      });

      expect(preview.sheetName).toBe('Planilha1');
      expect(preview.totalRowsFound).toBe(2);

      // Linha 1: Fórmula com resultado em cache deve gerar WARNING, exibir o valor em cache e não ser tratada como estática
      const row1 = preview.previewRows[0];
      expect(row1.status).toBe('WARNING');
      expect(row1.interpreted.totalValue).toBe(3500);
      expect(row1.interpreted.hasCachedFormula).toBe(true);
      expect(row1.warnings.some((w) => w.includes('fórmula com resultado em cache') && w.includes('não foi recalculado'))).toBe(true);
      expect(row1.rawRow['VALOR ATUAL']).toBe('=SUM(B2:B5) (em cache: 3500.00)');

      // Linha 2: Fórmula SEM resultado em cache deve gerar ERROR, bloquear conversão com valor nulo e exigir valor manual
      const row2 = preview.previewRows[1];
      expect(row2.status).toBe('ERROR');
      expect(row2.interpreted.totalValue).toBeUndefined();
      expect(row2.errors.some((e) => e.includes('fórmula não calculada') && e.includes('Conversão numérica bloqueada'))).toBe(true);

      // Bloqueia avanço geral devido ao erro impeditivo na linha 2
      expect(preview.canProceed).toBe(false);
      expect(preview.summary.errorCount).toBe(1);
      expect(preview.summary.warningCount).toBe(1);
    });

    it('deve exigir seleção explícita quando houver mais de uma aba no arquivo XLSX', async () => {
      const { parseXlsxArrayBuffer } = await import('../spreadsheetImporter');

      const xlsxMultiBuffer = createMockXlsxZip({
        'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Carteira Principal" sheetId="1" r:id="rId1"/>
    <sheet name="Proventos" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`,
        'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>`,
        'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1"><v>VALE3</v></c></row>
  </sheetData>
</worksheet>`,
        'xl/worksheets/sheet2.xml': `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1"><v>DIVIDENDOS</v></c></row>
  </sheetData>
</worksheet>`,
      });

      // Sem selectedSheetName, não escolhe silenciosamente sheet1.xml: exige seleção explícita
      const res = await parseXlsxArrayBuffer(xlsxMultiBuffer);
      expect(res.requiresSheetSelection).toBe(true);
      expect(res.rows).toEqual([]);
      expect(res.availableSheets).toHaveLength(2);
      expect(res.availableSheets[0].name).toBe('Carteira Principal');
      expect(res.availableSheets[1].name).toBe('Proventos');

      // Prévia com requiresSheetSelection: true bloqueia avanço
      const preview = generateImportPreview({
        fileName: 'multi.xlsx',
        rawHeaders: [],
        rawRows: [],
        mapping: {},
        mode: 'INITIAL_POSITIONS',
        availableSheets: res.availableSheets,
        requiresSheetSelection: res.requiresSheetSelection,
      });
      expect(preview.canProceed).toBe(false);
      expect(preview.requiresSheetSelection).toBe(true);
      expect(preview.blockReason).toContain('Carteira Principal, Proventos');

      // Com selectedSheetName explícito: carrega com sucesso a aba escolhida
      const resSheet2 = await parseXlsxArrayBuffer(xlsxMultiBuffer, { selectedSheetName: 'Proventos' });
      expect(resSheet2.requiresSheetSelection).toBe(false);
      expect(resSheet2.sheetName).toBe('Proventos');
      expect(resSheet2.rows).toHaveLength(1);
      expect(resSheet2.rows[0][0]).toBe('DIVIDENDOS');
    });

    it('deve mapear corretamente abas quando a primeira visível aponta para sheet2.xml (não assume sheet1.xml)', async () => {
      const { parseXlsxArrayBuffer } = await import('../spreadsheetImporter');

      // Cenário onde sheet1.xml foi excluída ou renomeada no Excel e a primeira aba mapeia para sheet2.xml
      const xlsxBuffer = createMockXlsxZip({
        'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="AbaUnica" sheetId="2" r:id="rIdSheet2"/>
  </sheets>
</workbook>`,
        'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdSheet2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>`,
        'xl/worksheets/sheet2.xml': `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1"><v>PETR4</v></c><c r="B1"><v>100</v></c></row>
  </sheetData>
</worksheet>`,
      });

      const res = await parseXlsxArrayBuffer(xlsxBuffer);
      expect(res.sheetName).toBe('AbaUnica');
      expect(res.requiresSheetSelection).toBe(false);
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0][0]).toBe('PETR4');
      expect(res.rows[0][1]).toBe('100');
    });

    it('deve rejeitar arquivo XLSX se relação em workbook.xml.rels estiver ausente', async () => {
      const { parseXlsxArrayBuffer } = await import('../spreadsheetImporter');

      const xlsxBrokenRels = createMockXlsxZip({
        'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="MinhaAba" sheetId="1" r:id="rIdMissing"/>
  </sheets>
</workbook>`,
        'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdDifferent" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
      });

      await expect(parseXlsxArrayBuffer(xlsxBrokenRels)).rejects.toThrow(
        "Relação da aba 'MinhaAba' (r:id: rIdMissing) não encontrada em workbook.xml.rels."
      );
    });

    it('deve rejeitar arquivo XLSX sem xl/workbook.xml', async () => {
      const { parseXlsxArrayBuffer } = await import('../spreadsheetImporter');

      const encoder = new TextEncoder();
      const nameBytes = encoder.encode('xl/worksheets/sheet1.xml');
      const dataBytes = encoder.encode('<worksheet></worksheet>');
      const header = new Uint8Array(30);
      header[0] = 0x50; header[1] = 0x4b; header[2] = 0x03; header[3] = 0x04;
      header[18] = dataBytes.length; header[22] = dataBytes.length; header[26] = nameBytes.length;
      const rawZip = new Uint8Array(30 + nameBytes.length + dataBytes.length);
      rawZip.set(header, 0);
      rawZip.set(nameBytes, 30);
      rawZip.set(dataBytes, 30 + nameBytes.length);

      await expect(parseXlsxArrayBuffer(rawZip.buffer)).rejects.toThrow(
        'Arquivo XLSX inválido: estrutura não contém xl/workbook.xml.'
      );
    });

    it('deve ler e validar o arquivo XLSX real do usuário se estiver disponível', async () => {
      const { parseXlsxArrayBuffer } = await import('../spreadsheetImporter');
      const fs = await import('fs');
      const path = 'C:/Users/leoli/.gemini/antigravity/brain/55440fd0-c1ef-48f1-864c-5b8eb0117ed9/.user_uploaded/media_1790368260790.xlsx';

      if (fs.existsSync(path)) {
        const fileBytes = fs.readFileSync(path);
        const res = await parseXlsxArrayBuffer(fileBytes.buffer);
        expect(res.availableSheets.length).toBeGreaterThan(0);
        if (res.requiresSheetSelection) {
          const firstSheet = res.availableSheets[0].name;
          const parsedFirst = await parseXlsxArrayBuffer(fileBytes.buffer, { selectedSheetName: firstSheet });
          expect(parsedFirst.rows.length).toBeGreaterThan(0);
        } else {
          expect(res.rows.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('7. Blindagem de Segurança contra Zip Bomb e DoS em XLSX', () => {
    it('deve rejeitar arquivo comprimido maior que 5 MB', async () => {
      const { parseXlsxArrayBuffer } = await import('../spreadsheetImporter');
      const oversizedBuffer = new ArrayBuffer(6 * 1024 * 1024); // 6 MB
      await expect(parseXlsxArrayBuffer(oversizedBuffer)).rejects.toThrow(
        'excede o limite máximo permitido de 5 MB'
      );
    });

    it('deve rejeitar arquivo com mais de 50 entradas ZIP', async () => {
      const { parseXlsxArrayBuffer } = await import('../spreadsheetImporter');

      // Cria buffer ZIP com 51 arquivos internos
      const chunks: Uint8Array[] = [];
      const encoder = new TextEncoder();
      for (let i = 0; i < 51; i++) {
        const nameBytes = encoder.encode(`file_${i}.txt`);
        const header = new Uint8Array(30);
        header[0] = 0x50; header[1] = 0x4b; header[2] = 0x03; header[3] = 0x04;
        header[26] = nameBytes.length & 0xff;
        chunks.push(header, nameBytes);
      }
      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      const out = new Uint8Array(totalLen);
      let off = 0;
      for (const c of chunks) {
        out.set(c, off);
        off += c.length;
      }

      await expect(parseXlsxArrayBuffer(out.buffer)).rejects.toThrow(
        'número excessivo de arquivos internos (51 > 50)'
      );
    });

    it('deve rejeitar entrada ZIP que declara tamanho descompactado superior a 10 MB antes de descompactar', async () => {
      const { parseXlsxArrayBuffer } = await import('../spreadsheetImporter');

      const encoder = new TextEncoder();
      const nameBytes = encoder.encode('xl/worksheets/sheet1.xml');
      const header = new Uint8Array(30);
      header[0] = 0x50; header[1] = 0x4b; header[2] = 0x03; header[3] = 0x04;
      // Declara 15 MB descompactados (15 * 1024 * 1024 = 15728640 = 0x00F00000)
      const fakeUncompSize = 15 * 1024 * 1024;
      header[22] = fakeUncompSize & 0xff;
      header[23] = (fakeUncompSize >> 8) & 0xff;
      header[24] = (fakeUncompSize >> 16) & 0xff;
      header[25] = (fakeUncompSize >> 24) & 0xff;
      header[26] = nameBytes.length & 0xff;

      const out = new Uint8Array(30 + nameBytes.length);
      out.set(header, 0);
      out.set(nameBytes, 30);

      await expect(parseXlsxArrayBuffer(out.buffer)).rejects.toThrow(
        'declara tamanho descompactado excessivo'
      );
    });
  });

  describe('5. Inteligência de Mapeamento, Inferência Heurística e Filtro de Rodapés Residuais', () => {
    it('deve mapear com exatidão cabeçalhos da planilha do usuário (VALOR ATUAL, META, ATIVO, EMPRESA)', () => {
      const headers = [
        'EMPRESA',
        'ATIVO',
        'META VLR',
        'META',
        'REALIZ',
        'DIFERENÇA',
        'VLR ANT',
        'VLR U$',
        'ALT VALOR',
        'VALOR ATUAL',
        'FLT/SBRA',
        'QDA/SUBD %',
      ];

      const mapping = autoDetectMapping(headers);

      expect(mapping.tickerColumn).toBe('ATIVO');
      expect(mapping.nameColumn).toBe('EMPRESA');
      expect(mapping.totalValueColumn).toBe('VALOR ATUAL');
      // Deve priorizar 'META' exato antes de 'META VLR'
      expect(mapping.targetPercentageColumn).toBe('META');
    });

    it('deve inferir corretamente classes de ativos e limpar nomes a partir de prefixos e tickers', () => {
      expect(inferAssetCategory('BRBI11', 'Aç BR PARTNERS')).toEqual({
        category: 'Ações Brasil',
        cleanName: 'BR PARTNERS',
      });

      expect(inferAssetCategory('CPTS11', 'FII CAPITANIA')).toEqual({
        category: 'Fundos Imobiliários',
        cleanName: 'CAPITANIA',
      });

      expect(inferAssetCategory('Z IPCA', 'GRFIXDIN TESOU IPCA 2045')).toEqual({
        category: 'Renda Fixa',
        cleanName: 'TESOU IPCA 2045',
      });

      expect(inferAssetCategory('VT', 'INT VT + VANGUARD TOTAL WORKD STOCK')).toEqual({
        category: 'Internacional',
        cleanName: 'VT + VANGUARD TOTAL WORKD STOCK',
      });

      expect(inferAssetCategory('CAIX', 'GRFCAIXA PORQ INTER')).toEqual({
        category: 'Caixa',
        cleanName: 'PORQ INTER',
      });
    });

    it('deve filtrar rodapés marginais e importar ativos com saldo puro sem erro', () => {
      const headers = ['EMPRESA', 'ATIVO', 'META', 'VALOR ATUAL', 'OUTRO'];
      const rows = [
        ['Aç BR PARTNERS', 'BRBI11', '0.0178', '3166.56', ''],
        ['FII CAPITANIA', 'CPTS11', '0.06', '9389.22', ''],
        ['', '', '', '', 'SALDO TOTAL ATUAL REALIZADO 161774.02'], // Linha de rodapé fora da grade
      ];

      const mapping = autoDetectMapping(headers);

      const preview = generateImportPreview({
        fileName: 'carteira_real.xlsx',
        rawHeaders: headers,
        rawRows: rows,
        mapping,
        mode: 'INITIAL_POSITIONS',
      });

      expect(preview.summary.errorCount).toBe(0);
      expect(preview.previewRows).toHaveLength(2); // Rodapé foi filtrado
      expect(preview.previewRows[0].interpreted.ticker).toBe('BRBI11');
      expect(preview.previewRows[0].interpreted.category).toBe('Ações Brasil');
      expect(preview.previewRows[0].interpreted.totalValue).toBe(3166.56);
      expect(preview.previewRows[0].interpreted.targetPercentage).toBe(1.78);
      expect(preview.previewRows[0].interpreted.isBalanceOnly).toBe(true);

      expect(preview.previewRows[1].interpreted.ticker).toBe('CPTS11');
      expect(preview.previewRows[1].interpreted.category).toBe('Fundos Imobiliários');
      expect(preview.previewRows[1].interpreted.totalValue).toBe(9389.22);
      expect(preview.previewRows[1].interpreted.targetPercentage).toBe(6);
    });

    it('deve processar o arquivo real do usuário sem nenhum erro', async () => {
      const fs = await import('fs');
      const filePath = 'C:/Users/leoli/.gemini/antigravity/brain/55440fd0-c1ef-48f1-864c-5b8eb0117ed9/.user_uploaded/media_1790368260790.xlsx';
      if (!fs.existsSync(filePath)) return;
      const buf = fs.readFileSync(filePath);
      const res = await parseXlsxArrayBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), { selectedSheetName: 'ATUALIZADA' });
      const headers = res.rows[0] || [];
      const rows = res.rows.slice(1);
      const mapping = autoDetectMapping(headers);
      const preview = generateImportPreview({
        fileName: 'media_1790368260790.xlsx',
        rawHeaders: headers,
        rawRows: rows,
        mapping,
        mode: 'INITIAL_POSITIONS',
        sheetName: 'ATUALIZADA',
      });
      console.log('User sheet summary:', preview.summary);
      for (const pr of preview.previewRows) {
        if (pr.status === 'ERROR') {
          console.log(`Error on row ${pr.sourceRowNumber}:`, pr.errors, pr.rawRow);
        }
      }
      expect(preview.summary.errorCount).toBe(0);
      expect(preview.previewRows).toHaveLength(23);
      const totalSum = preview.previewRows.reduce((acc, r) => acc + (r.interpreted.totalValue || 0), 0);
      expect(Number(totalSum.toFixed(2))).toBe(161774.02);
    });
  });

  describe('6. Presets Oficiais de Importação (B3, Kinvo, Gorila, Status Invest e Corretoras)', () => {
    it('deve listar 10 presets catalogados incluindo B3, plataformas e corretoras', () => {
      expect(IMPORT_PRESETS.length).toBe(10);
      const ids = IMPORT_PRESETS.map((p) => p.id);
      expect(ids).toContain('B3_NEGOCIACAO');
      expect(ids).toContain('B3_POSICAO');
      expect(ids).toContain('KINVO');
      expect(ids).toContain('GORILA');
      expect(ids).toContain('STATUS_INVEST');
      expect(ids).toContain('XP');
      expect(ids).toContain('NUINVEST');
      expect(ids).toContain('BTG');
      expect(ids).toContain('INTER');
    });

    it('deve identificar automaticamente extrato de negociação oficial da B3', () => {
      const b3Headers = [
        'Data do Negócio',
        'Tipo de Movimentação',
        'Mercado',
        'Prazo/Vencimento',
        'Instituição',
        'Código de Negociação',
        'Quantidade',
        'Preço',
        'Valor',
      ];

      const detected = detectMatchingPreset(b3Headers);
      expect(detected).toBe('B3_NEGOCIACAO');

      const mapping = applyImportPreset(detected, b3Headers);
      expect(mapping.tickerColumn).toBe('Código de Negociação');
      expect(mapping.dateColumn).toBe('Data do Negócio');
      expect(mapping.typeColumn).toBe('Tipo de Movimentação');
      expect(mapping.quantityColumn).toBe('Quantidade');
      expect(mapping.unitPriceColumn).toBe('Preço');
      expect(mapping.totalValueColumn).toBe('Valor');
    });

    it('deve identificar automaticamente extrato de custódia oficial da B3', () => {
      const b3CustodyHeaders = [
        'Produto',
        'Código de Negociação',
        'Instituição',
        'Conta',
        'Quantidade',
        'Quantidade Disponível',
        'Preço de Fechamento',
        'Valor Atualizado',
      ];

      const detected = detectMatchingPreset(b3CustodyHeaders);
      expect(detected).toBe('B3_POSICAO');

      const mapping = applyImportPreset(detected, b3CustodyHeaders);
      expect(mapping.tickerColumn).toBe('Código de Negociação');
      expect(mapping.nameColumn).toBe('Produto');
      expect(mapping.quantityColumn).toBe('Quantidade');
      expect(mapping.unitPriceColumn).toBe('Preço de Fechamento');
      expect(mapping.totalValueColumn).toBe('Valor Atualizado');
    });

    it('deve aplicar mapeamento customizado para exportação do Gorila e Status Invest', () => {
      const gorilaHeaders = ['Data do Evento', 'Tipo de Evento', 'Ativo', 'Quantidade', 'Preço Unitário', 'Valor Líquido', 'Custos'];
      expect(detectMatchingPreset(gorilaHeaders)).toBe('GORILA');
      const gorilaMap = applyImportPreset('GORILA', gorilaHeaders);
      expect(gorilaMap.dateColumn).toBe('Data do Evento');
      expect(gorilaMap.typeColumn).toBe('Tipo de Evento');
      expect(gorilaMap.totalValueColumn).toBe('Valor Líquido');
      expect(gorilaMap.feesColumn).toBe('Custos');

      const statusInvestHeaders = ['DATA', 'CATEGORIA', 'CÓDIGO', 'OPERAÇÃO', 'QUANTIDADE', 'PREÇO UNITÁRIO', 'TOTAL', 'CORRETAGEM'];
      expect(detectMatchingPreset(statusInvestHeaders)).toBe('STATUS_INVEST');
      const siMap = applyImportPreset('STATUS_INVEST', statusInvestHeaders);
      expect(siMap.tickerColumn).toBe('CÓDIGO');
      expect(siMap.typeColumn).toBe('OPERAÇÃO');
      expect(siMap.totalValueColumn).toBe('TOTAL');
      expect(siMap.feesColumn).toBe('CORRETAGEM');
    });

    it('deve aplicar preset de corretora vinculando a instituição correspondente', () => {
      const xpPreset = IMPORT_PRESETS.find((p) => p.id === 'XP');
      expect(xpPreset?.institutionDefault).toBe('XP Investimentos');

      const btgPreset = IMPORT_PRESETS.find((p) => p.id === 'BTG');
      expect(btgPreset?.institutionDefault).toBe('BTG Pactual');

      const nuPreset = IMPORT_PRESETS.find((p) => p.id === 'NUINVEST');
      expect(nuPreset?.institutionDefault).toBe('Nubank');

      const interPreset = IMPORT_PRESETS.find((p) => p.id === 'INTER');
      expect(interPreset?.institutionDefault).toBe('Inter');
    });
  });
});

