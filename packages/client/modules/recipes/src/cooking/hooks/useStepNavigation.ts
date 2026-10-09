import { useCallback, useEffect, useState } from 'react';

export interface StepNavigation {
  stepIndex: number;
  goPrevious: () => void;
  goNext: () => void;
}

export function useStepNavigation(stepCount: number): StepNavigation {
  const [stepIndex, setStepIndex] = useState(0);
  const goPrevious = useCallback(() => setStepIndex((index) => Math.max(0, index - 1)), []);
  const goNext = useCallback(
    () => setStepIndex((index) => Math.min(stepCount - 1, index + 1)),
    [stepCount],
  );
  useArrowKeys(goPrevious, goNext);
  return { stepIndex, goPrevious, goNext };
}

function useArrowKeys(onPrevious: () => void, onNext: () => void): void {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.key === 'ArrowRight') onNext();
      if (event.key === 'ArrowLeft') onPrevious();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onPrevious, onNext]);
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}
