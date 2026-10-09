import type { CurrencyCode, QuoteMarket } from './portfolioTypes';

export interface CatalogItem {
  ticker: string;
  name: string;
  category: string;
  market: QuoteMarket;
  currency: CurrencyCode;
  type?: 'STOCK' | 'FII' | 'BDR' | 'ETF' | 'CRYPTO' | 'FIXED_INCOME' | 'CASH';
  isBalanceOnly?: boolean;
}

export const COMMON_BROKERS = [
  'XP Investimentos',
  'BTG Pactual',
  'Banco Inter',
  'Nubank / NuInvest',
  'Avenue',
  'Binance',
  'Rico',
  'Clear',
  'Genial Investimentos',
  'Itaú Corretora',
  'Bradesco Corretora',
  'BB Investimentos',
  'Santander Corretora',
  'Mercado Bitcoin',
] as const;

export const TICKER_CATALOG: CatalogItem[] = [
  // ==========================================
  // AÇÕES B3 (IBOVESPA & LIQUIDEZ)
  // ==========================================
  { ticker: 'PETR4', name: 'Petrobras PN', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'PETR3', name: 'Petrobras ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'VALE3', name: 'Vale ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'ITUB4', name: 'Itaú Unibanco PN', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'ITUB3', name: 'Itaú Unibanco ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'BBDC4', name: 'Bradesco PN', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'BBDC3', name: 'Bradesco ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'BBAS3', name: 'Banco do Brasil ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'WEGE3', name: 'WEG ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'RENT3', name: 'Localiza ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'PRIO3', name: 'PRIO ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'ABEV3', name: 'Ambev ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'BPAC11', name: 'BTG Pactual Unit', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'SUZB3', name: 'Suzano ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'EQTL3', name: 'Equatorial ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'RADL3', name: 'Raia Drogasil ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'RDOR3', name: 'Rede D\'Or ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'JBSS3', name: 'JBS ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'GGBR4', name: 'Gerdau PN', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'CSNA3', name: 'CSN ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'CSAN3', name: 'Cosan ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'VBBR3', name: 'Vibra Energia ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'CPLE6', name: 'Copel PNB', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'ELET3', name: 'Eletrobras ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'ELET6', name: 'Eletrobras PNB', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'BBSE3', name: 'BB Seguridade ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'CXSE3', name: 'Caixa Seguridade ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'SANB11', name: 'Santander Brasil Unit', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'KLBN11', name: 'Klabin Unit', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'TAEE11', name: 'Taesa Unit', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'TRPL4', name: 'Transmissão Paulista PN (ISA CTEEP)', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'EGIE3', name: 'Engie Brasil ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'CMIG4', name: 'Cemig PN', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'SBSP3', name: 'Sabesp ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'CCRO3', name: 'CCR ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'RAIL3', name: 'Rumo ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'ENGI11', name: 'Energisa Unit', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'ALOS3', name: 'Allos ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'MULT3', name: 'Multiplan ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'CYRE3', name: 'Cyrela ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'EZTC3', name: 'EZTec ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'MRVE3', name: 'MRV ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'DIRR3', name: 'Direcional ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'CURY3', name: 'Cury ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'PLPL3', name: 'Plano&Plano ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'TOTS3', name: 'Totvs ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'VIVT3', name: 'Telefônica Brasil ON (Vivo)', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'TIMS3', name: 'TIM Brasil ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'FLRY3', name: 'Fleury ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'HYPE3', name: 'Hypera ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'BRFS3', name: 'BRF ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'BEEF3', name: 'Minerva ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'MRFG3', name: 'Marfrig ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'SMTO3', name: 'São Martinho ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'SLCE3', name: 'SLC Agrícola ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'ASAI3', name: 'Assaí ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'CRFB3', name: 'Carrefour Brasil ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'MGLU3', name: 'Magazine Luiza ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'LREN3', name: 'Lojas Renner ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'ARZZ3', name: 'Arezzo&Co ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'VAMO3', name: 'Vamos ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'STBP3', name: 'Santos Brasil ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'EMBR3', name: 'Embraer ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'AZUL4', name: 'Azul PN', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'CMIN3', name: 'CSN Mineração ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'USIM5', name: 'Usiminas PNA', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'BRAP4', name: 'Bradespar PN', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'COGN3', name: 'Cogna ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'YDUQ3', name: 'Yduqs ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'POMO4', name: 'Marcopolo PN', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'KEPL3', name: 'Kepler Weber ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'RANI3', name: 'Irani ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'LEVE3', name: 'Metal Leve ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'TUPY3', name: 'Tupy ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'UNIP6', name: 'Unipar Carbocloro PNB', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'POSI3', name: 'Positivo Tecnologia ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'INTB3', name: 'Intelbras ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'PSSA3', name: 'Porto Seguro ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'B3SA3', name: 'B3 Brasil Bolsa Balcão ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'DXCO3', name: 'Dexco ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'RECV3', name: 'PetroRecôncavo ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'BRAV3', name: 'Brava Energia ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'TTEN3', name: '3Tentos Agro ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'AGRO3', name: 'BrasilAgro ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'MDIA3', name: 'M. Dias Branco ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'GRND3', name: 'Grendene ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'ODPV3', name: 'Odontoprev ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'SIMH3', name: 'Simpar ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'MOVI3', name: 'Movida ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'SAPR11', name: 'Sanepar Unit', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'SAPR4', name: 'Sanepar PN', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'ITSA4', name: 'Itaúsa PN', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'ITSA3', name: 'Itaúsa ON', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },
  { ticker: 'ALUP11', name: 'Alupar Unit', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'STOCK' },

  // ==========================================
  // FUNDOS IMOBILIÁRIOS (IFIX & MAIS NEGOCIADOS)
  // ==========================================
  { ticker: 'MXRF11', name: 'Maxi Renda FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'HGLG11', name: 'CSHG Logística FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'KNCR11', name: 'Kinea Rendimentos Imobiliários FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'KNIP11', name: 'Kinea Índices de Preços FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'KNHY11', name: 'Kinea High Yield FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'KNRI11', name: 'Kinea Renda Imobiliária FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'KNSC11', name: 'Kinea Real Estate FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'XPLG11', name: 'XP Log FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'XPML11', name: 'XP Malls FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'BTLG11', name: 'BTG Pactual Logística FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'VISC11', name: 'Vinci Shopping Centers FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'MALL11', name: 'Malls Brasil Plural FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'HGBS11', name: 'Hedge Brasil Shopping FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'HGRU11', name: 'CSHG Renda Urbana FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'HGCR11', name: 'CSHG Recebíveis Imobiliários FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'HGRE11', name: 'CSHG Real Estate FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'TGAR11', name: 'TG Ativo Real FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'VGIR11', name: 'Valora RE III FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'VGHF11', name: 'Valora Hedge Fund FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'CPTS11', name: 'Capitânia Securities II FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'RBRR11', name: 'RBR Rendimento High Grade FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'RBRY11', name: 'RBR Private Crédito Imobiliário FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'RECR11', name: 'REC Recebíveis Imobiliários FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'VRTA11', name: 'Fator Verità FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'BRCO11', name: 'Bresco Logística FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'VILG11', name: 'Vinci Logística FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'JSRE11', name: 'JS Real Estate Multigestão FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'PVBI11', name: 'VBI Prime Properties FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'LVBI11', name: 'VBI Logístico FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'RBVA11', name: 'Rio Bravo Renda Varejo FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'GGRC11', name: 'GGR Covepi Renda FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'TRXF11', name: 'TRX Real Estate FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'ALZR11', name: 'Alianza Trust Renda Imobiliária FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'GALG11', name: 'Guardian Logística FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'RURA11', name: 'Itaú Asset Rural Fiagro', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'KNCA11', name: 'Kinea Crédito Agro Fiagro', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'VGIA11', name: 'Valora CRA Fiagro', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'SNAG11', name: 'Suno Agro Fiagro', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'XPCA11', name: 'XP Agro Fiagro', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'RZTR11', name: 'Riza Terrax FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'URPR11', name: 'Urca Prime Renda FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'CVBI11', name: 'VBI CRI FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'MCCI11', name: 'Mauá Capital Recebíveis FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },
  { ticker: 'BCIA11', name: 'Bradesco Carteira Imobiliária Ativa FII', category: 'Fundos Imobiliários', market: 'B3', currency: 'BRL', type: 'FII' },

  // ==========================================
  // ETFS E BDRS POPULARES (B3)
  // ==========================================
  { ticker: 'BOVA11', name: 'iShares Ibovespa Fundo de Índice (ETF)', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'ETF' },
  { ticker: 'SMAL11', name: 'iShares Small Cap ETF', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'ETF' },
  { ticker: 'DIVO11', name: 'It Now IDIV Dividendos ETF', category: 'Ações Brasil', market: 'B3', currency: 'BRL', type: 'ETF' },
  { ticker: 'IVVB11', name: 'iShares S&P 500 ETF (B3)', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'ETF' },
  { ticker: 'SPXI11', name: 'Trend S&P 500 ETF', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'ETF' },
  { ticker: 'NASD11', name: 'Trend Nasdaq 100 ETF', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'ETF' },
  { ticker: 'WRLD11', name: 'Investo MSCI World ETF', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'ETF' },
  { ticker: 'ACWI11', name: 'Trend ACWI All Country World ETF', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'ETF' },
  { ticker: 'GOLD11', name: 'Trend Ouro ETF', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'ETF' },
  { ticker: 'HASH11', name: 'Hashdex Nasdaq Crypto Index ETF', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'ETF' },
  { ticker: 'QBTC11', name: 'QR CME CF Bitcoin ETF', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'ETF' },
  { ticker: 'QETH11', name: 'QR CME CF Ether ETF', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'ETF' },

  // BDRs B3
  { ticker: 'AAPL34', name: 'Apple Inc BDR', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'BDR' },
  { ticker: 'MSFT34', name: 'Microsoft Corporation BDR', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'BDR' },
  { ticker: 'NVDC34', name: 'Nvidia Corporation BDR', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'BDR' },
  { ticker: 'GOGL34', name: 'Alphabet / Google Class A BDR', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'BDR' },
  { ticker: 'AMZO34', name: 'Amazon.com Inc BDR', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'BDR' },
  { ticker: 'TSLA34', name: 'Tesla Inc BDR', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'BDR' },
  { ticker: 'META34', name: 'Meta Platforms Inc BDR', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'BDR' },
  { ticker: 'NFLX34', name: 'Netflix Inc BDR', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'BDR' },
  { ticker: 'BERK34', name: 'Berkshire Hathaway Inc BDR', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'BDR' },
  { ticker: 'BIDI34', name: 'Inter & Co Inc BDR', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'BDR' },
  { ticker: 'ROXO34', name: 'Nu Holdings / Nubank BDR', category: 'Internacional', market: 'B3', currency: 'BRL', type: 'BDR' },

  // ==========================================
  // ATIVOS EXTERIOR DIRETO (EUA / NYSE / NASDAQ)
  // ==========================================
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', category: 'Internacional', market: 'US', currency: 'USD', type: 'ETF' },
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', category: 'Internacional', market: 'US', currency: 'USD', type: 'ETF' },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq 100)', category: 'Internacional', market: 'US', currency: 'USD', type: 'ETF' },
  { ticker: 'VT', name: 'Vanguard Total World Stock ETF', category: 'Internacional', market: 'US', currency: 'USD', type: 'ETF' },
  { ticker: 'VXUS', name: 'Vanguard Total International Stock ETF', category: 'Internacional', market: 'US', currency: 'USD', type: 'ETF' },
  { ticker: 'VNQ', name: 'Vanguard Real Estate ETF (US REITs)', category: 'Internacional', market: 'US', currency: 'USD', type: 'ETF' },
  { ticker: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', category: 'Internacional', market: 'US', currency: 'USD', type: 'ETF' },
  { ticker: 'BND', name: 'Vanguard Total Bond Market ETF', category: 'Internacional', market: 'US', currency: 'USD', type: 'ETF' },
  { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', category: 'Internacional', market: 'US', currency: 'USD', type: 'ETF' },
  { ticker: 'AAPL', name: 'Apple Inc', category: 'Internacional', market: 'US', currency: 'USD', type: 'STOCK' },
  { ticker: 'MSFT', name: 'Microsoft Corporation', category: 'Internacional', market: 'US', currency: 'USD', type: 'STOCK' },
  { ticker: 'NVDA', name: 'Nvidia Corporation', category: 'Internacional', market: 'US', currency: 'USD', type: 'STOCK' },
  { ticker: 'GOOGL', name: 'Alphabet Inc Class A', category: 'Internacional', market: 'US', currency: 'USD', type: 'STOCK' },
  { ticker: 'AMZN', name: 'Amazon.com Inc', category: 'Internacional', market: 'US', currency: 'USD', type: 'STOCK' },
  { ticker: 'TSLA', name: 'Tesla Inc', category: 'Internacional', market: 'US', currency: 'USD', type: 'STOCK' },
  { ticker: 'META', name: 'Meta Platforms Inc', category: 'Internacional', market: 'US', currency: 'USD', type: 'STOCK' },
  { ticker: 'NU', name: 'Nu Holdings Ltd (Nubank)', category: 'Internacional', market: 'US', currency: 'USD', type: 'STOCK' },

  // ==========================================
  // CRIPTOMOEDAS
  // ==========================================
  { ticker: 'BTC', name: 'Bitcoin', category: 'Internacional', market: 'CRYPTO', currency: 'USD', type: 'CRYPTO' },
  { ticker: 'ETH', name: 'Ethereum', category: 'Internacional', market: 'CRYPTO', currency: 'USD', type: 'CRYPTO' },
  { ticker: 'SOL', name: 'Solana', category: 'Internacional', market: 'CRYPTO', currency: 'USD', type: 'CRYPTO' },
  { ticker: 'BNB', name: 'BNB (Binance Coin)', category: 'Internacional', market: 'CRYPTO', currency: 'USD', type: 'CRYPTO' },
  { ticker: 'XRP', name: 'XRP (Ripple)', category: 'Internacional', market: 'CRYPTO', currency: 'USD', type: 'CRYPTO' },
  { ticker: 'ADA', name: 'Cardano', category: 'Internacional', market: 'CRYPTO', currency: 'USD', type: 'CRYPTO' },
  { ticker: 'AVAX', name: 'Avalanche', category: 'Internacional', market: 'CRYPTO', currency: 'USD', type: 'CRYPTO' },
  { ticker: 'DOT', name: 'Polkadot', category: 'Internacional', market: 'CRYPTO', currency: 'USD', type: 'CRYPTO' },
  { ticker: 'LINK', name: 'Chainlink', category: 'Internacional', market: 'CRYPTO', currency: 'USD', type: 'CRYPTO' },
  { ticker: 'POL', name: 'Polygon Ecosystem Token', category: 'Internacional', market: 'CRYPTO', currency: 'USD', type: 'CRYPTO' },
  { ticker: 'USDT', name: 'Tether USD', category: 'Internacional', market: 'CRYPTO', currency: 'USD', type: 'CRYPTO' },
  { ticker: 'USDC', name: 'USD Coin', category: 'Internacional', market: 'CRYPTO', currency: 'USD', type: 'CRYPTO' },

  // ==========================================
  // RENDA FIXA & CAIXA
  // ==========================================
  { ticker: 'TESOURO-SELIC', name: 'Tesouro Selic (LFT)', category: 'Renda Fixa', market: 'MANUAL', currency: 'BRL', type: 'FIXED_INCOME', isBalanceOnly: true },
  { ticker: 'TESOURO-IPCA', name: 'Tesouro IPCA+ (NTN-B)', category: 'Renda Fixa', market: 'MANUAL', currency: 'BRL', type: 'FIXED_INCOME', isBalanceOnly: false },
  { ticker: 'TESOURO-PRE', name: 'Tesouro Prefixado (LTN)', category: 'Renda Fixa', market: 'MANUAL', currency: 'BRL', type: 'FIXED_INCOME', isBalanceOnly: false },
  { ticker: 'CDB-DI', name: 'CDB Pós-Fixado 100% CDI', category: 'Renda Fixa', market: 'MANUAL', currency: 'BRL', type: 'FIXED_INCOME', isBalanceOnly: true },
  { ticker: 'LCI-LCA', name: 'LCI / LCA Isenta de IR', category: 'Renda Fixa', market: 'MANUAL', currency: 'BRL', type: 'FIXED_INCOME', isBalanceOnly: true },
  { ticker: 'DEBENTURE-INC', name: 'Debênture Incentivada Isenta de IR', category: 'Renda Fixa', market: 'MANUAL', currency: 'BRL', type: 'FIXED_INCOME', isBalanceOnly: false },
  { ticker: 'CRI-CRA', name: 'CRI / CRA Certificado de Recebíveis', category: 'Renda Fixa', market: 'MANUAL', currency: 'BRL', type: 'FIXED_INCOME', isBalanceOnly: false },
  { ticker: 'CAIXA-OPORTUNIDADE', name: 'Caixa de Oportunidade da Carteira', category: 'Caixa de Oportunidade', market: 'CASH', currency: 'BRL', type: 'CASH', isBalanceOnly: true },
  { ticker: 'POUPANCA', name: 'Caderneta de Poupança', category: 'Caixa de Oportunidade', market: 'CASH', currency: 'BRL', type: 'CASH', isBalanceOnly: true },
];

/**
 * Busca inteligente no catálogo por Ticker ou Nome do Ativo
 */
export function searchTickerCatalog(query: string, limit = 8): CatalogItem[] {
  const clean = query.trim().toUpperCase();
  if (!clean) return [];

  const exactMatches: CatalogItem[] = [];
  const startsWithMatches: CatalogItem[] = [];
  const containsTickerMatches: CatalogItem[] = [];
  const nameMatches: CatalogItem[] = [];

  const cleanNoPunct = clean.replace(/[^A-Z0-9]/g, '');

  for (const item of TICKER_CATALOG) {
    const itemTicker = item.ticker.toUpperCase();
    const itemName = item.name.toUpperCase();

    if (itemTicker === clean) {
      exactMatches.push(item);
    } else if (itemTicker.startsWith(clean)) {
      startsWithMatches.push(item);
    } else if (itemTicker.includes(clean)) {
      containsTickerMatches.push(item);
    } else if (itemName.includes(clean) || (cleanNoPunct && itemName.includes(cleanNoPunct))) {
      nameMatches.push(item);
    }
  }

  const combined = [
    ...exactMatches,
    ...startsWithMatches,
    ...containsTickerMatches,
    ...nameMatches,
  ];

  // Desduplica por ticker
  const seen = new Set<string>();
  const results: CatalogItem[] = [];

  for (const item of combined) {
    if (!seen.has(item.ticker)) {
      seen.add(item.ticker);
      results.push(item);
      if (results.length >= limit) break;
    }
  }

  return results;
}
