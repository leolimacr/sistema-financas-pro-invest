"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialFactsEngine = void 0;
class FinancialFactsEngine {
    static fmt(val) {
        return Number(val || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }
    static computeFacts(params) {
        const { transactions = [], debts = [], assets = [], passives = [], bills = [], invoices = [], financialProfile, } = params;
        let totalIncome = 0;
        let totalExpenses = 0;
        const hasTransactions = transactions.length > 0;
        for (const t of transactions) {
            const amount = Number(t.amount || 0);
            if (amount <= 0)
                continue;
            const type = t.type || (amount > 0 ? 'expense' : 'income');
            if (type === 'income') {
                totalIncome += amount;
            }
            else {
                totalExpenses += amount;
            }
        }
        const cashflowBalance = totalIncome - totalExpenses;
        const burnRatePercent = totalIncome > 0
            ? Math.round((totalExpenses / totalIncome) * 100)
            : totalExpenses > 0 ? 100 : 0;
        const activeBills = bills.filter((b) => b.isActive !== false);
        const fixedBillsTotal = activeBills.reduce((acc, b) => acc + Number(b.amount || 0), 0);
        const invoicesTotal = invoices.reduce((acc, inv) => {
            const val = Number(inv.totalAmount || inv.amount || inv.estimatedValue || 0);
            return acc + val;
        }, 0);
        const totalDebtBalance = debts.reduce((acc, d) => acc + Number(d.saldoDevedor || 0), 0);
        const monthlyInstallments = debts.reduce((acc, d) => acc + Number(d.valorParcela || 0), 0);
        const activeDebtsCount = debts.length;
        let maxMonthlyRate = 0;
        let mostExpensiveDebtName;
        for (const d of debts) {
            const taxa = Number(d.taxaMensal || 0);
            if (taxa > maxMonthlyRate) {
                maxMonthlyRate = taxa;
                mostExpensiveDebtName = d.nome || d.name || 'Dívida sem nome';
            }
        }
        const effectiveIncome = Number(financialProfile?.monthlyIncome || 0) || totalIncome || 0;
        const incomeCommitmentPercent = effectiveIncome > 0
            ? Math.round((monthlyInstallments / effectiveIncome) * 100)
            : monthlyInstallments > 0 ? 100 : 0;
        let debtSeverity = 'sem_dividas';
        if (activeDebtsCount > 0) {
            if (maxMonthlyRate >= 4.0 || incomeCommitmentPercent >= 30) {
                debtSeverity = 'critica';
            }
            else if (incomeCommitmentPercent >= 15 || maxMonthlyRate >= 2.0) {
                debtSeverity = 'atencao';
            }
            else {
                debtSeverity = 'sob_controle';
            }
        }
        const totalImmediate = fixedBillsTotal + invoicesTotal + monthlyInstallments;
        const projectedMargin = effectiveIncome - totalImmediate;
        const hasProfile = !!financialProfile;
        const reserveCurrent = Number(financialProfile?.emergencyReserveCurrent || 0);
        const reserveTargetMonths = hasProfile ? Number(financialProfile?.emergencyReserveTarget || 6) : 0;
        const estimatedMonthlyCost = totalExpenses > 0
            ? totalExpenses
            : totalImmediate > 0
                ? totalImmediate
                : effectiveIncome > 0 ? effectiveIncome * 0.7 : 0;
        const reserveTargetValue = estimatedMonthlyCost > 0
            ? estimatedMonthlyCost * reserveTargetMonths
            : 0;
        const monthsCovered = estimatedMonthlyCost > 0
            ? Number((reserveCurrent / estimatedMonthlyCost).toFixed(1))
            : reserveCurrent > 0 ? reserveTargetMonths : 0;
        let protectionStatus = 'nao_configurada';
        if (hasProfile && (reserveTargetMonths > 0 || reserveCurrent > 0)) {
            if (monthsCovered >= reserveTargetMonths && monthsCovered >= 6) {
                protectionStatus = 'blindada';
            }
            else if (monthsCovered >= 3) {
                protectionStatus = 'em_formacao';
            }
            else {
                protectionStatus = 'vulneravel';
            }
        }
        const totalInvestments = assets.reduce((acc, a) => acc + Number(a.currentValue || 0), 0);
        const totalProperty = passives.reduce((acc, p) => acc + Number(p.currentValue || 0), 0);
        const netWorth = totalInvestments + totalProperty + reserveCurrent - totalDebtBalance;
        const narrativeFacts = [];
        if (hasTransactions) {
            narrativeFacts.push(`Fluxo contábil: Entradas de ${this.fmt(totalIncome)}, saídas de ${this.fmt(totalExpenses)}, resultando em saldo de ${this.fmt(cashflowBalance)} (consumo de ${burnRatePercent}% da receita).`);
        }
        else {
            narrativeFacts.push('Fluxo contábil: Sem lançamentos suficientes no período.');
        }
        if (protectionStatus !== 'nao_configurada') {
            narrativeFacts.push(`Proteção de liquidez: Reserva atual de ${this.fmt(reserveCurrent)} cobre ${monthsCovered} meses de despesas estimadas (meta: ${reserveTargetMonths} meses / ${this.fmt(reserveTargetValue)}). Status: ${protectionStatus}.`);
        }
        else {
            narrativeFacts.push('Proteção de liquidez: Metas de reserva não configuradas no perfil financeiro.');
        }
        if (activeDebtsCount > 0) {
            narrativeFacts.push(`Compromisso de dívidas: ${activeDebtsCount} obrigação(ões) ativa(s) totalizando saldo devedor de ${this.fmt(totalDebtBalance)}. Parcelas somam ${this.fmt(monthlyInstallments)}/mês (${incomeCommitmentPercent}% da renda). A dívida mais onerosa é "${mostExpensiveDebtName}" a ${maxMonthlyRate.toFixed(2)}% a.m. (Gravidade: ${debtSeverity}).`);
        }
        else {
            narrativeFacts.push('Compromisso de dívidas: Nenhuma dívida ativa registrada no sistema.');
        }
        narrativeFacts.push(`Compromissos estruturais imediatos: Contas fixas (${this.fmt(fixedBillsTotal)}) + Faturas (${this.fmt(invoicesTotal)}) + Parcelas (${this.fmt(monthlyInstallments)}) = ${this.fmt(totalImmediate)}. Margem operacional estimada: ${this.fmt(projectedMargin)}.`);
        if (totalInvestments > 0 || totalProperty > 0) {
            narrativeFacts.push(`Patrimônio consolidado: Ativos/Investimentos em ${this.fmt(totalInvestments)}, bens patrimoniais em ${this.fmt(totalProperty)}, gerando patrimônio líquido de ${this.fmt(netWorth)}.`);
        }
        return {
            cashflow: {
                totalIncome,
                totalExpenses,
                balance: cashflowBalance,
                burnRatePercent,
                hasTransactions,
            },
            protection: {
                reserveCurrent,
                reserveTargetMonths,
                reserveTargetValue,
                estimatedMonthlyCost,
                monthsCovered,
                status: protectionStatus,
            },
            debts: {
                totalBalance: totalDebtBalance,
                monthlyInstallments,
                activeCount: activeDebtsCount,
                maxMonthlyRate,
                mostExpensiveDebtName,
                incomeCommitmentPercent,
                severity: debtSeverity,
            },
            immediateCommitments: {
                fixedBillsTotal,
                invoicesTotal,
                totalImmediate,
                projectedMargin,
            },
            wealth: {
                totalInvestments,
                totalProperty,
                netWorth,
            },
            narrativeFacts,
        };
    }
    static formatForPrompt(facts) {
        const lines = facts.narrativeFacts.map((fact) => `• ${fact}`).join('\n');
        return `
# 🏛️ FATOS CONTÁBEIS DETERMINÍSTICOS (CÁLCULOS FECHADOS DO MOTOR SOBERANO)
ATENÇÃO: Os cálculos abaixo foram apurados matematicamente com base nos dados reais do usuário.
NUNCA tente recalcular ou adivinhar esses números. Interprete-os com autoridade silenciosa e sobriedade:
${lines}
`;
    }
}
exports.FinancialFactsEngine = FinancialFactsEngine;
//# sourceMappingURL=financial-facts.js.map