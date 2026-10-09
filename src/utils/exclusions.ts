import type { VoucherCardInfo } from '../contexts/ExclusionsContext';

export interface ExclusionToggles {
  excluirReserva: boolean;
  excluirColchao: boolean;
  excluirVoucherMap: Record<string, boolean>;
}

export function computeExclusions(
  toggles: ExclusionToggles,
  reserveTarget: number,
  colchaoTarget: number,
  voucherCards: VoucherCardInfo[]
): number {
  const exclusaoVoucher = voucherCards
    .filter(c => toggles.excluirVoucherMap[c.id])
    .reduce((s, c) => s + c.balance, 0);
  return (toggles.excluirReserva ? reserveTarget : 0)
       + (toggles.excluirColchao ? colchaoTarget : 0)
       + exclusaoVoucher;
}