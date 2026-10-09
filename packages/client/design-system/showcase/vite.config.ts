import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const showcaseRoot = fileURLToPath(new URL('.', import.meta.url));
const srcRoot = fileURLToPath(new URL('../src', import.meta.url));

export default defineConfig({
  root: showcaseRoot,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': srcRoot } },
  server: { port: 5273, strictPort: true },
  build: { outDir: fileURLToPath(new URL('../dist-showcase', import.meta.url)), emptyOutDir: true },
});
