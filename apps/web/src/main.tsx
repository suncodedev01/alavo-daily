import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { EngineGate, EngineProvider, useEngineQuery } from '@alavo-daily/common/engine';
import { WorkerEngineClient } from '@alavo-daily/common/engine/worker';

const client = new WorkerEngineClient();
if (import.meta.env.DEV) (window as unknown as { __engine: unknown }).__engine = client;

function Probe() {
  const settings = useEngineQuery('hub.get_settings');
  const rules = useEngineQuery('hub.list_notification_rules');
  return (
    <pre id="probe">
      {JSON.stringify({ settings: settings.data, rules: rules.data?.length }, null, 2)}
    </pre>
  );
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
