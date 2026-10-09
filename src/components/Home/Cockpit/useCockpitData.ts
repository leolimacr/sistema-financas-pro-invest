import { useMemo } from 'react';
import type { Transaction, UserMeta } from '../../../types';
import { useBills } from '../../../hooks/useBills';
import { isBillPaid, getCurrentInvoice } from '../../../utils/invoiceUtils';
import { useWealthData } from '../../../hooks/useWealthData';
import { useCards } from '../../../hooks/useCards';
import { useWealthHistory } from '../../../hooks/useWealthHistory';
import { useSovereignSnapshot } from '../../../hooks/useSovereignSnapshot';
import { useExclusions } from '../../../contexts/ExclusionsContext';
import { useNexusEvents } from '../../../hooks/useNexusEvents';
import { classifyFromSnapshot } from '../../../services/sovereignMap';

export const useCockpitData = (
  user: { uid: string } | null,
  transactions: Transaction[],
  userMeta: UserMeta | null | undefined
) => {
  const { bills: recurringBills, isLoading: loadingBills } = useBills(user?.uid);
  const { 
    history: wealthHistory, 
    daysSinceLastSnapshot, 
    dataHealth, 
    saveSnapshot, 
    isSaving 
  } = useWealthHistory(user?.uid);

  const { 
    assets,
    passives,
    totalInvestments, 
    totalProperty, 
    patrimonioLiquido, 
    totalDebts,
    debts,
    loading: loadingWealth 
  } = useWealthData();

  const { cards: userCards = [], isLoading: loadingCards } = useCards(user?.uid);

  const safeTx = useMemo(() => Array.isArray(transactions) ? transactions : [], [transactions]);

  const reserveTarget = userMeta?.financialProfile?.emergencyReserveTarget || 0;
  const colchaoTarget = userMeta?.financialProfile?.colchaoInicialTarget || 0;
  const { excluirVoucherMap } = useExclusions();
  const voucherExclusion = useMemo(() => {
    return userCards
      .filter((c: any) => c.paymentMethod === 'voucher' && excluirVoucherMap[c.id])
      .reduce((s: number, c: any) => s + (c.balance || 0), 0);
  }, [userCards, excluirVoucherMap]);

  const sovereign = useSovereignSnapshot(safeTx, userMeta, false, undefined, voucherExclusion);

  const colchaoCurrent = sovereign.colchaoCoverage;
  const reserveCurrent = sovereign.reserveCoverage;

  // Estágio do Mapa de Soberania
  const stage = useMemo(
    () => classifyFromSnapshot(sovereign, safeTx.length),
    [sovereign, safeTx.length],
  );

  // Evento Nexus para o CommandRitual (linha de Atenção)
  const { event: serverEvent } = useNexusEvents();
  const contextualEvent = serverEvent;

  // Lógica de Urgência
  const urgentBills = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    
    return recurringBills.filter(bill => {
      if (!bill.isActive) return false;
      const isDueSoon = bill.dueDay === currentDay || bill.dueDay === (currentDay + 1);
      if (!isDueSoon) return false;
      return !isBillPaid(bill, safeTx);
    });
  }, [recurringBills, safeTx]);

  // Totais e Composições
  const totals = useMemo(() => {
    const totalCards = userCards.reduce((sum, card) => {
      const inv = getCurrentInvoice(card, safeTx);
      return sum + (inv?.total || 0);
    }, 0);

    const controlaBalance = safeTx.reduce((acc, t) => {
      const val = Number(t.amount) || 0;
      if (t.type === 'income') return acc + val;
      if (t.type === 'expense' && t.paymentMethod !== 'credit') return acc - val;
      return acc;
    }, 0);

    return {
      debt: totalDebts,
      cards: totalCards,
      investments: totalInvestments,
      bens: totalProperty,
      controlaBalance,
      colchaoCurrent,
      colchaoTarget,
      marcoZero: colchaoCurrent,
      reserveCurrent,
      hasCards: userCards.length > 0,
      hasDebts: debts.length > 0,
      hasInvestments: totalInvestments > 0,
      hasBens: totalProperty > 0,
      hasIncompleteCards: userCards.some(c => !c.closingDay || !c.dueDay),
      validatedModules: wealthHistory[0]?.validatedModules || {}
    };
  }, [totalDebts, userCards, safeTx, totalInvestments, totalProperty, debts.length, wealthHistory, reserveCurrent, colchaoCurrent, colchaoTarget]);

  const investmentComposition = useMemo(() => {
    const categories: Record<string, number> = {};
    assets.forEach(asset => {
      const cat = asset.category || 'Outros';
      categories[cat] = (categories[cat] || 0) + (asset.currentValue || 0);
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [assets]);

  const propertyComposition = useMemo(() => {
    const categories: Record<string, number> = {};
    passives.forEach(item => {
      const cat = item.category || 'Outros';
      categories[cat] = (categories[cat] || 0) + (item.currentValue || 0);
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [passives]);

  const debtComposition = useMemo(() => {
    const categories: Record<string, number> = {};
    debts.forEach(debt => {
      const cat = debt.tipo || 'Outros';
      categories[cat] = (categories[cat] || 0) + (debt.saldoDevedor || 0);
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [debts]);

  const detailedCards = useMemo(() => {
    return userCards.map(card => {
      const inv = getCurrentInvoice(card, safeTx);
      const balance = inv?.total || 0;
      const limit = card.limit || 0;
      
      // [REACTIVE] A verdade do limite agora vem do saldoUtilizadoTotal persistido
      const usedAmount = card.saldoUtilizadoTotal || 0;
      const available = Math.max(0, limit - usedAmount);
      const usagePercent = limit > 0 ? Math.min(100, (usedAmount / limit) * 100) : 0;
      
      const purchaseCount = safeTx.filter(t => t.cardId === card.id && t.type === 'expense' && inv && t.date >= inv.periodStart && t.date <= inv.periodEnd).length;
      return { ...card, balance, available, usagePercent, purchaseCount, dueDate: inv?.dueDate };
    }).filter(c => c.isActive !== false);
  }, [userCards, safeTx]);

  const evolutionData = useMemo(() => {
    let data = wealthHistory.map(h => {
      let pureInvestments = h.totalInvestments;
      if (pureInvestments === undefined) {
        const propertyValueToSubtract = h.totalProperty !== undefined ? h.totalProperty : totalProperty;
        pureInvestments = Math.max(0, h.totalAssets - propertyValueToSubtract);
      }
      return {
        name: new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        fullDate: new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        value: h.totalNetWorth,
        investments: pureInvestments,
        debts: h.totalDebts,
        isReal: true
      };
    });
    const todayLabel = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const currentReality = {
      name: todayLabel,
      fullDate: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
      value: patrimonioLiquido,
      investments: totalInvestments,
      debts: totalDebts,
      isReal: true
    };
    if (data.length === 0) return [currentReality];
    if (data[data.length - 1].name === todayLabel) data[data.length - 1] = currentReality;
    else data.push(currentReality);
    return data;
  }, [patrimonioLiquido, totalInvestments, totalDebts, wealthHistory, totalProperty]);

  return {
    sovereign,
    urgentBills,
    totals,
    investmentComposition,
    propertyComposition,
    debtComposition,
    detailedCards,
    evolutionData,
    daysSinceLastSnapshot,
    dataHealth,
    loading: loadingBills || loadingWealth || loadingCards,
    patrimonioLiquido,
    totalInvestments,
    totalDebts,
    totalProperty,
    colchaoCurrent,
    colchaoTarget,
    marcoZero: colchaoCurrent,
    reserveCurrent,
    stage,
    contextualEvent,
  };
};
