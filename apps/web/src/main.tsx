import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createWebPlatform } from '@alavo-daily/common';
import { WorkerEngineClient } from '@alavo-daily/common/engine/worker';
import { AlavoApp } from '@alavo-daily/hub';

import './index.css';

const engine = new WorkerEngineClient();
if (import.meta.env.DEV) (window as unknown as { __engine: unknown }).__engine = engine;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AlavoApp engine={engine} platform={createWebPlatform()} />
  </StrictMode>,
);
