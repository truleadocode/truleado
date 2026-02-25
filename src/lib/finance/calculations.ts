/**
 * Finance Calculations Engine
 *
 * Implements all financial formulas from the Finance Module PRD.
 * All calculations are server-side and use precise decimal arithmetic.
 *
 * Formulas:
 *   Committed = Sum of accepted creator agreements (status = committed)
 *   Paid = Sum of paid creator agreements + Sum of paid expenses
 *   Other Expenses = Sum of manual expenses (paid + unpaid)
 *   Total Spend = Paid + Other Expenses (paid only)
 *   Remaining Budget = Total Budget - (Committed + Other Expenses)
 *   Profit = Revenue - Total Spend
 *   Margin % = (Profit / Revenue) * 100
 *   Budget Utilization = (Committed + Other Expenses) / Total Budget * 100
 *   Warning Level = 'none' | 'warning' (80-99%) | 'critical' (100%+)
 */

export interface AgreementRow {
  converted_amount: number;
  status: 'committed' | 'paid' | 'cancelled';
}

export interface ExpenseRow {
  converted_amount: number;
  status: 'unpaid' | 'paid';
}

export interface CampaignBudgetConfig {
  total_budget: number | null;
  currency: string | null;
  budget_control_type: 'soft' | 'hard' | null;
  client_contract_value: number | null;
}

export interface FinanceSummary {
  totalBudget: number | null;
  currency: string | null;
  budgetControlType: 'soft' | 'hard' | null;
  clientContractValue: number | null;
  committed: number;
  paid: number;
  otherExpenses: number;
  totalSpend: number;
  remainingBudget: number | null;
  profit: number | null;
  marginPercent: number | null;
  budgetUtilization: number | null;
  warningLevel: 'none' | 'warning' | 'critical';
}

/**
 * Calculate the full financial summary for a campaign.
 */
export function calculateFinanceSummary(
  budget: CampaignBudgetConfig,
  agreements: AgreementRow[],
  expenses: ExpenseRow[]
): FinanceSummary {
  // Committed = sum of agreements with status 'committed'
  const committed = agreements
    .filter((a) => a.status === 'committed')
    .reduce((sum, a) => sum + Number(a.converted_amount), 0);

  // Paid from agreements = sum of agreements with status 'paid'
  const paidAgreements = agreements
    .filter((a) => a.status === 'paid')
    .reduce((sum, a) => sum + Number(a.converted_amount), 0);

  // Paid expenses
  const paidExpenses = expenses
    .filter((e) => e.status === 'paid')
    .reduce((sum, e) => sum + Number(e.converted_amount), 0);

  // Unpaid expenses
  const unpaidExpenses = expenses
    .filter((e) => e.status === 'unpaid')
    .reduce((sum, e) => sum + Number(e.converted_amount), 0);

  // Other Expenses = all manual expenses (paid + unpaid)
  const otherExpenses = paidExpenses + unpaidExpenses;

  // Paid = paid agreements + paid expenses
  const paid = paidAgreements + paidExpenses;

  // Total Spend = paid agreements + paid expenses
  const totalSpend = paid;

  // Remaining Budget
  const remainingBudget =
    budget.total_budget != null
      ? Number(budget.total_budget) - (committed + otherExpenses)
      : null;

  // Revenue = client contract value
  const revenue = budget.client_contract_value != null
    ? Number(budget.client_contract_value)
    : null;

  // Profit = Revenue - Total Spend
  const profit = revenue != null ? revenue - totalSpend : null;

  // Margin % = (Profit / Revenue) * 100
  const marginPercent =
    profit != null && revenue != null && revenue > 0
      ? roundToTwo((profit / revenue) * 100)
      : null;

  // Budget Utilization = (Committed + Other Expenses) / Total Budget * 100
  const budgetUtilization =
    budget.total_budget != null && Number(budget.total_budget) > 0
      ? roundToTwo(((committed + otherExpenses) / Number(budget.total_budget)) * 100)
      : null;

  // Warning Level
  const warningLevel = getWarningLevel(budgetUtilization);

  return {
    totalBudget: budget.total_budget != null ? Number(budget.total_budget) : null,
    currency: budget.currency,
    budgetControlType: budget.budget_control_type,
    clientContractValue: budget.client_contract_value != null ? Number(budget.client_contract_value) : null,
    committed: roundToTwo(committed),
    paid: roundToTwo(paid),
    otherExpenses: roundToTwo(otherExpenses),
    totalSpend: roundToTwo(totalSpend),
    remainingBudget: remainingBudget != null ? roundToTwo(remainingBudget) : null,
    profit: profit != null ? roundToTwo(profit) : null,
    marginPercent,
    budgetUtilization,
    warningLevel,
  };
}

/**
 * Determine warning level based on budget utilization percentage.
 */
export function getWarningLevel(
  utilization: number | null
): 'none' | 'warning' | 'critical' {
  if (utilization == null) return 'none';
  if (utilization >= 100) return 'critical';
  if (utilization >= 80) return 'warning';
  return 'none';
}

/**
 * Check if a new commitment would exceed the hard budget limit.
 * Returns null if allowed, or an error message if blocked.
 */
export function checkBudgetLimit(
  budget: CampaignBudgetConfig,
  currentCommitted: number,
  currentExpenses: number,
  newAmount: number
): string | null {
  if (budget.total_budget == null) return null;
  if (budget.budget_control_type !== 'hard') return null;

  const totalAfter = currentCommitted + currentExpenses + newAmount;
  if (totalAfter > Number(budget.total_budget)) {
    return 'Budget exceeded. Increase budget or remove expenses.';
  }

  return null;
}

/**
 * Round to two decimal places using banker's rounding.
 */
export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Convert an amount from one currency to another using a given FX rate.
 */
export function convertAmount(
  amount: number,
  fxRate: number
): number {
  return roundToTwo(amount * fxRate);
}
