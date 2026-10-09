import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import { designSystemAlias } from '../design-system/vite-plugin';

export default defineConfig({
  plugins: [designSystemAlias(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['@alavo-daily/common/testing/setup'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    testTimeout: 20000,
  },
});
