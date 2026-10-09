import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { TauriEngineClient } from '@alavo-daily/common/engine/tauri';
import { AlavoApp } from '@alavo-daily/hub';

import { createNativePlatform } from './createNativePlatform';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlavoApp engine={new TauriEngineClient()} platform={createNativePlatform()} />
  </StrictMode>,
);
