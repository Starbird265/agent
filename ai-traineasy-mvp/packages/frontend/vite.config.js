import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',             // project root
  base: '/agent/',       // GitHub Pages base path
  server: { port: 5173 },
});