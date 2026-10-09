export interface FireMonthlyRow {
  month: number;
  year: number;
  monthInYear: number;
  startingBalance: number;
  investment: number;
  interest: number;
  endingBalance: number;
  passiveIncome: number;
  isFireAchievedMonth: boolean;
}

export interface FireYearlyRow {
  year: number;
  startingBalance: number;
  totalInvested: number;
  totalInterest: number;
  endingBalance: number;
  passiveIncome: number;
  isFireAchievedYear: boolean;
}

export interface CalculatedState {
  fireNumber: number;
  yearsToFire: number | null;
  percentageDone: number;
  alreadyFire: boolean;
  minMonthly: number | null;
  trajectory: { year: number; patrimonio: number }[];
  fireYear: number | null;
  arrivalAge: number | null;
  monthlyExpense: number;
  monthlyInvestment: number;
  currentWealth: number;
  withdrawalRate: number;
  returnRate: number;
  monthlyRate: number;
  monthlyBreakdown: FireMonthlyRow[];
  yearlyBreakdown: FireYearlyRow[];
}
