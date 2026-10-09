import { useSyncExternalStore } from 'react';

export const TOAST_DURATION_MS = 2200;

type Listener = () => void;

let currentMessage: string | null = null;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getMessage(): string | null {
  return currentMessage;
}

function showToast(message: string): void {
  clearTimeout(hideTimer);
  currentMessage = message;
  emit();
  hideTimer = setTimeout(() => {
    currentMessage = null;
    emit();
  }, TOAST_DURATION_MS);
}

export function resetToasts(): void {
  clearTimeout(hideTimer);
  currentMessage = null;
  emit();
}

export function useToast(): { toast: (message: string) => void } {
  return { toast: showToast };
}

export function Toaster() {
  const message = useSyncExternalStore(subscribe, getMessage, () => null);
  return (
    <div
      role="status"
      aria-live="polite"
      data-visible={message ? '' : undefined}
      className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 translate-y-4 rounded-4xl bg-text-primary px-4 py-2.5 text-sm text-paper opacity-0 transition-all duration-200 data-visible:translate-y-0 data-visible:opacity-100 lg:bottom-6"
    >
      {message}
    </div>
  );
}
