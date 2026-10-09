import type { PaletteId } from '../types';
import { DEFAULT_PALETTE_ID, isPaletteId } from './palettes';
import { PALETTE_KEY, readStored, writeStored } from './storedChoice';

type Listener = () => void;

const listeners = new Set<Listener>();

export function appliedPaletteId(root: HTMLElement = document.documentElement): PaletteId {
  const applied = root.dataset.palette;
  return isPaletteId(applied) ? applied : DEFAULT_PALETTE_ID;
}

function applyPaletteId(id: PaletteId, root: HTMLElement): void {
  if (id === DEFAULT_PALETTE_ID) delete root.dataset.palette;
  else root.dataset.palette = id;
}

export function choosePalette(id: PaletteId, root: HTMLElement = document.documentElement): void {
  if (!isPaletteId(id)) return;
  applyPaletteId(id, root);
  writeStored(PALETTE_KEY, id);
  listeners.forEach((listener) => listener());
}

export function restoreStoredPalette(root: HTMLElement = document.documentElement): void {
  const stored = readStored(PALETTE_KEY);
  if (isPaletteId(stored) && stored !== appliedPaletteId(root)) applyPaletteId(stored, root);
  listeners.forEach((listener) => listener());
}

export function subscribeToPalette(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
