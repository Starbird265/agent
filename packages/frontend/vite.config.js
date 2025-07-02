import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/agent/', // Set this to your repo name for GitHub Pages
  plugins: [react()],
});