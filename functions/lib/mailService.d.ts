export declare function sendWeeklySummary(params: {
    to: string;
    name: string;
    totalGasto: number;
    totalAnterior: number;
    topCategorias: {
        nome: string;
        valor: number;
    }[];
    saldo: number;
}): Promise<void>;
export declare function sendInactivityAlert(params: {
    to: string;
    name: string;
    diasSemRegistro: number;
}): Promise<void>;
export declare function sendMonthlyClose(params: {
    to: string;
    name: string;
    mes: string;
    saldo: number;
    totalReceitas: number;
    totalDespesas: number;
    maiorCategoria: string;
}): Promise<void>;
export declare function sendDebtDueAlert(params: {
    to: string;
    name: string;
    debtName: string;
    dueDate: string;
    amount: number;
    diffDays: number;
}): Promise<void>;
export declare function sendGoalAportAlert(params: {
    to: string;
    name: string;
    goalName: string;
    amount: number;
}): Promise<void>;
export declare function sendPixUnderpaidNotification(params: {
    to: string;
    name?: string;
    amountPaid: number;
    planName: string;
    planPrice: number;
}): Promise<void>;
export declare function sendPixRefundCompletedNotification(params: {
    to: string;
    name?: string;
    amountRefunded: number;
    pixKey: string;
}): Promise<void>;
