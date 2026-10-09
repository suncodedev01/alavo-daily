import {
  addDays,
  dayAndMonthLong,
  daysInMonth,
  monthOf,
  weekdayName,
  type Bill,
  type BudgetLine,
  type Language,
  type PlanEntry,
  type ShoppingList,
} from '@alavo-daily/common';

export const FOOD_CATEGORY_ID = 'category-food';
export const SHOPPING_DAYS = 3;
export const BUDGET_RAISE_STEP_VND = 100_000;
const MAX_UPCOMING_BILLS = 4;

export function dinnerEntries(plan: PlanEntry[]): PlanEntry[] {
  return plan.filter((entry) => entry.slot === 'dinner');
}

export function missingIngredientCount(shopping: ShoppingList, recipeNames: string[]): number {
  return shopping.items.filter(
    (item) => !item.have && item.from.some((name) => recipeNames.includes(name)),
  ).length;
}

export function foodBudgetLine(lines: BudgetLine[]): BudgetLine | undefined {
  return lines.find((line) => line.categoryId === FOOD_CATEGORY_ID);
}

export type BudgetDecision =
  | { kind: 'none' }
  | { kind: 'fits'; projectedRatio: number }
  | {
      kind: 'over';
      costVnd: number;
      remainingVnd: number;
      overByVnd: number;
      raiseByVnd: number;
      projectedRatio: number;
    };

export function roundUpToStep(amountVnd: number, step = BUDGET_RAISE_STEP_VND): number {
  return Math.ceil(amountVnd / step) * step;
}

/** Compares what the shopping list still needs with what is left of the food budget. */
export function decideFoodBudget(
  shopping: ShoppingList | undefined,
  line: BudgetLine | undefined,
): BudgetDecision {
  if (!shopping || !line || shopping.neededCostVnd <= 0) return { kind: 'none' };
  const costVnd = shopping.neededCostVnd;
  const projectedRatio = (line.spentVnd + costVnd) / line.budgetVnd;
  if (costVnd <= line.remainingVnd) return { kind: 'fits', projectedRatio };
  const overByVnd = costVnd - line.remainingVnd;
  const remainingVnd = Math.max(0, line.remainingVnd);
  const raiseByVnd = roundUpToStep(overByVnd);
  return { kind: 'over', costVnd, remainingVnd, overByVnd, raiseByVnd, projectedRatio };
}

export function spentToday(dailyExpenseVnd: number[]): number {
  return dailyExpenseVnd[dailyExpenseVnd.length - 1] ?? 0;
}

export function isFirstRun(transactionCount: number, recipeCount: number): boolean {
  return transactionCount === 0 && recipeCount === 0;
}

export function shoppingRangeEnd(today: string): string {
  return addDays(today, SHOPPING_DAYS - 1);
}

/** `2026-10-09` → `Thứ Sáu, 9 tháng 10`, in English `Friday, October 9`. */
export function longDateLabel(dateText: string, language: Language = 'vi'): string {
  return `${weekdayName(dateText, language)}, ${dayAndMonthLong(dateText, language)}`;
}

export function nextDueDate(dayOfMonth: number, today: string): string {
  const month = dueMonth(dayOfMonth, today);
  const day = Math.min(dayOfMonth, daysInMonth(month));
  return `${month}-${String(day).padStart(2, '0')}`;
}

function dueMonth(dayOfMonth: number, today: string): string {
  const month = monthOf(today);
  const todayDay = Number(today.slice(8, 10));
  if (Math.min(dayOfMonth, daysInMonth(month)) >= todayDay) return month;
  return monthOf(addDays(`${month}-01`, daysInMonth(month)));
}

export interface UpcomingBill {
  bill: Bill;
  dueOn: string;
}

export function upcomingBills(bills: Bill[], today: string): UpcomingBill[] {
  return bills
    .filter((bill) => bill.active)
    .map((bill) => ({ bill, dueOn: nextDueDate(bill.dayOfMonth, today) }))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
    .slice(0, MAX_UPCOMING_BILLS);
}
