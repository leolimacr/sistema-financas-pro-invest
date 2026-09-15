import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface VoucherCardInfo {
  id: string;
  name: string;
  balance: number;
  voucherType?: 'alimentacao' | 'refeicao' | 'outro';
}

export interface ExclusionToggles {
  excluirReserva: boolean;
  excluirColchao: boolean;
  excluirVoucherMap: Record<string, boolean>;
}

const LS_RESERVA = 'fpi-dash-excluir-reserva';
const LS_COLCHAO = 'fpi-dash-excluir-colchao';
const LS_VOUCHER = 'fpi-dash-excluir-voucher';

interface ExclusionsContextValue {
  excluirReserva: boolean;
  excluirColchao: boolean;
  excluirVoucherMap: Record<string, boolean>;
  toggleReserva: () => void;
  toggleColchao: () => void;
  toggleVoucherCard: (cardId: string) => void;
  resetExclusions: () => void;
  computeExclusions: (reserveTarget: number, colchaoTarget: number, voucherCards: VoucherCardInfo[]) => number;
}

const ExclusionsContext = createContext<ExclusionsContextValue | null>(null);

export function ExclusionsProvider({ children }: { children: ReactNode }) {
  const [excluirReserva, setExcluirReserva] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(LS_RESERVA) === 'true';
  });
  const [excluirColchao, setExcluirColchao] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(LS_COLCHAO) === 'true';
  });
  const [excluirVoucherMap, setExcluirVoucherMap] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem(LS_VOUCHER) || '{}'); }
    catch { return {}; }
  });

  useEffect(() => { localStorage.setItem(LS_RESERVA, String(excluirReserva)); }, [excluirReserva]);
  useEffect(() => { localStorage.setItem(LS_COLCHAO, String(excluirColchao)); }, [excluirColchao]);
  useEffect(() => { localStorage.setItem(LS_VOUCHER, JSON.stringify(excluirVoucherMap)); }, [excluirVoucherMap]);

  const toggleReserva = useCallback(() => setExcluirReserva(p => !p), []);
  const toggleColchao = useCallback(() => {
    setExcluirColchao(p => {
      const next = !p;
      if (next) setExcluirReserva(true);
      return next;
    });
  }, []);
  const toggleVoucherCard = useCallback((cardId: string) =>
    setExcluirVoucherMap(prev => ({ ...prev, [cardId]: !prev[cardId] })), []);
  
  const resetExclusions = useCallback(() => {
    setExcluirReserva(false);
    setExcluirColchao(false);
    setExcluirVoucherMap({});
  }, []);

  const computeExclusions = useCallback((
    reserveTarget: number,
    colchaoTarget: number,
    voucherCards: VoucherCardInfo[]
  ): number => {
    const exclusaoVoucher = voucherCards
      .filter(c => excluirVoucherMap[c.id])
      .reduce((s, c) => s + c.balance, 0);
    return (excluirReserva ? reserveTarget : 0)
         + (excluirColchao ? colchaoTarget : 0)
         + exclusaoVoucher;
  }, [excluirReserva, excluirColchao, excluirVoucherMap]);

  return (
    <ExclusionsContext.Provider value={{
      excluirReserva,
      excluirColchao,
      excluirVoucherMap,
      toggleReserva,
      toggleColchao,
      toggleVoucherCard,
      resetExclusions,
      computeExclusions,
    }}>
      {children}
    </ExclusionsContext.Provider>
  );
}

export function useExclusions(): ExclusionsContextValue {
  const ctx = useContext(ExclusionsContext);
  if (!ctx) throw new Error('useExclusions must be used within ExclusionsProvider');
  return ctx;
}

/**
 * Returns the total exclusion amount (reserva + colchão + vouchers) based on
 * the current toggle state and the user's financial targets.
 * Safe to call inside useMemo — reads only from ExclusionsContext.
 */
export function useExclusionAmount(
  reserveTarget: number,
  colchaoTarget: number,
  voucherCards: VoucherCardInfo[] = [],
): number {
  const { excluirReserva, excluirColchao, excluirVoucherMap } = useExclusions();
  const exclusaoVoucher = voucherCards
    .filter(c => excluirVoucherMap[c.id])
    .reduce((s, c) => s + c.balance, 0);
  return (excluirReserva ? reserveTarget : 0)
       + (excluirColchao ? colchaoTarget : 0)
       + exclusaoVoucher;
}