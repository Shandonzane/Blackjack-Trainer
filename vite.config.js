import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Minimal Vite config — React plugin + dev server.
export default defineConfig({
  plugins: [react()],
  server: { open: true },
});
