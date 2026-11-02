
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['process', 'util', 'buffer', 'stream'],
      globals: {
        process: true,
        Buffer: true,
        global: true,
      },
      protocolImports: true,
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
});
