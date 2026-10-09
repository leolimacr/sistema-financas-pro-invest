/**
 * Importador Puro de Planilhas (CSV e XLSX) com Prévia, Validação e Detecção de Duplicidades
 * Finanças Pro Invest
 *
 * Princípios de Engenharia:
 * - Zero dependências externas adicionadas (utiliza DecompressionStream nativo para XLSX e RFC 4180 puro para CSV)
 * - Função puramente em memória: não grava no banco, não altera estado
 * - Não adivinha números ambíguos: gera aviso explicativo
 * - Não descarta duplicidades automaticamente: marca como DUPLICATE_CANDIDATE para o usuário decidir
 * - Proteção de memória: limita tamanho do arquivo (5MB) e quantidade de linhas (2.000)
 */

export const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB de arquivo comprimido
export const MAX_ZIP_ENTRIES = 50;                          // Máximo de arquivos internos no ZIP
export const MAX_UNCOMPRESSED_ENTRY_BYTES = 10 * 1024 * 1024; // 10 MB por arquivo interno descompactado
export const MAX_TOTAL_UNCOMPRESSED_BYTES = 25 * 1024 * 1024; // 25 MB descompactado acumulado total
export const MAX_IMPORT_ROWS = 2000;                        // Máximo de 2.000 linhas
export const MAX_TOTAL_CELLS = 50_000;                      // Máximo de 50.000 células processadas

export type ImportMode = 'INITIAL_POSITIONS' | 'MOVEMENTS';

export interface ColumnMapping {
  tickerColumn?: string;
  nameColumn?: string;
  categoryColumn?: string;
  dateColumn?: string;            // Requerido em MOVEMENTS
  typeColumn?: string;            // Requerido em MOVEMENTS (BUY, SELL, DIVIDEND, etc.)
  quantityColumn?: string;
  unitPriceColumn?: string;
  totalValueColumn?: string;      // Saldo atual em INITIAL_POSITIONS ou Valor Total em MOVEMENTS
  targetPercentageColumn?: string;// Opcional em INITIAL_POSITIONS
  feesColumn?: string;
  fundingSourceColumn?: string;
}

export interface InterpretedImportedItem {
  ticker: string;
  name?: string;
  category?: string;
  date?: string;                  // YYYY-MM-DD
  type?: string;
  quantity?: number | null;       // Null para ativos puramente em saldo
  hasKnownQuantity?: boolean;     // False se for saldo puro sem cotas
  isBalanceOnly?: boolean;        // True se for ativo puramente financeiro (sem cotas)
  unitPrice?: number;
  totalValue?: number;
  targetPercentage?: number;
  fees?: number;
  hasKnownCost?: boolean;
  hasCachedFormula?: boolean;
}

export interface ImportedRowPreview {
  sourceRowNumber: number;        // 1-indexed (linha física da planilha)
  rawRow: Record<string, string>; // Coluna original -> Valor original
  interpreted: Partial<InterpretedImportedItem>;
  warnings: string[];
  errors: string[];
  status: 'VALID' | 'WARNING' | 'ERROR' | 'DUPLICATE_CANDIDATE';
  duplicateOfRow?: number;
}

export interface XlsxSheetInfo {
  name: string;
  sheetId: string;
  index: number;
  rId: string;
  targetPath: string;
}

export interface ParseXlsxOptions {
  selectedSheetName?: string;
  maxRows?: number;
}

export interface ParseXlsxResult {
  rows: string[][];
  sheetName: string;
  availableSheets: XlsxSheetInfo[];
  requiresSheetSelection: boolean;
}

export interface ImportPreviewResult {
  fileName: string;
  detectedFormat: 'CSV' | 'XLSX';
  detectedDelimiter?: string;
  sheetName?: string;
  availableSheets?: Array<{ name: string; sheetId: string; index: number }>;
  requiresSheetSelection?: boolean;
  totalRowsFound: number;
  headers: string[];
  previewRows: ImportedRowPreview[];
  summary: {
    totalRows: number;
    validCount: number;
    warningCount: number;
    errorCount: number;
    duplicateCount: number;
  };
  canProceed: boolean;
  blockReason?: string;
}

// ============================================================================
// 1. PARSERS DE ENTRADA BRUTA (CSV e XLSX NATIVOS)
// ============================================================================

/**
 * Detecta o delimitador mais provável em um texto CSV (; , ou \t)
 */
export function detectCsvDelimiter(sampleText: string): string {
  const lines = sampleText.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 5);
  let countSemicolon = 0;
  let countComma = 0;
  let countTab = 0;

  for (const line of lines) {
    countSemicolon += (line.match(/;/g) || []).length;
    countComma += (line.match(/,/g) || []).length;
    countTab += (line.match(/\t/g) || []).length;
  }

  if (countTab > countSemicolon && countTab > countComma) return '\t';
  if (countSemicolon >= countComma) return ';';
  return ',';
}

/**
 * Parser puro de CSV em conformidade com RFC 4180
 */
export function parseCsvString(content: string, delimiter?: string, maxRows = MAX_IMPORT_ROWS): string[][] {
  // Remove BOM UTF-8 se presente
  const cleanContent = content.startsWith('\uFEFF') ? content.slice(1) : content;
  const sep = delimiter || detectCsvDelimiter(cleanContent);

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < cleanContent.length) {
    const char = cleanContent[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < cleanContent.length && cleanContent[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    }

    if (char === '"') {
      inQuotes = true;
      i++;
    } else if (char === sep) {
      currentRow.push(currentField.trim());
      currentField = '';
      i++;
    } else if (char === '\r') {
      if (i + 1 < cleanContent.length && cleanContent[i + 1] === '\n') {
        i += 2;
      } else {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      if (rows.length >= maxRows) break;
    } else if (char === '\n') {
      currentRow.push(currentField.trim());
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      i++;
      if (rows.length >= maxRows) break;
    } else {
      currentField += char;
      i++;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Converte referência de coluna alfabética (ex: 'A' -> 0, 'B' -> 1, 'Z' -> 25, 'AA' -> 26) para índice base-0
 */
export function parseCellColumnIndex(cellRef?: string): number {
  if (!cellRef) return -1;
  const colLetters = cellRef.replace(/[0-9]/g, '').toUpperCase();
  if (!colLetters) return -1;
  let index = 0;
  for (let i = 0; i < colLetters.length; i++) {
    index = index * 26 + (colLetters.charCodeAt(i) - 64);
  }
  return index - 1; // 0-indexed
}

/**
 * Descompressor nativo PKZIP + leitor XML para arquivos .xlsx usando DecompressionStream
 * com blindagem contra Zip Bomb, entradas excessivas e expansão descontrolada de memória
 */
export async function parseXlsxArrayBuffer(
  buffer: ArrayBuffer,
  options?: ParseXlsxOptions | number
): Promise<ParseXlsxResult> {
  const maxRows = typeof options === 'number' ? options : (options?.maxRows || MAX_IMPORT_ROWS);
  const selectedSheetName = typeof options === 'object' ? options?.selectedSheetName : undefined;

  // 1. Limite estrito de tamanho do arquivo comprimido
  if (buffer.byteLength > MAX_IMPORT_FILE_SIZE_BYTES) {
    throw new Error(`Arquivo XLSX rejeitado: tamanho de ${(buffer.byteLength / (1024 * 1024)).toFixed(1)} MB excede o limite máximo permitido de 5 MB.`);
  }

  const bytes = new Uint8Array(buffer);

  // 2. Localiza os arquivos compactados no arquivo ZIP (varredura de Local File Headers)
  // Assinatura PKZIP: 0x04034b50 ('PK\x03\x04')
  const entries = new Map<string, { offset: number; compSize: number; uncompSize: number; method: number }>();
  let pos = 0;

  while (pos < bytes.length - 30) {
    if (bytes[pos] === 0x50 && bytes[pos + 1] === 0x4b && bytes[pos + 2] === 0x03 && bytes[pos + 3] === 0x04) {
      const method = bytes[pos + 8] | (bytes[pos + 9] << 8);
      const compSize = bytes[pos + 18] | (bytes[pos + 19] << 8) | (bytes[pos + 20] << 16) | (bytes[pos + 21] << 24);
      const uncompSize = bytes[pos + 22] | (bytes[pos + 23] << 8) | (bytes[pos + 24] << 16) | (bytes[pos + 25] << 24);
      const nameLen = bytes[pos + 26] | (bytes[pos + 27] << 8);
      const extraLen = bytes[pos + 28] | (bytes[pos + 29] << 8);

      const nameBytes = bytes.slice(pos + 30, pos + 30 + nameLen);
      const name = new TextDecoder().decode(nameBytes);
      const dataOffset = pos + 30 + nameLen + extraLen;

      entries.set(name, { offset: dataOffset, compSize, uncompSize, method });
      pos = dataOffset + compSize;
    } else {
      pos++;
    }
  }

  // Se não encontrou entradas via local header, o arquivo não é um ZIP/XLSX válido
  if (entries.size === 0) {
    throw new Error('O arquivo não possui o formato de planilha XLSX válido.');
  }

  // 3. Blindagem de segurança pré-descompressão (Zip Bomb & DoS)
  if (entries.size > MAX_ZIP_ENTRIES) {
    throw new Error(`Arquivo XLSX rejeitado: número excessivo de arquivos internos (${entries.size} > ${MAX_ZIP_ENTRIES}).`);
  }

  let totalDeclaredUncompressed = 0;
  for (const [name, entry] of entries.entries()) {
    if (entry.uncompSize > MAX_UNCOMPRESSED_ENTRY_BYTES) {
      throw new Error(`Arquivo XLSX rejeitado: arquivo interno '${name}' declara tamanho descompactado excessivo (${(entry.uncompSize / (1024 * 1024)).toFixed(1)} MB > 10 MB).`);
    }
    totalDeclaredUncompressed += entry.uncompSize;
  }

  if (totalDeclaredUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
    throw new Error(`Arquivo XLSX rejeitado: volume total descompactado declarado (${(totalDeclaredUncompressed / (1024 * 1024)).toFixed(1)} MB) excede o limite seguro de 25 MB.`);
  }

  // 4. Descompressão com monitoramento de fluxo contínuo
  let cumulativeDecompressedBytes = 0;

  const extractFileString = async (entryName: string): Promise<string | null> => {
    const entry = entries.get(entryName) || entries.get(entryName.replace(/^\//, ''));
    if (!entry) return null;

    const compressed = bytes.slice(entry.offset, entry.offset + entry.compSize);

    if (entry.method === 0) {
      // Sem compressão (Store)
      if (compressed.length > MAX_UNCOMPRESSED_ENTRY_BYTES) {
        throw new Error(`Arquivo XLSX rejeitado: entrada '${entryName}' excede 10 MB.`);
      }
      cumulativeDecompressedBytes += compressed.length;
      if (cumulativeDecompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
        throw new Error('Arquivo XLSX rejeitado: expansão acumulada excede 25 MB.');
      }
      return new TextDecoder().decode(compressed);
    } else if (entry.method === 8) {
      // Deflate
      if (typeof globalThis.DecompressionStream !== 'function') {
        throw new Error('Ambiente sem suporte a DecompressionStream nativo.');
      }
      const ds = new globalThis.DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(compressed);
      writer.close();

      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      let entryBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        entryBytes += value.length;
        cumulativeDecompressedBytes += value.length;

        if (entryBytes > MAX_UNCOMPRESSED_ENTRY_BYTES) {
          await reader.cancel();
          throw new Error(`Arquivo XLSX rejeitado: entrada '${entryName}' excedeu o limite máximo de 10 MB durante a descompressão.`);
        }
        if (cumulativeDecompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
          await reader.cancel();
          throw new Error('Arquivo XLSX rejeitado: expansão acumulada excedeu o limite máximo seguro de 25 MB.');
        }

        chunks.push(value);
      }

      const result = new Uint8Array(entryBytes);
      let off = 0;
      for (const ch of chunks) {
        result.set(ch, off);
        off += ch.length;
      }
      return new TextDecoder().decode(result);
    }
    return null;
  };

  // 5. Extrai tabela de strings compartilhadas (xl/sharedStrings.xml) se houver
  const sharedStringsXml = await extractFileString('xl/sharedStrings.xml');
  const sharedStrings: string[] = [];
  if (sharedStringsXml) {
    const siMatches = sharedStringsXml.match(/<si>[\s\S]*?<\/si>/g) || [];
    for (const si of siMatches) {
      const textMatches = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
      const fullText = textMatches.map((tm) => tm.replace(/<[^>]+>/g, '')).join('');
      sharedStrings.push(fullText);
    }
  }

  // 6. Extrai e relaciona as abas do arquivo (workbook.xml e workbook.xml.rels)
  const workbookXml = await extractFileString('xl/workbook.xml');
  if (!workbookXml) {
    throw new Error('Arquivo XLSX inválido: estrutura não contém xl/workbook.xml.');
  }

  const relsXml = await extractFileString('xl/_rels/workbook.xml.rels');
  if (!relsXml) {
    throw new Error('Arquivo XLSX inválido: arquivo de relações xl/_rels/workbook.xml.rels não foi encontrado.');
  }

  const relsMap = new Map<string, string>();
  const relMatches = relsXml.match(/<Relationship[^>]*\/>/g) || [];
  for (const rel of relMatches) {
    const idMatch = rel.match(/\bId="([^"]+)"/);
    const targetMatch = rel.match(/\bTarget="([^"]+)"/);
    if (idMatch && targetMatch) {
      relsMap.set(idMatch[1], targetMatch[1]);
    }
  }

  const availableSheets: XlsxSheetInfo[] = [];
  const sheetMatches = workbookXml.match(/<sheet[^>]*\/>/g) || [];

  for (let idx = 0; idx < sheetMatches.length; idx++) {
    const sTag = sheetMatches[idx];
    const nameMatch = sTag.match(/\bname="([^"]+)"/);
    const sheetIdMatch = sTag.match(/\bsheetId="([^"]+)"/);
    const rIdMatch = sTag.match(/\br:id="([^"]+)"/) || sTag.match(/\bid="([^"]+)"/);

    if (!nameMatch || !rIdMatch) continue;

    const name = nameMatch[1];
    const sheetId = sheetIdMatch ? sheetIdMatch[1] : String(idx + 1);
    const rId = rIdMatch[1];

    const relTarget = relsMap.get(rId);
    if (!relTarget) {
      throw new Error(`Relação da aba '${name}' (r:id: ${rId}) não encontrada em workbook.xml.rels.`);
    }

    let targetPath = relTarget.replace(/^\//, '');
    if (!targetPath.startsWith('xl/')) {
      targetPath = `xl/${targetPath}`;
    }

    availableSheets.push({
      name,
      sheetId,
      index: idx,
      rId,
      targetPath,
    });
  }

  if (availableSheets.length === 0) {
    throw new Error('Nenhuma aba foi encontrada no arquivo XLSX (workbook.xml não contém tags <sheet> válidas).');
  }

  // Se houver múltiplas abas e nenhuma foi especificada explicitamente, não escolhe silenciosamente sheet1.xml
  let targetSheet: XlsxSheetInfo | undefined;

  if (availableSheets.length === 1) {
    targetSheet = availableSheets[0];
  } else {
    if (selectedSheetName) {
      targetSheet = availableSheets.find((s) => s.name.toLowerCase() === selectedSheetName.toLowerCase());
      if (!targetSheet) {
        throw new Error(
          `Aba '${selectedSheetName}' não encontrada no arquivo XLSX. Abas disponíveis: ${availableSheets.map((s) => s.name).join(', ')}.`
        );
      }
    } else {
      // Exige seleção explícita antes de gerar prévia
      return {
        rows: [],
        sheetName: '',
        availableSheets,
        requiresSheetSelection: true,
      };
    }
  }

  // 7. Extrai o XML da aba selecionada
  const sheetXml = await extractFileString(targetSheet.targetPath);
  if (!sheetXml) {
    throw new Error(`Arquivo de dados '${targetSheet.targetPath}' para a aba '${targetSheet.name}' não foi encontrado no arquivo XLSX.`);
  }

  // 8. Parser leve e seguro de linhas e coordenadas de células
  const rows: string[][] = [];
  const rowMatches = sheetXml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || [];
  let totalCellsCount = 0;

  for (const rowXml of rowMatches) {
    if (rows.length >= maxRows) break;

    const cellMatches = rowXml.match(/<c[^>]*>[\s\S]*?<\/c>|<c[^>]*\/>/g) || [];
    const currentRow: string[] = [];
    let currentColIdx = 0;

    for (const cellXml of cellMatches) {
      totalCellsCount++;
      if (totalCellsCount > MAX_TOTAL_CELLS) {
        throw new Error(`Planilha XLSX rejeitada: quantidade de células excede o limite máximo de ${MAX_TOTAL_CELLS} células.`);
      }

      // Identifica coluna pelo atributo r="[A-Z]+[0-9]+" (ex: r="C4" -> col 2)
      const refMatch = cellXml.match(/\br="([A-Za-z]+)\d+"/);
      let targetColIdx = currentColIdx;
      if (refMatch) {
        const parsedIdx = parseCellColumnIndex(refMatch[1]);
        if (parsedIdx >= 0) {
          targetColIdx = parsedIdx;
        }
      }

      // Preenche lacunas com strings vazias para células vazias/ocultadas
      while (currentRow.length < targetColIdx) {
        currentRow.push('');
      }

      const hasFormula = /<f[^>]*>/.test(cellXml);
      const isString = /t="s"/.test(cellXml);
      const isInline = /t="inlineStr"/.test(cellXml);

      let val = '';
      if (isInline) {
        const match = cellXml.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        val = match ? match[1] : '';
      } else {
        const match = cellXml.match(/<v>([\s\S]*?)<\/v>/);
        if (match) {
          if (isString) {
            const idx = parseInt(match[1], 10);
            val = sharedStrings[idx] !== undefined ? sharedStrings[idx] : match[1];
          } else {
            val = match[1];
          }
        }
      }

      // FÓRMULAS: Detecta <f> independentemente de existir <v>
      if (hasFormula) {
        const formulaMatch = cellXml.match(/<f[^>]*>([\s\S]*?)<\/f>/);
        const formulaExpr = formulaMatch ? formulaMatch[1] : 'FORMULA';
        if (val) {
          // Possui fórmula E resultado avaliado em cache: prefixa com indicativo explícito de cache
          val = `=CACHED:${val}:${formulaExpr}`;
        } else {
          // Possui fórmula SEM resultado avaliado em cache: prefixa com = para indicar fórmula não calculada
          val = `=${formulaExpr}`;
        }
      }

      currentRow[targetColIdx] = val.trim();
      currentColIdx = targetColIdx + 1;
    }

    if (currentRow.some((c) => c && c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return {
    rows,
    sheetName: targetSheet.name,
    availableSheets,
    requiresSheetSelection: false,
  };
}

// ============================================================================
// 2. PARSERS ROBUSTOS DE DADOS BRASILEIROS E SANITIZAÇÃO
// ============================================================================

export interface ParsedNumberResult {
  value: number | null;
  isAmbiguous: boolean;
  isFormula: boolean;
  isFormulaCached?: boolean;
  formulaExpression?: string;
  cachedValue?: number | null;
  raw: string;
}

/**
 * Interpreta números em formato brasileiro (1.500,50), formato americano (1500.50),
 * porcentagens (15% ou 0,15) e detecta fórmulas não avaliadas e valores ambíguos.
 */
export function parseBrazilianNumber(rawValue: string): ParsedNumberResult {
  const raw = (rawValue || '').trim();

  if (raw === '') {
    return { value: null, isAmbiguous: false, isFormula: false, raw };
  }

  // 1. Detecta fórmula com resultado em cache gerada pelo parser XLSX
  if (raw.startsWith('=CACHED:')) {
    const parts = raw.slice('=CACHED:'.length).split(':');
    const cachedValStr = parts[0] || '';
    const formulaExpr = parts.slice(1).join(':') || 'FORMULA';

    const parsedInner = parseBrazilianNumber(cachedValStr);
    return {
      value: parsedInner.value,
      isAmbiguous: false,
      isFormula: true,
      isFormulaCached: true,
      formulaExpression: formulaExpr,
      cachedValue: parsedInner.value,
      raw: `=${formulaExpr}`,
    };
  }

  // 2. Detecta se é uma fórmula de planilha não calculada / sem resultado em cache
  if (raw.startsWith('=')) {
    return {
      value: null,
      isAmbiguous: false,
      isFormula: true,
      isFormulaCached: false,
      formulaExpression: raw.slice(1),
      cachedValue: null,
      raw,
    };
  }

  // Remove símbolos monetários e espaços
  let clean = raw
    .replace(/^R\$\s*/i, '')
    .replace(/^\$\s*/, '')
    .replace(/^€\s*/, '')
    .replace(/\s+/g, '');

  const isPercent = clean.endsWith('%');
  if (isPercent) {
    clean = clean.slice(0, -1).trim();
  }

  // Verifica ambiguidade de pontuação (ex: "123.456" ou "12,345" com 3 dígitos no final sem outro separador)
  let isAmbiguous = false;
  let parsedValue: number | null = null;

  const hasComma = clean.includes(',');
  const hasDot = clean.includes('.');

  if (hasComma && hasDot) {
    // Se tem ambos: ex: "1.500,50" (BR) ou "1,500.50" (US)
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      // Padrão Brasileiro: 1.500,50 -> remove ponto, substitui vírgula
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // Padrão US: 1,500.50 -> remove vírgula
      clean = clean.replace(/,/g, '');
    }
    const n = parseFloat(clean);
    parsedValue = Number.isFinite(n) ? n : null;
  } else if (hasComma) {
    // Apenas vírgula: "1500,50" ou "12,345"
    // Se houver 3 dígitos após a vírgula (ex: 12,345), pode ser milhar US com erro ou decimal BR de 3 casas
    if (/^\d+,\d{3}$/.test(clean)) {
      isAmbiguous = true;
    }
    clean = clean.replace(',', '.');
    const n = parseFloat(clean);
    parsedValue = Number.isFinite(n) ? n : null;
  } else if (hasDot) {
    // Apenas ponto: "1500.50" ou "1.500"
    // Se houver 3 dígitos após o ponto (ex: 1.500 ou 123.456), no Brasil frequentemente é milhar!
    if (/^\d+\.\d{3}$/.test(clean)) {
      isAmbiguous = true;
      // Trata como milhar se for inteiro sem centavos
      const asThousands = parseFloat(clean.replace(/\./g, ''));
      parsedValue = Number.isFinite(asThousands) ? asThousands : null;
    } else {
      const n = parseFloat(clean);
      parsedValue = Number.isFinite(n) ? n : null;
    }
  } else {
    // Sem separador: número inteiro puro
    const n = parseFloat(clean);
    parsedValue = Number.isFinite(n) ? n : null;
  }

  if (parsedValue !== null && isPercent) {
    // Se veio com símbolo %, ex: 15% -> 15.0
    parsedValue = Number(parsedValue.toFixed(6));
  }

  return {
    value: parsedValue,
    isAmbiguous,
    isFormula: false,
    raw,
  };
}

/**
 * Interpreta datas no formato DD/MM/AAAA, DD/MM/AA, YYYY-MM-DD ou números de data serial do Excel
 */
export function parseDate(rawValue: string): { isoDate: string | null; raw: string } {
  let raw = (rawValue || '').trim();
  if (!raw) return { isoDate: null, raw };

  if (raw.startsWith('=CACHED:')) {
    const parts = raw.slice('=CACHED:'.length).split(':');
    raw = parts[0] || '';
  } else if (raw.startsWith('=')) {
    return { isoDate: null, raw };
  }

  // Formato ISO: YYYY-MM-DD
  if (/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(raw)) {
    return { isoDate: raw, raw };
  }

  // Formato Brasileiro: DD/MM/AAAA
  const brMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return { isoDate: `${year}-${month}-${day}`, raw };
  }

  // Data serial do Excel (número de dias desde 1900-01-01)
  const serialNumber = Number(raw);
  if (!isNaN(serialNumber) && serialNumber > 30000 && serialNumber < 70000) {
    // 30000 é aprox 1982, 70000 é aprox 2091
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const targetDate = new Date(excelEpoch.getTime() + serialNumber * 86400000);
    const iso = targetDate.toISOString().slice(0, 10);
    return { isoDate: iso, raw };
  }

  return { isoDate: null, raw };
}

/**
 * Dedução heurística de categoria de ativo e sanitização de nome a partir de prefixos comuns
 */
export function inferAssetCategory(ticker: string, name?: string): { category: string; cleanName?: string } {
  const normTicker = (ticker || '').trim().toUpperCase();
  const rawName = (name || '').trim();
  const normName = rawName.toUpperCase();
  const normCombined = `${normTicker} ${normName}`;

  // 1. Caixa / Moeda
  if (
    ['US$', 'USD', 'DOLAR', 'DÓLAR', 'CAIX', 'CAIXA'].includes(normTicker) ||
    normCombined.includes('CAIXA') ||
    normCombined.includes('WDOLAR')
  ) {
    const cleanName = rawName
      .replace(/^GRFCAIXA\s+/i, '')
      .replace(/^INT\s+WDOLAR/i, 'Dólar (Caixa Internacional)')
      .replace(/^INT\s+/i, '')
      .trim();
    return { category: 'Caixa', cleanName: cleanName || rawName || 'Caixa' };
  }

  // 2. Fundos Imobiliários (FII)
  if (
    normCombined.includes('FII') ||
    normCombined.includes('IMOBIL') ||
    ['CPTS11', 'PVBI11', 'PSEC11', 'VILG11', 'XPCI11', 'XPML11', 'HGLG11', 'KNIP11', 'KNCR11', 'BBRC11', 'MXRF11', 'VISC11'].includes(normTicker)
  ) {
    const cleanName = rawName.replace(/^FII\s+/i, '').trim();
    return { category: 'Fundos Imobiliários', cleanName: cleanName || rawName };
  }

  // 3. Renda Fixa / Tesouro / CDB / Debêntures
  if (
    normCombined.includes('TESOU') ||
    normCombined.includes('CDB') ||
    normCombined.includes('SELIC') ||
    normCombined.includes('IPCA') ||
    normCombined.includes('FIXPOS') ||
    normCombined.includes('FIXDIN') ||
    normCombined.includes('R FIX') ||
    normCombined.includes('DEBENTURE') ||
    normCombined.includes('LCI') ||
    normCombined.includes('LCA') ||
    normCombined.includes('CRI') ||
    normCombined.includes('CRA') ||
    normTicker.startsWith('Z ')
  ) {
    const cleanName = rawName
      .replace(/^GRFIX(POS|DIN)?\s+/i, '')
      .replace(/^META TOTAL R FIX\s*/i, 'Renda Fixa')
      .trim();
    return { category: 'Renda Fixa', cleanName: cleanName || rawName };
  }

  // 4. Criptoativos
  if (
    normCombined.includes('CRIPTO') ||
    normCombined.includes('BITCOIN') ||
    normCombined.includes('ETHEREUM') ||
    ['BTC', 'ETH', 'SOL', 'USDT'].includes(normTicker)
  ) {
    const cleanName = rawName.replace(/^CRIPTO\s+/i, '').trim();
    return { category: 'Criptoativos', cleanName: cleanName || rawName };
  }

  // 5. Internacional / ETF Global / REIT
  if (
    normCombined.includes('INT ') ||
    normCombined.includes('VANGUARD') ||
    normCombined.includes('ISHARES') ||
    normCombined.includes('REIT') ||
    ['VT', 'BND', 'BNDX', 'IAU', 'VNQ', 'VOO', 'QQQ', 'VTI', 'SPY', 'IVV'].includes(normTicker) ||
    /^[A-Z]{4}34$/.test(normTicker) ||
    /^[A-Z]{4}39$/.test(normTicker)
  ) {
    const cleanName = rawName.replace(/^INT\s+/i, '').trim();
    return { category: 'Internacional', cleanName: cleanName || rawName };
  }

  // 6. Ações Brasil
  if (
    normCombined.includes('AÇÕES') ||
    normCombined.includes('ACOES') ||
    normCombined.startsWith('AÇ') ||
    /^[A-Z]{4}[34]$/.test(normTicker) ||
    normTicker === 'BRBI11' // Unit de Ações Brasil
  ) {
    const cleanName = rawName.replace(/^(AÇÕES|ACOES|AÇ)\s+/i, '').trim();
    return { category: 'Ações Brasil', cleanName: cleanName || rawName };
  }

  return { category: 'Outros', cleanName: rawName };
}

export type ImportPresetId =
  | 'AUTO'
  | 'B3_NEGOCIACAO'
  | 'B3_POSICAO'
  | 'KINVO'
  | 'GORILA'
  | 'STATUS_INVEST'
  | 'XP'
  | 'NUINVEST'
  | 'BTG'
  | 'INTER';

export interface ImportPreset {
  id: ImportPresetId;
  name: string;
  badge: string;
  description: string;
  defaultMode: ImportMode;
  institutionDefault?: string;
  preferredKeywords: {
    ticker: string[];
    name?: string[];
    category?: string[];
    date?: string[];
    type?: string[];
    quantity?: string[];
    unitPrice?: string[];
    totalValue?: string[];
    targetPercentage?: string[];
    fees?: string[];
  };
}

export const IMPORT_PRESETS: ImportPreset[] = [
  {
    id: 'AUTO',
    name: 'Detecção Automática',
    badge: 'Inteligente',
    description: 'Varre os cabeçalhos e mapeia colunas dinamicamente.',
    defaultMode: 'INITIAL_POSITIONS',
    preferredKeywords: {
      ticker: ['ticker', 'ativo', 'codigo', 'papel', 'symbol', 'código de negociação', 'codigo de negociacao'],
      name: ['empresa', 'nome', 'descricao', 'name', 'razao', 'produto', 'título'],
      category: ['classe', 'categoria', 'tipo ativo', 'segmento'],
      date: ['data', 'dia', 'date', 'pregao', 'data do negócio', 'data do negocio', 'data da operação', 'data do evento', 'data pregão'],
      type: ['tipo', 'operacao', 'movimentacao', 'type', 'tipo de movimentação', 'tipo de evento', 'c/v'],
      quantity: ['quantidade', 'qtd', 'cotas', 'quantity', 'acoes', 'quantidade disponível'],
      unitPrice: ['preco', 'preco medio', 'cotacao', 'valor unitario', 'unit price', 'preço de fechamento', 'preço médio'],
      totalValue: [
        'valor atual',
        'vlr atual',
        'valor total',
        'saldo atual',
        'saldo',
        'total',
        'posicao',
        'financeiro',
        'custodia',
        'valor atualizado',
        'valor líquido',
        'total líquido',
        'valor',
      ],
      targetPercentage: ['meta %', '% meta', 'meta', 'target', 'alocacao', 'objetivo'],
      fees: ['taxa', 'emolumentos', 'corretagem', 'custos', 'fees', 'taxas'],
    },
  },
  {
    id: 'B3_NEGOCIACAO',
    name: 'B3 - Negociação',
    badge: 'Área do Investidor',
    description: 'Extrato oficial de negociação de ações, FIIs e opções da B3.',
    defaultMode: 'MOVEMENTS',
    preferredKeywords: {
      ticker: ['código de negociação', 'codigo de negociacao', 'código', 'ativo'],
      date: ['data do negócio', 'data do negocio', 'data'],
      type: ['tipo de movimentação', 'tipo de movimentacao', 'movimentação'],
      quantity: ['quantidade', 'qtd'],
      unitPrice: ['preço', 'preco'],
      totalValue: ['valor', 'valor total'],
    },
  },
  {
    id: 'B3_POSICAO',
    name: 'B3 - Custódia / Posição',
    badge: 'Área do Investidor',
    description: 'Extrato oficial de posição consolidada de custódia da B3.',
    defaultMode: 'INITIAL_POSITIONS',
    preferredKeywords: {
      ticker: ['código de negociação', 'codigo de negociacao', 'código', 'ativo'],
      name: ['produto', 'empresa', 'nome'],
      quantity: ['quantidade', 'quantidade disponível', 'qtd'],
      unitPrice: ['preço de fechamento', 'preco de fechamento', 'preço'],
      totalValue: ['valor atualizado', 'valor total', 'valor'],
    },
  },
  {
    id: 'KINVO',
    name: 'Kinvo',
    badge: 'Plataforma',
    description: 'Exportação padrão de carteira e movimentações do Kinvo.',
    defaultMode: 'MOVEMENTS',
    preferredKeywords: {
      ticker: ['ativo', 'código', 'ticker'],
      name: ['produto', 'nome'],
      date: ['data', 'data da operação'],
      type: ['operação', 'operacao', 'tipo'],
      quantity: ['quantidade', 'qtd'],
      unitPrice: ['preço unitário', 'preco unitario', 'preço'],
      totalValue: ['valor total', 'total'],
      fees: ['taxas', 'custos'],
    },
  },
  {
    id: 'GORILA',
    name: 'Gorila',
    badge: 'Plataforma',
    description: 'Exportação de transações e eventos do Gorila Investimentos.',
    defaultMode: 'MOVEMENTS',
    preferredKeywords: {
      ticker: ['ativo', 'código'],
      name: ['ativo', 'nome'],
      date: ['data do evento', 'data'],
      type: ['tipo de evento', 'tipo', 'evento'],
      quantity: ['quantidade', 'qtd'],
      unitPrice: ['preço unitário', 'preço'],
      totalValue: ['valor líquido', 'valor bruto', 'valor'],
      fees: ['custos', 'taxas'],
    },
  },
  {
    id: 'STATUS_INVEST',
    name: 'Status Invest',
    badge: 'Plataforma',
    description: 'Exportação de transações da carteira do Status Invest.',
    defaultMode: 'MOVEMENTS',
    preferredKeywords: {
      ticker: ['código', 'codigo', 'papel', 'ticker'],
      name: ['título', 'titulo', 'nome'],
      category: ['categoria', 'classe'],
      date: ['data'],
      type: ['operação', 'operacao'],
      quantity: ['quantidade', 'qtd'],
      unitPrice: ['preço unitário', 'preco unitario'],
      totalValue: ['total', 'valor total'],
      fees: ['corretagem', 'taxas'],
    },
  },
  {
    id: 'XP',
    name: 'XP Investimentos',
    badge: 'Corretora',
    description: 'Extrato e notas de negociação da XP Investimentos.',
    defaultMode: 'MOVEMENTS',
    institutionDefault: 'XP Investimentos',
    preferredKeywords: {
      ticker: ['ativo', 'papel', 'código'],
      date: ['data'],
      type: ['tipo', 'c/v', 'operação'],
      quantity: ['qtd', 'quantidade'],
      unitPrice: ['preço', 'preco'],
      totalValue: ['valor líquido', 'total'],
      fees: ['taxas', 'emolumentos'],
    },
  },
  {
    id: 'NUINVEST',
    name: 'NuInvest / Nubank',
    badge: 'Corretora',
    description: 'Extrato de operações NuInvest / Nubank.',
    defaultMode: 'MOVEMENTS',
    institutionDefault: 'Nubank',
    preferredKeywords: {
      ticker: ['papel', 'ativo', 'código'],
      name: ['nome', 'empresa'],
      date: ['data da operação', 'data'],
      type: ['operação', 'operacao', 'tipo'],
      quantity: ['quantidade', 'qtd'],
      unitPrice: ['preço médio', 'preço'],
      totalValue: ['total líquido', 'total'],
    },
  },
  {
    id: 'BTG',
    name: 'BTG Pactual',
    badge: 'Corretora',
    description: 'Relatório de operações do BTG Pactual Digital.',
    defaultMode: 'MOVEMENTS',
    institutionDefault: 'BTG Pactual',
    preferredKeywords: {
      ticker: ['código', 'codigo', 'ativo'],
      name: ['descrição', 'descricao', 'nome'],
      date: ['data pregão', 'data pregao', 'data'],
      type: ['c/v', 'tipo'],
      quantity: ['quantidade', 'qtd'],
      unitPrice: ['preço', 'preco'],
      totalValue: ['valor total', 'valor líquido'],
    },
  },
  {
    id: 'INTER',
    name: 'Banco Inter',
    badge: 'Corretora',
    description: 'Extrato de notas e custódia da Inter DTVM.',
    defaultMode: 'MOVEMENTS',
    institutionDefault: 'Inter',
    preferredKeywords: {
      ticker: ['ativo', 'papel', 'código'],
      name: ['nome', 'descrição'],
      date: ['data da operação', 'data'],
      type: ['tipo', 'operação'],
      quantity: ['quantidade', 'qtd'],
      unitPrice: ['preço unitário', 'preço'],
      totalValue: ['valor total', 'total'],
    },
  },
];

/**
 * Detecta se a planilha corresponde a um preset conhecido
 */
export function detectMatchingPreset(headers: string[]): ImportPresetId {
  const norm = (s: string) =>
    s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const joined = headers.map(norm).join(' | ');

  if (
    joined.includes('codigo de negociacao') &&
    (joined.includes('data do negocio') || joined.includes('tipo de movimentacao'))
  ) {
    return 'B3_NEGOCIACAO';
  }
  if (
    joined.includes('codigo de negociacao') &&
    (joined.includes('preco de fechamento') ||
      joined.includes('valor atualizado') ||
      joined.includes('quantidade disponivel'))
  ) {
    return 'B3_POSICAO';
  }
  if (joined.includes('data do evento') || joined.includes('tipo de evento')) {
    return 'GORILA';
  }
  if (joined.includes('categoria') && joined.includes('corretagem') && joined.includes('operacao')) {
    return 'STATUS_INVEST';
  }
  if (joined.includes('data pregao') && joined.includes('c/v')) {
    return 'BTG';
  }
  if (joined.includes('data da operacao') && joined.includes('total liquido')) {
    return 'NUINVEST';
  }

  return 'AUTO';
}

/**
 * Aplica um preset específico aos cabeçalhos encontrados na planilha
 */
export function applyImportPreset(
  presetId: ImportPresetId,
  headers: string[]
): ColumnMapping {
  const preset = IMPORT_PRESETS.find((p) => p.id === presetId) || IMPORT_PRESETS[0];

  const norm = (s: string) =>
    s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const findCol = (keywords?: string[]) => {
    if (!keywords || keywords.length === 0) return undefined;
    // 1. Procura casamento exato
    for (const kw of keywords) {
      const exact = headers.find((h) => norm(h) === norm(kw));
      if (exact) return exact;
    }
    // 2. Procura casamento parcial
    for (const kw of keywords) {
      const partial = headers.find((h) => norm(h).includes(norm(kw)));
      if (partial) return partial;
    }
    return undefined;
  };

  return {
    tickerColumn: findCol(preset.preferredKeywords.ticker),
    nameColumn: findCol(preset.preferredKeywords.name),
    categoryColumn: findCol(preset.preferredKeywords.category),
    dateColumn: findCol(preset.preferredKeywords.date),
    typeColumn: findCol(preset.preferredKeywords.type),
    quantityColumn: findCol(preset.preferredKeywords.quantity),
    unitPriceColumn: findCol(preset.preferredKeywords.unitPrice),
    totalValueColumn: findCol(preset.preferredKeywords.totalValue),
    targetPercentageColumn: findCol(preset.preferredKeywords.targetPercentage),
    feesColumn: findCol(preset.preferredKeywords.fees),
  };
}

/**
 * Detecção automática determinística de colunas a partir de cabeçalhos de planilhas financeiras
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const matchedPreset = detectMatchingPreset(headers);
  return applyImportPreset(matchedPreset, headers);
}

// ============================================================================
// 3. GERADOR DE PRÉVIA, MAPEAMENTO E DETECÇÃO DE DUPLICIDADES
// ============================================================================

export function generateImportPreview(params: {
  fileName: string;
  rawHeaders: string[];
  rawRows: string[][];
  mapping: ColumnMapping;
  mode: ImportMode;
  sheetName?: string;
  availableSheets?: Array<{ name: string; sheetId: string; index: number }>;
  requiresSheetSelection?: boolean;
}): ImportPreviewResult {
  const { fileName, rawHeaders, rawRows, mapping, mode, sheetName, availableSheets, requiresSheetSelection } = params;

  const detectedFormat = fileName.toLowerCase().endsWith('.xlsx') ? 'XLSX' : 'CSV';

  if (requiresSheetSelection) {
    const sheetNames = (availableSheets || []).map((s) => s.name).join(', ');
    return {
      fileName,
      detectedFormat: 'XLSX',
      sheetName,
      availableSheets,
      requiresSheetSelection: true,
      totalRowsFound: 0,
      headers: rawHeaders,
      previewRows: [],
      summary: {
        totalRows: 0,
        validCount: 0,
        warningCount: 0,
        errorCount: 0,
        duplicateCount: 0,
      },
      canProceed: false,
      blockReason: `O arquivo XLSX contém múltiplas abas (${sheetNames}). Selecione explicitamente a aba desejada antes de continuar.`,
    };
  }

  const previewRows: ImportedRowPreview[] = [];

  // Mapeia índices das colunas selecionadas
  const colIndex = (colName?: string) => {
    if (!colName) return -1;
    return rawHeaders.findIndex((h) => h.trim().toLowerCase() === colName.trim().toLowerCase());
  };

  const tickerIdx = colIndex(mapping.tickerColumn);
  const nameIdx = colIndex(mapping.nameColumn);
  const categoryIdx = colIndex(mapping.categoryColumn);
  const dateIdx = colIndex(mapping.dateColumn);
  const typeIdx = colIndex(mapping.typeColumn);
  const qtyIdx = colIndex(mapping.quantityColumn);
  const unitPriceIdx = colIndex(mapping.unitPriceColumn);
  const totalValIdx = colIndex(mapping.totalValueColumn);
  const targetPctIdx = colIndex(mapping.targetPercentageColumn);
  const feesIdx = colIndex(mapping.feesColumn);

  // Mapa de hash para detecção de duplicidades: hash -> primeira linha onde apareceu
  const duplicateTracker = new Map<string, number>();

  let validCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    const sourceRowNumber = r + 2; // +1 cabeçalho + 1 index-0

    // 0. Filtro de Linhas Residuais / Rodapés Marginais:
    // Se a linha não contém dados em nenhuma das colunas mapeadas, ou se não possui
    // ticker e nenhum valor/quantidade/nome, trata-se de anotação/resumo de rodapé fora da grade de ativos.
    const hasAnyMappedContent = [
      tickerIdx,
      nameIdx,
      categoryIdx,
      dateIdx,
      typeIdx,
      qtyIdx,
      unitPriceIdx,
      totalValIdx,
      targetPctIdx,
      feesIdx,
    ].some((idx) => idx !== -1 && (row[idx] || '').trim().length > 0);

    if (!hasAnyMappedContent) {
      continue;
    }

    const rawTickerCheck = tickerIdx !== -1 ? (row[tickerIdx] || '').trim() : '';
    const rawNameCheck = nameIdx !== -1 ? (row[nameIdx] || '').trim() : '';
    const rawValCheck = totalValIdx !== -1 ? (row[totalValIdx] || '').trim() : '';
    const rawQtyCheck = qtyIdx !== -1 ? (row[qtyIdx] || '').trim() : '';

    const isVisualSeparator = (val: string) => {
      const trimmed = val.replace(/&gt;/g, '>').replace(/&lt;/g, '<').trim();
      return /^[>=<-]{3,}$/.test(trimmed);
    };

    if (isVisualSeparator(rawTickerCheck) || isVisualSeparator(rawNameCheck)) {
      continue;
    }

    // Filtro de Linhas Residuais / Rodapés / Totais:
    // Se a linha não possui ticker e não possui valor financeiro nem quantidade,
    // não se trata de um ativo de investimento (é nota textual marginal, rodapé, separador ou fórmula solta).
    if (mode === 'INITIAL_POSITIONS') {
      if (!rawTickerCheck && !rawValCheck && !rawQtyCheck) {
        continue;
      }
      // Detecção defensiva de linhas de total/soma onde ATIVO está vazio
      const upperName = rawNameCheck.toUpperCase();
      if (!rawTickerCheck && (/^(TOTAL|SOMA|SUBTOTAL|SALDO\s+TOTAL)/.test(upperName) || upperName.startsWith('=FORMULA'))) {
        continue;
      }
    } else {
      const rawDateCheck = dateIdx !== -1 ? (row[dateIdx] || '').trim() : '';
      if (!rawTickerCheck && !rawDateCheck && !rawValCheck && !rawQtyCheck) {
        continue;
      }
    }

    const rawMap: Record<string, string> = {};
    rawHeaders.forEach((h, i) => {
      const cellVal = row[i] || '';
      if (cellVal.startsWith('=CACHED:')) {
        const parts = cellVal.slice('=CACHED:'.length).split(':');
        const cVal = parts[0] || '';
        const expr = parts.slice(1).join(':') || 'FORMULA';
        rawMap[h] = `=${expr} (em cache: ${cVal})`;
      } else {
        rawMap[h] = cellVal;
      }
    });

    const warnings: string[] = [];
    const errors: string[] = [];
    const interpreted: Partial<InterpretedImportedItem> = {};

    // 1. Ticker / Ativo
    if (tickerIdx !== -1) {
      const rawTicker = (row[tickerIdx] || '').trim().toUpperCase();
      if (!rawTicker) {
        errors.push('Código/ticker do ativo está em branco nesta linha.');
      } else if (rawTicker.startsWith('=')) {
        errors.push(`Coluna de ticker contém fórmula de planilha (${rawTicker}).`);
      } else {
        interpreted.ticker = rawTicker;
      }
    } else {
      errors.push('A coluna de Ticker não foi mapeada.');
    }

    // 2. Nome e Categoria (com inferência inteligente por classe e prefixos)
    if (nameIdx !== -1 && row[nameIdx]) interpreted.name = row[nameIdx].trim();
    if (categoryIdx !== -1 && row[categoryIdx] && row[categoryIdx].trim()) {
      interpreted.category = row[categoryIdx].trim();
    } else if (interpreted.ticker) {
      const inferred = inferAssetCategory(interpreted.ticker, interpreted.name);
      interpreted.category = inferred.category;
      if (inferred.cleanName) {
        interpreted.name = inferred.cleanName;
      }
    }

    // 3. Validações específicas por modo
    if (mode === 'INITIAL_POSITIONS') {
      // Posição Inicial: requer saldo/valor atual OU quantidade
      let hasVal = false;

      if (totalValIdx !== -1 && row[totalValIdx]) {
        const parsedVal = parseBrazilianNumber(row[totalValIdx]);
        if (parsedVal.isFormula) {
          if (parsedVal.isFormulaCached) {
            warnings.push(
              `Valor total contém fórmula com resultado em cache (${parsedVal.raw} = ${parsedVal.cachedValue}); valor não foi recalculado e pode estar desatualizado.`
            );
            interpreted.hasCachedFormula = true;
          } else {
            errors.push(
              `Valor total contém fórmula não calculada (${parsedVal.raw}). Conversão numérica bloqueada (valor nulo); informe o valor manualmente.`
            );
          }
        }
        if (parsedVal.isAmbiguous) {
          warnings.push(`Valor ${parsedVal.raw} tem pontuação ambígua; verifique se é milhar ou decimal.`);
        }
        if (parsedVal.value !== null && Number.isFinite(parsedVal.value) && parsedVal.value >= 0) {
          interpreted.totalValue = parsedVal.value;
          hasVal = true;
        } else if (!parsedVal.isFormula) {
          errors.push(`Valor total inválido (${row[totalValIdx]}).`);
        }
      }

      if (qtyIdx !== -1 && row[qtyIdx]) {
        const parsedQty = parseBrazilianNumber(row[qtyIdx]);
        if (parsedQty.isFormula) {
          if (parsedQty.isFormulaCached) {
            warnings.push(
              `Quantidade contém fórmula com resultado em cache (${parsedQty.raw} = ${parsedQty.cachedValue}); valor não foi recalculado e pode estar desatualizado.`
            );
            interpreted.hasCachedFormula = true;
          } else {
            errors.push(
              `Quantidade contém fórmula não calculada (${parsedQty.raw}). Conversão numérica bloqueada (valor nulo); informe o valor manualmente.`
            );
          }
        }
        if (parsedQty.isAmbiguous) {
          warnings.push(`Quantidade (${parsedQty.raw}) tem pontuação ambígua; verifique se é milhar ou decimal.`);
        }
        if (parsedQty.value !== null && Number.isFinite(parsedQty.value) && parsedQty.value >= 0) {
          interpreted.quantity = parsedQty.value;
          hasVal = true;
        } else if (!parsedQty.isFormula) {
          errors.push(`Quantidade inválida (${row[qtyIdx]}).`);
        }
      }

      if (unitPriceIdx !== -1 && row[unitPriceIdx]) {
        const parsedPrice = parseBrazilianNumber(row[unitPriceIdx]);
        if (parsedPrice.isFormula) {
          if (parsedPrice.isFormulaCached) {
            warnings.push(
              `Preço unitário contém fórmula com resultado em cache (${parsedPrice.raw} = ${parsedPrice.cachedValue}); valor não foi recalculado e pode estar desatualizado.`
            );
            interpreted.hasCachedFormula = true;
          } else {
            errors.push(
              `Preço unitário contém fórmula não calculada (${parsedPrice.raw}). Conversão numérica bloqueada (valor nulo); informe o valor manualmente.`
            );
          }
        }
        if (parsedPrice.isAmbiguous) {
          warnings.push(`Preço unitário (${parsedPrice.raw}) tem pontuação ambígua; verifique se é milhar ou decimal.`);
        }
        if (parsedPrice.value !== null && Number.isFinite(parsedPrice.value) && parsedPrice.value >= 0) {
          interpreted.unitPrice = parsedPrice.value;
          interpreted.hasKnownCost = true;
        } else if (!parsedPrice.isFormula) {
          errors.push(`Preço unitário inválido (${row[unitPriceIdx]}).`);
        }
      }

      if (targetPctIdx !== -1 && row[targetPctIdx]) {
        const parsedTarget = parseBrazilianNumber(row[targetPctIdx]);
        if (parsedTarget.isFormula) {
          if (parsedTarget.isFormulaCached) {
            warnings.push(
              `Meta de alocação contém fórmula com resultado em cache (${parsedTarget.raw} = ${parsedTarget.cachedValue}); valor não foi recalculado.`
            );
            interpreted.hasCachedFormula = true;
          } else {
            errors.push(
              `Meta de alocação contém fórmula não calculada (${parsedTarget.raw}). Conversão numérica bloqueada; informe o valor manualmente.`
            );
          }
        }
        if (parsedTarget.value !== null && Number.isFinite(parsedTarget.value) && parsedTarget.value >= 0) {
          const rawPct = parsedTarget.value <= 1.0 ? parsedTarget.value * 100 : parsedTarget.value;
          interpreted.targetPercentage = Number(rawPct.toFixed(2));
        }
      }

      // Regra de Integridade: Se tiver apenas saldo e não tiver quantidade, NÃO inventa cotas fictícias nem preço médio
      if (!hasVal) {
        errors.push('A linha não possui nem quantidade nem saldo financeiro.');
      } else if (interpreted.quantity === undefined && interpreted.totalValue !== undefined) {
        warnings.push('Ativo importado apenas com saldo financeiro; quantidade de cotas e preço médio desconhecidos (sem cotas fictícias).');
        interpreted.hasKnownCost = false;
        interpreted.hasKnownQuantity = false;
        interpreted.isBalanceOnly = true;
        interpreted.quantity = null;
      }
    } else {
      // Modo MOVEMENTS: Data e Tipo de Operação são obrigatórios
      if (dateIdx !== -1) {
        const rawDate = row[dateIdx];
        if (rawDate && (rawDate.startsWith('=CACHED:') || rawDate.startsWith('='))) {
          if (rawDate.startsWith('=CACHED:')) {
            const parts = rawDate.slice('=CACHED:'.length).split(':');
            const cachedD = parts[0] || '';
            const expr = parts.slice(1).join(':') || 'FORMULA';
            warnings.push(`Data contém fórmula com resultado em cache (=${expr} = ${cachedD}); valor não recalculado.`);
            interpreted.hasCachedFormula = true;
            const parsedD = parseDate(cachedD);
            if (parsedD.isoDate) {
              interpreted.date = parsedD.isoDate;
            } else {
              errors.push(`Data em cache não reconhecida (${cachedD}).`);
            }
          } else {
            errors.push(`Data contém fórmula não calculada (${rawDate}). Conversão bloqueada; informe a data manualmente.`);
          }
        } else {
          const parsedD = parseDate(rawDate);
          if (parsedD.isoDate) {
            interpreted.date = parsedD.isoDate;
          } else {
            errors.push(`Data inválida ou não reconhecida (${rawDate}).`);
          }
        }
      } else {
        errors.push('A coluna de Data é obrigatória no modo de movimentações.');
      }

      if (typeIdx !== -1) {
        interpreted.type = (row[typeIdx] || '').trim().toUpperCase();
      }

      if (qtyIdx !== -1 && row[qtyIdx]) {
        const parsedQty = parseBrazilianNumber(row[qtyIdx]);
        if (parsedQty.isFormula) {
          if (parsedQty.isFormulaCached) {
            warnings.push(
              `Quantidade contém fórmula com resultado em cache (${parsedQty.raw} = ${parsedQty.cachedValue}); valor não foi recalculado e pode estar desatualizado.`
            );
            interpreted.hasCachedFormula = true;
          } else {
            errors.push(
              `Quantidade contém fórmula não calculada (${parsedQty.raw}). Conversão numérica bloqueada (valor nulo); informe o valor manualmente.`
            );
          }
        }
        if (parsedQty.isAmbiguous) {
          warnings.push(`Quantidade (${parsedQty.raw}) tem pontuação ambígua; verifique se é milhar ou decimal.`);
        }
        if (parsedQty.value !== null && Number.isFinite(parsedQty.value) && parsedQty.value >= 0) {
          interpreted.quantity = parsedQty.value;
        } else if (!parsedQty.isFormula) {
          errors.push(`Quantidade inválida (${row[qtyIdx]}).`);
        }
      }

      if (unitPriceIdx !== -1 && row[unitPriceIdx]) {
        const parsedPrice = parseBrazilianNumber(row[unitPriceIdx]);
        if (parsedPrice.isFormula) {
          if (parsedPrice.isFormulaCached) {
            warnings.push(
              `Preço unitário contém fórmula com resultado em cache (${parsedPrice.raw} = ${parsedPrice.cachedValue}); valor não foi recalculado e pode estar desatualizado.`
            );
            interpreted.hasCachedFormula = true;
          } else {
            errors.push(
              `Preço unitário contém fórmula não calculada (${parsedPrice.raw}). Conversão numérica bloqueada (valor nulo); informe o valor manualmente.`
            );
          }
        }
        if (parsedPrice.isAmbiguous) {
          warnings.push(`Preço unitário (${parsedPrice.raw}) tem pontuação ambígua; verifique se é milhar ou decimal.`);
        }
        if (parsedPrice.value !== null && Number.isFinite(parsedPrice.value) && parsedPrice.value >= 0) {
          interpreted.unitPrice = parsedPrice.value;
        } else if (!parsedPrice.isFormula) {
          errors.push(`Preço unitário inválido (${row[unitPriceIdx]}).`);
        }
      }

      if (feesIdx !== -1 && row[feesIdx]) {
        const parsedFees = parseBrazilianNumber(row[feesIdx]);
        if (parsedFees.isFormula) {
          if (parsedFees.isFormulaCached) {
            warnings.push(
              `Taxas/custos contêm fórmula com resultado em cache (${parsedFees.raw} = ${parsedFees.cachedValue}); valor não foi recalculado e pode estar desatualizado.`
            );
            interpreted.hasCachedFormula = true;
          } else {
            errors.push(
              `Taxas/custos contêm fórmula não calculada (${parsedFees.raw}). Conversão numérica bloqueada (valor nulo); informe o valor manualmente.`
            );
          }
        }
        if (parsedFees.isAmbiguous) {
          warnings.push(`Taxas/custos (${parsedFees.raw}) têm pontuação ambígua; verifique se é milhar ou decimal.`);
        }
        if (parsedFees.value !== null && Number.isFinite(parsedFees.value) && parsedFees.value >= 0) {
          interpreted.fees = parsedFees.value;
        } else if (!parsedFees.isFormula) {
          errors.push(`Taxas/custos inválidas (${row[feesIdx]}).`);
        }
      }
    }

    // 4. Detecção de Duplicidades (mesmo ativo, data/tipo, quantidade e valor)
    const dupKey = `${interpreted.ticker || ''}|${interpreted.date || ''}|${interpreted.type || ''}|${interpreted.quantity || 0}|${interpreted.totalValue || interpreted.unitPrice || 0}`;
    let status: ImportedRowPreview['status'] = 'VALID';
    let duplicateOfRow: number | undefined;

    if (interpreted.ticker) {
      if (duplicateTracker.has(dupKey)) {
        duplicateOfRow = duplicateTracker.get(dupKey);
        status = 'DUPLICATE_CANDIDATE';
        warnings.push(`Possível duplicata da Linha ${duplicateOfRow}. Não descartada automaticamente; confirme na prévia.`);
        duplicateCount++;
      } else {
        duplicateTracker.set(dupKey, sourceRowNumber);
      }
    }

    if (errors.length > 0) {
      status = 'ERROR';
      errorCount++;
    } else if (status !== 'DUPLICATE_CANDIDATE') {
      if (warnings.length > 0) {
        status = 'WARNING';
        warningCount++;
      } else {
        validCount++;
      }
    }

    previewRows.push({
      sourceRowNumber,
      rawRow: rawMap,
      interpreted,
      warnings,
      errors,
      status,
      duplicateOfRow,
    });
  }

  const totalRows = previewRows.length;
  const canProceed = totalRows > 0 && errorCount === 0;

  return {
    fileName,
    detectedFormat,
    sheetName,
    availableSheets,
    requiresSheetSelection: false,
    totalRowsFound: totalRows,
    headers: rawHeaders,
    previewRows,
    summary: {
      totalRows,
      validCount,
      warningCount,
      errorCount,
      duplicateCount,
    },
    canProceed,
    blockReason: errorCount > 0 ? `Existem ${errorCount} linhas com erros impeditivos. Corrija o mapeamento ou o arquivo.` : undefined,
  };
}
