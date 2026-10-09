import { MemoryRouter, useLocation } from 'react-router';
import { Screen, type ModuleManifest } from '@alavo-daily/common';
import { renderWithProviders, type FakeEngineClient } from '@alavo-daily/common/testing';
import { Toaster } from '@alavo-daily/design-system';
import type { Handlers } from '@alavo-daily/common/testing';
import type { PlatformServices, SyncController } from '@alavo-daily/common';

import { AppRoutes } from '../app';
import { ModulesProvider } from '../module-registry';
import { SyncProvider } from '../sync-status';
import { createHubEngine, type HubState } from './hubEngine';

function AlphaOne() {
  return (
    <Screen
      title="Trang một"
      actions={<button type="button">Việc của trang một</button>}
      list={<p>Danh sách của Alpha</p>}
      listLabel="Danh sách Alpha"
      dock={<p>Ngữ cảnh của Alpha</p>}
      narrowShows="main"
    >
      <p>Nội dung trang một</p>
    </Screen>
  );
}

function AlphaTwo() {
  return (
    <Screen title="Trang hai" list={<p>Danh sách hai</p>} narrowShows="list">
      <p>Nội dung trang hai</p>
    </Screen>
  );
}

function BetaOne() {
  return (
    <Screen title="Trang beta">
      <p>Nội dung beta</p>
    </Screen>
  );
}

export const alphaManifest: ModuleManifest = {
  id: 'alpha',
  name: 'Alpha',
  icon: 'wallet',
  description: 'Ứng dụng thử số một',
  views: [
    { id: 'one', label: 'Trang một', icon: 'squares-four', path: '/alpha/one', tab: true },
    { id: 'two', label: 'Trang hai', icon: 'receipt', path: '/alpha/two', tab: true },
    { id: 'three', label: 'Trang ba', icon: 'target', path: '/alpha/three' },
  ],
  quickActions: [{ id: 'new-a', label: 'Việc mới của Alpha', icon: 'plus', path: '/alpha/one?new=1' }],
  routes: [
    { path: '/alpha/one', element: <AlphaOne /> },
    { path: '/alpha/two', element: <AlphaTwo /> },
    { path: '/alpha/cook/:id', element: <p>Chế độ toàn màn hình</p>, fullscreen: true },
  ],
};

export const betaManifest: ModuleManifest = {
  id: 'beta',
  name: 'Beta',
  icon: 'cooking-pot',
  description: 'Ứng dụng thử số hai',
  views: [
    { id: 'a', label: 'Mục A', icon: 'book-open', path: '/beta/a', tab: true },
    { id: 'b', label: 'Mục B', icon: 'calendar-blank', path: '/beta/b', tab: true },
    { id: 'c', label: 'Mục C', icon: 'shopping-bag', path: '/beta/c', tab: true },
  ],
  routes: [{ path: '/beta/a', element: <BetaOne /> }],
};

export const TEST_MODULES = [alphaManifest, betaManifest];

function LocationProbe() {
  const location = useLocation();
  return <p aria-label="Đường dẫn hiện tại">{location.pathname + location.search}</p>;
}

export interface RenderHubOptions {
  modules?: ModuleManifest[];
  state?: Partial<HubState>;
  handlers?: Handlers;
  platform?: PlatformServices;
  /** What the sync buttons talk to. Without one, the device cannot sync. */
  sync?: SyncController | null;
}

export function renderHub(path = '/today', options: RenderHubOptions = {}) {
  const { engine, state } = createHubEngine(options.state, options.handlers);
  const result = renderWithProviders(
    <ModulesProvider modules={options.modules ?? TEST_MODULES}>
      <SyncProvider controller={options.sync ?? null}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
          <LocationProbe />
        </MemoryRouter>
      </SyncProvider>
      <Toaster />
    </ModulesProvider>,
    { engine, platform: options.platform },
  );
  return Object.assign(result, { engine: engine as FakeEngineClient, state });
}

export function setViewportWidth(width: number): void {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
}
