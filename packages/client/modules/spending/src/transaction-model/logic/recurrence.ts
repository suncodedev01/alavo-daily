const MONTHLY_PREFIX = 'monthly:';

export function monthlyRule(dayOfMonth: number): string {
  return `${MONTHLY_PREFIX}${dayOfMonth}`;
}

export function monthlyRuleDay(rule: string | null): number | null {
  if (rule === null || !rule.startsWith(MONTHLY_PREFIX)) return null;
  const day = Number(rule.slice(MONTHLY_PREFIX.length));
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
}
