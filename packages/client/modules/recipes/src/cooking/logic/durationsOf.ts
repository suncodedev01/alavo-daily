import type { Step } from '@alavo-daily/common/engine';

export function durationsOf(steps: readonly Step[]): Map<number, number> {
  const durations = new Map<number, number>();
  steps.forEach((step, index) => {
    if (step.timerMin > 0) durations.set(index, step.timerMin * 60);
  });
  return durations;
}
