import type { DateRange } from '../../shopping-range';

// Session-wide on purpose: the recorded state must survive moving between the plan and shopping screens.
const loggedRanges = new Set<string>();
const listeners = new Set<() => void>();

function rangeKey(range: DateRange): string {
  return `${range.from}|${range.to}`;
}

export function subscribeToLoggedExpenses(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function markExpenseLogged(range: DateRange): void {
  loggedRanges.add(rangeKey(range));
  listeners.forEach((listener) => listener());
}

export function clearLoggedExpenses(): void {
  loggedRanges.clear();
  listeners.forEach((listener) => listener());
}

export function isExpenseLogged(range: DateRange): boolean {
  return loggedRanges.has(rangeKey(range));
}
