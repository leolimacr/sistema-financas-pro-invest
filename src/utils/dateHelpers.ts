import { Timestamp } from 'firebase/firestore';

export type Frequencia = 'semanal' | 'quinzenal' | 'mensal' | 'personalizado';

interface CalcularProximoAporteParams {
  dataInicio: Date | Timestamp;
  frequencia: Frequencia;
  diasPersonalizado?: number;
}

/**
 * Calcula a data do próximo aporte com base na frequência e data de início.
 * Retorna um objeto Date ou null se não houver data de início válida.
 */
export function calcularProximoAporte({
  dataInicio,
  frequencia,
  diasPersonalizado = 0,
}: CalcularProximoAporteParams): Date | null {
  const inicio = dataInicio instanceof Timestamp ? dataInicio.toDate() : dataInicio;
  if (!inicio) return null;

  const hoje = new Date();
  
  // Se a data de início for futura, o próximo aporte é na data de início
  if (inicio > hoje) {
    return inicio;
  }

  let proximo = new Date(inicio);

  // Loop para encontrar a próxima data futura (ou igual a hoje)
  while (proximo <= hoje) {
    switch (frequencia) {
      case 'semanal':
        proximo.setDate(proximo.getDate() + 7);
        break;
      case 'quinzenal':
        proximo.setDate(proximo.getDate() + 15);
        break;
      case 'mensal':
        proximo.setMonth(proximo.getMonth() + 1);
        break;
      case 'personalizado':
        if (diasPersonalizado > 0) {
          proximo.setDate(proximo.getDate() + diasPersonalizado);
        } else {
          // Se não definido, trata como mensal
          proximo.setMonth(proximo.getMonth() + 1);
        }
        break;
      default:
        return null;
    }
  }
  return proximo;
}

/**
 * Calcula quantos dias faltam para o próximo aporte.
 * Retorna um número (pode ser negativo se já passou).
 */
/**
 * Retorna a data local como string YYYY-MM-DD,
 * evitando o bug de fuso horário do toISOString() que usa UTC.
 */
export function getLocalDateString(date?: Date): string {
  const d = date ?? new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function diasAteProximoAporte(proximoAporte: Date | null): number | null {
  if (!proximoAporte) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const proximo = new Date(proximoAporte);
  proximo.setHours(0, 0, 0, 0);
  const diffTime = proximo.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Identifica se a transação é uma parcela herdada de meses anteriores (parcela 2 em diante).
 */
export function isPreviousInstallment(t: any): boolean {
  if (!t) return false;
  const currentInst = Number(t.currentInstallment);
  const totalInst = Number(t.installments);
  if (currentInst > 1 && totalInst > 1) return true;
  if (currentInst > 1 && t.paymentMethod === 'credit') return true;
  return false;
}

/**
 * Retorna a data original da compra física em formato YYYY-MM-DD.
 * Se já existir `purchaseDate`, retorna diretamente.
 * Caso contrário, deduz matematicamente subtraindo (currentInstallment - 1) meses da data contábil.
 */
export function getOriginalPurchaseDate(t: { date?: string; purchaseDate?: string; installments?: number; currentInstallment?: number }): string {
  if (!t) return '';
  if (t.purchaseDate) return t.purchaseDate;
  const currentInst = Number(t.currentInstallment);
  if (currentInst > 1 && t.date) {
    const [y, m, d] = t.date.split('-').map(Number);
    if (y && m && d) {
      const monthsToSubtract = currentInst - 1;
      const totalMonths = (y * 12 + (m - 1)) - monthsToSubtract;
      const targetYear = Math.floor(totalMonths / 12);
      const targetMonth = totalMonths % 12;
      const maxDaysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const safeDay = Math.min(d, maxDaysInTargetMonth);
      const targetDate = new Date(targetYear, targetMonth, safeDay);
      return getLocalDateString(targetDate);
    }
  }
  return t.date || '';
}