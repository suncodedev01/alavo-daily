import type { ScreenInfo } from '@alavo-daily/common/shell';
import type { PlatformServices } from '@alavo-daily/common';
import { createFakePlatform, FakeEngineClient, renderWithProviders, type Handlers } from '@alavo-daily/common/testing';
import { Toaster } from '@alavo-daily/design-system';
import { act } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { RecipesBackend } from './fakeBackend';
import { spendingHandlers, type FoodBudget } from './fakeSpending';
import { FakeShell } from './FakeShell';

export interface ScreenOptions {
  path: string;
  route: string;
  backend?: RecipesBackend;
  budget?: FoodBudget | null;
  platform?: PlatformServices;
  width?: number;
  fullscreen?: boolean;
  handlers?: Handlers;
}

export function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
}

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Đường dẫn hiện tại">{`${location.pathname}${location.search}`}</output>;
}

export function renderScreen(element: ReactElement, options: ScreenOptions) {
  const backend = options.backend ?? new RecipesBackend();
  const engine = new FakeEngineClient({
    ...backend.handlers(),
    ...spendingHandlers(options.budget === undefined ? { budgetVnd: 1_000_000, spentVnd: 200_000 } : options.budget),
    ...options.handlers,
  });
  setViewportWidth(options.width ?? 1280);
  const described: ScreenInfo[] = [];
  const routes = (
    <Routes>
      <Route path={options.path} element={element} />
      <Route path="*" element={null} />
    </Routes>
  );
  const body = options.fullscreen ? routes : <FakeShell onDescribe={(info) => described.push(info)}>{routes}</FakeShell>;
  const result = renderWithProviders(
    <MemoryRouter initialEntries={[options.route]}>
      {body}
      <LocationProbe />
      <Toaster />
    </MemoryRouter>,
    { engine, platform: options.platform ?? createFakePlatform() },
  );
  return { ...result, engine, backend, described };
}
