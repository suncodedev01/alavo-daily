import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { designSystemAlias } from '../../packages/client/design-system/vite-plugin';

export default defineConfig({
  plugins: [designSystemAlias(), tailwindcss(), react()],
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  server: { port: 5190 },
});
