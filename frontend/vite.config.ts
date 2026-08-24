import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3300,
    strictPort: true, // Prevents Vite from automatically switching ports if 3000 is busy
    hmr: {
      protocol: 'ws', // Use 'wss' if your local environment runs over HTTPS
      host: 'localhost',
      port: 3300,
    },
  },
});
