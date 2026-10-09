import { useSyncExternalStore } from 'react';

export type Layout = 'wide' | 'narrow';

export const WIDE_BREAKPOINT_PX = 1024;

function subscribe(onChange: () => void): () => void {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

function readLayout(): Layout {
  return window.innerWidth >= WIDE_BREAKPOINT_PX ? 'wide' : 'narrow';
}

function readServerLayout(): Layout {
  return 'wide';
}

export function useLayout(): Layout {
  return useSyncExternalStore(subscribe, readLayout, readServerLayout);
}
