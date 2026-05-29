import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: '@shared',
        replacement: path.resolve(__dirname, '../backend/supabase/functions/_shared'),
      },
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // The @shared schemas import bare `zod` (so Deno resolves it via deno.json). When Vite bundles
      // those files from outside the project root, force `zod` to resolve to the frontend's copy.
      { find: /^zod$/, replacement: path.resolve(__dirname, 'node_modules/zod') },
    ],
  },
  server: {
    port: 5173,
  },
});
