const SETTLE_MS = 1000;

/** Milliseconds from `now` until just after the next local midnight. */
export function millisUntilNextDay(now: Date): number {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return nextMidnight.getTime() - now.getTime() + SETTLE_MS;
}
