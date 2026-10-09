import { Navigate, Outlet, Route, Routes } from 'react-router';

import type { ModuleManifest, ModuleRoute } from '@alavo-daily/common';

import { ExploreScreen } from '../../screens/explore';
import { SettingsScreen } from '../../screens/settings';
import { TodayScreen } from '../../screens/today';
import { UnknownPath } from '../../screens/unknown-path';
import { firstViewPath } from '../../module-navigation';
import { ShellFrame } from '../../shell';
import { useModules } from '../../module-registry';

export function AppRoutes() {
  const modules = useModules();
  const routes = modules.flatMap((manifest) => manifest.routes);
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/today" replace />} />
      {routes.filter((route) => route.fullscreen).map(renderRoute)}
      <Route element={<FramedLayout />}>
        <Route path="/today" element={<TodayScreen />} />
        <Route path="/explore" element={<ExploreScreen />} />
        <Route path="/settings/:tab?" element={<SettingsScreen />} />
        {modules.filter((manifest) => !hasOwnRoot(manifest)).map(renderModuleRedirect)}
        {routes.filter((route) => !route.fullscreen).map(renderRoute)}
        <Route path="*" element={<UnknownPath />} />
      </Route>
    </Routes>
  );
}

function FramedLayout() {
  return (
    <ShellFrame>
      <Outlet />
    </ShellFrame>
  );
}

function renderRoute(route: ModuleRoute) {
  return <Route key={route.path} path={route.path} element={route.element} />;
}

function renderModuleRedirect(manifest: ModuleManifest) {
  const target = <Navigate to={firstViewPath(manifest)} replace />;
  return <Route key={`${manifest.id}-root`} path={`/${manifest.id}`} element={target} />;
}

function hasOwnRoot(manifest: ModuleManifest): boolean {
  return manifest.routes.some((route) => route.path === `/${manifest.id}`);
}
