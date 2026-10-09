import { useLayoutEffect, useSyncExternalStore } from 'react';

import { appliedPaletteId, choosePalette, restoreStoredPalette, subscribeToPalette } from '../logic/paletteDocument';
import type { PaletteId } from '../types';

export function usePalette(): { paletteId: PaletteId; selectPalette: (id: PaletteId) => void } {
  useLayoutEffect(() => restoreStoredPalette(), []);
  const paletteId = useSyncExternalStore(subscribeToPalette, () => appliedPaletteId());
  return { paletteId, selectPalette: choosePalette };
}
