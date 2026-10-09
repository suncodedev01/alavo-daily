import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { EngineGate, EngineProvider, useEngineQuery } from '@alavo-daily/common/engine';
import { TauriEngineClient } from '@alavo-daily/common/engine/tauri';

const client = new TauriEngineClient();

function Probe() {
  const settings = useEngineQuery('hub.get_settings');
  return <pre id="probe">{JSON.stringify(settings.data, null, 2)}</pre>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EngineProvider client={client}>
      <EngineGate loading={<p>loading</p>} failed={(message) => <p id="failed">{message}</p>}>
        <Probe />
      </EngineGate>
    </EngineProvider>
  </StrictMode>,
);
