import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { designSystemAlias } from '../../packages/client/design-system/vite-plugin';

export default defineConfig({
  plugins: [designSystemAlias(), tailwindcss(), react()],
  clearScreen: false,
  server: { port: 5191, strictPort: true, host: process.env.TAURI_DEV_HOST || false },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: { target: 'es2022', outDir: 'dist' },
});
