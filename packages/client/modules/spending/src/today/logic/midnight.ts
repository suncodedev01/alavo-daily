const MIDNIGHT_GRACE_MS = 1000;

export function msUntilNextMidnight(now: Date): number {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return nextMidnight.getTime() - now.getTime() + MIDNIGHT_GRACE_MS;
}
