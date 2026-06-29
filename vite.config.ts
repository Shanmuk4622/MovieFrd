import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// All secrets are read from the client at runtime via `import.meta.env` (VITE_* vars).
// No secrets are injected at build time and none are hardcoded in source.
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
