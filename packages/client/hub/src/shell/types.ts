import type { ScreenInfo, ShellSlots } from '@alavo-daily/common';

export interface ShellState {
  slots: ShellSlots;
  info: ScreenInfo | null;
  setActions: (element: HTMLElement | null) => void;
  setList: (element: HTMLElement | null) => void;
  setDock: (element: HTMLElement | null) => void;
}
