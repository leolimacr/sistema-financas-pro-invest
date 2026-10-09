// src/components/tools/index.ts

// Ferramentas simples (cada uma em seu próprio arquivo)
export { CompoundInterestTool } from './CompoundInterestTool';
export { FireCalculatorTool } from './FireCalculatorTool';
export { DividendsTool } from './DividendsTool';
export { InflationTool } from './InflationTool';
export { RentVsFinanceTool } from './RentVsFinanceTool';
export { DebtOptimizerTool } from './DebtOptimizerTool';

// Gerenciador financeiro – exporta o Dashboard como padrão desta subpasta
export { default as Dashboard } from './finance';

// Nexus IA – exporta o AiChatPage como padrão desta subpasta
export { default as AiChatPage } from './nexus';
export { default as BuyCashOrInstallInvestTool } from './buy-cash-or-installments/BuyCashOrInstallInvestTool';