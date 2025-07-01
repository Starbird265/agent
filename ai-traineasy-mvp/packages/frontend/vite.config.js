import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',             // project root
  base: '/',             // Root path for GitHub Pages
  server: { port: 5173 },
});