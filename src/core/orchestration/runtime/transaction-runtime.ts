export interface TransactionScope {
  transactionId: string;
  correlationId: string;
}

export class TransactionRuntime {
  private activeTransactions: Map<string, TransactionScope> = new Map();

  start(correlationId: string): string {
    const transactionId = crypto.randomUUID();
    this.activeTransactions.set(transactionId, { transactionId, correlationId });
    return transactionId;
  }

  end(transactionId: string) {
    this.activeTransactions.delete(transactionId);
  }

  isActive(transactionId: string): boolean {
    return this.activeTransactions.has(transactionId);
  }
}

export const transactionRuntime = new TransactionRuntime();
