import { ShellSlotsContext, type ScreenInfo, type ShellSlots } from '@alavo-daily/common/shell';
import { FakeEngineClient, renderWithProviders, type Handlers } from '@alavo-daily/common/testing';
import { Toaster } from '@alavo-daily/design-system';
import { act, type RenderResult } from '@testing-library/react';
import { useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { vi, beforeEach, afterEach } from 'vitest';

import { spendingManifest } from '../index';
import { createDemoData, TODAY, type FakeData } from './fixtures';
import { spendingHandlers } from './fakeSpending';

export const WIDE_WIDTH = 1280;
export const NARROW_WIDTH = 390;

export function setViewport(width: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
}

export function freezeToday(date: string = TODAY): void {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${date}T10:00:00`));
  });
  afterEach(() => {
    vi.useRealTimers();
  });
}

function FakeShell({ infoRef, children }: { infoRef: { current: ScreenInfo | null }; children: ReactNode }) {
  const [actions, setActions] = useState<HTMLElement | null>(null);
  const [list, setList] = useState<HTMLElement | null>(null);
  const [dock, setDock] = useState<HTMLElement | null>(null);
  const describeScreen = useMemo(
    () => (info: ScreenInfo) => {
      infoRef.current = info;
      return () => undefined;
    },
    [infoRef],
  );
  const slots: ShellSlots = { actions, list, dock, describeScreen };
  return (
    <ShellSlotsContext.Provider value={slots}>
      <header aria-label="Thanh tiêu đề" ref={setActions} />
      <nav aria-label="Ngăn danh sách" ref={setList} />
      <aside aria-label="Bảng ngữ cảnh" ref={setDock} />
      <main aria-label="Ngăn làm việc">{children}</main>
      <Toaster />
    </ShellSlotsContext.Provider>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Địa chỉ hiện tại">{`${location.pathname}${location.search}`}</output>;
}

function ManifestRoutes() {
  return (
    <Routes>
      {spendingManifest.routes.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
    </Routes>
  );
}

export interface SpendingRenderOptions {
  route?: string;
  width?: number;
  data?: FakeData;
  handlers?: Handlers;
}

export interface SpendingRender extends RenderResult {
  engine: FakeEngineClient;
  data: FakeData;
  screenInfo: { current: ScreenInfo | null };
}

export function renderInSpendingShell(ui: ReactElement, options: SpendingRenderOptions = {}): SpendingRender {
  const data = options.data ?? createDemoData();
  setViewport(options.width ?? WIDE_WIDTH);
  const engine = new FakeEngineClient({ ...spendingHandlers(data), ...options.handlers });
  const infoRef: { current: ScreenInfo | null } = { current: null };
  const result = renderWithProviders(
    <MemoryRouter initialEntries={[options.route ?? '/spending/overview']}>
      <FakeShell infoRef={infoRef}>{ui}</FakeShell>
      <LocationProbe />
    </MemoryRouter>,
    { engine },
  );
  return Object.assign(result, { engine, data, screenInfo: infoRef });
}

export function renderSpending(options: SpendingRenderOptions = {}): SpendingRender {
  return renderInSpendingShell(<ManifestRoutes />, options);
}
