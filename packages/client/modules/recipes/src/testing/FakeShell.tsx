import { ShellSlotsContext, type ScreenInfo, type ShellSlots } from '@alavo-daily/common/shell';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

export interface FakeShellProps {
  children: ReactNode;
  onDescribe?: (info: ScreenInfo) => void;
}

export function FakeShell({ children, onDescribe }: FakeShellProps) {
  const [actions, setActions] = useState<HTMLElement | null>(null);
  const [list, setList] = useState<HTMLElement | null>(null);
  const [dock, setDock] = useState<HTMLElement | null>(null);
  const describeScreen = useCallback(
    (info: ScreenInfo) => {
      onDescribe?.(info);
      return () => undefined;
    },
    [onDescribe],
  );
  const slots: ShellSlots = useMemo(
    () => ({ actions, list, dock, describeScreen }),
    [actions, list, dock, describeScreen],
  );
  return (
    <ShellSlotsContext.Provider value={slots}>
      <div role="banner" ref={setActions} />
      <div role="region" aria-label="Danh sách" ref={setList} />
      <main>{children}</main>
      <aside aria-label="Bảng bên phải" ref={setDock} />
    </ShellSlotsContext.Provider>
  );
}
