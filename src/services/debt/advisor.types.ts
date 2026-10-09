export type DebtCommandAction = 'open_projection' | 'open_validation' | 'open_crisis_mode';

export interface DebtCommandMetadata {
  debtId?: string;
  suggestedAmount?: number;
  daysOverdue?: number;
}

export interface DebtCommand {
  id: string;
  type: 'urgency' | 'opportunity' | 'hygiene';
  priority: number; // 0 a 100
  title: string;
  description: string;
  ctaLabel: string;
  action: DebtCommandAction;
  metadata?: DebtCommandMetadata;
}
