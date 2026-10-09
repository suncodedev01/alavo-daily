import { render, screen } from '@testing-library/react';
import { useMemo, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Screen, ShellSlotsContext, type ScreenInfo, type ShellSlots } from './index';

function Harness({ onDescribe, children }: { onDescribe: (info: ScreenInfo) => void; children: React.ReactNode }) {
  const [actions, setActions] = useState<HTMLElement | null>(null);
  const [list, setList] = useState<HTMLElement | null>(null);
  const [dock, setDock] = useState<HTMLElement | null>(null);
  const describeScreen = useMemo(
    () => (info: ScreenInfo) => {
      onDescribe(info);
      return () => undefined;
    },
    [onDescribe],
  );
  const slots: ShellSlots = { actions, list, dock, describeScreen };
  return (
    <ShellSlotsContext.Provider value={slots}>
      <header data-testid="actions" ref={setActions} />
      <nav data-testid="list" ref={setList} />
      <aside data-testid="dock" ref={setDock} />
      <main data-testid="main">{children}</main>
    </ShellSlotsContext.Provider>
  );
}

describe('Screen', () => {
  it('renders the working pane in place and the other panes into the shell slots', () => {
    render(
      <Harness onDescribe={() => undefined}>
        <Screen title="Giao dịch" actions={<button>Thêm</button>} list={<p>Danh sách</p>} dock={<p>Bảng</p>}>
          <p>Chi tiết</p>
        </Screen>
      </Harness>,
    );
    expect(screen.getByTestId('main')).toHaveTextContent('Chi tiết');
    expect(screen.getByTestId('actions')).toHaveTextContent('Thêm');
    expect(screen.getByTestId('list')).toHaveTextContent('Danh sách');
    expect(screen.getByTestId('dock')).toHaveTextContent('Bảng');
  });

  it('tells the shell whether it has a list and a dock', () => {
    const describe = vi.fn();
    render(
      <Harness onDescribe={describe}>
        <Screen title="Tổng quan" dock={<p>Bảng</p>}>
          <p>x</p>
        </Screen>
      </Harness>,
    );
    expect(describe).toHaveBeenLastCalledWith({
      title: 'Tổng quan',
      hasList: false,
      hasDock: true,
      listLabel: undefined,
      narrowShows: 'main',
    });
  });

  it('does not describe itself again when only its content changes', () => {
    const describe = vi.fn();
    const { rerender } = render(
      <Harness onDescribe={describe}>
        <Screen title="A">
          <p>one</p>
        </Screen>
      </Harness>,
    );
    rerender(
      <Harness onDescribe={describe}>
        <Screen title="A">
          <p>two</p>
        </Screen>
      </Harness>,
    );
    expect(describe).toHaveBeenCalledTimes(1);
  });

  it('works without a shell by showing just the working pane', () => {
    render(
      <Screen title="A" list={<p>list</p>}>
        <p>only main</p>
      </Screen>,
    );
    expect(screen.getByText('only main')).toBeInTheDocument();
    expect(screen.queryByText('list')).not.toBeInTheDocument();
  });
});
