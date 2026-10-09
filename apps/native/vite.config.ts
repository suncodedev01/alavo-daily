import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { designSystemAlias } from '../../packages/client/design-system/vite-plugin';

const googleSyncConfigured = Boolean(
  process.env.ALAVO_GOOGLE_DESKTOP_CLIENT_ID && process.env.ALAVO_GOOGLE_DESKTOP_CLIENT_SECRET,
);

export default defineConfig({
  define: { __ALAVO_GOOGLE_SYNC__: JSON.stringify(googleSyncConfigured) },
  plugins: [designSystemAlias(), tailwindcss(), react()],
  clearScreen: false,
  server: { port: 5191, strictPort: true, host: process.env.TAURI_DEV_HOST || false },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: { target: 'es2022', outDir: 'dist' },
});
