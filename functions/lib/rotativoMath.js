"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeRotativoMonthlyInterest = computeRotativoMonthlyInterest;
exports.projectRotativoCompoundInterest = projectRotativoCompoundInterest;
exports.hasInterestBeenAppliedThisMonth = hasInterestBeenAppliedThisMonth;
exports.computeInterestForDebt = computeInterestForDebt;
const roundToCentavos = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
function computeRotativoMonthlyInterest(saldoDevedor, taxaMensal) {
    if (saldoDevedor <= 0 || taxaMensal <= 0)
        return 0;
    const interest = saldoDevedor * (taxaMensal / 100);
    return roundToCentavos(interest);
}
function projectRotativoCompoundInterest(saldoDevedor, taxaMensal, meses) {
    if (saldoDevedor <= 0 || taxaMensal <= 0 || meses <= 0) {
        return { finalBalance: saldoDevedor, totalInterest: 0 };
    }
    const rate = taxaMensal / 100;
    const finalBalance = saldoDevedor * Math.pow(1 + rate, meses);
    const roundedBalance = roundToCentavos(finalBalance);
    const totalInterest = roundToCentavos(finalBalance - saldoDevedor);
    return { finalBalance: roundedBalance, totalInterest };
}
function hasInterestBeenAppliedThisMonth(lastAppliedAt, now) {
    if (!lastAppliedAt)
        return false;
    const currentDate = now ?? new Date();
    const last = new Date(lastAppliedAt);
    return last.getUTCFullYear() === currentDate.getUTCFullYear()
        && last.getUTCMonth() === currentDate.getUTCMonth();
}
function computeInterestForDebt(debt, now) {
    if (debt.originType !== 'rotativo_cartao')
        return null;
    if (debt.saldoDevedor <= 0)
        return null;
    if (debt.taxaMensal <= 0)
        return null;
    if (hasInterestBeenAppliedThisMonth(debt.lastInterestAppliedAt, now))
        return null;
    let monthsLost = 0;
    if (debt.lastInterestAppliedAt) {
        const last = new Date(debt.lastInterestAppliedAt);
        monthsLost = (now.getUTCFullYear() - last.getUTCFullYear()) * 12
            + (now.getUTCMonth() - last.getUTCMonth());
        if (monthsLost <= 0)
            return null;
    }
    else {
        monthsLost = 1;
    }
    let interest;
    if (monthsLost === 1) {
        interest = computeRotativoMonthlyInterest(debt.saldoDevedor, debt.taxaMensal);
    }
    else {
        const projection = projectRotativoCompoundInterest(debt.saldoDevedor, debt.taxaMensal, monthsLost);
        interest = projection.totalInterest;
    }
    return { interest, monthsLost };
}
//# sourceMappingURL=rotativoMath.js.map